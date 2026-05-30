"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotRuleSchema, type BotRuleInput } from "@/lib/validations";

const FULL_SCHEMA = BotRuleSchema.extend({
  isActive: z.boolean().default(true),
});
type FullBotRuleInput = z.infer<typeof FULL_SCHEMA>;

interface BotRule {
  id: string;
  keyword: string;
  matchType: string;
  action: string;
  replyText?: string | null;
  templateId?: string | null;
  isActive: boolean;
  priority: number;
}

interface Template {
  id: string;
  name: string;
}

interface BotRuleFormProps {
  rule?: BotRule;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BotRuleForm({ rule, open, onClose, onSuccess }: BotRuleFormProps) {
  const isEdit = !!rule;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [testInput, setTestInput] = useState("");

  const form = useForm<FullBotRuleInput>({
    resolver: zodResolver(FULL_SCHEMA),
    defaultValues: {
      keyword: rule?.keyword ?? "",
      matchType: (rule?.matchType as FullBotRuleInput["matchType"]) ?? "CONTAINS",
      action: (rule?.action as FullBotRuleInput["action"]) ?? "REPLY_TEXT",
      replyText: rule?.replyText ?? "",
      templateId: rule?.templateId ?? "",
      priority: rule?.priority ?? 0,
      isActive: rule?.isActive ?? true,
    },
  });

  const action = form.watch("action");
  const matchType = form.watch("matchType");
  const keyword = form.watch("keyword");

  // Fetch templates for SEND_TEMPLATE action
  useEffect(() => {
    if (action !== "SEND_TEMPLATE") return;
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
  }, [action]);

  // Test matching logic
  function testMatch(): string {
    if (!keyword || !testInput) return "";
    const kw = keyword.toLowerCase();
    const msg = testInput.trim().toLowerCase();

    switch (matchType) {
      case "EXACT": return msg === kw ? "✅ Would trigger" : "❌ No match";
      case "CONTAINS": return msg.includes(kw) ? "✅ Would trigger" : "❌ No match";
      case "STARTS_WITH": return msg.startsWith(kw) ? "✅ Would trigger" : "❌ No match";
      case "REGEX":
        try {
          return new RegExp(keyword, "i").test(testInput)
            ? "✅ Would trigger"
            : "❌ No match";
        } catch {
          return "⚠️ Invalid regex";
        }
      default: return "";
    }
  }

  const testResult = testMatch();

  async function onSubmit(values: FullBotRuleInput) {
    const url = isEdit ? `/api/bot-rules/${rule.id}` : "/api/bot-rules";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save rule");
        return;
      }
      toast.success(isEdit ? "Rule updated" : "Rule created");
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Bot Rule" : "New Bot Rule"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Keyword */}
            <FormField
              control={form.control}
              name="keyword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keyword / pattern</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={matchType === "REGEX" ? "^hello.+world$" : "hello"}
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Match type */}
            <FormField
              control={form.control}
              name="matchType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-2 gap-2"
                    >
                      {[
                        { value: "EXACT", label: "Exact" },
                        { value: "CONTAINS", label: "Contains" },
                        { value: "STARTS_WITH", label: "Starts with" },
                        { value: "REGEX", label: "Regex" },
                      ].map((opt) => (
                        <div
                          key={opt.value}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                            field.value === opt.value
                              ? "border-[#25D366] bg-[#25D366]/5"
                              : "border-border hover:border-muted-foreground"
                          }`}
                          onClick={() => field.onChange(opt.value)}
                        >
                          <RadioGroupItem value={opt.value} />
                          <span className="text-sm">{opt.label}</span>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Action */}
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-2 gap-2"
                    >
                      {[
                        { value: "REPLY_TEXT", label: "Reply Text" },
                        { value: "SEND_TEMPLATE", label: "Send Template" },
                        { value: "ESCALATE", label: "Escalate" },
                        { value: "OOO", label: "Out of Office" },
                      ].map((opt) => (
                        <div
                          key={opt.value}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                            field.value === opt.value
                              ? "border-[#25D366] bg-[#25D366]/5"
                              : "border-border hover:border-muted-foreground"
                          }`}
                          onClick={() => field.onChange(opt.value)}
                        >
                          <RadioGroupItem value={opt.value} />
                          <span className="text-sm">{opt.label}</span>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Conditional: Reply text */}
            {(action === "REPLY_TEXT" || action === "ESCALATE" || action === "OOO") && (
              <FormField
                control={form.control}
                name="replyText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Hi! How can I help you today?"
                        rows={3}
                        className="resize-none"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Conditional: Template selector */}
            {action === "SEND_TEMPLATE" && (
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="font-mono">
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Priority + Active */}
            <div className="flex items-center gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Priority (lower = higher)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 pt-1">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Test matcher */}
            <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                Test matcher
              </Label>
              <div className="flex gap-2">
                <Input
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Type a test message…"
                  className="text-sm"
                />
              </div>
              {testInput && keyword && (
                <p
                  className={`text-sm font-medium ${
                    testResult.startsWith("✅")
                      ? "text-green-600"
                      : testResult.startsWith("❌")
                      ? "text-red-500"
                      : "text-yellow-600"
                  }`}
                >
                  {testResult}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Update Rule" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
