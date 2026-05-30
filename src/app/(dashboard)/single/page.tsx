"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { SingleMessageForm } from "@/components/messaging/SingleMessageForm";
import { PhonePreview } from "@/components/messaging/PhonePreview";
import { PayloadInspector } from "@/components/messaging/PayloadInspector";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppStore } from "@/store/app.store";

interface SentLog {
  id: string;
  to: string;
  type: string;
  wamid?: string;
  sentAt: string;
}

export default function SinglePage() {
  const { setSidebarOpen } = useAppStore();
  const [previewType, setPreviewType] = useState<
    "TEXT" | "IMAGE" | "DOCUMENT" | "TEMPLATE"
  >("TEXT");
  const [previewBody, setPreviewBody] = useState("");
  const [sessionLogs, setSessionLogs] = useState<SentLog[]>([]);
  const [inspectorPayload, setInspectorPayload] = useState<object>({
    messaging_product: "whatsapp",
    to: "+12015550101",
    type: "text",
    text: { body: "Hello from WA Enterprise!" },
  });

  function handleSent(result: { to: string; type: string; wamid?: string }) {
    setSessionLogs((prev) =>
      [
        {
          id: crypto.randomUUID(),
          to: result.to,
          type: result.type,
          wamid: result.wamid,
          sentAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 10)
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Single Message"
        description="Send a one-off WhatsApp message to any number"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <ScrollArea className="flex-1">
        <div className="p-4 lg:p-6 space-y-6">
          {/* Two-column: form + preview */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Compose Message</CardTitle>
              </CardHeader>
              <CardContent>
                <SingleMessageForm onSent={handleSent} />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <PhonePreview
                    type={previewType}
                    message={previewBody || "Your message will appear here…"}
                    className="scale-90"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Payload inspector */}
          <PayloadInspector payload={inspectorPayload} />

          {/* Session send log */}
          {sessionLogs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Sent this session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sessionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{log.to}</span>
                        <Badge
                          variant="secondary"
                          className="text-xs border-0"
                        >
                          {log.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="SENT" size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.sentAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
