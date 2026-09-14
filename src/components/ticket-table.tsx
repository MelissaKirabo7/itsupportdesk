import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Initial, PriorityTag, StatusBadge } from "@/components/badges";
import { useTickets } from "@/lib/ticket-store";
import { slaState, type Ticket } from "@/lib/tickets";
import { cn } from "@/lib/utils";

function ago(iso: string, now: number) {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor((now - new Date(iso).getTime()) / 3_600_000);
  return hours >= 1 ? `${hours}h ago` : "just now";
}

export function TicketTable({
  tickets,
  now,
  showClaim = true,
  emptyLabel = "No tickets match these filters.",
}: {
  tickets: Ticket[];
  now: number;
  showClaim?: boolean;
  emptyLabel?: string;
}) {
  const { claim } = useTickets();

  if (tickets.length === 0) {
    return <p className="px-6 py-14 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">
            <th className="px-6 py-4 font-medium">Ticket</th>
            <th className="px-4 py-4 font-medium">Category</th>
            <th className="px-4 py-4 font-medium">Priority</th>
            <th className="px-4 py-4 font-medium">Status</th>
            <th className="px-4 py-4 font-medium">Assignee</th>
            <th className="px-4 py-4 font-medium">SLA</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const sla = slaState(t, now);
            return (
              <tr key={t.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                <td className="px-6 py-5">
                  <Link
                    to="/tickets/$ticketId"
                    params={{ ticketId: t.id }}
                    className="block max-w-md"
                  >
                    <span className="block font-display text-base font-medium hover:underline">
                      {t.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {t.ref} · {t.requester} · {t.location} · {ago(t.createdAt, now)}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-5 text-sm">{t.category}</td>
                <td className="px-4 py-5">
                  <PriorityTag priority={t.priority} />
                </td>
                <td className="px-4 py-5">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-5">
                  {t.assignee ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <Initial email={t.assignee} />
                      <span className="truncate text-sm">{t.assignee}</span>
                    </span>
                  ) : showClaim ? (
                    <button
                      onClick={() => claim(t.id)}
                      className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-5">
                  {sla.settled ? (
                    <span className="text-sm text-muted-foreground">Met</span>
                  ) : (
                    <div className="w-36">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          sla.overdue ? "text-alert" : "text-muted-foreground",
                        )}
                      >
                        {sla.label}
                      </span>
                      <div className="sla-bar mt-2">
                        <div
                          className={cn("h-full rounded-full", sla.overdue ? "bg-alert" : "bg-warn")}
                          style={{ width: `${Math.round(sla.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-5">
                  <Link
                    to="/tickets/$ticketId"
                    params={{ ticketId: t.id }}
                    aria-label={`Open ${t.ref}`}
                    className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
