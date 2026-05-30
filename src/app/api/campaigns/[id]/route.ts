import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: session.user.userId },
    include: {
      template: { select: { id: true, name: true, category: true } },
      _count: { select: { logs: true } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

export async function DELETE(
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

  const deletable: string[] = ["DRAFT", "COMPLETED", "FAILED"];
  if (!deletable.includes(campaign.status)) {
    return NextResponse.json(
      {
        error: `Cannot delete a campaign with status "${campaign.status}" — stop it first`,
      },
      { status: 409 }
    );
  }

  // Cascade deletes MessageLog rows via Prisma relation
  await prisma.campaign.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
