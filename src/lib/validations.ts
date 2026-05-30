import { z } from "zod";

// ── Shared ───────────────────────────────────────────────────────────────────

const E164 = /^\+[1-9]\d{7,14}$/;

const e164 = (fieldName = "Phone") =>
  z
    .string()
    .regex(E164, `${fieldName} must be in E.164 format (e.g. +12015550101)`);

// ── Schemas ──────────────────────────────────────────────────────────────────

export const SendMessageSchema = z.object({
  to: e164("to"),
  type: z.enum(["TEXT", "TEMPLATE", "IMAGE", "DOCUMENT"]),
  body: z.string().min(1).max(4096).optional(),
  mediaUrl: z.string().url("mediaUrl must be a valid URL").optional(),
  templateName: z.string().min(1).max(512).optional(),
  languageCode: z.string().min(2).max(10).optional(),
  variables: z.array(z.string()).optional(),
});

export const BulkCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100),
  messageType: z.enum(["TEXT", "TEMPLATE", "IMAGE", "DOCUMENT"]),
  messageBody: z.string().min(1).max(4096).optional(),
  templateId: z.string().uuid("templateId must be a valid UUID").optional(),
  phoneNumbers: z
    .array(e164())
    .min(1, "At least 1 recipient is required")
    .max(10000, "Maximum 10,000 recipients per campaign"),
  delayMs: z
    .number()
    .int()
    .min(500, "Minimum delay is 500 ms")
    .max(10000, "Maximum delay is 10,000 ms")
    .default(1200),
});

export const TemplateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(512)
    .regex(
      /^[a-z0-9_]+$/,
      "Template name must be lowercase letters, digits, or underscores"
    ),
  category: z.enum(["MARKETING", "TRANSACTIONAL", "AUTH", "UTILITY"]),
  language: z.string().min(2).max(10).default("en_US"),
  body: z.string().min(1, "Body is required").max(1024),
  headerText: z.string().max(60).optional(),
  footerText: z.string().max(60).optional(),
  variableCount: z.number().int().min(0).max(20).default(0),
});

export const ContactSchema = z.object({
  phone: e164(),
  name: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

export const BotRuleSchema = z.object({
  keyword: z.string().min(1, "Keyword is required").max(100),
  matchType: z.enum(["EXACT", "CONTAINS", "STARTS_WITH", "REGEX"]),
  action: z.enum(["REPLY_TEXT", "SEND_TEMPLATE", "ESCALATE", "OOO"]),
  replyText: z.string().max(4096).optional(),
  templateId: z.string().uuid("templateId must be a valid UUID").optional(),
  priority: z.number().int().min(0).max(100).default(0),
});

export const ConfigSchema = z.object({
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  accessToken: z.string().min(1, "Access Token is required"),
  wabaId: z.string().min(1, "WABA ID is required"),
  apiVersion: z
    .string()
    .regex(/^v\d+\.\d+$/, "API version must be in the form v21.0")
    .default("v21.0"),
  displayName: z.string().max(100).optional(),
  webhookVerifyToken: z.string().max(200).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ── Inferred types ───────────────────────────────────────────────────────────

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type BulkCampaignInput = z.infer<typeof BulkCampaignSchema>;
export type TemplateInput = z.infer<typeof TemplateSchema>;
export type ContactInput = z.infer<typeof ContactSchema>;
export type BotRuleInput = z.infer<typeof BotRuleSchema>;
export type ConfigInput = z.infer<typeof ConfigSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
