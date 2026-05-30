"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";

const E164 = /^\+[1-9]\d{7,14}$/;

interface ParsedRow {
  phone: string;
  name?: string;
  valid: boolean;
}

interface CSVImportProps {
  onSuccess?: (count: number) => void;
}

export function CSVImport({ onSuccess }: CSVImportProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [phoneCol, setPhoneCol] = useState<string>("");
  const [nameCol, setNameCol] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cols = result.meta.fields ?? [];
        setHeaders(cols);
        setRawRows(result.data);

        // Auto-detect phone column
        const auto = cols.find((c) =>
          ["phone", "mobile", "number", "tel", "telephone"].includes(c.toLowerCase())
        );
        setPhoneCol(auto ?? "");
        const autoName = cols.find((c) =>
          ["name", "full_name", "fullname", "contact_name"].includes(c.toLowerCase())
        );
        setNameCol(autoName ?? "");
      },
    });
  }, []);

  // Recompute parsed rows whenever column mapping changes
  const computeParsed = useCallback(() => {
    if (!phoneCol || rawRows.length === 0) {
      setParsed([]);
      return;
    }
    const rows = rawRows.map((row) => {
      const phone = formatPhone(row[phoneCol] ?? "");
      return {
        phone,
        name: nameCol ? row[nameCol]?.trim() || undefined : undefined,
        valid: E164.test(phone),
      };
    });
    setParsed(rows);
  }, [phoneCol, nameCol, rawRows]);

  // Run mapping whenever columns change
  const handlePhoneColChange = (col: string) => {
    setPhoneCol(col);
    setTimeout(computeParsed, 0);
  };

  const handleNameColChange = (col: string) => {
    setNameCol(col);
    setTimeout(computeParsed, 0);
  };

  // Also recompute when rawRows arrives
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const validRows = parsed.filter((r) => r.valid);
  const invalidRows = parsed.filter((r) => !r.valid);
  const uniquePhones = [...new Set(validRows.map((r) => r.phone))];
  const duplicates = validRows.length - uniquePhones.length;

  async function handleImport() {
    if (uniquePhones.length === 0) return;
    setImporting(true);
    try {
      const contacts = uniquePhones.map((phone) => {
        const row = validRows.find((r) => r.phone === phone);
        return { phone, name: row?.name };
      });

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }
      toast.success(`Imported ${data.created} contacts`, {
        description: `${data.skipped} skipped (duplicates)`,
      });
      onSuccess?.(data.created);
      // Reset
      setFileName(null);
      setHeaders([]);
      setRawRows([]);
      setParsed([]);
      setPhoneCol("");
      setNameCol("");
    } catch {
      toast.error("Network error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      {!fileName ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors",
            dragging
              ? "border-[#25D366] bg-[#25D366]/5"
              : "border-border hover:border-[#25D366]/50 hover:bg-muted/20"
          )}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">Drop your CSV here</p>
            <p className="text-sm text-muted-foreground">
              or click to browse — must have a phone number column
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parseFile(f);
            }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{fileName}</span>
            <span className="text-xs text-muted-foreground">
              {rawRows.length} rows
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFileName(null);
              setHeaders([]);
              setRawRows([]);
              setParsed([]);
            }}
          >
            Change
          </Button>
        </div>
      )}

      {/* Column mapping */}
      {headers.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Column mapping</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Phone column *</label>
              <Select value={phoneCol} onValueChange={handlePhoneColChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column…" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name column (optional)</label>
              <Select value={nameCol} onValueChange={handleNameColChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Skip name column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Skip —</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          {parsed.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-700 border-0">
                {validRows.length} valid
              </Badge>
              {duplicates > 0 && (
                <Badge className="bg-yellow-100 text-yellow-700 border-0">
                  {duplicates} duplicates
                </Badge>
              )}
              {invalidRows.length > 0 && (
                <Badge className="bg-red-100 text-red-700 border-0">
                  {invalidRows.length} invalid
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preview table */}
      {parsed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Preview (first 10 rows)
          </p>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Phone</TableHead>
                  {nameCol && <TableHead className="text-xs">Name</TableHead>}
                  <TableHead className="text-xs w-20">Valid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.slice(0, 10).map((row, i) => (
                  <TableRow key={i} className={cn(!row.valid && "bg-red-50 dark:bg-red-900/10")}>
                    <TableCell className="font-mono text-xs">{row.phone}</TableCell>
                    {nameCol && <TableCell className="text-xs">{row.name}</TableCell>}
                    <TableCell>
                      {row.valid ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Import button */}
      {uniquePhones.length > 0 && (
        <Button
          onClick={handleImport}
          disabled={importing}
          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {importing
            ? "Importing…"
            : `Import ${uniquePhones.length.toLocaleString()} Contacts`}
        </Button>
      )}
    </div>
  );
}
