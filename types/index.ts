export type CampaignStatus =
  | "DRAFT"
  | "GENERATING"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export type MessageStatus =
  | "PENDING"
  | "GENERATING"
  | "GENERATED"
  | "APPROVED"
  | "REJECTED"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "SKIPPED";

export type ContactStatus =
  | "READY"
  | "PROCESSING"
  | "CONTACTED"
  | "RESPONDED"
  | "OPTED_IN"
  | "OPTED_OUT"
  | "BLOCKED"
  | "INVALID";

export interface GenerateMessageInput {
  name: string;
  businessName: string;
  businessWork: string;
  objective: string;
  tone: string;
  language: string;
  cta: string;
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  errors: Array<{ row: number; phone?: string; error: string }>;
  batchId?: string;
}
