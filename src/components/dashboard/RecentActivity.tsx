"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Activity } from "lucide-react";

interface MessageLog {
  id: string;
  toPhone: string;
  toName?: string | null;
  messageType: string;
  status: string;
  sentAt: string | Date;
}

interface RecentActivityProps {
  recentLogs: MessageLog[];
}

function initials(phone: string, name?: string | null): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return phone.slice(-2);
}

const TYPE_COLORS: Record<string, string> = {
  TEXT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TEMPLATE: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  IMAGE: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  DOCUMENT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export function RecentActivity({ recentLogs }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {recentLogs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No messages yet"
            description="Sent messages will appear here."
            className="border-0 py-8"
          />
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-muted text-xs font-medium">
                    {initials(log.toPhone, log.toName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium font-mono">
                      {log.toName ?? log.toPhone}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {log.toName ? log.toPhone : null}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      className={`border-0 px-1.5 py-0 text-[10px] ${
                        TYPE_COLORS[log.messageType] ?? ""
                      }`}
                    >
                      {log.messageType}
                    </Badge>
                    <StatusBadge status={log.status as never} size="sm" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(log.sentAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
