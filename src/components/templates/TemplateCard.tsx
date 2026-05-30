"use client";

import { useState } from "react";
import { Send, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  headerText?: string | null;
  footerText?: string | null;
  variableCount: number;
  isApproved: boolean;
}

interface TemplateCardProps {
  template: MessageTemplate;
  onSend?: (template: MessageTemplate) => void;
  onEdit?: (template: MessageTemplate) => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  TRANSACTIONAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  AUTH: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  UTILITY: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export function TemplateCard({ template, onSend, onEdit, onDelete }: TemplateCardProps) {
  const [expanded, setExpanded] = useState(false);

  const preview =
    template.body.length > 120 && !expanded
      ? template.body.slice(0, 120) + "…"
      : template.body;

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="font-mono text-sm font-semibold truncate">
                {template.name}
              </span>
              <Badge
                variant="secondary"
                className={cn("border-0 text-xs", CATEGORY_COLORS[template.category] ?? "")}
              >
                {template.category}
              </Badge>
              <Badge variant="outline" className="text-xs font-normal">
                {template.language}
              </Badge>
            </div>

            {/* Approval status */}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex h-1.5 w-1.5 rounded-full",
                  template.isApproved ? "bg-green-500" : "bg-yellow-500"
                )}
              />
              <span className="text-xs text-muted-foreground">
                {template.isApproved ? "Approved" : "Pending approval"}
              </span>
              {template.variableCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 px-1.5 py-0 text-[10px] border-0"
                >
                  {template.variableCount} var
                  {template.variableCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onSend && (
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs"
                onClick={() => onSend(template)}
              >
                <Send className="h-3 w-3" />
                Send
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(template)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-600"
                onClick={() => onDelete(template.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Header text */}
        {template.headerText && (
          <p className="mt-2.5 text-xs font-semibold text-foreground/70 uppercase tracking-wide">
            {template.headerText}
          </p>
        )}

        {/* Body */}
        <p className="mt-1.5 text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
          {preview}
        </p>
        {template.body.length > 120 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show more
              </>
            )}
          </button>
        )}

        {/* Footer text */}
        {template.footerText && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            {template.footerText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
