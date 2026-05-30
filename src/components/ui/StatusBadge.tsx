"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MessageStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
type CampaignStatus = "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED";
type AnyStatus = MessageStatus | CampaignStatus;

interface StatusBadgeProps {
  status: AnyStatus;
  size?: "sm" | "default";
  className?: string;
}

const STATUS_CONFIG: Record<
  AnyStatus,
  { label: string; className: string }
> = {
  // Message statuses
  PENDING: { label: "Pending", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  DELIVERED: { label: "Delivered", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  READ: { label: "Read", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  // Campaign statuses
  DRAFT: { label: "Draft", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  RUNNING: { label: "Running", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  PAUSED: { label: "Paused", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
};

export function StatusBadge({ status, size = "default", className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600",
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-0 font-medium",
        config.className,
        size === "sm" && "px-1.5 py-0 text-xs",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
