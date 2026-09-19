# Product Requirements Document (PRD)

**Product:** AI WhatsApp Business Outreach Automation
**Version:** 1.0
**Status:** MVP Planning

---

# 1. Product Overview

The AI WhatsApp Business Outreach Automation platform is a web application that allows a user to upload an Excel/CSV file containing business prospect information.

The system processes each prospect, uses AI to understand the business and generate a personalized WhatsApp outreach message, allows the user to review the generated messages, and sends approved messages through WhatsApp using Evolution API.

### Core workflow

```text
Upload Excel
     ↓
Validate & Import Contacts
     ↓
Analyze Business Information
     ↓
Generate Personalized Message
     ↓
Review / Approve
     ↓
Start Campaign
     ↓
Send via Evolution API
     ↓
Track Message Status
```

---

# 2. Problem Statement

Sending personalized outreach messages manually is time-consuming.

A typical process requires the user to:

1. Open a list of businesses.
2. Find the business details.
3. Understand what the business does.
4. Write an appropriate message.
5. Find/copy the phone number.
6. Open WhatsApp.
7. Send the message.
8. Record whether the message was sent successfully.

When the number of prospects increases, this process becomes repetitive and difficult to manage.

The product will automate this workflow while keeping the user in control of message generation and campaign execution.

---

# 3. Goals

## Primary Goals

The MVP should allow a user to:

* Upload an Excel/CSV file.
* Validate the uploaded data.
* Import business prospects.
* Identify valid phone numbers.
* Generate personalized messages using AI.
* Preview generated messages.
* Edit messages manually.
* Approve messages.
* Create and launch a campaign.
* Send messages through Evolution API.
* Track message status.
* View campaign history.

## Secondary Goals

The system should:

* Prevent duplicate contacts.
* Handle invalid phone numbers.
* Handle failed messages.
* Provide campaign-level statistics.
* Maintain an audit trail of message activity.
* Allow campaigns to be paused or stopped.

---

# 4. Non-Goals for MVP

The following features are intentionally excluded from the first version:

* CRM functionality
* Billing/subscriptions
* Multiple organizations/workspaces
* Advanced lead scoring
* Complex automation builder
* Email campaigns
* SMS campaigns
* AI voice calling
* AI-generated images/videos
* Advanced analytics
* Multi-agent AI architecture
* Advanced contact segmentation
* Automatic AI replies to incoming WhatsApp conversations

These can be considered in future versions.

---

# 5. Target User

The initial target user is a business owner, marketer, freelancer, agency, or sales professional who has a list of potential business clients and wants to perform personalized WhatsApp outreach.

The user should not need programming knowledge.

---

# 6. User Journey

## Step 1 — Login

User logs into the application.

```text
Login
  ↓
Dashboard
```

---

## Step 2 — Upload Prospect File

The user uploads:

* `.xlsx`
* `.xls`
* `.csv`

Example:

| Name  | Business Name        | Phone Number | Business Work    |
| ----- | -------------------- | ------------ | ---------------- |
| Rahul | Sharma Dental Clinic | 919876543210 | Dental Clinic    |
| Amit  | ABC Restaurant       | 919812345678 | Restaurant       |
| Neha  | NK Boutique          | 919998877665 | Women's Boutique |

---

# 7. File Validation

After upload, the system validates:

### Required columns

```text
Name
Business Name
Phone Number
Business Work
```

### Validation rules

The system should check:

* Missing required columns
* Empty values
* Invalid phone numbers
* Duplicate phone numbers
* Invalid characters
* Unsupported file format
* Excessively large file

The user should receive a clear validation report.

Example:

```text
Total Rows: 500

Valid: 462
Invalid Phone: 21
Missing Business Name: 8
Duplicate: 9
```

The user can then decide whether to continue with the valid records.

---

# 8. Contact Import

Valid records are imported into the database.

Each contact should contain:

```text
Name
Business Name
Phone Number
Business Work
Import Source
Created At
Status
```

Initial contact status:

```text
READY
```

Possible future statuses:

```text
READY
PROCESSING
CONTACTED
RESPONDED
OPTED_OUT
BLOCKED
INVALID
```

---

# 9. Campaign Creation

After importing contacts, the user creates a campaign.

### Campaign fields

```text
Campaign Name
Campaign Description
Target Contacts
Message Objective
Tone
Language
Call To Action
```

Example:

```text
Campaign Name:
Web Development Outreach

Objective:
Offer website development services

Tone:
Professional and friendly

Language:
English

CTA:
Ask for a quick discussion
```

---

# 10. AI Message Generation

The system generates a personalized message for each contact.

The AI receives structured information such as:

