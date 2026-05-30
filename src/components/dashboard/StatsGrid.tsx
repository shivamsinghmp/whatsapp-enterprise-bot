"use client";

import {
  MessageSquare,
  CheckCheck,
  Zap,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { cn } from "@/lib/utils";

interface TodayStats {
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: string;
}

interface StatsData {
  today: TodayStats;
  week: { sent: number; delivered: number };
  month: { sent: number };
  activeCampaigns: number;
  totalContacts: number;
}

interface StatsGridProps {
  stats?: StatsData;
  isLoading?: boolean;
}

function DeliveryRateColor(rate: string) {
  const num = parseFloat(rate);
  if (num >= 95) return "text-green-600 dark:text-green-400";
  if (num >= 85) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

interface StatCardProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  subtitle: string;
  trend?: "up" | "down" | "neutral";
  valueClassName?: string;
}

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  subtitle,
  trend,
  valueClassName,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBg)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tracking-tight", valueClassName)}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
          {trend === "neutral" && <Minus className="h-3 w-3" />}
          <span>{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard count={4} />
      </div>
    );
  }

  const deliveryRateNum = parseFloat(stats.today.deliveryRate);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={MessageSquare}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        iconColor="text-blue-600 dark:text-blue-400"
        label="Messages Today"
        value={stats.today.sent}
        subtitle={`${stats.today.failed > 0 ? `${stats.today.failed} failed · ` : ""}${stats.month.sent.toLocaleString()} this month`}
        trend={stats.today.sent > 0 ? "up" : "neutral"}
      />

      <StatCard
        icon={CheckCheck}
        iconBg={
          deliveryRateNum >= 95
            ? "bg-green-100 dark:bg-green-900/30"
            : deliveryRateNum >= 85
            ? "bg-yellow-100 dark:bg-yellow-900/30"
            : "bg-red-100 dark:bg-red-900/30"
        }
        iconColor={
          deliveryRateNum >= 95
            ? "text-green-600"
            : deliveryRateNum >= 85
            ? "text-yellow-600"
            : "text-red-600"
        }
        label="Delivery Rate"
        value={stats.today.deliveryRate}
        valueClassName={DeliveryRateColor(stats.today.deliveryRate)}
        subtitle={`${stats.today.delivered.toLocaleString()} delivered today`}
        trend={
          deliveryRateNum >= 95 ? "up" : deliveryRateNum >= 85 ? "neutral" : "down"
        }
      />

      <StatCard
        icon={Zap}
        iconBg="bg-violet-100 dark:bg-violet-900/30"
        iconColor="text-violet-600 dark:text-violet-400"
        label="Active Campaigns"
        value={stats.activeCampaigns}
        subtitle={`${stats.activeCampaigns} running now`}
        trend={stats.activeCampaigns > 0 ? "up" : "neutral"}
      />

      <StatCard
        icon={Users}
        iconBg="bg-orange-100 dark:bg-orange-900/30"
        iconColor="text-orange-600 dark:text-orange-400"
        label="Total Contacts"
        value={stats.totalContacts}
        subtitle="across all lists"
        trend="neutral"
      />
    </div>
  );
}
