# System Architecture

## AI WhatsApp Business Outreach Automation

**Version:** 1.1
**Status:** MVP Architecture

---

## 1. Architecture Goal

Build a simple, maintainable application that:

```text
Excel Upload
     ↓
Read Business Data
     ↓
Generate AI Message
     ↓
Review Message
     ↓
Send WhatsApp Message
     ↓
Track Status
```

The MVP will use a **modular monolith architecture** rather than microservices.

---

# 2. Technology Stack

| Layer            | Technology                              |
| ---------------- | --------------------------------------- |
| Frontend         | Next.js                                 |
| Language         | TypeScript                              |
| UI               | Tailwind CSS + shadcn/ui                |
| Backend          | Next.js Route Handlers / Server Actions |
| Database         | MySQL                                   |
| ORM              | Prisma                                  |
| AI               | xAI Grok API                            |
| WhatsApp         | Evolution API                           |
| Background Jobs  | BullMQ                                  |
| Queue            | Redis                                   |
| Excel Processing | ExcelJS                                 |
| Validation       | Zod                                     |
| Authentication   | Auth.js                                 |
| Containerization | Docker                                  |

No Cloudflare R2 will be used in the MVP.

---

# 3. High-Level Architecture

```text
                    ┌──────────────┐
                    │    User      │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │   Next.js    │
                    │ Frontend +   │
                    │   Backend    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
           MySQL         Redis       External APIs
              ↑            ↓          ↙       ↘
           Prisma       BullMQ      Grok   Evolution
              │            ↓                  ↓
              │          Worker            WhatsApp
              │
              └───────────────┐
                              ↓
                           Database
```

---

# 4. Excel Upload

For the MVP, uploaded Excel files do not need permanent cloud storage.

The flow will be:

```text
Browser
   ↓
Next.js
   ↓
Temporary File
   ↓
ExcelJS
   ↓
Validate
   ↓
Extract Data
   ↓
MySQL
   ↓
Temporary File Deleted
```

We only need to store the **business data**, not the original Excel file.

Example:

```text
Name
Business Name
Phone Number
Business Work
```

This keeps the architecture simple and reduces storage requirements.

---

# 5. Next.js Application

Next.js will handle both:

### Frontend

```text
Dashboard
Contacts
Campaigns
Messages
Settings
WhatsApp Connection
```

### Backend

```text
API Routes
Authentication
Business Logic
Database Operations
Webhooks
AI Requests
Campaign Management
```

We will not create a separate Express backend initially.

---

# 6. Database

Use:

**MySQL + Prisma**

Architecture:

```text
Next.js
   ↓
Prisma
   ↓
MySQL
```

The database will contain:

```text
User
Contact
Campaign
CampaignContact
Message
WhatsAppInstance
WebhookEvent
```

Additional tables will be finalized in the Database Design document.

---

# 7. AI Architecture

Use the **xAI Grok API**.

The browser will never directly call Grok.

```text
Browser
   ↓
Next.js Backend
   ↓
AI Service
   ↓
Grok API
   ↓
Generated Message
   ↓
MySQL
```

Environment variable:

```env
GROK_API_KEY=your_key
```

The API key remains server-side.

---

# 8. AI Service

Create a dedicated service:

```text
src/
└── services/
    └── ai/
        ├── ai.service.ts
        └── grok.service.ts
```

Application code should call:

```text
AIService.generateMessage()
```

rather than calling Grok directly from multiple places.

This keeps the AI implementation organized and replaceable later.

---

# 9. WhatsApp Architecture

Use Evolution API.

```text
Next.js
   ↓
WhatsApp Service
   ↓
Evolution API
   ↓
WhatsApp
```

Create:

```text
src/
└── services/
    └── whatsapp/
        ├── whatsapp.service.ts
        └── evolution.service.ts
```

The application communicates with Evolution API through the backend.

---

# 10. Background Processing

For the MVP, we will use:

**Redis + BullMQ**

Reason:

Suppose the user uploads:

```text
500 contacts
```

We don't want:

```text
Browser
 ↓
Next.js request
 ↓
Generate 500 AI messages
 ↓
Send 500 WhatsApp messages
 ↓
Wait...
```

Instead:

```text
Campaign
   ↓
Create Jobs
   ↓
BullMQ
   ↓
Redis
   ↓
Worker
   ↓
Process contacts
```

---

# 11. Worker

The worker can initially live in the **same project/repository**.

Example:

```text
project/
│
├── app/
│
├── src/
│   ├── services/
│   ├── queues/
│   ├── workers/
│   └── lib/
│
├── prisma/
│
└── worker.ts
```

We don't need a separate microservice.

---

# 12. Campaign Processing

When the user starts a campaign:

```text
User clicks START
       ↓
Next.js
       ↓
Validate campaign
       ↓
Create BullMQ jobs
       ↓
Redis
       ↓
Worker
       ↓
Process contact
```

For each contact:

```text
Contact
   ↓
Generate message
   ↓
Save message
   ↓
Send through Evolution API
   ↓
Save WhatsApp message ID
```

---

# 13. Message Lifecycle