```text
Name
Business Name
Business Work
Campaign Objective
Tone
Language
CTA
```

Example input:

```text
Name:
Rahul

Business:
Sharma Dental Clinic

Business Work:
Dental Clinic

Campaign:
Website Development

Tone:
Professional
```

The AI generates a message relevant to the business.

Example:

```text
Hi Rahul,

I came across Sharma Dental Clinic and noticed that you
provide dental care services.

We help businesses improve their online presence and make
it easier for potential patients to discover and connect
with them online.

I'd be happy to share a few ideas specifically for Sharma
Dental Clinic.

Would you be open to a quick conversation?
```

The system must avoid blindly using the same message for every contact.

---

# 11. Message Personalization

The system should support variables such as:

```text
{{name}}
{{business_name}}
{{business_work}}
```

Example template:

```text
Hi {{name}},

I came across {{business_name}} and noticed that you work
in {{business_work}}.

We help businesses improve their digital presence...
```

The AI can use these variables and business information to produce the final message.

---

# 12. Message Review

Before sending the campaign, the user should see generated messages.

Example:

```text
┌──────────────────────────────────────────────┐
│ Rahul — Sharma Dental Clinic                │
│                                              │
│ Hi Rahul,                                    │
│                                              │
│ I came across Sharma Dental Clinic...        │
│                                              │
│ [Edit] [Regenerate] [Approve]                │
└──────────────────────────────────────────────┘
```

The user should be able to:

* Approve
* Edit
* Regenerate
* Reject
* Approve all

---

# 13. Campaign Approval

A campaign cannot start sending until the user explicitly launches it.

Campaign states:

```text
DRAFT
GENERATING
READY_FOR_REVIEW
APPROVED
RUNNING
PAUSED
COMPLETED
CANCELLED
FAILED
```

---

# 14. WhatsApp Integration

The application will use **Evolution API** as the WhatsApp integration layer.

Architecture:

```text
Application Backend
       ↓
Evolution API
       ↓
WhatsApp
       ↓
Recipient
```

The application should support connecting a WhatsApp instance through Evolution API.

The UI should display:

```text
WhatsApp Status

● Connected

Number:
+91 XXXXX XXXXX

Instance:
Business-01
```

Possible states:

```text
CONNECTED
DISCONNECTED
CONNECTING
QR_REQUIRED
ERROR
```

---

# 15. Message Sending

Once a campaign is launched:

```text
Campaign
   ↓
Get approved contacts
   ↓
Get approved message
   ↓
Validate recipient
   ↓
Send through Evolution API
   ↓
Record result
```

The system should not assume that an API request being accepted means the message was delivered.

Message lifecycle:

```text
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

Failure path:

```text
SENDING
   ↓
FAILED
```

---

# 16. Campaign Controls

The user should be able to:

### Start

Start sending an approved campaign.

### Pause

Temporarily stop sending.

### Resume

Continue a paused campaign.

### Stop

Permanently stop the campaign.

### Retry

Retry failed messages where appropriate.

Example:

```text
Campaign: September Outreach

Total:       500
Pending:     320
Sent:        150
Delivered:   125
Failed:       30

[Pause Campaign] [Stop Campaign]
```

---

# 17. Sending Controls

The system should have configurable sending controls.

Examples:

```text
Messages per batch
Delay between messages
Maximum campaign messages
Retry attempts
```

The system should also support rate limiting and stop conditions.

These controls are intended to improve reliability and prevent accidental excessive sending; they should not be used to bypass WhatsApp's policies or enforcement.

---

# 18. Message Tracking

Every message should have a unique record.

Example:

```text
Message ID
Campaign ID
Contact ID
Phone Number
Generated Message
Final Message
Status
Evolution Message ID
Sent At
Delivered At
Read At
Failed At
Failure Reason
```

---

# 19. Webhook Processing

Evolution API events should be received by the backend through webhooks.

Example:

```text
Evolution API
      ↓
Webhook
      ↓
Backend
      ↓
Update Message Status
      ↓
Dashboard
```

The system should process events such as:

```text
MESSAGE_SENT
MESSAGE_DELIVERED
MESSAGE_READ
MESSAGE_FAILED
```

Webhook events should be stored for debugging and auditing.

---

# 20. Dashboard

The dashboard should provide an overview of the system.

### Metrics

```text
Total Contacts
Active Campaigns
Messages Sent
Messages Delivered
Messages Failed
Messages Pending
```

### Recent campaigns

```text
Campaign              Total    Sent    Delivered    Failed
-----------------------------------------------------------
September Outreach     500      450       420         30
Restaurant Campaign    200      180       165         15
```

---

# 21. Contact Management

The user should be able to:

* View contacts
* Search contacts
* Filter contacts
* Edit contacts
* Delete contacts
* View contact history
* View campaign participation

Contact detail:

```text
Rahul Sharma

