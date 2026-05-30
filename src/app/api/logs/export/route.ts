import { getServerSession } from "next-auth";
import type { MessageStatus, Prisma } from "@prisma/client";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as MessageStatus | null;
  const messageType = searchParams.get("messageType");
  const phone = searchParams.get("phone");
  const campaignId = searchParams.get("campaignId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Prisma.MessageLogWhereInput = {
    userId: session.user.userId,
    ...(status ? { status } : {}),
    ...(messageType ? { messageType } : {}),
    ...(phone ? { toPhone: { contains: phone } } : {}),
    ...(campaignId ? { campaignId } : {}),
    ...(dateFrom || dateTo
      ? {
          sentAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const logs = await prisma.messageLog.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 50_000,
  });

  const filename = `logs_${format(new Date(), "yyyy-MM-dd")}.csv`;

  const HEADERS = [
    "ID",
    "To Phone",
    "To Name",
    "Message Type",
    "Status",
    "WAMID",
    "Error Code",
    "Error Message",
    "Sent At",
    "Delivered At",
    "Read At",
    "Campaign ID",
  ];

  function esc(v: string | null | undefined): string {
    return `"${(v ?? "").replace(/"/g, '""')}"`;
  }

  const rows = logs.map((log) =>
    [
      esc(log.id),
      esc(log.toPhone),
      esc(log.toName),
      esc(log.messageType),
      esc(log.status),
      esc(log.wamid),
      esc(log.errorCode),
      esc(log.errorMessage),
      esc(log.sentAt.toISOString()),
      esc(log.deliveredAt?.toISOString()),
      esc(log.readAt?.toISOString()),
      esc(log.campaignId),
    ].join(",")
  );

  const csv = [HEADERS.join(","), ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
