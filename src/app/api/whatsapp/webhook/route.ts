import { createHmac, timingSafeEqual } from "crypto";
import type { BotAction, MatchType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encrypt";
import { WhatsAppClient } from "@/lib/whatsapp";

// ── Webhook types ─────────────────────────────────────────────────────────────

interface WAMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string };
  document?: { id: string; filename: string };
}

interface WAStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message?: string }>;
}

interface WAContact {
  profile: { name: string };
  wa_id: string;
}

interface WAChangeValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: WAContact[];
  messages?: WAMessage[];
  statuses?: WAStatus[];
}

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{ value: WAChangeValue; field: string }>;
  }>;
}

// ── GET: Hub verification ─────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token) {
    return new Response("Bad Request", { status: 400 });
  }

  const waConfig = await prisma.wAConfig.findFirst({
    where: { webhookVerifyToken: token, isActive: true },
  });

  if (!waConfig) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge ?? "", { status: 200 });
}

// ── POST: Event processing ────────────────────────────────────────────────────

export async function POST(req: Request) {
  const rawBody = await req.text();

  // HMAC-SHA256 signature verification — enforced when secret is configured.
  // Log a warning in production if the secret is missing so operators notice.
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret && process.env.NODE_ENV === "production") {
    console.warn(
      "[webhook] WHATSAPP_APP_SECRET is not set — webhook is unauthenticated"
    );
  }
  if (appSecret) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const expected = `sha256=${createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex")}`;

    let valid = false;
    try {
      valid =
        signature.length === expected.length &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      valid = false;
    }

    if (!valid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Respond 200 immediately; Meta retries if we don't acknowledge quickly
  processWebhook(payload).catch((err: Error) => {
    console.error("[webhook] Processing error:", err.message);
  });

  return new Response("OK", { status: 200 });
}

// ── Processing ────────────────────────────────────────────────────────────────

async function processWebhook(payload: WebhookPayload) {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const phoneNumberId = value.metadata.phone_number_id;

      const waConfig = await prisma.wAConfig.findFirst({
        where: { phoneNumberId, isActive: true },
      });

      if (!waConfig) continue;

      const userId = waConfig.userId;

      // ── Incoming messages ────────────────────────────────────────────────
      if (value.messages) {
        for (const message of value.messages) {
          const fromPhone = `+${message.from}`;
          const contactName = value.contacts?.find(
            (c) => c.wa_id === message.from
          )?.profile.name;

          const event = await prisma.webhookEvent.create({
            data: {
              userId,
              eventType: `message.${message.type}`,
              fromPhone,
              payload: value as object,
              processed: false,
            },
          });

          if (message.type === "text" && message.text?.body) {
            const inboundText = message.text.body.trim();

            await runBotRules(userId, fromPhone, inboundText, waConfig, contactName);

            // Mark only this specific event processed to avoid a race condition
            // where concurrent events from the same phone mark each other done.
            await prisma.webhookEvent.update({
              where: { id: event.id },
              data: { processed: true },
            });
          }
        }
      }

      // ── Delivery / read receipts ─────────────────────────────────────────
      if (value.statuses) {
        for (const s of value.statuses) {
          if (s.status === "delivered") {
            await prisma.messageLog.updateMany({
              where: { wamid: s.id, userId },
              data: { status: "DELIVERED", deliveredAt: new Date() },
            });
          } else if (s.status === "read") {
            await prisma.messageLog.updateMany({
              where: { wamid: s.id, userId },
              data: {
                status: "READ",
                deliveredAt: (await prisma.messageLog.findFirst({
                  where: { wamid: s.id, userId },
                  select: { deliveredAt: true },
                }))?.deliveredAt ?? new Date(),
                readAt: new Date(),
              },
            });
          } else if (s.status === "failed") {
            const err = s.errors?.[0];
            await prisma.messageLog.updateMany({
              where: { wamid: s.id, userId },
              data: {
                status: "FAILED",
                errorCode: err?.code !== undefined ? String(err.code) : null,
                errorMessage: err?.title ?? "Delivery failed",
              },
            });
          }
        }
      }
    }
  }
}

// ── Bot rule engine ───────────────────────────────────────────────────────────

async function runBotRules(
  userId: string,
  fromPhone: string,
  inboundText: string,
  waConfig: { phoneNumberId: string; accessToken: string; apiVersion: string },
  _contactName: string | undefined
) {
  const rules = await prisma.botRule.findMany({
    where: { userId, isActive: true },
    orderBy: { priority: "asc" },
    include: { template: true },
  });

  const normalised = inboundText.toLowerCase();

  const matched = rules.find((rule) => {
    const kw = rule.keyword.toLowerCase();
    switch (rule.matchType as MatchType) {
      case "EXACT":
        return normalised === kw;
      case "CONTAINS":
        return normalised.includes(kw);
      case "STARTS_WITH":
        return normalised.startsWith(kw);
      case "REGEX":
        // Guard against catastrophic backtracking (ReDoS): reject patterns
        // longer than 200 chars and truncate input to 500 chars before testing.
        if (rule.keyword.length > 200) return false;
        try {
          return new RegExp(rule.keyword, "i").test(
            inboundText.slice(0, 500)
          );
        } catch {
          return false;
        }
    }
  });

  if (!matched) return;

  let accessToken: string;
  try {
    accessToken = decrypt(waConfig.accessToken);
  } catch {
    console.error("[bot] Failed to decrypt access token");
    return;
  }

  const client = new WhatsAppClient(
    waConfig.phoneNumberId,
    accessToken,
    waConfig.apiVersion
  );

  let response;
  let replyType = "TEXT";

  switch (matched.action as BotAction) {
    case "REPLY_TEXT":
    case "ESCALATE":
    case "OOO":
      if (matched.replyText) {
        response = await client.sendText(fromPhone, matched.replyText);
      }
      break;

    case "SEND_TEMPLATE":
      if (matched.template) {
        replyType = "TEMPLATE";
        response = await client.sendTemplate(
          fromPhone,
          matched.template.name,
          matched.template.language,
          []
        );
      } else if (matched.replyText) {
        response = await client.sendText(fromPhone, matched.replyText);
      }
      break;
  }

  if (response) {
    await prisma.messageLog.create({
      data: {
        userId,
        toPhone: fromPhone,
        messageType: replyType,
        messageBody: matched.replyText ?? null,
        status: response.ok ? "SENT" : "FAILED",
        wamid: response.wamid ?? null,
        errorMessage: response.error ?? null,
        errorCode:
          response.code !== undefined ? String(response.code) : null,
        sentAt: new Date(),
      },
    });
  }
}
