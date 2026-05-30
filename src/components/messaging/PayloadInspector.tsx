"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PayloadInspectorProps {
  payload: object;
  className?: string;
}

export function PayloadInspector({ payload, className }: PayloadInspectorProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const json = JSON.stringify(payload, null, 2);

  function handleCopy() {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-zinc-950 text-zinc-100",
        className
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <span className="font-mono">API Payload Inspector</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-white/10">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="absolute right-2 top-2 h-7 gap-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
            <pre className="overflow-x-auto px-4 py-4 pt-10 text-xs leading-relaxed text-zinc-300">
              <code>{json}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
