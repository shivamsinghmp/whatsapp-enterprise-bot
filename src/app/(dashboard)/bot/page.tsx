"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Bot, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Topbar } from "@/components/layout/Topbar";
import { BotRuleCard } from "@/components/bot/BotRuleCard";
import { BotRuleForm } from "@/components/bot/BotRuleForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/store/app.store";
import type { BotRule } from "@/types";

export default function BotPage() {
  const { setSidebarOpen } = useAppStore();
  const [rules, setRules] = useState<BotRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BotRule | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot-rules");
      const data = await res.json();
      setRules(data.rules ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/bot-rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive } : r))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/bot-rules/${id}`, { method: "DELETE" });
    toast.success("Rule deleted");
    load();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setRules((prev) => {
      const oldIdx = prev.findIndex((r) => r.id === active.id);
      const newIdx = prev.findIndex((r) => r.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);

      fetch("/api/bot-rules/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((r) => r.id) }),
      }).catch(() => toast.error("Failed to save order"));

      return reordered;
    });
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Bot & Auto-Reply"
        description="Keyword-triggered automated responses"
        onMenuClick={() => setSidebarOpen(true)}
        action={
          <Button
            size="sm"
            className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
            onClick={() => {
              setEditTarget(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        }
      />

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4 lg:p-6">
          {/* Rules list */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No bot rules yet"
              description="Add keyword rules to auto-reply to incoming messages."
              actionLabel="Add first rule"
              onAction={() => setFormOpen(true)}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rules.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <BotRuleCard
                      key={rule.id}
                      rule={rule}
                      onToggle={handleToggle}
                      onEdit={(r) => {
                        setEditTarget(r as BotRule);
                        setFormOpen(true);
                      }}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Webhook info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4 text-[#25D366]" />
                Webhook Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Webhook URL
                </p>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <code className="flex-1 truncate text-xs font-mono">
                    {webhookUrl || "Loading…"}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={copyWebhookUrl}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Required Meta subscriptions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "messages",
                    "message_deliveries",
                    "message_reads",
                    "messaging_postbacks",
                  ].map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="font-mono text-xs"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Set your verify token in{" "}
                <span className="font-medium text-foreground">
                  Settings → Webhook
                </span>
                . Paste the webhook URL and verify token into your Meta
                developer app.
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <BotRuleForm
        rule={editTarget ?? undefined}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSuccess={load}
      />
    </div>
  );
}
