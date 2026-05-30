import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkQueue } from "@/lib/bulk-queue";

type RouteContext = { params: { id: string } };

export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: session.user.userId },
  });

  if (!campaign) {
    return new Response("Campaign not found", { status: 404 });
  }

  const enc = new TextEncoder();
  let _controller: ReadableStreamDefaultController | undefined;

  const stream = new ReadableStream({
    start(controller) {
      _controller = controller;

      const job = bulkQueue.getJob(params.id);

      // Build initial state from live job or persisted DB values
      const initial = job
        ? {
            type: "state",
            sent: job.sent,
            ok: job.ok,
            failed: job.failed,
            total: job.total,
            status: job.status,
            recentLogs: job.recentLogs.slice(0, 5),
          }
        : {
            type: "state",
            sent: campaign.sentCount,
            ok: campaign.deliveredCount,
            failed: campaign.failedCount,
            total: campaign.totalRecipients,
            status: campaign.status.toLowerCase(),
            recentLogs: [],
          };

      controller.enqueue(enc.encode(`data: ${JSON.stringify(initial)}\n\n`));

      // If no active job, there will be no live events — close stream immediately
      if (!job || job.status === "completed" || job.status === "stopped") {
        controller.close();
        return;
      }

      bulkQueue.addSSEClient(params.id, controller);
    },

    cancel() {
      if (_controller) {
        bulkQueue.removeSSEClient(params.id, _controller);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
