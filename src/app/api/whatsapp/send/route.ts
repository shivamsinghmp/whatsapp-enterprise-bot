import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encrypt";
import { WhatsAppClient } from "@/lib/whatsapp";
import { SendMessageSchema } from "@/lib/validations";

// ── In-memory rate limiter: 10 req / minute per user ────────────────────────

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateMap = new Map<string, RateEntry>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  if (entry.count >= 10) return true;

  entry.count++;
  return false;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRateLimited(session.user.userId)) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded — max 10 messages per minute" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = await req.json();
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const config = await prisma.wAConfig.findUnique({
    where: { userId: session.user.userId },
  });

  if (!config || !config.isActive) {
    return NextResponse.json(
      { ok: false, error: "WhatsApp configuration not found or inactive" },
      { status: 404 }
    );
  }

  const accessToken = decrypt(config.accessToken);
  const client = new WhatsAppClient(
    config.phoneNumberId,
    accessToken,
    config.apiVersion
  );

  const {
    to,
    type,
    body: msgBody,
    mediaUrl,
    templateName,
    languageCode,
    variables,
  } = parsed.data;

  let response;
  switch (type) {
    case "TEXT":
      if (!msgBody) {
        return NextResponse.json(
          { ok: false, error: "body is required for TEXT messages" },
          { status: 400 }
        );
      }
      response = await client.sendText(to, msgBody);
      break;

    case "TEMPLATE":
      if (!templateName) {
        return NextResponse.json(
          { ok: false, error: "templateName is required for TEMPLATE messages" },
          { status: 400 }
        );
      }
      response = await client.sendTemplate(
        to,
        templateName,
        languageCode ?? "en_US",
        variables ?? []
      );
      break;

    case "IMAGE":
      if (!mediaUrl) {
        return NextResponse.json(
          { ok: false, error: "mediaUrl is required for IMAGE messages" },
          { status: 400 }
        );
      }
      response = await client.sendImage(to, mediaUrl);
      break;

    case "DOCUMENT":
      if (!mediaUrl) {
        return NextResponse.json(
          { ok: false, error: "mediaUrl is required for DOCUMENT messages" },
          { status: 400 }
        );
      }
      response = await client.sendDocument(to, mediaUrl, "document");
      break;
  }

  try {
    await prisma.messageLog.create({
      data: {
        userId: session.user.userId,
        toPhone: to,
        messageType: type,
        messageBody: msgBody ?? null,
        status: response.ok ? "SENT" : "FAILED",
        wamid: response.wamid ?? null,
        errorMessage: response.error ?? null,
        errorCode: response.code !== undefined ? String(response.code) : null,
        sentAt: new Date(),
      },
    });
  } catch (dbErr) {
    console.error("[send] Failed to persist message log:", dbErr);
  }

  return NextResponse.json(response, { status: response.ok ? 200 : 502 });
}
