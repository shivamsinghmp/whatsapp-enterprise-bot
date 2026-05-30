"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Topbar } from "@/components/layout/Topbar";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { SendTemplateDialog } from "@/components/templates/SendTemplateDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useAppStore } from "@/store/app.store";
import type { MessageTemplate } from "@/types";

export default function TemplatesPage() {
  const { setSidebarOpen } = useAppStore();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MessageTemplate | null>(null);
  const [sendTarget, setSendTarget] = useState<MessageTemplate | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/templates/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Sync failed");
        return;
      }
      toast.success(`Synced ${data.synced} template${data.synced !== 1 ? "s" : ""} from Meta`);
      load();
    } catch {
      toast.error("Network error");
    } finally {
      setSyncing(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      const res = await fetch(`/api/templates?${params}`);
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Cannot delete template");
    } else {
      toast.success("Template deleted");
      load();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Template Library"
        description="Manage your WhatsApp message templates"
        onMenuClick={() => setSidebarOpen(true)}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync from Meta"}
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Template
            </Button>
          </div>
        }
      />

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4 lg:p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-56"
            />
            <Select
              value={category || "ALL"}
              onValueChange={(v) => setCategory(v === "ALL" ? "" : v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="TRANSACTIONAL">Transactional</SelectItem>
                <SelectItem value="AUTH">Authentication</SelectItem>
                <SelectItem value="UTILITY">Utility</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonCard count={4} />
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No templates found"
              description="Create a template to send structured messages at scale."
              actionLabel="Add template"
              onAction={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onSend={(tpl) => setSendTarget(tpl as MessageTemplate)}
                  onEdit={(tpl) => {
                    setEditTarget(tpl as MessageTemplate);
                    setFormOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editTarget ?? undefined}
            onSuccess={() => {
              setFormOpen(false);
              load();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Send dialog */}
      <SendTemplateDialog
        template={sendTarget}
        open={!!sendTarget}
        onClose={() => setSendTarget(null)}
      />
    </div>
  );
}
