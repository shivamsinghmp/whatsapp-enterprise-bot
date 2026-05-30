import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { MessageStatus, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "50")));
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

  const [logs, total] = await Promise.all([
    prisma.messageLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.messageLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    total,
    pages: Math.ceil(total / limit),
    page,
  });
}
