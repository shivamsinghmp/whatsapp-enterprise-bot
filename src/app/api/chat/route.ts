import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId;

  const [outboundRaw, inboundRaw] = await Promise.all([
    prisma.messageLog.findMany({
      where: { userId },
      select: { toPhone: true },
      distinct: ["toPhone"],
    }),
    prisma.webhookEvent.findMany({
      where: { userId },
      select: { fromPhone: true },
      distinct: ["fromPhone"],
    }),
  ]);

  const phones = Array.from(
    new Set([
      ...outboundRaw.map((r) => r.toPhone),
      ...inboundRaw.map((r) => r.fromPhone),
    ])
  );

  const conversations = await Promise.all(
    phones.map(async (phone) => {
      const [lastOut, lastIn, contact] = await Promise.all([
        prisma.messageLog.findFirst({
          where: { userId, toPhone: phone },
          orderBy: { sentAt: "desc" },
          select: { messageBody: true, messageType: true, sentAt: true },
        }),
        prisma.webhookEvent.findFirst({
          where: { userId, fromPhone: phone },
          orderBy: { receivedAt: "desc" },
          select: { payload: true, receivedAt: true },
        }),
        prisma.contact.findFirst({
          where: { userId, phone },
          select: { name: true },
        }),
      ]);

      let inboundText: string | null = null;
      if (lastIn) {
        const p = lastIn.payload as Record<string, unknown>;
        const msgs = (p?.messages as Array<Record<string, unknown>>) ?? [];
        const msg = msgs[0];
        const textObj = msg?.text as Record<string, unknown> | undefined;
        inboundText =
          (textObj?.body as string) ?? `[${(msg?.type as string) ?? "media"}]`;
      }

      const outTime = lastOut?.sentAt ?? null;
      const inTime = lastIn?.receivedAt ?? null;
      const useInbound = inTime && (!outTime || inTime > outTime);

      return {
        phone,
        name: contact?.name ?? null,
        lastMessage: useInbound
          ? inboundText
          : (lastOut?.messageBody ?? `[${lastOut?.messageType}]`),
        lastMessageAt: useInbound
          ? inTime?.toISOString()
          : outTime?.toISOString() ?? null,
        lastDirection: useInbound ? "inbound" : "outbound",
      };
    })
  );

  conversations.sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ conversations });
}
