import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";
import { randomBytes } from "crypto";
import { format } from "date-fns";

/**
 * Merges Tailwind class names, resolving conflicts via tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Strips non-digit/non-plus characters and ensures a leading "+".
 * Does not validate country codes — use with E.164 regex for full validation.
 */
export function formatPhone(phone: string): string {
  const stripped = phone.replace(/[^\d+]/g, "");
  return stripped.startsWith("+") ? stripped : `+${stripped}`;
}

/**
 * Parses a CSV string (with header row) into an array of contact objects.
 * Accepts columns named: phone | mobile | number, name | full_name.
 */
export function parseCSV(
  content: string
): Array<{ phone: string; name?: string }> {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  return result.data
    .map((row) => {
      const phone = formatPhone(
        row["phone"] ?? row["mobile"] ?? row["number"] ?? ""
      );
      const name =
        row["name"] ?? row["full_name"] ?? row["fullname"] ?? undefined;
      return { phone, name: name?.trim() || undefined };
    })
    .filter((r) => r.phone.length >= 9); // require at least country code + 7 digits
}

/**
 * Returns a promise that resolves after `ms` milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a random 32-character hex token suitable for webhook verification.
 */
export function generateVerifyToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Masks a sensitive token, showing only the first 8 and last 4 characters.
 * Strings shorter than 12 characters are fully masked.
 */
export function maskToken(token: string): string {
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

/**
 * Formats a Date or ISO string as "15 Jan 2025, 09:30".
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy, HH:mm");
}

/**
 * Calculates the message delivery rate as a formatted percentage string.
 * Returns "0.0%" when sent is 0 to avoid division by zero.
 */
export function calcDeliveryRate(sent: number, delivered: number): string {
  if (sent === 0) return "0.0%";
  return `${((delivered / sent) * 100).toFixed(1)}%`;
}
