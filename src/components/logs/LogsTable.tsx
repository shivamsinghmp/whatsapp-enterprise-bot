"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessageLog {
  id: string;
  toPhone: string;
  toName?: string | null;
  messageType: string;
  messageBody?: string | null;
  status: string;
  wamid?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  sentAt: string | Date;
  deliveredAt?: string | Date | null;
  readAt?: string | Date | null;
}

interface LogsTableProps {
  logs: MessageLog[];
  total: number;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

const TYPE_COLORS: Record<string, string> = {
  TEXT: "bg-blue-100 text-blue-700",
  TEMPLATE: "bg-violet-100 text-violet-700",
  IMAGE: "bg-pink-100 text-pink-700",
  DOCUMENT: "bg-orange-100 text-orange-700",
};

function DeliveryTimeline({ log }: { log: MessageLog }) {
  const steps = [
    { label: "Sent", time: log.sentAt, done: true },
    { label: "Delivered", time: log.deliveredAt, done: !!log.deliveredAt },
    { label: "Read", time: log.readAt, done: !!log.readAt },
  ];

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full border-2",
                step.done
                  ? "border-[#25D366] bg-[#25D366]"
                  : "border-muted-foreground/30 bg-background"
              )}
            />
            <p className={cn("mt-0.5 text-[10px]", step.done ? "text-foreground" : "text-muted-foreground/40")}>
              {step.label}
            </p>
            {step.time && (
              <p className="text-[9px] text-muted-foreground">
                {format(new Date(step.time), "HH:mm")}
              </p>
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mb-4 h-0.5 w-10",
                steps[i + 1].done ? "bg-[#25D366]" : "bg-muted-foreground/20"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandedRow({ log }: { log: MessageLog }) {
  return (
    <div className="bg-muted/20 p-4 space-y-3">
      <DeliveryTimeline log={log} />
      {log.messageBody && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
          <p className="text-sm bg-background rounded-lg border p-3 whitespace-pre-wrap">
            {log.messageBody}
          </p>
        </div>
      )}
      {log.wamid && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">WAMID:</p>
          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{log.wamid}</code>
        </div>
      )}
      {log.errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-3">
          <p className="text-xs font-medium text-red-600">
            Error {log.errorCode && `(${log.errorCode})`}
          </p>
          <p className="text-xs text-red-500 mt-0.5">{log.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

export function LogsTable({ logs, total, page, pages, onPageChange }: LogsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const columns: ColumnDef<MessageLog>[] = [
    {
      id: "expand",
      cell: ({ row }) => (
        <button
          onClick={() => toggleRow(row.original.id)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {expandedRows.has(row.original.id) ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      ),
    },
    {
      accessorKey: "sentAt",
      header: "Time",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(row.original.sentAt)}
        </span>
      ),
    },
    {
      accessorKey: "toPhone",
      header: "To",
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-sm">{row.original.toPhone}</p>
          {row.original.toName && (
            <p className="text-xs text-muted-foreground">{row.original.toName}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "messageType",
      header: "Type",
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={cn(
            "border-0 text-xs",
            TYPE_COLORS[row.original.messageType] ?? ""
          )}
        >
          {row.original.messageType}
        </Badge>
      ),
    },
    {
      id: "preview",
      header: "Preview",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
          {row.original.messageBody
            ? row.original.messageBody.slice(0, 60) +
              (row.original.messageBody.length > 60 ? "…" : "")
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status as never} size="sm" />
      ),
    },
  ];

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: pages,
  });

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No logs found"
        description="Sent messages will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <>
                <TableRow
                  key={log.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => toggleRow(log.id)}
                >
                  {table.getRowModel().rows.find((r) => r.original.id === log.id)
                    ?.getVisibleCells()
                    .map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                </TableRow>
                {expandedRows.has(log.id) && (
                  <TableRow key={`${log.id}-expanded`}>
                    <TableCell colSpan={columns.length} className="p-0">
                      <ExpandedRow log={log} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
        <span>{total.toLocaleString()} total logs</span>
        <div className="flex items-center gap-1">
          <span className="text-xs">Page {page} / {pages}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
