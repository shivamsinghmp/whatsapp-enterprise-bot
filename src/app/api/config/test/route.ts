import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encrypt";
import { WhatsAppClient } from "@/lib/whatsapp";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.wAConfig.findUnique({
    where: { userId: session.user.userId },
  });

  if (!config) {
    return NextResponse.json(
      { ok: false, error: "No WhatsApp configuration found" },
      { status: 404 }
    );
  }

  if (!config.isActive) {
    return NextResponse.json(
      { ok: false, error: "WhatsApp configuration is marked inactive" },
      { status: 400 }
    );
  }

  let accessToken: string;
  try {
    accessToken = decrypt(config.accessToken);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to decrypt access token — re-save your config" },
      { status: 500 }
    );
  }

  const client = new WhatsAppClient(
    config.phoneNumberId,
    accessToken,
    config.apiVersion
  );

  const result = await client.testConnection();

  return NextResponse.json(result);
}
