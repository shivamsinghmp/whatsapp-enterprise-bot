import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotRuleSchema } from "@/lib/validations";

type RouteContext = { params: { id: string } };

const UpdateBotRuleSchema = BotRuleSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.botRule.findFirst({
    where: { id: params.id, userId: session.user.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Bot rule not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateBotRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Validate regex pattern if matchType is or stays REGEX
  const effectiveMatchType = parsed.data.matchType ?? existing.matchType;
  const effectiveKeyword = parsed.data.keyword ?? existing.keyword;
  if (effectiveMatchType === "REGEX") {
    try {
      new RegExp(effectiveKeyword);
    } catch {
      return NextResponse.json(
        { error: "keyword is not a valid regular expression" },
        { status: 400 }
      );
    }
  }

  const rule = await prisma.botRule.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ rule });
}

export async function DELETE(
  _req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.botRule.findFirst({
    where: { id: params.id, userId: session.user.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Bot rule not found" }, { status: 404 });
  }

  await prisma.botRule.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
