import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

const UpdateContactSchema = z.object({
  name: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
  optedOut: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.contact.findFirst({
    where: { id: params.id, userId: session.user.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ contact });
}

export async function DELETE(
  _req: Request,
  { params }: RouteContext
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.contact.findFirst({
    where: { id: params.id, userId: session.user.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await prisma.contact.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
