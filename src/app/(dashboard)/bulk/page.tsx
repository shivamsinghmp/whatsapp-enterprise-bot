"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Topbar } from "@/components/layout/Topbar";
import { CampaignForm } from "@/components/bulk/CampaignForm";
import { CampaignTable } from "@/components/bulk/CampaignTable";
import { BulkProgress } from "@/components/bulk/BulkProgress";
import { useAppStore } from "@/store/app.store";
import { useRouter } from "next/navigation";
import type { Campaign } from "@/types";

export default function BulkPage() {
  const router = useRouter();
  const { setSidebarOpen, activeCampaignId, setActiveCampaignId } =
    useAppStore();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns?limit=50");
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const runningSorted = campaigns.filter((c) =>
    ["RUNNING", "PAUSED"].includes(c.status)
  );

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Bulk Campaigns"
        description="Send messages to thousands of contacts at once"
        onMenuClick={() => setSidebarOpen(true)}
        action={
          <Button
            size="sm"
            className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        }
      />

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4 lg:p-6">
          {/* Live progress cards for running campaigns */}
          {runningSorted.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Live Campaigns
              </p>
              {runningSorted.map((c) => (
                <BulkProgress
                  key={c.id}
                  campaignId={c.id}
                  campaignName={c.name}
                  onComplete={loadCampaigns}
                />
              ))}
            </div>
          )}

          {/* All campaigns table */}
          <CampaignTable
            campaigns={campaigns}
            onView={(id) => router.push(`/bulk/${id}`)}
            onRefresh={loadCampaigns}
          />
        </div>
      </ScrollArea>

      {/* New campaign dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Bulk Campaign</DialogTitle>
          </DialogHeader>
          <CampaignForm
            onSuccess={(c) => {
              setFormOpen(false);
              setActiveCampaignId(c.id);
              loadCampaigns();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
