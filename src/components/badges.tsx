import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Status } from "@/lib/tickets";
import { cn } from "@/lib/utils";

const priorityStyles: Record<Priority, string> = {
  low: "border-border bg-secondary text-muted-foreground",
  medium: "border-warn/30 bg-warn-soft text-warn",
  high: "border-warn/40 bg-warn-soft text-warn",
  critical: "border-alert/30 bg-alert-soft text-alert",
};

export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide",
        priorityStyles[priority],
      )}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const statusStyles: Record<Status, string> = {
  new: "bg-signal-new text-signal-new-fg",
  in_progress: "bg-signal-progress text-signal-progress-fg",
  pending: "bg-signal-hold text-signal-hold-fg",
  resolved: "bg-signal-done text-signal-done-fg",
  closed: "bg-secondary text-muted-foreground",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        statusStyles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Initial({ email, className }: { email: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground",
        className,
      )}
    >
      {email.charAt(0).toUpperCase()}
    </span>
  );
}
