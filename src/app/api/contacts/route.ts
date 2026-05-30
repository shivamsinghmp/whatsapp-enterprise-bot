import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContactSchema } from "@/lib/validations";

const BulkImportSchema = z.object({
  contacts: z.array(ContactSchema).min(1).max(10_000),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));
  const search = searchParams.get("search");
  const tag = searchParams.get("tag");
  const optedOut = searchParams.get("optedOut");

  const where: Prisma.ContactWhereInput = {
    userId: session.user.userId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(optedOut !== null ? { optedOut: optedOut === "true" } : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({
    contacts,
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

  const body = await req.json();

  // ── Bulk import ────────────────────────────────────────────────────────────
  if (Array.isArray(body.contacts)) {
    const parsed = BulkImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const userId = session.user.userId;
    const { contacts } = parsed.data;

    const result = await prisma.contact.createMany({
      data: contacts.map((c) => ({
        userId,
        phone: c.phone,
        name: c.name ?? null,
        tags: c.tags ?? [],
      })),
      skipDuplicates: true,
    });

    return NextResponse.json(
      {
        created: result.count,
        skipped: contacts.length - result.count,
        errors: [],
      },
      { status: 201 }
    );
  }

  // ── Single contact ────────────────────────────────────────────────────────
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { phone, name, tags } = parsed.data;

  try {
    const contact = await prisma.contact.create({
      data: {
        userId: session.user.userId,
        phone,
        name: name ?? null,
        tags: tags ?? [],
      },
    });

    return NextResponse.json(
      { contact, created: 1, skipped: 0, errors: [] },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: `Contact with phone ${phone} already exists` },
      { status: 409 }
    );
  }
}
