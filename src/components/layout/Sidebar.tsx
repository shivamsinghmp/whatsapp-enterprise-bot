"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  MessageSquare,
  MessageCircle,
  Zap,
  FileText,
  Users,
  Activity,
  Bot,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    section: "Messaging",
    items: [
      { href: "/chat", icon: MessageCircle, label: "Chat" },
      { href: "/single", icon: MessageSquare, label: "Single Send" },
      { href: "/bulk", icon: Zap, label: "Bulk Campaigns" },
      { href: "/templates", icon: FileText, label: "Templates" },
    ],
  },
  {
    section: "Data",
    items: [
      { href: "/contacts", icon: Users, label: "Contacts" },
      { href: "/logs", icon: Activity, label: "Message Logs" },
    ],
  },
  {
    section: "System",
    items: [
      { href: "/bot", icon: Bot, label: "Bot Rules" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

// ── Item ──────────────────────────────────────────────────────────────────────

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  const inner = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[#25D366]/15 text-[#25D366] font-medium"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto rounded-full bg-[#25D366]/20 px-1.5 py-0.5 text-xs text-[#25D366]">
          {item.badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [phoneDisplay, setPhoneDisplay] = useState<string | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  // Fetch connected phone number from config
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setPhoneDisplay(d.config.displayName ?? d.config.phoneNumberId ?? null);
          setApiOk(d.config.isActive ?? false);
        } else {
          setApiOk(false);
        }
      })
      .catch(() => setApiOk(false));
  }, []);

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col bg-[#111827] transition-all duration-200",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-white/10 px-4 py-5",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]">
          <MessageSquare className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="truncate text-sm font-bold text-white leading-tight">WA Enterprise</p>
            <p className="truncate text-[10px] text-gray-500 leading-tight">Business API</p>
          </div>
        )}
      </div>

      {/* API status */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs">
          <span
            className={cn(
              "relative flex h-2 w-2 shrink-0",
              apiOk === null && "opacity-50"
            )}
          >
            {apiOk && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                apiOk === true
                  ? "bg-[#25D366]"
                  : apiOk === false
                  ? "bg-red-500"
                  : "bg-gray-600"
              )}
            />
          </span>
          <span className={cn("text-gray-500", apiOk && "text-gray-400")}>
            {apiOk === true ? "API Connected" : apiOk === false ? "Not Connected" : "Checking..."}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-none">
        {NAV.map((section) => (
          <div key={section.section} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                {section.section}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  active={pathname.startsWith(item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <Separator className="bg-white/10" />

      {/* Footer */}
      <div className={cn("space-y-1 p-2", collapsed && "flex flex-col items-center")}>
        {/* Phone number */}
        {!collapsed && phoneDisplay && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <span className="truncate text-xs text-gray-500">{phoneDisplay}</span>
          </div>
        )}

        {/* User + logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={cn(
                "w-full justify-start gap-2 text-gray-400 hover:bg-white/5 hover:text-red-400",
                collapsed && "justify-center px-2"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="truncate text-xs">
                  {session?.user?.name ?? "Logout"}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Logout</TooltipContent>}
        </Tooltip>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#111827] text-gray-400 hover:text-white transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
