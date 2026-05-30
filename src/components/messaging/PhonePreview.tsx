"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface PhonePreviewProps {
  type: "TEXT" | "IMAGE" | "DOCUMENT" | "TEMPLATE";
  message?: string;
  recipientName?: string;
  mediaUrl?: string;
  caption?: string;
  className?: string;
}

export function PhonePreview({
  type,
  message,
  recipientName,
  mediaUrl,
  caption,
  className,
}: PhonePreviewProps) {
  const now = format(new Date(), "HH:mm");

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Phone frame */}
      <div
        className="relative mx-auto flex flex-col overflow-hidden rounded-[2.5rem] border-[6px] border-gray-800 bg-gray-900 shadow-2xl"
        style={{ width: 280, height: 560 }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between bg-gray-900 px-6 py-2 text-[10px] text-gray-400">
          <span>{now}</span>
          <div className="flex gap-1 text-gray-400">
            <span>●●●</span>
          </div>
        </div>

        {/* WhatsApp header */}
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-700">
            {recipientName ? recipientName.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">
              {recipientName || "Recipient"}
            </p>
            <p className="text-[10px] text-green-300">online</p>
          </div>
        </div>

        {/* Chat body */}
        <div
          className="flex-1 overflow-hidden px-3 py-4"
          style={{ background: "#E5DDD5" }}
        >
          {/* Message bubble */}
          <div className="ml-auto max-w-[85%]">
            <div
              className="relative rounded-lg rounded-tr-none px-3 py-2 shadow-sm"
              style={{ background: "#DCF8C6" }}
            >
              {/* Media preview */}
              {type === "IMAGE" && mediaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt="preview"
                  className="mb-1.5 w-full rounded-md object-cover"
                  style={{ maxHeight: 120 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              {type === "IMAGE" && !mediaUrl && (
                <div className="mb-1.5 flex h-20 w-full items-center justify-center rounded-md bg-gray-200 text-xs text-gray-500">
                  Image preview
                </div>
              )}
              {type === "DOCUMENT" && (
                <div className="mb-1.5 flex items-center gap-2 rounded-md bg-white/60 p-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-red-500 text-[9px] font-bold text-white">
                    PDF
                  </div>
                  <p className="truncate text-xs text-gray-700">
                    {mediaUrl ? mediaUrl.split("/").pop() : "document.pdf"}
                  </p>
                </div>
              )}

              {/* Body text */}
              <p
                className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-800"
                style={{ minHeight: 18 }}
              >
                {type === "TEMPLATE" ? (
                  <span className="text-gray-500 italic">
                    {message || "Template message preview…"}
                  </span>
                ) : (
                  message || (
                    <span className="text-gray-400 italic">
                      Start typing to preview…
                    </span>
                  )
                )}
              </p>
              {caption && (
                <p className="mt-1 text-xs italic text-gray-600">{caption}</p>
              )}

              {/* Timestamp + double tick */}
              <div className="mt-1 flex items-center justify-end gap-1">
                <span className="text-[10px] text-gray-500">{now}</span>
                <span className="text-[#25D366]">
                  <Check className="inline h-3 w-3 -mr-1" />
                  <Check className="inline h-3 w-3" />
                </span>
              </div>

              {/* Bubble tail */}
              <div
                className="absolute right-0 top-0 h-0 w-0"
                style={{
                  borderStyle: "solid",
                  borderWidth: "0 0 10px 10px",
                  borderColor: "transparent transparent #DCF8C6 transparent",
                  right: -9,
                  top: 0,
                }}
              />
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 bg-[#F0F0F0] px-3 py-2">
          <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-[11px] text-gray-400">
            Type a message
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]">
            <Check className="h-3 w-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
