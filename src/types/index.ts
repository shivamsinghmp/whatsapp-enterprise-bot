// ── Enums ─────────────────────────────────────────────────────────────────────

export type Role = "ADMIN" | "AGENT";
export type TemplateCategory = "MARKETING" | "TRANSACTIONAL" | "AUTH" | "UTILITY";
export type CampaignStatus = "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED";
export type MessageType = "TEXT" | "TEMPLATE" | "IMAGE" | "DOCUMENT";
export type MessageStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
export type MatchType = "EXACT" | "CONTAINS" | "STARTS_WITH" | "REGEX";
export type BotAction = "REPLY_TEXT" | "SEND_TEMPLATE" | "ESCALATE" | "OOO";

// ── Model interfaces (dates serialised as ISO strings in API responses) ────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface WAConfig {
  id: string;
  userId: string;
  phoneNumberId: string;
  /** Always returned masked ("EAA1234...efgh") — never plaintext */
  accessToken: string;
  wabaId: string;
  apiVersion: string;
  displayName: string | null;
  webhookVerifyToken: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  userId: string;
  phone: string;
  name: string | null;
  tags: string[];
  optedOut: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  userId: string;
  name: string;
  category: TemplateCategory;
  language: string;
  body: string;
  headerText: string | null;
  footerText: string | null;
  variableCount: number;
  isApproved: boolean;
  metaTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  status: CampaignStatus;
  messageType: MessageType;
  messageBody: string | null;
  templateId: string | null;
  template?: Pick<MessageTemplate, "id" | "name" | "category"> | null;
  mediaUrl: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  delayMs: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageLog {
  id: string;
  userId: string;
  campaignId: string | null;
  toPhone: string;
  toName: string | null;
  messageType: string;
  messageBody: string | null;
  status: MessageStatus;
  wamid: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface WebhookEvent {
  id: string;
  userId: string;
  eventType: string;
  fromPhone: string;
  payload: Record<string, unknown>;
  processed: boolean;
  receivedAt: string;
}

export interface BotRule {
  id: string;
  userId: string;
  keyword: string;
  matchType: MatchType;
  action: BotAction;
  replyText: string | null;
  templateId: string | null;
  template?: Pick<MessageTemplate, "id" | "name"> | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// ── API response shapes ────────────────────────────────────────────────────────

export interface WAResponse {
  ok: boolean;
  wamid?: string;
  error?: string;
  code?: number;
}

export interface PhoneInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
}

export interface StatsResponse {
  today: {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: string;
  };
  week: {
    sent: number;
    delivered: number;
  };
  month: {
    sent: number;
  };
  activeCampaigns: number;
  totalContacts: number;
  hourlyData: Array<{ hour: string; sent: number }>;
  recentLogs: MessageLog[];
  topFailReasons: Array<{ reason: string; count: number }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pages: number;
  page: number;
}
