import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateSchema } from "@/lib/validations";

type RouteContext = { params: { id: string } };

export async function GET(
  _req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.messageTemplate.findFirst({
    where: { id: params.id, userId: session.user.userId },
    include: {
      _count: { select: { campaigns: true, botRules: true } },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function PUT(
  req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.messageTemplate.findFirst({
    where: { id: params.id, userId: session.user.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = TemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const template = await prisma.messageTemplate.update({
    where: { id: params.id },
    // Editing a template invalidates Meta's approval — reset to pending
    data: { ...parsed.data, isApproved: false },
  });

  return NextResponse.json({ template });
}

export async function DELETE(
  _req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.messageTemplate.findFirst({
    where: { id: params.id, userId: session.user.userId },
    include: {
      campaigns: {
        where: { status: { in: ["RUNNING", "PAUSED"] } },
        select: { id: true, name: true },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (template.campaigns.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete template — it is used by active campaigns",
        campaigns: template.campaigns.map((c) => c.name),
      },
      { status: 409 }
    );
  }

  await prisma.messageTemplate.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
