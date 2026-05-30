"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Topbar } from "@/components/layout/Topbar";
import { BulkProgress } from "@/components/bulk/BulkProgress";
import { LogsTable } from "@/components/logs/LogsTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppStore } from "@/store/app.store";
import { formatDate, calcDeliveryRate } from "@/lib/utils";
import type { Campaign, MessageLog } from "@/types";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setSidebarOpen } = useAppStore();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logPages, setLogPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadCampaign = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setCampaign(data.campaign);
    }
  }, [params.id]);

  const loadLogs = useCallback(
    async (page = 1) => {
      const res = await fetch(
        `/api/logs?campaignId=${params.id}&page=${page}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
        setLogTotal(data.total ?? 0);
        setLogPages(data.pages ?? 1);
        setLogPage(page);
      }
    },
    [params.id]
  );

  useEffect(() => {
    Promise.all([loadCampaign(), loadLogs()]).finally(() =>
      setLoading(false)
    );
  }, [loadCampaign, loadLogs]);

  const isLive =
    campaign?.status === "RUNNING" || campaign?.status === "PAUSED";

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title={campaign?.name ?? "Campaign Detail"}
        description={campaign ? `Created ${formatDate(campaign.createdAt)}` : ""}
        onMenuClick={() => setSidebarOpen(true)}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/bulk")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4 lg:p-6">
          {/* Campaign info card */}
          {campaign && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{campaign.name}</CardTitle>
                  <StatusBadge status={campaign.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="font-semibold">
                        {campaign.totalRecipients.toLocaleString()}
                      </span>{" "}
                      recipients
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCheck className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="font-semibold">
                        {calcDeliveryRate(
                          campaign.sentCount,
                          campaign.deliveredCount
                        )}
                      </span>{" "}
                      delivery rate
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {(campaign.delayMs / 1000).toFixed(1)}s delay
                    </span>
                  </div>
                  {campaign.startedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Started {formatDate(campaign.startedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live SSE progress */}
          {isLive && (
            <BulkProgress
              campaignId={params.id}
              campaignName={campaign?.name}
              onComplete={() => {
                loadCampaign();
                loadLogs();
              }}
            />
          )}

          {/* Logs */}
          <div>
            <p className="mb-3 text-sm font-semibold">
              Message Logs ({logTotal.toLocaleString()})
            </p>
            <LogsTable
              logs={logs}
              total={logTotal}
              page={logPage}
              pages={logPages}
              onPageChange={(p) => loadLogs(p)}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