```text
PENDING
   ↓
GENERATING
   ↓
GENERATED
   ↓
APPROVED
   ↓
QUEUED
   ↓
SENDING
   ↓
SENT
   ↓
DELIVERED
   ↓
READ
```

Failure:

```text
GENERATING → FAILED
SENDING    → FAILED
```

---

# 14. Evolution API Webhook

Evolution API will notify our application about message events.

```text
Evolution API
      ↓
POST /api/webhooks/evolution
      ↓
Next.js
      ↓
Validate Event
      ↓
Update Message
      ↓
MySQL
```

Example:

```text
SENT
DELIVERED
READ
FAILED
```

---

# 15. Webhook Idempotency

Webhook events should not be processed multiple times.

```text
Webhook
   ↓
Check Event ID
   ↓
Already processed?
   ├── YES → Ignore
   └── NO
        ↓
      Process
        ↓
      Store
```

This prevents duplicate status updates and other webhook-related problems.

---

# 16. Excel Processing

Use **ExcelJS**.

Flow:

```text
Upload
 ↓
ExcelJS
 ↓
Read Sheet
 ↓
Validate Columns
 ↓
Validate Rows
 ↓
Normalize Phone Numbers
 ↓
Insert Contacts
```

Required columns:

```text
Name
Business Name
Phone Number
Business Work
```

---

# 17. Validation

Use **Zod** for application-level validation.

Examples:

```text
Excel data
API requests
Campaign configuration
AI responses
Environment variables
```

Phone numbers should also undergo proper normalization/validation before entering the sending pipeline.

---

# 18. Authentication

Use **Auth.js**.

```text
User
 ↓
Login
 ↓
Session
 ↓
Protected Next.js Routes
 ↓
Application
```

All campaign/contact/message operations should be associated with the authenticated user.

---

# 19. Project Structure

Recommended structure:

```text
project/
│
├── app/
│   ├── dashboard/
│   ├── contacts/
│   ├── campaigns/
│   ├── messages/
│   ├── settings/
│   └── api/
│       ├── contacts/
│       ├── campaigns/
│       ├── whatsapp/
│       └── webhooks/
│
├── components/
│
├── services/
│   ├── ai/
│   ├── whatsapp/
│   ├── campaign/
│   ├── contact/
│   └── excel/
│
├── queues/
│
├── workers/
│
├── lib/
│   ├── prisma.ts
│   ├── redis.ts
│   └── auth.ts
│
├── validators/
│
├── types/
│
├── prisma/
│   └── schema.prisma
│
├── public/
│
├── worker.ts
│
├── docker-compose.yml
│
└── package.json
```

---

# 20. Docker

For development, Docker Compose can run:

```text
┌─────────────────────────────┐
│       Docker Compose        │
│                             │
│  ┌──────────┐               │
│  │  MySQL   │               │
│  └──────────┘               │
│                             │
│  ┌──────────┐               │
│  │  Redis   │               │
│  └──────────┘               │
│                             │
│  ┌──────────────────────┐   │
│  │   Evolution API      │   │
│  └──────────────────────┘   │
│                             │
└─────────────────────────────┘

Next.js
   ↓
Docker services
```

During development, Next.js can also run directly with:

```bash
npm run dev
```

---

# 21. Environment Variables

The initial `.env` will contain only the essentials:

```env
DATABASE_URL="mysql://user:password@localhost:3306/whatsapp_ai"

REDIS_URL="redis://localhost:6379"

GROK_API_KEY="your_grok_api_key"

EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="your_evolution_api_key"

AUTH_SECRET="your_auth_secret"
```

No cloud storage credentials are required.

---

# 22. MVP Deployment

The first deployment can remain simple:

```text
                 Internet
                    ↓
              ┌───────────┐
              │  Next.js  │
              └─────┬─────┘
                    │
          ┌─────────┼─────────┐
          ↓         ↓         ↓
       MySQL      Redis    Evolution
                    │
                    ↓
                  Worker
                    │
                    ↓
                 Grok API
```

The exact hosting provider can be decided later.

---

# 23. What We Are Deliberately NOT Using

For the MVP:

```text
❌ Cloudflare R2
❌ AWS S3
❌ Kubernetes
❌ Kafka
❌ RabbitMQ
❌ gRPC
❌ Microservices
❌ GraphQL
❌ MongoDB
❌ Elasticsearch
❌ Separate Express backend
❌ Separate AI service
❌ Separate WhatsApp service
```

We can introduce these only when an actual requirement appears.

---

# 24. Final Architecture Decision

The MVP will follow:

> **Next.js Modular Monolith + MySQL + Prisma + Redis/BullMQ + Grok API + Evolution API**

The complete flow is:

```text
                    USER
                      │
                      ↓
                 ┌─────────┐
                 │ Next.js │
                 └────┬────┘
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       Prisma       BullMQ      Services
          ↓           ↓        ↙        ↘
        MySQL       Redis     Grok    Evolution
                                      API
                                        ↓
                                    WhatsApp
                                        ↓
                                     Client
                                        │
                                        ↓
                                    Webhook
                                        │
                                        ↓
                                     Next.js
                                        │
                                        ↓
                                      MySQL
```

This architecture is intentionally small. It gives us enough infrastructure to handle background processing and retries without turning a simple MVP into a distributed-systems science project.
