"use client";

import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Pencil, Trash2, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface BotRule {
  id: string;
  keyword: string;
  matchType: string;
  action: string;
  replyText?: string | null;
  isActive: boolean;
  priority: number;
  template?: { id: string; name: string } | null;
}

interface BotRuleCardProps {
  rule: BotRule;
  onToggle?: (id: string, active: boolean) => void;
  onEdit?: (rule: BotRule) => void;
  onDelete?: (id: string) => void;
}

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  REPLY_TEXT: { label: "Reply Text", className: "bg-blue-100 text-blue-700" },
  SEND_TEMPLATE: { label: "Send Template", className: "bg-violet-100 text-violet-700" },
  ESCALATE: { label: "Escalate", className: "bg-orange-100 text-orange-700" },
  OOO: { label: "Out of Office", className: "bg-gray-100 text-gray-600" },
};

const MATCH_LABELS: Record<string, string> = {
  EXACT: "Exact",
  CONTAINS: "Contains",
  STARTS_WITH: "Starts with",
  REGEX: "Regex",
};

export function BotRuleCard({ rule, onToggle, onEdit, onDelete }: BotRuleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  const actionConfig = ACTION_CONFIG[rule.action] ?? {
    label: rule.action,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50 z-50")}>
      <Card
        className={cn(
          "transition-shadow",
          !rule.isActive && "opacity-60",
          isDragging && "shadow-lg"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* Priority badge */}
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
              {rule.priority + 1}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-semibold">
                  {rule.keyword}
                </code>
                <span className="text-xs text-muted-foreground">
                  {MATCH_LABELS[rule.matchType] ?? rule.matchType}
                </span>
                <span className="text-muted-foreground/40">→</span>
                <Badge
                  variant="secondary"
                  className={cn("border-0 text-xs", actionConfig.className)}
                >
                  {actionConfig.label}
                </Badge>
                {rule.template && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {rule.template.name}
                  </Badge>
                )}
              </div>

              {rule.replyText && (
                <p className="truncate text-xs text-muted-foreground">
                  &ldquo;{rule.replyText}&rdquo;
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex shrink-0 items-center gap-2">
              <Switch
                checked={rule.isActive}
                onCheckedChange={(v) => onToggle?.(rule.id, v)}
                aria-label={rule.isActive ? "Disable rule" : "Enable rule"}
              />
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(rule)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-600"
                  onClick={() => onDelete(rule.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
