# Project Vision

## AI-Powered WhatsApp Business Outreach Automation

### 1. Vision

The goal of this project is to build an AI-powered automation system that can take an Excel file containing business information, understand each business, generate a personalized and relevant WhatsApp message for that business, and send the message automatically through WhatsApp.

The system should eliminate the need to manually research each business, write individual messages, find their phone numbers, and send messages one by one.

The core idea is:

**Upload Excel → Understand Business → Generate Personalized Creative → Send WhatsApp Message → Track Result**

---

## 2. Input

The user will upload an Excel/CSV file containing business information.

Example:

| Name  | Business Name        | Phone Number | Business Work             |
| ----- | -------------------- | ------------ | ------------------------- |
| Rahul | Sharma Dental Clinic | 919876543210 | Dental clinic             |
| Amit  | ABC Restaurant       | 919812345678 | Restaurant                |
| Neha  | NK Boutique          | 919998877665 | Women's clothing boutique |

The system should read each row as an individual business prospect.

### Required fields

* Name
* Business Name
* Phone Number
* Business Work

Additional fields may be supported in the future.

---

## 3. Core Workflow

For every row in the uploaded Excel file:

### Step 1 — Read Business Information

The system extracts:

```text
Name
Business Name
Phone Number
Business Work
```

### Step 2 — Understand the Business

The AI analyzes the available business information to understand what type of business the prospect operates.

For example:

```text
Business:
Sharma Dental Clinic

Business Work:
Dental clinic
```

The AI identifies this as a dental/healthcare business.

### Step 3 — Generate Personalized Creative

The AI generates a WhatsApp message specifically relevant to that business.

The message should not be a generic copy-paste message.

For example:

```text
Hi Rahul,

I came across Sharma Dental Clinic and noticed that you
are working in the dental healthcare space.

We help businesses improve their online presence and
generate more customer enquiries through digital solutions.

I’d love to share a few ideas that could work specifically
for Sharma Dental Clinic.

Would you be open to a quick conversation?
```

The exact message style, length, language and offer will be configurable later.

### Step 4 — Send WhatsApp Message

The generated message is sent to the phone number provided in the Excel file through the configured WhatsApp connection using Evolution API.

```text
AI Generated Message
        ↓
Evolution API
        ↓
WhatsApp
        ↓
Business Owner
```

### Step 5 — Track the Result

The system records the outcome of the message.

Possible states:

```text
PENDING
PROCESSING
SENT
DELIVERED
READ
FAILED
SKIPPED
```

---

## 4. Core Product Objective

The system should automate the repetitive process of:

```text
Find business
      ↓
Understand business
      ↓
Write personalized message
      ↓
Find/use phone number
      ↓
Send WhatsApp message
```

The user's responsibility should primarily be:

```text
Prepare Excel
      ↓
Upload Excel
      ↓
Review
      ↓
Start Campaign
```

Everything else should be automated.

---

## 5. AI's Role

AI is not simply responsible for generating a generic marketing message.

It should use the information available about each business to create a message that feels relevant to that particular prospect.

For example:

### Input

```text
Business Name:
ABC Fitness Studio

Business Work:
Gym and personal training
```

### AI output

A message focused on the fitness business.

For:

```text
Business Name:
Sharma Dental Clinic

Business Work:
Dental clinic
```

The generated message should instead focus on opportunities relevant to a dental clinic.

Therefore:

**Same campaign + different business → personalized message.**

---

## 6. MVP Scope

The first version should remain intentionally simple.

### MVP must support

* Excel/CSV upload
* Excel validation
* Reading business information
* Phone number validation
* AI message generation
* Message preview
* Individual message editing
* WhatsApp connection
* Sending messages through Evolution API
* Sending status
* Failed-message tracking
* Basic campaign history

### MVP does NOT initially require

* Complex CRM
* Advanced analytics
* Multiple organizations
* Billing/subscriptions
* Complex workflow builder
* Multi-agent architecture
* Large-scale campaign management
* Advanced AI research
* Complex contact segmentation

These can be added after the core workflow is proven.

---

## 7. High-Level Architecture

The initial system will consist of four major components:

```text
                 ┌─────────────────┐
                 │   Excel / CSV   │
                 └────────┬────────┘
                          ↓
                 ┌─────────────────┐
                 │    Web App      │
                 │    Next.js      │
                 └────────┬────────┘
                          ↓
                 ┌─────────────────┐
                 │       n8n       │
                 │  Orchestration  │
                 └───────┬─┬───────┘
                         │ │
              ┌──────────┘ └──────────┐
              ↓                       ↓
       ┌──────────────┐       ┌──────────────┐
       │   AI / LLM   │       │ Evolution API│
       └──────────────┘       └───────┬──────┘
                                      ↓
                                  WhatsApp
                                      ↓
                                  Prospect
```

---

## 8. Product Philosophy

The system should prioritize:

### Personalization

Messages should be relevant to the individual business.

### Automation

The user should not manually process every prospect.

### Simplicity

The user should be able to upload a file and start the workflow without technical knowledge.

### Transparency

The user should be able to see:

* which messages were generated
* which messages were sent
* which messages failed
* which contacts were skipped

### Control

The user should be able to review and stop the campaign before messages are sent.

---

## 9. Future Vision

Once the MVP is stable, the system can evolve into a broader AI-powered outreach platform.

Potential future capabilities:

```text
Excel/CSV
    ↓
Business Research
    ↓
AI Business Analysis
    ↓
Personalized Creative
    ↓
WhatsApp / Email / SMS
    ↓
Response Detection
    ↓
AI Reply Generation
    ↓
Lead Qualification
    ↓
CRM
```

The long-term vision is therefore not merely a WhatsApp sender.

It is an **AI-powered business outreach and lead-generation automation system**.

---

## 10. One-Line Product Definition

> **An AI automation platform that converts a list of business prospects into personalized WhatsApp outreach messages and automatically delivers them through WhatsApp.**
