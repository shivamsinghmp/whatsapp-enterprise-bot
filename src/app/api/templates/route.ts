import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma, TemplateCategory } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as TemplateCategory | null;
  const search = searchParams.get("search");

  const where: Prisma.MessageTemplateWhereInput = {
    userId: session.user.userId,
    ...(category ? { category } : {}),
    ...(search
      ? { name: { contains: search, mode: "insensitive" } }
      : {}),
  };

  const templates = await prisma.messageTemplate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { campaigns: true } } },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = TemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const template = await prisma.messageTemplate.create({
    data: {
      userId: session.user.userId,
      ...parsed.data,
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
