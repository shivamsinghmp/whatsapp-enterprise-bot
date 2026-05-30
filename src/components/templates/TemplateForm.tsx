"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { TemplateSchema, type TemplateInput } from "@/lib/validations";

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  headerText?: string | null;
  footerText?: string | null;
  variableCount: number;
  isApproved: boolean;
}

interface TemplateFormProps {
  template?: MessageTemplate;
  onSuccess?: (t: MessageTemplate) => void;
  onCancel?: () => void;
}

const VARIABLE_BUTTONS = ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}"];

function countVariables(body: string): number {
  const matches = body.match(/\{\{\d+\}\}/g) ?? [];
  const nums = matches.map((m) => parseInt(m.replace(/\D/g, ""), 10));
  return nums.length > 0 ? Math.max(...nums) : 0;
}

export function TemplateForm({ template, onSuccess, onCancel }: TemplateFormProps) {
  const isEdit = !!template;

  const form = useForm<TemplateInput>({
    resolver: zodResolver(TemplateSchema),
    defaultValues: {
      name: template?.name ?? "",
      category: (template?.category as TemplateInput["category"]) ?? "MARKETING",
      language: template?.language ?? "en_US",
      body: template?.body ?? "",
      headerText: template?.headerText ?? "",
      footerText: template?.footerText ?? "",
      variableCount: template?.variableCount ?? 0,
    },
  });

  const body = form.watch("body");
  const detectedVars = countVariables(body ?? "");

  // Auto-update variableCount when body changes
  useEffect(() => {
    form.setValue("variableCount", detectedVars);
  }, [detectedVars, form]);

  function insertVariable(v: string) {
    const current = form.getValues("body") ?? "";
    form.setValue("body", current + v);
  }

  async function onSubmit(values: TemplateInput) {
    const url = isEdit ? `/api/templates/${template.id}` : "/api/templates";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save template");
        return;
      }
      toast.success(isEdit ? "Template updated" : "Template created");
      onSuccess?.(data.template);
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Template name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="hello_world"
                    className="font-mono lowercase"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="TRANSACTIONAL">Transactional</SelectItem>
                      <SelectItem value="AUTH">Authentication</SelectItem>
                      <SelectItem value="UTILITY">Utility</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en_US">English (US)</SelectItem>
                      <SelectItem value="en_GB">English (GB)</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="pt_BR">Portuguese (BR)</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="headerText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Header <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="Order Confirmation" {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body</FormLabel>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {VARIABLE_BUTTONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="rounded border px-2 py-0.5 text-xs font-mono text-muted-foreground hover:border-[#25D366] hover:text-[#25D366] transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                  {detectedVars > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {detectedVars} variable{detectedVars !== 1 ? "s" : ""} detected
                    </Badge>
                  )}
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Hi {{1}}, your order #{{2}} has been confirmed."
                    rows={5}
                    className="resize-none font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="footerText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Footer <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="Reply STOP to unsubscribe" {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex gap-2 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
            >
              {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Live preview */}
      <div className="hidden lg:block">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Preview</p>
        <div className="rounded-xl border bg-[#E5DDD5] p-4 min-h-48">
          {form.watch("headerText") && (
            <p className="mb-1 text-xs font-bold text-gray-700 uppercase tracking-wide">
              {form.watch("headerText")}
            </p>
          )}
          <div
            className="ml-auto max-w-xs rounded-lg rounded-tr-none px-3 py-2 shadow-sm text-sm leading-relaxed whitespace-pre-line"
            style={{ background: "#DCF8C6" }}
          >
            {form.watch("body") || (
              <span className="text-gray-400 italic">Template body appears here…</span>
            )}
          </div>
          {form.watch("footerText") && (
            <p className="mt-1.5 text-xs italic text-gray-500 text-right">
              {form.watch("footerText")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
