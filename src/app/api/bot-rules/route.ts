import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotRuleSchema } from "@/lib/validations";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.botRule.findMany({
    where: { userId: session.user.userId },
    orderBy: { priority: "asc" },
    include: {
      template: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = BotRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // If REGEX, validate the pattern before saving
  if (parsed.data.matchType === "REGEX") {
    try {
      new RegExp(parsed.data.keyword);
    } catch {
      return NextResponse.json(
        { error: "keyword is not a valid regular expression" },
        { status: 400 }
      );
    }
  }

  const rule = await prisma.botRule.create({
    data: {
      userId: session.user.userId,
      ...parsed.data,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
