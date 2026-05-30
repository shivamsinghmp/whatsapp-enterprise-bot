import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encrypt";
import { maskToken } from "@/lib/utils";
import { ConfigSchema } from "@/lib/validations";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.wAConfig.findUnique({
    where: { userId: session.user.userId },
  });

  if (!config) {
    return NextResponse.json({ config: null });
  }

  const decrypted = decrypt(config.accessToken);

  return NextResponse.json({
    config: {
      ...config,
      accessToken: maskToken(decrypted),
    },
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const {
    accessToken: rawToken,
    phoneNumberId,
    wabaId,
    apiVersion,
    displayName,
    webhookVerifyToken,
  } = parsed.data;

  // If the token looks like a masked value (contains "..."), preserve the existing encrypted token
  let encryptedToken: string;
  if (rawToken.includes("...")) {
    const existing = await prisma.wAConfig.findUnique({
      where: { userId: session.user.userId },
      select: { accessToken: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "No existing config found — provide a full access token" },
        { status: 400 }
      );
    }
    encryptedToken = existing.accessToken;
  } else {
    encryptedToken = encrypt(rawToken);
  }

  const data: Prisma.WAConfigUncheckedCreateInput = {
    userId: session.user.userId,
    phoneNumberId,
    accessToken: encryptedToken,
    wabaId,
    apiVersion,
    displayName: displayName ?? null,
    webhookVerifyToken: webhookVerifyToken ?? null,
  };

  const config = await prisma.wAConfig.upsert({
    where: { userId: session.user.userId },
    update: {
      phoneNumberId,
      accessToken: encryptedToken,
      wabaId,
      apiVersion,
      displayName: displayName ?? null,
      webhookVerifyToken: webhookVerifyToken ?? null,
    },
    create: data,
  });

  return NextResponse.json({
    config: {
      ...config,
      accessToken: maskToken(rawToken.includes("...") ? rawToken : rawToken),
    },
  });
}
