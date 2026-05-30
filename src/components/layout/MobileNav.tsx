"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  MessageSquare,
  Zap,
  FileText,
  Users,
  Activity,
  Bot,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NAV = [
  {
    section: "Messaging",
    items: [
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

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-72 bg-[#111827] p-0 text-white border-white/10">
        <SheetHeader className="border-b border-white/10 px-4 py-5">
          <SheetTitle className="flex items-center gap-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            WA Enterprise
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {NAV.map((section) => (
            <div key={section.section} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                {section.section}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-[#25D366]/15 text-[#25D366] font-medium"
                          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <Separator className="bg-white/10" />
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full justify-start gap-2 text-gray-400 hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
