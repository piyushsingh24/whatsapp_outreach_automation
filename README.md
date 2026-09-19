# OpenCode — AI WhatsApp Business Outreach Automation

Production-oriented modular monolith: Next.js + MySQL/Prisma + Redis/BullMQ + Groq + Evolution API.

## Quick start

1. Copy env: `cp .env.example .env` and fill secrets.
2. Start MySQL in WSL (`sudo service mysql start`) — the app uses it via `DATABASE_URL`, it is not run in Docker.
3. Start Evolution stack: `docker compose up -d` (Evolution API + its Postgres + its cache Redis).
3. Install: `npm install`
4. DB: `npx prisma migrate dev` (or `npx prisma db push` for quick dev)
5. Seed demo user (demo@example.com / demo12345): `npm run db:seed`
6. Run app: `npm run dev`
7. Run worker (separate terminal): `npm run worker:dev`

## Flow

Login → Dashboard → Contacts (upload .xlsx/.csv) → Campaigns (create, select contacts) →
Generate (BullMQ + Groq) → Review (edit/regenerate/approve) → Connect WhatsApp →
Launch → Worker sends via Evolution API → Webhooks update SENT/DELIVERED/READ/FAILED.

## Key decisions

- Modular monolith; business logic lives in `services/`, never in route handlers or components.
- AI behind `AIProvider` (`services/ai/`), WhatsApp behind `WhatsAppProvider` (`services/whatsapp/`).
- Long-running AI generation + sending run in BullMQ workers (`worker.ts`), never inside HTTP requests.
- Backend enforces opt-out (`OPTED_OUT`/`BLOCKED`/`INVALID` never sent), ownership checks on every query.
- Webhooks are idempotent via `WebhookEvent(eventId, event)` unique constraint.
- Secrets stay server-side; frontend only calls same-origin APIs.
