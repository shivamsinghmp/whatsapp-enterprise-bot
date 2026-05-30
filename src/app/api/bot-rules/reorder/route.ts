import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { orderedIds } = parsed.data;

  // Verify ownership of every rule in one query
  const owned = await prisma.botRule.findMany({
    where: { id: { in: orderedIds }, userId: session.user.userId },
    select: { id: true },
  });

  if (owned.length !== orderedIds.length) {
    return NextResponse.json(
      { error: "One or more rule IDs are invalid or do not belong to you" },
      { status: 400 }
    );
  }

  // Update priorities atomically
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.botRule.update({
        where: { id },
        data: { priority: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
