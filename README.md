# WA Enterprise — WhatsApp Cloud API Dashboard

A full-stack Next.js 14 enterprise dashboard for managing WhatsApp Business Cloud API
messaging at scale: single sends, bulk campaigns, template management, contact lists,
message logs, and keyword-based auto-reply bots.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js v4 (JWT + bcrypt) |
| UI | Tailwind CSS + shadcn/ui + Radix |
| State | Zustand |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Drag-drop | dnd-kit |
| Encryption | AES-256-GCM (Node.js crypto) |
| Real-time | Server-Sent Events (SSE) |
| Toast | Sonner |

---

## Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/wa-enterprise-dashboard.git
cd wa-enterprise-dashboard

# 2. Install dependencies
npm install

# 3. Copy environment file and fill in values
cp .env.example .env.local

# 4. Generate Prisma client
npm run prisma:generate

# 5. Push schema to database
npm run prisma:push

# 6. Seed with demo data
npm run prisma:seed

# 7. Start development server
npm run dev
```

Open http://localhost:3000 — login with **demo@waenterprise.com / Demo@1234**.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full public URL (e.g. `https://yourapp.vercel.app`) |
| `ENCRYPTION_KEY` | 64-char hex string — `openssl rand -hex 32` |
| `WHATSAPP_APP_SECRET` | Meta app secret for webhook HMAC verification |

---

## Adding WhatsApp API Credentials

1. Log in → go to **Settings → API Config**
2. Paste your Meta **Phone Number ID**, **Access Token**, and **WABA ID**
3. Click **Test Connection** — should show phone number info
4. Go to **Settings → Webhook**
5. Copy the webhook URL and paste it into your Meta app → Webhooks
6. Generate a verify token, save it, paste it into Meta, verify

---

## Deploy to Vercel + Supabase

```bash
# 1. Create a Supabase project at https://supabase.com
#    Copy the "Transaction" pooler connection string as DATABASE_URL
#    (add ?pgbouncer=true&connection_limit=1 to the end)

# 2. Install Vercel CLI and link project
npm i -g vercel
vercel link

# 3. Set all environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add ENCRYPTION_KEY
vercel env add WHATSAPP_APP_SECRET

# 4. Deploy
vercel deploy --prod
```

After the first deploy, run migrations via:
```bash
vercel env pull .env.local
npm run prisma:push
npm run prisma:seed
```

---

## Architecture

```
Browser
  │
  ├── Next.js App Router (pages)
  │     ├── (auth)/login          ← public
  │     └── (dashboard)/*         ← protected by middleware
  │           ├── /               Dashboard home + live stats
  │           ├── /single         One-off message sender
  │           ├── /bulk           Bulk campaign manager
  │           ├── /bulk/[id]      Campaign detail + SSE progress
  │           ├── /templates      Template library (CRUD)
  │           ├── /contacts       Contact management + CSV import
  │           ├── /logs           Message log viewer + export
  │           ├── /bot            Bot rules (drag-and-drop)
  │           └── /settings       API config, webhook, profile
  │
  ├── API Routes (src/app/api/)
  │     ├── /auth/[...nextauth]   NextAuth.js handler
  │     ├── /config               WAConfig CRUD
  │     ├── /config/test          Test Meta connection
  │     ├── /whatsapp/send        Single message (rate-limited)
  │     ├── /whatsapp/webhook     Meta webhook (GET verify / POST events)
  │     ├── /campaigns/*          CRUD + SSE stream
  │     ├── /templates/*          CRUD
  │     ├── /contacts/*           CRUD + bulk import
  │     ├── /logs                 Paginated log query
  │     ├── /logs/export          CSV download
  │     ├── /bot-rules/*          CRUD + priority reorder
  │     └── /stats                Dashboard metrics
  │
  ├── Prisma ORM → PostgreSQL
  │     User, WAConfig, Contact, MessageTemplate,
  │     Campaign, MessageLog, WebhookEvent, BotRule
  │
  └── WhatsAppClient (src/lib/whatsapp.ts)
        → Meta Graph API (https://graph.facebook.com/v21.0)
           ├── POST /messages      Send text/template/image/document
           └── GET  /{phoneId}     Test connection & phone info

Meta Webhook → /api/whatsapp/webhook
  ├── HMAC-SHA256 signature verification
  ├── Delivery/read status updates → MessageLog
  └── Inbound messages → BotRule engine → auto-reply
```

---

## Key Design Decisions

### AES-256-GCM Token Encryption
WhatsApp access tokens are encrypted before being stored in PostgreSQL using
AES-256-GCM (96-bit IV, 128-bit auth tag). The format stored is
`iv:authTag:ciphertext` (hex). The API always returns tokens masked
(`EAA1234...efgh`) — the plaintext never leaves the server.

### Bulk Campaign Queue
`BulkQueueManager` (`src/lib/bulk-queue.ts`) runs entirely in-memory on the
Node.js process. It reads pre-created PENDING `MessageLog` rows (created at
campaign submission time), sends each one via `WhatsAppClient`, and broadcasts
SSE progress events to all connected browser tabs.

### SSE for Live Progress
The `/api/campaigns/[id]/progress` route streams `text/event-stream` events.
The `BulkProgress` component connects via `EventSource`, shows a live progress
bar, and closes the stream when the campaign completes.

### Bot Rule Engine
Incoming webhook messages are matched against `BotRule` rows ordered by
`priority`. The first matching rule executes its action (REPLY_TEXT,
SEND_TEMPLATE, ESCALATE, OOO). Regex patterns are compiled per-message; invalid
regexes are caught and skipped.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:push` | Push schema to DB (dev) |
| `npm run prisma:seed` | Seed demo data |
