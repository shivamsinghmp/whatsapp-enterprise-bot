"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Send, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { PhoneInput } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";

const FORM_SCHEMA = z.object({
  to: z.string().regex(/^\+[1-9]\d{7,14}$/, "Must be E.164 format"),
  recipientName: z.string().optional(),
  type: z.enum(["TEXT", "IMAGE", "DOCUMENT", "TEMPLATE"]),
  body: z.string().max(4096).optional(),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  caption: z.string().optional(),
  templateName: z.string().optional(),
  languageCode: z.string().optional(),
  variables: z.array(z.object({ value: z.string() })).optional(),
});

type FormValues = z.infer<typeof FORM_SCHEMA>;

const TYPE_PILLS = [
  { value: "TEXT", label: "Text" },
  { value: "TEMPLATE", label: "Template" },
  { value: "IMAGE", label: "Image" },
  { value: "DOCUMENT", label: "Document" },
] as const;

interface SingleMessageFormProps {
  onSent?: (log: { to: string; type: string; wamid?: string }) => void;
}

export function SingleMessageForm({ onSent }: SingleMessageFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: {
      to: "",
      type: "TEXT",
      body: "",
      mediaUrl: "",
      caption: "",
      templateName: "",
      languageCode: "en_US",
      variables: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variables",
  });

  const type = form.watch("type");
  const body = form.watch("body") ?? "";

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        to: values.to,
        type: values.type,
      };

      if (values.type === "TEXT") payload.body = values.body;
      if (values.type === "IMAGE" || values.type === "DOCUMENT") {
        payload.mediaUrl = values.mediaUrl;
        if (values.caption) payload.caption = values.caption;
      }
      if (values.type === "TEMPLATE") {
        payload.templateName = values.templateName;
        payload.languageCode = values.languageCode;
        payload.variables = values.variables?.map((v) => v.value) ?? [];
      }

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.ok) {
        toast.success("Message sent", { description: `WAMID: ${data.wamid}` });
        onSent?.({ to: values.to, type: values.type, wamid: data.wamid });
        form.reset();
      } else {
        toast.error("Send failed", { description: data.error });
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Recipient */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient phone</FormLabel>
                <FormControl>
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    error={!!form.formState.errors.to}
                    placeholder="9876543210"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recipientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name <span className="text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Type selector */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message type</FormLabel>
              <FormControl>
                <div className="flex gap-2 flex-wrap">
                  {TYPE_PILLS.map((pill) => (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => field.onChange(pill.value)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                        field.value === pill.value
                          ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366]"
                          : "border-border bg-background text-muted-foreground hover:border-[#25D366]/50"
                      )}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Conditional fields */}
        {type === "TEXT" && (
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Message</FormLabel>
                  <span
                    className={cn(
                      "text-xs",
                      body.length > 3800 ? "text-red-500" : "text-muted-foreground"
                    )}
                  >
                    {body.length} / 4096
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Type your message here…"
                    rows={5}
                    className="resize-none font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {(type === "IMAGE" || type === "DOCUMENT") && (
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="mediaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {type === "IMAGE" ? "Image" : "Document"} URL
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/file.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Optional caption…" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}

        {type === "TEMPLATE" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="templateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="hello_world"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="languageCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
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
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="id">Indonesian</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <Label>
                Variables{" "}
                <span className="text-muted-foreground text-xs">({"{{1}}, {{2}}…"})</span>
              </Label>
              {fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2">
                  <div className="flex items-center w-16 shrink-0 justify-center rounded-lg border bg-muted text-xs font-mono text-muted-foreground">
                    {`{{${idx + 1}}}`}
                  </div>
                  <Input
                    placeholder={`Variable ${idx + 1} value`}
                    {...form.register(`variables.${idx}.value`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(idx)}
                    className="shrink-0 text-muted-foreground hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: "" })}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3 w-3" />
                Add variable
              </Button>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {loading ? "Sending…" : "Send Message"}
        </Button>
      </form>
    </Form>
  );
}
