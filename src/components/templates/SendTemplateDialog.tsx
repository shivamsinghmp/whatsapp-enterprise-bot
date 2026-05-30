"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  variableCount: number;
  body: string;
}

interface SendTemplateDialogProps {
  template: MessageTemplate | null;
  open: boolean;
  onClose: () => void;
}

const sendSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{7,14}$/, "Must be E.164 format"),
  languageCode: z.string().min(2),
  variables: z.array(z.object({ value: z.string() })),
});

type SendValues = z.infer<typeof sendSchema>;

export function SendTemplateDialog({ template, open, onClose }: SendTemplateDialogProps) {
  const form = useForm<SendValues>({
    resolver: zodResolver(sendSchema),
    defaultValues: {
      to: "",
      languageCode: "en_US",
      variables: [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "variables",
  });

  // Sync variable count when template changes
  useEffect(() => {
    if (!template) return;
    form.setValue("languageCode", template.language);
    form.setValue(
      "variables",
      Array.from({ length: template.variableCount }, () => ({ value: "" }))
    );
  }, [template, form]);

  async function onSubmit(values: SendValues) {
    if (!template) return;

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: values.to,
          type: "TEMPLATE",
          templateName: template.name,
          languageCode: values.languageCode,
          variables: values.variables.map((v) => v.value),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Template sent", { description: `WAMID: ${data.wamid}` });
        form.reset();
        onClose();
      } else {
        toast.error("Send failed", { description: data.error });
      }
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Send Template
            {template && (
              <Badge variant="secondary" className="font-mono text-xs">
                {template.name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Send via WhatsApp template message
          </DialogDescription>
        </DialogHeader>

        {template && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground italic leading-relaxed">
            {template.body}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Dynamic variable inputs */}
            {fields.map((field, idx) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`variables.${idx}.value`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      Variable
                      <span className="rounded border px-1.5 py-0.5 font-mono text-xs">
                        {`{{${idx + 1}}}`}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`Value for {{${idx + 1}}}`}
                        {...f}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
