import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encrypt";
import { WhatsAppClient } from "@/lib/whatsapp";

export async function GET(
  _req: Request,
  { params }: { params: { phone: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId;
  const phone = decodeURIComponent(params.phone);

  const [outbound, inbound, contact] = await Promise.all([
    prisma.messageLog.findMany({
      where: { userId, toPhone: phone },
      orderBy: { sentAt: "asc" },
    }),
    prisma.webhookEvent.findMany({
      where: {
        userId,
        fromPhone: phone,
        eventType: { startsWith: "message." },
      },
      orderBy: { receivedAt: "asc" },
    }),
    prisma.contact.findFirst({
      where: { userId, phone },
      select: { name: true },
    }),
  ]);

  const messages = [
    ...outbound.map((m) => ({
      id: m.id,
      direction: "outbound" as const,
      text: m.messageBody,
      messageType: m.messageType,
      status: m.status,
      timestamp: m.sentAt.toISOString(),
    })),
    ...inbound.map((e) => {
      const p = e.payload as Record<string, unknown>;
      const msgs = (p?.messages as Array<Record<string, unknown>>) ?? [];
      const msg = msgs.find((m) => `+${m.from as string}` === phone) ?? msgs[0];
      const textObj = msg?.text as Record<string, unknown> | undefined;
      return {
        id: e.id,
        direction: "inbound" as const,
        text: (textObj?.body as string) ?? null,
        messageType: (msg?.type as string) ?? "unknown",
        status: null as string | null,
        timestamp: e.receivedAt.toISOString(),
      };
    }),
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return NextResponse.json({ messages, contactName: contact?.name ?? null });
}

export async function POST(
  req: Request,
  { params }: { params: { phone: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId;
  const phone = decodeURIComponent(params.phone);

  const body = (await req.json()) as { text?: string };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const text = body.text.trim();

  const config = await prisma.wAConfig.findUnique({ where: { userId } });
  if (!config?.isActive) {
    return NextResponse.json(
      { error: "WhatsApp not configured or inactive" },
      { status: 404 }
    );
  }

  const client = new WhatsAppClient(
    config.phoneNumberId,
    decrypt(config.accessToken),
    config.apiVersion
  );

  const response = await client.sendText(phone, text);

  try {
    await prisma.messageLog.create({
      data: {
        userId,
        toPhone: phone,
        messageType: "TEXT",
        messageBody: text,
        status: response.ok ? "SENT" : "FAILED",
        wamid: response.wamid ?? null,
        errorMessage: response.error ?? null,
        errorCode: response.code !== undefined ? String(response.code) : null,
        sentAt: new Date(),
      },
    });
  } catch (dbErr) {
    console.error("[chat/send] Failed to persist message log:", dbErr);
  }

  return NextResponse.json(response, { status: response.ok ? 200 : 502 });
}
