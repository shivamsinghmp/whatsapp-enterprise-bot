import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkQueue } from "@/lib/bulk-queue";

type RouteContext = { params: { id: string } };

export async function POST(
  _req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: session.user.userId },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!["RUNNING", "PAUSED"].includes(campaign.status)) {
    return NextResponse.json(
      { error: `Campaign cannot be stopped — current status: ${campaign.status}` },
      { status: 409 }
    );
  }

  bulkQueue.stopCampaign(params.id);

  await prisma.campaign.update({
    where: { id: params.id },
    data: { status: "PAUSED" },
  });

  return NextResponse.json({ ok: true, status: "PAUSED" });
}
