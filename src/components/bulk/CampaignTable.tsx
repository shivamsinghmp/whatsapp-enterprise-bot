"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Square,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";
import { formatDate, calcDeliveryRate } from "@/lib/utils";
import { Zap } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string | Date;
  template?: { name: string } | null;
}

interface CampaignTableProps {
  campaigns: Campaign[];
  onView?: (id: string) => void;
  onRefresh?: () => void;
}

export function CampaignTable({ campaigns, onView, onRefresh }: CampaignTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const columns: ColumnDef<Campaign>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          {column.getIsSorted() === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown className="h-3 w-3" />
          ) : null}
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.template && (
            <p className="text-xs text-muted-foreground font-mono">
              {row.original.template.name}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status as never} />
      ),
    },
    {
      accessorKey: "totalRecipients",
      header: "Recipients",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.totalRecipients.toLocaleString()}
        </span>
      ),
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => {
        const { sentCount, totalRecipients } = row.original;
        const pct =
          totalRecipients > 0
            ? Math.round((sentCount / totalRecipients) * 100)
            : 0;
        return (
          <div className="w-28">
            <div className="mb-0.5 flex justify-between text-xs text-muted-foreground">
              <span>{pct}%</span>
              <span>{sentCount.toLocaleString()}</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        );
      },
    },
    {
      id: "deliveryRate",
      header: "Delivery",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium">
          {calcDeliveryRate(row.original.sentCount, row.original.deliveredCount)}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          {column.getIsSorted() === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown className="h-3 w-3" />
          ) : null}
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const camp = row.original;
        const canDelete = ["DRAFT", "COMPLETED", "FAILED"].includes(camp.status);
        const isRunning = camp.status === "RUNNING" || camp.status === "PAUSED";

        return (
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onView?.(camp.id)}
              title="View campaign"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {isRunning && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-orange-500 hover:text-orange-600"
                onClick={async () => {
                  await fetch(`/api/campaigns/${camp.id}/stop`, { method: "POST" });
                  toast.info("Campaign stopped");
                  onRefresh?.();
                }}
                title="Stop campaign"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-600"
                onClick={async () => {
                  if (!confirm("Delete this campaign?")) return;
                  await fetch(`/api/campaigns/${camp.id}`, { method: "DELETE" });
                  toast.success("Campaign deleted");
                  onRefresh?.();
                }}
                title="Delete campaign"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: campaigns,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="No campaigns yet"
        description="Create your first bulk campaign to get started."
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
                  <TableHead key={header.id} className="text-xs font-medium text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
