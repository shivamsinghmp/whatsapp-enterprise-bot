import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subHours,
  format,
} from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.userId;
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const last24h = subHours(now, 24);

  const [
    todayGroups,
    weekSent,
    weekDelivered,
    monthSent,
    activeCampaigns,
    totalContacts,
    hourlyRaw,
    recentLogs,
    failReasonGroups,
  ] = await Promise.all([
    // Group today's logs by status
    prisma.messageLog.groupBy({
      by: ["status"],
      where: { userId, sentAt: { gte: todayStart } },
      _count: { _all: true },
    }),

    // Week: sent (any non-pending, non-failed status)
    prisma.messageLog.count({
      where: {
        userId,
        sentAt: { gte: weekStart },
        status: { in: ["SENT", "DELIVERED", "READ"] },
      },
    }),

    // Week: delivered or read
    prisma.messageLog.count({
      where: {
        userId,
        sentAt: { gte: weekStart },
        status: { in: ["DELIVERED", "READ"] },
      },
    }),

    // Month: successfully sent
    prisma.messageLog.count({
      where: {
        userId,
        sentAt: { gte: monthStart },
        status: { in: ["SENT", "DELIVERED", "READ"] },
      },
    }),

    // Active campaigns
    prisma.campaign.count({
      where: { userId, status: { in: ["RUNNING", "PAUSED"] } },
    }),

    // Total non-opted-out contacts
    prisma.contact.count({ where: { userId } }),

    // Timestamps for hourly bucketing (last 24h)
    prisma.messageLog.findMany({
      where: {
        userId,
        sentAt: { gte: last24h },
        status: { in: ["SENT", "DELIVERED", "READ"] },
      },
      select: { sentAt: true },
    }),

    // 5 most recent logs
    prisma.messageLog.findMany({
      where: { userId },
      orderBy: { sentAt: "desc" },
      take: 5,
    }),

    // Top failure reasons this month — aggregated in the DB, not in memory
    prisma.messageLog.groupBy({
      by: ["errorMessage"],
      where: {
        userId,
        status: "FAILED",
        errorMessage: { not: null },
        sentAt: { gte: monthStart },
      },
      _count: { _all: true },
      orderBy: { _count: { errorMessage: "desc" } },
      take: 5,
    }),
  ]);

  // ── Today's summary ────────────────────────────────────────────────────────
  const countByStatus = Object.fromEntries(
    todayGroups.map((g) => [g.status, g._count._all])
  );
  const todaySent =
    (countByStatus["SENT"] ?? 0) +
    (countByStatus["DELIVERED"] ?? 0) +
    (countByStatus["READ"] ?? 0);
  const todayDelivered =
    (countByStatus["DELIVERED"] ?? 0) + (countByStatus["READ"] ?? 0);
  const todayFailed = countByStatus["FAILED"] ?? 0;
  const todayDeliveryRate =
    todaySent > 0
      ? `${((todayDelivered / todaySent) * 100).toFixed(1)}%`
      : "0.0%";

  // ── Hourly buckets (oldest → newest) ──────────────────────────────────────
  const buckets = new Map<string, number>();
  for (let i = 23; i >= 0; i--) {
    buckets.set(format(subHours(now, i), "HH:00"), 0);
  }
  for (const { sentAt } of hourlyRaw) {
    const key = format(sentAt, "HH:00");
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }
  const hourlyData = Array.from(buckets.entries()).map(([hour, sent]) => ({
    hour,
    sent,
  }));

  // ── Top failure reasons (already grouped + ordered by the DB) ────────────────
  const topFailReasons = failReasonGroups.map((g) => ({
    reason: g.errorMessage ?? "Unknown error",
    count: g._count._all,
  }));

  return NextResponse.json({
    today: {
      sent: todaySent,
      delivered: todayDelivered,
      failed: todayFailed,
      deliveryRate: todayDeliveryRate,
    },
    week: {
      sent: weekSent,
      delivered: weekDelivered,
    },
    month: {
      sent: monthSent,
    },
    activeCampaigns,
    totalContacts,
    hourlyData,
    recentLogs,
    topFailReasons,
  });
}
