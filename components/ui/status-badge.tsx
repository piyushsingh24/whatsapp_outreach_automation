import { Badge } from "@/components/ui/badge";

const MAP: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  // Campaign
  DRAFT: "outline",
  GENERATING: "warning",
  READY_FOR_REVIEW: "warning",
  APPROVED: "secondary",
  RUNNING: "default",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELLED: "outline",
  FAILED: "destructive",
  // Message
  PENDING: "outline",
  GENERATED: "secondary",
  REJECTED: "destructive",
  QUEUED: "warning",
  SENDING: "warning",
  SENT: "default",
  DELIVERED: "success",
  READ: "success",
  SKIPPED: "outline",
  // Contact
  READY: "secondary",
  PROCESSING: "warning",
  CONTACTED: "default",
  RESPONDED: "success",
  OPTED_IN: "success",
  OPTED_OUT: "outline",
  BLOCKED: "destructive",
  INVALID: "destructive",
  // WhatsApp instance
  CONNECTED: "success",
  DISCONNECTED: "outline",
  CONNECTING: "warning",
  QR_REQUIRED: "warning",
  ERROR: "destructive",
};

/** Colored badge for any campaign / message / contact / instance status. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={MAP[status] ?? "secondary"} className={className}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
