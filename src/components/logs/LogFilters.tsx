"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const STATUSES = ["PENDING", "SENT", "DELIVERED", "READ", "FAILED"];
const TYPES = ["TEXT", "TEMPLATE", "IMAGE", "DOCUMENT"];

interface LogFiltersProps {
  onExport?: () => void;
}

export function LogFilters({ onExport }: LogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [messageType, setMessageType] = useState(searchParams.get("messageType") ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");

  const hasFilters = !!(phone || status || messageType || dateFrom || dateTo);

  function apply(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    const vals = {
      phone,
      status,
      messageType,
      dateFrom,
      dateTo,
      page: "1",
      ...overrides,
    };
    Object.entries(vals).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    setPhone("");
    setStatus("");
    setMessageType("");
    setDateFrom("");
    setDateTo("");
    router.push(pathname);
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (phone) params.set("phone", phone);
    if (status) params.set("status", status);
    if (messageType) params.set("messageType", messageType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/logs/export?${params.toString()}`, "_blank");
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Phone search */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Phone number</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply({ phone: e.currentTarget.value })}
              placeholder="Search phone…"
              className="pl-8 text-sm"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={status || "ALL"}
            onValueChange={(v) => {
              const val = v === "ALL" ? "" : v;
              setStatus(val);
              apply({ status: val });
            }}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message type */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Message type</Label>
          <Select
            value={messageType || "ALL"}
            onValueChange={(v) => {
              const val = v === "ALL" ? "" : v;
              setMessageType(val);
              apply({ messageType: val });
            }}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Date range</Label>
          <div className="flex gap-1.5">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                apply({ dateFrom: e.target.value });
              }}
              className="text-xs"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                apply({ dateTo: e.target.value });
              }}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-1.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
