"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Topbar } from "@/components/layout/Topbar";
import { useWAConfig } from "@/hooks/useWAConfig";
import { useAppStore } from "@/store/app.store";
import { ConfigSchema, type ConfigInput } from "@/lib/validations";
import { generateVerifyToken } from "@/lib/utils";
import type { PhoneInfo } from "@/types";

// ── API Config Tab ─────────────────────────────────────────────────────────────

type WAConfigHook = ReturnType<typeof useWAConfig>;

function APIConfigTab({ config, loading, refetch }: WAConfigHook) {
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [phoneInfo, setPhoneInfo] = useState<PhoneInfo | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const form = useForm<ConfigInput>({
    resolver: zodResolver(ConfigSchema),
    defaultValues: {
      phoneNumberId: "",
      accessToken: "",
      wabaId: "",
      apiVersion: "v21.0",
      displayName: "",
      webhookVerifyToken: "",
    },
  });

  // Pre-fill form when config loads
  useEffect(() => {
    if (!config) return;
    form.reset({
      phoneNumberId: config.phoneNumberId,
      accessToken: config.accessToken, // masked value
      wabaId: config.wabaId,
      apiVersion: config.apiVersion,
      displayName: config.displayName ?? "",
      webhookVerifyToken: config.webhookVerifyToken ?? "",
    });
  }, [config, form]);

  async function onSubmit(values: ConfigInput) {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save config");
    } else {
      toast.success("Configuration saved");
      refetch();
    }
  }

  async function testConnection() {
    setTesting(true);
    setPhoneInfo(null);
    setTestError(null);
    try {
      const res = await fetch("/api/config/test", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setPhoneInfo(data.info);
        toast.success("Connection successful!");
      } else {
        setTestError(data.error ?? "Connection failed");
        toast.error(data.error ?? "Connection failed");
      }
    } catch {
      setTestError("Network error");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="phoneNumberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number ID</FormLabel>
                  <FormControl>
                    <Input
                      className="font-mono"
                      placeholder="1234567890"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="wabaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WABA ID</FormLabel>
                  <FormControl>
                    <Input
                      className="font-mono"
                      placeholder="9876543210"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="accessToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Token</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showToken ? "text" : "password"}
                      className="pr-10 font-mono text-sm"
                      placeholder="EAAxxxxxxxx…"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Stored encrypted with AES-256-GCM. Leave as-is to keep
                  current token.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="apiVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Version</FormLabel>
                  <FormControl>
                    <Input
                      className="font-mono"
                      placeholder="v21.0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Display name{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My WhatsApp Business"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save configuration
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={testing}
              onClick={testConnection}
              className="gap-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Test connection
            </Button>
          </div>
        </form>
      </Form>

      {/* Test result */}
      {phoneInfo && (
        <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-green-700 dark:text-green-400">
              Connected successfully
            </p>
            <p>
              <span className="text-muted-foreground">Number:</span>{" "}
              {phoneInfo.display_phone_number}
            </p>
            <p>
              <span className="text-muted-foreground">Business:</span>{" "}
              {phoneInfo.verified_name}
            </p>
            <p>
              <span className="text-muted-foreground">Quality:</span>{" "}
              <Badge
                variant="secondary"
                className={
                  phoneInfo.quality_rating === "GREEN"
                    ? "bg-green-100 text-green-700"
                    : phoneInfo.quality_rating === "YELLOW"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }
              >
                {phoneInfo.quality_rating}
              </Badge>
            </p>
          </div>
        </div>
      )}
      {testError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          <XCircle className="h-5 w-5 shrink-0" />
          {testError}
        </div>
      )}
    </div>
  );
}

// ── Webhook Tab ───────────────────────────────────────────────────────────────

function WebhookTab({ config, refetch }: Pick<WAConfigHook, "config" | "refetch">) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [verifyToken, setVerifyToken] = useState(
    config?.webhookVerifyToken ?? ""
  );
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentEvents, setRecentEvents] = useState<
    Array<{
      id: string;
      eventType: string;
      fromPhone: string;
      processed: boolean;
      receivedAt: string;
    }>
  >([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);
    }
    // Load recent webhook events
    fetch("/api/stats")
      .then((r) => r.json())
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (config?.webhookVerifyToken) {
      setVerifyToken(config.webhookVerifyToken);
    }
  }, [config]);

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveToken() {
    if (!config) return;
    setSaving(true);
    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: config.phoneNumberId,
          accessToken: config.accessToken,
          wabaId: config.wabaId,
          apiVersion: config.apiVersion,
          displayName: config.displayName ?? undefined,
          webhookVerifyToken: verifyToken,
        }),
      });
      toast.success("Verify token saved");
      refetch();
    } finally {
      setSaving(false);
    }
  }

  const REQUIRED_SUBSCRIPTIONS = [
    "messages",
    "message_deliveries",
    "message_reads",
    "messaging_postbacks",
    "message_echoes",
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Webhook URL</Label>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
          <code className="flex-1 truncate text-sm font-mono">{webhookUrl}</code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={copyUrl}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste this URL in your Meta developer app under Webhooks.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Verify Token</Label>
        <div className="flex gap-2">
          <Input
            value={verifyToken}
            onChange={(e) => setVerifyToken(e.target.value)}
            className="font-mono"
            placeholder="Generate a random token…"
          />
          <Button
            variant="outline"
            onClick={() => setVerifyToken(generateVerifyToken())}
          >
            Generate
          </Button>
          <Button
            disabled={saving || !verifyToken}
            onClick={saveToken}
            className="bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#25D366]" />
          Required subscriptions
        </Label>
        <div className="space-y-1.5">
          {REQUIRED_SUBSCRIPTIONS.map((sub) => (
            <div key={sub} className="flex items-center gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
              <code className="font-mono">{sub}</code>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Enable all these fields in your Meta app → Webhooks →
          WhatsApp Business Account.
        </p>
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { data: session } = useSession();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/10 text-lg font-bold text-[#25D366]">
            {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="font-semibold">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">
              {session?.user?.email}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="ml-auto bg-violet-100 text-violet-700 border-0"
          >
            {(session?.user as { role?: string })?.role ?? "AGENT"}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-0.5">Email</p>
          <p className="text-sm text-muted-foreground">
            {session?.user?.email}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Email cannot be changed via dashboard.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-medium">Change password</p>
        <Input
          type="password"
          placeholder="Current password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
        />
        <Input
          type="password"
          placeholder="New password (min 6 chars)"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
        <Button
          disabled={saving || !oldPw || newPw.length < 6}
          onClick={async () => {
            setSaving(true);
            // Extend API to support password change if needed
            await new Promise((r) => setTimeout(r, 800));
            toast.info("Password change API endpoint not yet implemented");
            setSaving(false);
          }}
          className="gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { setSidebarOpen } = useAppStore();
  const waConfig = useWAConfig();

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Settings"
        description="Manage your WhatsApp API and account configuration"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <ScrollArea className="flex-1">
        <div className="p-4 lg:p-6">
          <Tabs defaultValue="api" className="space-y-6">
            <TabsList>
              <TabsTrigger value="api">API Config</TabsTrigger>
              <TabsTrigger value="webhook">Webhook</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    WhatsApp API Credentials
                  </CardTitle>
                  <CardDescription>
                    Connect your Meta WhatsApp Business account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <APIConfigTab {...waConfig} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webhook">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Webhook Setup</CardTitle>
                  <CardDescription>
                    Configure Meta to send events to your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WebhookTab config={waConfig.config} refetch={waConfig.refetch} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">My Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProfileTab />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
