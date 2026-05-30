import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { TemplateCategory } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encrypt";

type MetaComponent = {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: string;
  text?: string;
};

type MetaTemplate = {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: MetaComponent[];
};

function mapCategory(metaCat: string): TemplateCategory {
  switch (metaCat.toUpperCase()) {
    case "AUTHENTICATION": return "AUTH";
    case "UTILITY":        return "UTILITY";
    case "TRANSACTIONAL":  return "TRANSACTIONAL";
    default:               return "MARKETING";
  }
}

function countVars(text: string): number {
  const matches = text.match(/\{\{\d+\}\}/g) ?? [];
  const nums = matches.map((m) => parseInt(m.replace(/\D/g, ""), 10));
  return nums.length > 0 ? Math.max(...nums) : 0;
}

async function fetchAllMetaTemplates(
  wabaId: string,
  accessToken: string,
  apiVersion: string
): Promise<MetaTemplate[]> {
  const results: MetaTemplate[] = [];
  let url: string | null =
    `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates` +
    `?fields=id,name,status,category,language,components&limit=200`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data: {
      data?: MetaTemplate[];
      paging?: { next?: string };
      error?: { message: string };
    } = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message ?? `Meta API HTTP ${res.status}`);
    }

    results.push(...(data.data ?? []));
    url = data.paging?.next ?? null;
  }

  return results;
}

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
      { error: "WhatsApp not configured. Set up your credentials in Settings first." },
      { status: 400 }
    );
  }

  let metaTemplates: MetaTemplate[];
  try {
    const plainToken = decrypt(config.accessToken);
    metaTemplates = await fetchAllMetaTemplates(
      config.wabaId,
      plainToken,
      config.apiVersion
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch from Meta" },
      { status: 502 }
    );
  }

  const approved = metaTemplates.filter((t) => t.status === "APPROVED");

  let synced = 0;
  let skipped = 0;

  for (const mt of approved) {
    const bodyComp = mt.components.find((c) => c.type === "BODY");
    if (!bodyComp?.text) {
      skipped++;
      continue;
    }

    const headerComp = mt.components.find(
      (c) => c.type === "HEADER" && c.format === "TEXT"
    );
    const footerComp = mt.components.find((c) => c.type === "FOOTER");

    const bodyText   = bodyComp.text;
    const headerText = headerComp?.text ?? null;
    const footerText = footerComp?.text ?? null;
    const varCount   = countVars(bodyText);
    const category   = mapCategory(mt.category);

    // Try to find existing record by metaTemplateId first, then by name
    const existing = await prisma.messageTemplate.findFirst({
      where: {
        userId: session.user.userId,
        OR: [
          { metaTemplateId: mt.id },
          { name: mt.name },
        ],
      },
    });

    if (existing) {
      await prisma.messageTemplate.update({
        where: { id: existing.id },
        data: {
          metaTemplateId: mt.id,
          isApproved: true,
          category,
          language: mt.language,
          body: bodyText,
          headerText,
          footerText,
          variableCount: varCount,
        },
      });
    } else {
      await prisma.messageTemplate.create({
        data: {
          userId: session.user.userId,
          metaTemplateId: mt.id,
          name: mt.name,
          isApproved: true,
          category,
          language: mt.language,
          body: bodyText,
          headerText,
          footerText,
          variableCount: varCount,
        },
      });
    }
    synced++;
  }

  return NextResponse.json({ synced, skipped, total: approved.length });
}
