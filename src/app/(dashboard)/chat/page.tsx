"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  MessageCircle,
  Send,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  X,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  phone: string;
  name: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastDirection: "inbound" | "outbound";
}

interface ChatMessage {
  id: string;
  direction: "inbound" | "outbound";
  text: string | null;
  messageType: string;
  status: string | null;
  timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Kal ${format(d, "HH:mm")}`;
  return format(d, "d MMM HH:mm");
}

function fmtDate(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return "Aaj";
  if (isYesterday(d)) return "Kal";
  return format(d, "d MMMM yyyy");
}

function initials(name: string | null, phone: string) {
  if (name) return name.slice(0, 2).toUpperCase();
  return phone.slice(-2);
}

function StatusIcon({ status }: { status: string | null }) {
  if (!status) return null;
  switch (status) {
    case "PENDING":
      return <Clock className="h-3 w-3 text-gray-400" />;
    case "SENT":
      return <Check className="h-3 w-3 text-gray-400" />;
    case "DELIVERED":
      return <CheckCheck className="h-3 w-3 text-gray-400" />;
    case "READ":
      return <CheckCheck className="h-3 w-3 text-[#53bdeb]" />;
    case "FAILED":
      return <X className="h-3 w-3 text-red-400" />;
    default:
      return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { setSidebarOpen } = useAppStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contactName, setContactName] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch conversations ────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = (await res.json()) as { conversations: Conversation[] };
        setConversations(data.conversations);
      }
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const id = setInterval(fetchConversations, 10_000);
    return () => clearInterval(id);
  }, [fetchConversations]);

  // ── Fetch messages for selected phone ─────────────────────────────────────

  const fetchMessages = useCallback(async (phone: string) => {
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = (await res.json()) as {
          messages: ChatMessage[];
          contactName: string | null;
        };
        setMessages(data.messages);
        setContactName(data.contactName);
      }
    } catch {
      // network error — ignore, will retry
    }
  }, []);

  useEffect(() => {
    if (!selectedPhone) return;
    setLoadingMsgs(true);
    fetchMessages(selectedPhone).finally(() => setLoadingMsgs(false));

    pollRef.current = setInterval(() => fetchMessages(selectedPhone), 5_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedPhone, fetchMessages]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send ───────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!selectedPhone || !inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        direction: "outbound",
        text,
        messageType: "TEXT",
        status: "PENDING",
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      await fetch(`/api/chat/${encodeURIComponent(selectedPhone)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      await fetchMessages(selectedPhone);
      await fetchConversations();
    } finally {
      setSending(false);
    }
  }, [selectedPhone, inputText, sending, fetchMessages, fetchConversations]);

  // ── Filtered conversations ─────────────────────────────────────────────────

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone.includes(q);
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Conversation List ──────────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col border-r border-white/10 bg-[#111827]",
          "w-full lg:w-80 lg:flex shrink-0",
          selectedPhone ? "hidden lg:flex" : "flex"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-[14px]">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden h-8 w-8 text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <MessageCircle className="h-5 w-5 text-[#25D366] shrink-0" />
          <span className="font-semibold text-white text-sm">Conversations</span>
          <span className="ml-auto rounded-full bg-[#25D366]/20 px-2 py-0.5 text-xs text-[#25D366]">
            {conversations.length}
          </span>
        </div>

        {/* Search */}
        <div className="border-b border-white/10 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
            <Input
              placeholder="Search name or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {loadingConvs ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg animate-pulse"
                >
                  <div className="h-10 w-10 rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-white/10 rounded" />
                    <div className="h-2.5 w-36 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 px-4 text-center">
              <MessageCircle className="h-10 w-10 text-gray-700" />
              <p className="text-sm text-gray-500">Koi conversation nahi</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Jab aap messages bhejenge ya receive karenge, yahan dikhenge
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {filtered.map((conv) => (
                <button
                  key={conv.phone}
                  onClick={() => setSelectedPhone(conv.phone)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors",
                    selectedPhone === conv.phone
                      ? "bg-[#25D366]/15"
                      : "hover:bg-white/5"
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-[#25D366]/20 text-[#25D366] text-xs font-medium">
                      {initials(conv.name, conv.phone)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          selectedPhone === conv.phone
                            ? "text-[#25D366]"
                            : "text-gray-200"
                        )}
                      >
                        {conv.name ?? conv.phone}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="shrink-0 text-[10px] text-gray-600">
                          {fmtTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {conv.lastDirection === "outbound" && (
                        <Check className="h-3 w-3 shrink-0 text-gray-600" />
                      )}
                      <span className="truncate text-xs text-gray-500">
                        {conv.lastMessage ?? ""}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Right: Chat Window ───────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 flex flex-col bg-[#0b141a]",
          selectedPhone ? "flex" : "hidden lg:flex"
        )}
      >
        {!selectedPhone ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="h-24 w-24 rounded-full bg-[#25D366]/10 flex items-center justify-center">
              <MessageCircle className="h-12 w-12 text-[#25D366]/30" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-gray-400">
                Conversation select karein
              </p>
              <p className="text-sm text-gray-600">
                Left side se kisi contact ke saath chat shuru karein
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#202c33]">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 shrink-0 text-gray-400 hover:text-white"
                onClick={() => setSelectedPhone(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-[#25D366]/20 text-[#25D366] text-xs font-medium">
                  {initials(contactName, selectedPhone)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {contactName ?? selectedPhone}
                </p>
                {contactName && (
                  <p className="text-[11px] text-gray-400 truncate">
                    {selectedPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 px-4 py-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 rounded-full border-2 border-[#25D366] border-t-transparent animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <p className="text-sm text-gray-500">Koi message nahi</p>
                  <p className="text-xs text-gray-600">
                    Neeche type karke pehla message bhejein
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, i) => {
                    const isOut = msg.direction === "outbound";
                    const prevTs = i > 0 ? messages[i - 1].timestamp : null;
                    const showDate =
                      !prevTs ||
                      format(new Date(prevTs), "yyyy-MM-dd") !==
                        format(new Date(msg.timestamp), "yyyy-MM-dd");

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="bg-[#182229] text-gray-400 text-[11px] px-3 py-1 rounded-full border border-white/10">
                              {fmtDate(msg.timestamp)}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex mb-0.5",
                            isOut ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "relative max-w-[72%] rounded-2xl px-3.5 py-2",
                              isOut
                                ? "bg-[#005c4b] text-white rounded-tr-sm"
                                : "bg-[#202c33] text-gray-100 rounded-tl-sm"
                            )}
                          >
                            {/* Media / unknown type */}
                            {!msg.text && (
                              <span className="text-gray-400 italic text-xs">
                                [{msg.messageType}]
                              </span>
                            )}

                            {/* Text */}
                            {msg.text && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {msg.text}
                              </p>
                            )}

                            {/* Timestamp + status */}
                            <div
                              className={cn(
                                "flex items-center gap-1 mt-0.5",
                                isOut ? "justify-end" : "justify-start"
                              )}
                            >
                              <span className="text-[10px] text-gray-400/80">
                                {format(new Date(msg.timestamp), "HH:mm")}
                              </span>
                              {isOut && <StatusIcon status={msg.status} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Bar */}
            <div className="flex items-end gap-2 px-4 py-3 border-t border-white/10 bg-[#202c33]">
              <div className="flex-1 bg-[#2a3942] rounded-xl px-4 py-2.5 min-h-[42px] flex items-center">
                <textarea
                  ref={textareaRef}
                  className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none resize-none leading-relaxed max-h-32"
                  placeholder="Yahan type karein..."
                  rows={1}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
                size="icon"
                className="h-[42px] w-[42px] rounded-full bg-[#25D366] hover:bg-[#20c15a] text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
