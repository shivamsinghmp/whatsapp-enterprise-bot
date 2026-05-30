"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title: string;
  description?: string;
  sentToday?: number;
  action?: React.ReactNode;
  onMenuClick?: () => void;
  className?: string;
}

export function Topbar({
  title,
  description,
  sentToday,
  action,
  onMenuClick,
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6",
        className
      )}
    >
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Title block */}
      <div className="flex-1 min-w-0">
        <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
        {description && (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-3">
        {sentToday !== undefined && (
          <Badge
            variant="secondary"
            className="hidden sm:flex gap-1.5 items-center bg-[#25D366]/10 text-[#25D366] border-0"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
            Sent today: {sentToday.toLocaleString()}
          </Badge>
        )}
        {action}
      </div>
    </header>
  );
}
