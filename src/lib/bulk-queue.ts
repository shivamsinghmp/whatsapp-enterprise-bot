import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { WhatsAppClient, type WAResponse } from "@/lib/whatsapp";
import { decrypt } from "@/lib/encrypt";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BulkJob {
  campaignId: string;
  userId: string;
  status: "running" | "paused" | "stopped" | "completed";
  total: number;
  sent: number;
  ok: number;
  failed: number;
  stopFlag: boolean;
  pauseFlag: boolean;
  sseClients: Set<ReadableStreamDefaultController>;
  recentLogs: Array<{ phone: string; status: string; time: string }>;
}

type LoadedCampaign = Prisma.CampaignGetPayload<{
  include: {
    template: true;
    user: { include: { waConfig: true } };
  };
}>;

// ── Manager ──────────────────────────────────────────────────────────────────

class BulkQueueManager {
  private readonly jobs = new Map<string, BulkJob>();

  /**
   * Kicks off a campaign in the background.
   * Expects PENDING MessageLog rows to already exist for each recipient.
   * Call without await from your API route to avoid blocking the response.
   */
  async startCampaign(campaignId: string, userId: string): Promise<void> {
    let job: BulkJob | undefined;

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          template: true,
          user: { include: { waConfig: true } },
        },
      });

      if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
      if (!campaign.user.waConfig)
        throw new Error("WhatsApp configuration is missing for this account");
      if (!campaign.user.waConfig.isActive)
        throw new Error("WhatsApp configuration is inactive");

      const waConfig = campaign.user.waConfig;
      const accessToken = decrypt(waConfig.accessToken);
      const client = new WhatsAppClient(
        waConfig.phoneNumberId,
        accessToken,
        waConfig.apiVersion
      );

      // Load pre-created PENDING logs (one row per recipient)
      const pendingLogs = await prisma.messageLog.findMany({
        where: { campaignId, status: "PENDING" },
        orderBy: { sentAt: "asc" },
      });

      if (pendingLogs.length === 0)
        throw new Error("No pending recipients found for this campaign");

      const total = pendingLogs.length;

      job = {
        campaignId,
        userId,
        status: "running",
        total,
        sent: 0,
        ok: 0,
        failed: 0,
        stopFlag: false,
        pauseFlag: false,
        sseClients: new Set(),
        recentLogs: [],
      };

      this.jobs.set(campaignId, job);

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          totalRecipients: total,
        },
      });

      // ── Processing loop ────────────────────────────────────────────────────
      for (const log of pendingLogs) {
        if (job.stopFlag) {
          job.status = "stopped";
          break;
        }

        // Suspend here while paused (poll every 300 ms)
        while (job.pauseFlag && !job.stopFlag) {
          await sleep(300);
        }
        if (job.stopFlag) {
          job.status = "stopped";
          break;
        }

        const response = await this.sendOne(client, campaign, log.toPhone);

        job.sent++;
        if (response.ok) {
          job.ok++;
        } else {
          job.failed++;
        }

        // Persist log result
        await prisma.messageLog.update({
          where: { id: log.id },
          data: {
            status: response.ok ? "SENT" : "FAILED",
            wamid: response.wamid ?? null,
            errorMessage: response.error ?? null,
            errorCode:
              response.code !== undefined ? String(response.code) : null,
            sentAt: new Date(),
          },
        });

        // Update campaign counters
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            sentCount: job.sent,
            deliveredCount: job.ok,
            failedCount: job.failed,
          },
        });

        // Keep the 20 most-recent log entries in memory
        job.recentLogs.unshift({
          phone: log.toPhone,
          status: response.ok ? "sent" : "failed",
          time: new Date().toISOString(),
        });
        if (job.recentLogs.length > 20) job.recentLogs.pop();

        // Broadcast progress to all SSE clients
        this.broadcast(campaignId, {
          type: "progress",
          sent: job.sent,
          ok: job.ok,
          failed: job.failed,
          total: job.total,
          status: job.status,
          recentLogs: job.recentLogs.slice(0, 5),
        });

        // Throttle between sends (skip final delay)
        if (!job.stopFlag && job.sent < total) {
          await sleep(campaign.delayMs);
        }
      }

      // ── Finalize ───────────────────────────────────────────────────────────
      const wasStopped = job.status === "stopped";
      if (!wasStopped) job.status = "completed";

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: wasStopped ? "PAUSED" : "COMPLETED",
          completedAt: new Date(),
        },
      });

      this.broadcast(campaignId, {
        type: "complete",
        sent: job.sent,
        ok: job.ok,
        failed: job.failed,
        total: job.total,
        status: job.status,
      });
    } catch (err) {
      if (job) job.status = "stopped";

      // Best-effort: mark campaign as FAILED
      await prisma.campaign
        .update({
          where: { id: campaignId },
          data: { status: "FAILED" },
        })
        .catch(() => undefined);

      this.broadcast(campaignId, {
        type: "error",
        error: err instanceof Error ? err.message : "Unexpected error",
      });

      throw err;
    }
  }

  stopCampaign(campaignId: string): void {
    const job = this.jobs.get(campaignId);
    if (job) {
      job.stopFlag = true;
      job.pauseFlag = false;
      job.status = "stopped";
    }
  }

  pauseCampaign(campaignId: string): void {
    const job = this.jobs.get(campaignId);
    if (job && job.status === "running") {
      job.pauseFlag = true;
      job.status = "paused";
    }
  }

  resumeCampaign(campaignId: string): void {
    const job = this.jobs.get(campaignId);
    if (job && job.status === "paused") {
      job.pauseFlag = false;
      job.status = "running";
    }
  }

  addSSEClient(
    campaignId: string,
    controller: ReadableStreamDefaultController
  ): void {
    const job = this.jobs.get(campaignId);
    if (job) {
      job.sseClients.add(controller);
    }
  }

  removeSSEClient(
    campaignId: string,
    controller: ReadableStreamDefaultController
  ): void {
    const job = this.jobs.get(campaignId);
    if (job) {
      job.sseClients.delete(controller);
    }
  }

  getJob(campaignId: string): BulkJob | undefined {
    return this.jobs.get(campaignId);
  }

  /**
   * Sends an SSE event to every client subscribed to this campaign.
   * Silently removes any controller that has already closed.
   */
  private broadcast(campaignId: string, data: object): void {
    const job = this.jobs.get(campaignId);
    if (!job || job.sseClients.size === 0) return;

    const payload = new TextEncoder().encode(
      `data: ${JSON.stringify(data)}\n\n`
    );

    for (const controller of job.sseClients) {
      try {
        controller.enqueue(payload);
      } catch {
        // Controller was closed by the client
        job.sseClients.delete(controller);
      }
    }
  }

  /**
   * Dispatches a single message based on campaign type.
   */
  private async sendOne(
    client: WhatsAppClient,
    campaign: LoadedCampaign,
    phone: string
  ): Promise<WAResponse> {
    switch (campaign.messageType) {
      case "TEXT": {
        if (!campaign.messageBody) {
          return { ok: false, error: "Campaign has no message body" };
        }
        return client.sendText(phone, campaign.messageBody);
      }

      case "TEMPLATE": {
        if (!campaign.template) {
          return { ok: false, error: "Campaign has no template linked" };
        }
        return client.sendTemplate(
          phone,
          campaign.template.name,
          campaign.template.language,
          [] // per-recipient variable injection can be added here
        );
      }

      case "IMAGE": {
        if (!campaign.mediaUrl) {
          return { ok: false, error: "Campaign has no media URL" };
        }
        return client.sendImage(phone, campaign.mediaUrl);
      }

      case "DOCUMENT": {
        if (!campaign.mediaUrl) {
          return { ok: false, error: "Campaign has no media URL" };
        }
        return client.sendDocument(phone, campaign.mediaUrl, "document");
      }

      default:
        return {
          ok: false,
          error: `Unsupported message type: ${campaign.messageType}`,
        };
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const bulkQueue = new BulkQueueManager();
