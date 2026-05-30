import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { CampaignStatus, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BulkCampaignSchema } from "@/lib/validations";
import { bulkQueue } from "@/lib/bulk-queue";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const status = searchParams.get("status") as CampaignStatus | null;

  const where: Prisma.CampaignWhereInput = {
    userId: session.user.userId,
    ...(status ? { status } : {}),
  };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        template: { select: { name: true } },
        _count: { select: { logs: true } },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  return NextResponse.json({
    campaigns,
    total,
    pages: Math.ceil(total / limit),
    page,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify WAConfig exists before creating campaign
  const waConfig = await prisma.wAConfig.findUnique({
    where: { userId: session.user.userId },
    select: { id: true, isActive: true },
  });

  if (!waConfig || !waConfig.isActive) {
    return NextResponse.json(
      { error: "WhatsApp configuration not found or inactive" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = BulkCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, messageType, messageBody, templateId, phoneNumbers, delayMs } = parsed.data;

  const campaign = await prisma.campaign.create({
    data: {
      userId: session.user.userId,
      name,
      messageType,
      messageBody: messageBody ?? null,
      templateId: templateId ?? null,
      delayMs,
      totalRecipients: phoneNumbers.length,
      status: "DRAFT",
    },
  });

  await prisma.messageLog.createMany({
    data: phoneNumbers.map((phone) => ({
      userId: session.user.userId,
      campaignId: campaign.id,
      toPhone: phone,
      messageType,
      messageBody: messageBody ?? null,
      status: "PENDING" as const,
    })),
  });

  // Fire and forget — response returns immediately
  bulkQueue
    .startCampaign(campaign.id, session.user.userId)
    .catch((err: Error) => {
      console.error(`[campaign ${campaign.id}] failed:`, err.message);
    });

  return NextResponse.json({ campaign }, { status: 201 });
}