Business:
Sharma Dental Clinic

Phone:
+91 XXXXX XXXXX

Business:
Dental Clinic

Campaign History:
- September Outreach
- Website Campaign
```

---

# 22. Campaign History

Each campaign should retain its historical information.

The user should be able to view:

```text
Campaign
 ├── Configuration
 ├── Contacts
 ├── Generated Messages
 ├── Sent Messages
 ├── Delivery Status
 ├── Failures
 └── Activity Log
```

---

# 23. AI Configuration

The system should eventually allow the user to configure:

### Tone

```text
Professional
Friendly
Casual
Persuasive
Minimal
```

### Language

```text
English
Hindi
Hinglish
```

### Message length

```text
Short
Medium
Long
```

### Objective

```text
Generate Lead
Book Meeting
Promote Service
Introduce Business
Follow Up
```

---

# 24. Safety and Consent

The system should include controls for responsible messaging.

A contact should be able to have:

```text
OPTED_IN
OPTED_OUT
BLOCKED
```

The system must not send messages to contacts marked as:

```text
OPTED_OUT
BLOCKED
```

The application should also provide a global campaign stop mechanism.

The system should comply with applicable WhatsApp Business policies and applicable privacy/communications laws. The platform should not be designed to bypass WhatsApp restrictions.

---

# 25. Error Handling

The system should gracefully handle:

### Invalid phone number

```text
Status: INVALID
Reason: Invalid phone number
```

### WhatsApp unavailable

```text
Status: FAILED
Reason: WhatsApp connection unavailable
```

### Evolution API error

Store:

```text
HTTP Status
Error Code
Error Message
Timestamp
```

### AI generation failure

The system should allow:

```text
Retry Generation
```

### Network failure

The message should remain:

```text
QUEUED
```

and be retried according to the retry policy.

---

# 26. Authentication

MVP should support basic authentication.

Users should be able to:

* Register/login
* Logout
* Change password
* Manage profile

Authentication should protect:

* Contacts
* Campaigns
* Messages
* WhatsApp instances
* AI configuration

---

# 27. Audit Logging

Important actions should be recorded.

Examples:

```text
USER_LOGIN
FILE_UPLOADED
CONTACT_IMPORTED
CAMPAIGN_CREATED
AI_MESSAGE_GENERATED
MESSAGE_EDITED
CAMPAIGN_APPROVED
CAMPAIGN_STARTED
CAMPAIGN_PAUSED
CAMPAIGN_STOPPED
MESSAGE_SENT
MESSAGE_FAILED
```

---

# 28. MVP Success Criteria

The MVP will be considered successful when a user can complete this complete flow:

```text
Login
 ↓
Upload Excel
 ↓
System validates file
 ↓
Contacts imported
 ↓
Create campaign
 ↓
AI generates personalized messages
 ↓
Review messages
 ↓
Approve campaign
 ↓
Connect WhatsApp
 ↓
Launch campaign
 ↓
Messages sent through Evolution API
 ↓
Delivery events received
 ↓
Dashboard displays results
```

The entire process should work without the user manually copying phone numbers or manually writing individual messages.

---

# 29. Technical Direction

The exact technology stack will be finalized in the System Architecture document.

The current planned components are:

```text
Frontend
Next.js

Backend
Node.js / Next.js API

Database
PostgreSQL or MySQL

ORM
Prisma

AI
LLM API

WhatsApp
Evolution API

Authentication
To be finalized

Storage
To be finalized
```

The architecture should keep the AI provider and WhatsApp integration modular so that they can be replaced later.

---

# 30. Future Roadmap

### Phase 1 — MVP

```text
Excel Upload
+
AI Message Generation
+
Review
+
Evolution API
+
WhatsApp Sending
+
Tracking
```

### Phase 2

```text
Scheduling
Contact Groups
Templates
Advanced Analytics
Message Personalization
```

### Phase 3

```text
AI Lead Qualification
AI WhatsApp Reply Assistant
Conversation History
CRM
Follow-up Automation
```

### Phase 4

```text
Multi-channel Outreach
WhatsApp
Email
SMS
Voice
```

---

# 31. Product Success Metric

The primary product metric is:

> **How much manual effort is eliminated between receiving a prospect list and completing personalized outreach.**

The ideal workflow should eventually become:

```text
Upload File
     ↓
Review Generated Campaign
     ↓
Launch
```

rather than manually processing each prospect individually.
