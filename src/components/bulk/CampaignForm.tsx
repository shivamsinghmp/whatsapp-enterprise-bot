"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload, AlertCircle, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn, formatPhone } from "@/lib/utils";

const E164 = /^\+[1-9]\d{7,14}$/;

const schema = z
  .object({
    name: z.string().min(1, "Name required").max(100),
    messageType: z.enum(["TEXT", "TEMPLATE"]),
    messageBody: z.string().max(4096).optional(),
    templateId: z.string().optional(),
    delayMs: z.number().min(500).max(10000).default(1200),
  })
  .superRefine((val, ctx) => {
    if (val.messageType === "TEXT" && !val.messageBody?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Message body is required",
        path: ["messageBody"],
      });
    }
    if (val.messageType === "TEMPLATE" && !val.templateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a template",
        path: ["templateId"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface CampaignFormProps {
  onSuccess?: (campaign: { id: string; name: string }) => void;
}

interface Template {
  id: string;
  name: string;
  category: string;
}

export function CampaignForm({ onSuccess }: CampaignFormProps) {
  const [loading, setLoading] = useState(false);
  const [recipientTab, setRecipientTab] = useState("paste");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [phones, setPhones] = useState<string[]>([]);
  const [csvDragging, setCsvDragging] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      messageType: "TEXT",
      messageBody: "",
      delayMs: 1200,
    },
  });

  const messageType = form.watch("messageType");
  const delayMs = form.watch("delayMs");

  useEffect(() => {
    if (messageType !== "TEMPLATE") return;
    setTemplatesLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [messageType]);

  function handlePasteChange(text: string) {
    setPastedText(text);
    const lines = text
      .split("\n")
      .map((l) => formatPhone(l.trim()))
      .filter((l) => l.length > 3);
    setPhones(lines);
  }

  const validPhones   = phones.filter((p) => E164.test(p));
  const invalidPhones = phones.filter((p) => !E164.test(p) && p.length > 3);
  const uniquePhones  = [...new Set(validPhones)];
  const duplicates    = validPhones.length - uniquePhones.length;

  const parseCsvFile = useCallback((file: File) => {
    setCsvFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        const parsed = result.data
          .map((row) =>
            formatPhone(row["phone"] ?? row["mobile"] ?? row["number"] ?? "")
          )
          .filter((p) => p.length > 3);
        setPhones(parsed);
        toast.success(`Parsed ${parsed.length} numbers from CSV`);
      },
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setCsvDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseCsvFile(file);
  }

  async function onSubmit(values: FormValues) {
    if (uniquePhones.length === 0) {
      toast.error("Add at least one valid phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          phoneNumbers: uniquePhones,
          messageBody: values.messageBody?.trim() || undefined,
          templateId: values.templateId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create campaign");
        return;
      }

      toast.success("Campaign started!", {
        description: `${uniquePhones.length} recipients queued`,
      });
      onSuccess?.(data.campaign);
      form.reset();
      setPhones([]);
      setPastedText("");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Campaign name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign name</FormLabel>
              <FormControl>
                <Input placeholder="Summer Promo – June 2025" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Recipients */}
        <div className="space-y-2">
          <Label>Recipients</Label>
          {uniquePhones.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className="bg-green-100 text-green-700 border-0">
                {uniquePhones.length.toLocaleString()} valid
              </Badge>
              {duplicates > 0 && (
                <Badge className="bg-yellow-100 text-yellow-700 border-0">
                  {duplicates} duplicates removed
                </Badge>
              )}
              {invalidPhones.length > 0 && (
                <Badge className="bg-red-100 text-red-700 border-0">
                  {invalidPhones.length} invalid
                </Badge>
              )}
            </div>
          )}

          <Tabs value={recipientTab} onValueChange={setRecipientTab}>
            <TabsList className="w-full">
              <TabsTrigger value="paste" className="flex-1">Paste Numbers</TabsTrigger>
              <TabsTrigger value="csv" className="flex-1">Upload CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="mt-3">
              <Textarea
                value={pastedText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={"+12015550101\n+447911123456\n+919876543210\n…"}
                rows={8}
                className="font-mono text-sm resize-none"
              />
              {invalidPhones.length > 0 && (
                <div className="mt-2 space-y-1">
                  {invalidPhones.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span className="font-mono">{p}</span>
                      <span>— invalid E.164</span>
                    </div>
                  ))}
                  {invalidPhones.length > 5 && (
                    <p className="text-xs text-red-400">
                      +{invalidPhones.length - 5} more invalid numbers
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="csv" className="mt-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setCsvDragging(true); }}
                onDragLeave={() => setCsvDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors",
                  csvDragging
                    ? "border-[#25D366] bg-[#25D366]/5"
                    : "border-border hover:border-[#25D366]/50 hover:bg-muted/30"
                )}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {csvFileName ? csvFileName : "Drop CSV file here"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Needs a "phone", "mobile", or "number" column
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) parseCsvFile(f);
                  }}
                />
              </div>

              {phones.length > 0 && (
                <div className="mt-3 rounded-lg border overflow-hidden text-xs">
                  <div className="bg-muted/50 px-3 py-2 font-medium">
                    Preview (first 5 of {phones.length})
                  </div>
                  <div className="divide-y">
                    {phones.slice(0, 5).map((p, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between px-3 py-1.5 font-mono",
                          !E164.test(p) && "bg-red-50 dark:bg-red-900/10 text-red-500"
                        )}
                      >
                        <span>{p}</span>
                        {!E164.test(p) && <AlertCircle className="h-3 w-3" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Message type */}
        <FormField
          control={form.control}
          name="messageType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="TEMPLATE">Template</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {messageType === "TEXT" && (
          <FormField
            control={form.control}
            name="messageBody"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message body</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Your message…"
                    rows={4}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {messageType === "TEMPLATE" && (
          <FormField
            control={form.control}
            name="templateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Template</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={templatesLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          templatesLoading
                            ? "Loading templates…"
                            : templates.length === 0
                            ? "No templates found — create one first"
                            : "Choose a template"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="font-medium">{t.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {t.category}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Advanced settings */}
        <Accordion type="single" collapsible>
          <AccordionItem value="advanced" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium py-3">
              Advanced settings
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <FormField
                control={form.control}
                name="delayMs"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Delay between messages</FormLabel>
                      <span className="text-sm font-medium tabular-nums">
                        {(delayMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <FormControl>
                      <Slider
                        min={500}
                        max={10000}
                        step={100}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                        className="mt-2"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      ~{uniquePhones.length > 0
                        ? Math.ceil((uniquePhones.length * delayMs) / 60000)
                        : 0}{" "}
                      min estimated
                    </p>
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button
          type="submit"
          disabled={loading || uniquePhones.length === 0}
          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Zap className="h-4 w-4" />}
          {loading
            ? "Creating…"
            : `Start Now (${uniquePhones.length.toLocaleString()} recipients)`}
        </Button>
      </form>
    </Form>
  );
}
