import type { Database } from "@/integrations/supabase/types";

export type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
export type TicketNote = Database["public"]["Tables"]["ticket_notes"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type FaqArticle = Database["public"]["Tables"]["faq_articles"]["Row"];
export type CannedResponse = Database["public"]["Tables"]["canned_responses"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];

export type Priority = Database["public"]["Enums"]["ticket_priority"];
export type Status = Database["public"]["Enums"]["ticket_status"];
export type Role = Database["public"]["Enums"]["app_role"];

export type Category =
  | "Hardware"
  | "Software"
  | "Network/Wi-Fi"
  | "Peripherals"
  | "Access/Passwords"
  | "Printing"
  | "Accounts";

export const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
export const STATUSES: Status[] = ["new", "in_progress", "pending", "resolved", "closed"];
export const CATEGORIES: Category[] = [
  "Hardware",
  "Software",
  "Network/Wi-Fi",
  "Peripherals",
  "Access/Passwords",
  "Printing",
  "Accounts",
];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};

export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  in_progress: "In Progress",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

export const ROLE_LABEL: Record<Role, string> = {
  submitter: "Employee",
  technician: "IT Technician",
  admin: "Administrator",
};

/** First-response SLA targets, in hours, per priority. */
export const SLA_HOURS: Record<Priority, number> = {
  critical: 2,
  high: 4,
  medium: 8,
  low: 24,
};

/** Unclaimed critical tickets escalate after this many minutes. */
export const ESCALATION_MINUTES = 30;
/** Nudge the submitter after this long in Pending (User). */
export const PENDING_NUDGE_HOURS = 48;
/** Pending tickets auto-close after this many days of silence. */
export const PENDING_AUTOCLOSE_DAYS = 5;
/** Submitters can reopen a resolved ticket within this many days. */
export const REOPEN_WINDOW_DAYS = 3;

export const isActive = (t: Ticket) =>
  t.status === "new" || t.status === "in_progress" || t.status === "pending";

export const isStaffRole = (role: Role | null) => role === "technician" || role === "admin";

export function slaState(t: Ticket, now: number) {
  const due = new Date(t.sla_due_at).getTime();
  const diffMs = due - now;
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3600_000);
  const mins = Math.floor((abs % 3600_000) / 60_000);
  const label = `${hours}h ${mins}m ${overdue ? "overdue" : "left"}`;
  const total = SLA_HOURS[t.priority] * 3600_000;
  const used = Math.min(1, Math.max(0, (now - new Date(t.created_at).getTime()) / total));
  const settled = t.status === "resolved" || t.status === "closed";
  return { overdue: overdue && !settled, label, progress: used, settled };
}

/** Critical ticket left unclaimed past the escalation threshold. */
export function needsEscalation(t: Ticket, now: number) {
  if (t.assignee_id || t.priority !== "critical" || !isActive(t)) return false;
  return now - new Date(t.created_at).getTime() > ESCALATION_MINUTES * 60_000;
}

export function pendingState(t: Ticket, now: number) {
  if (t.status !== "pending" || !t.pending_since) return null;
  const hours = (now - new Date(t.pending_since).getTime()) / 3600_000;
  return {
    hours: Math.floor(hours),
    nudgeDue: hours >= PENDING_NUDGE_HOURS,
    autoCloseDue: hours >= PENDING_AUTOCLOSE_DAYS * 24,
  };
}

export function canReopen(t: Ticket, now: number) {
  if (t.status !== "resolved" && t.status !== "closed") return false;
  if (!t.resolved_at) return false;
  return now - new Date(t.resolved_at).getTime() <= REOPEN_WINDOW_DAYS * 86_400_000;
}

export function ago(iso: string, now: number) {
  const ms = now - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h ago`;
  const mins = Math.floor(ms / 60_000);
  return mins >= 1 ? `${mins}m ago` : "just now";
}

export function ticketsToCsv(tickets: Ticket[]) {
  const cols = [
    "ref",
    "title",
    "requester_email",
    "assignee_email",
    "location",
    "department",
    "workstation",
    "category",
    "priority",
    "status",
    "created_at",
    "resolved_at",
    "resolution_notes",
    "satisfaction",
  ] as const;
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...tickets.map((t) => cols.map((c) => esc(t[c])).join(","))].join("\n");
}
