import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Initial, PriorityTag, StatusBadge } from "@/components/badges";
import { useTickets } from "@/lib/ticket-store";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  TECHNICIANS,
  slaState,
  type Priority,
  type Status,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tickets/$ticketId")({
  head: () => ({
    meta: [
      { title: "Ticket detail — ServeDesk" },
      {
        name: "description",
        content:
          "Full ticket workspace: status and priority controls, assignment, SLA timer and the comment timeline.",
      },
      { property: "og:title", content: "Ticket detail — ServeDesk" },
      { property: "og:description", content: "Ticket workspace with SLA timer and notes." },
    ],
  }),
  component: TicketDetail,
});

const controlCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/25";

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const { tickets, update, addNote } = useTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);

  if (!ticket) {
    return (
      <div className="rounded-3xl bg-card p-10 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">That ticket no longer exists.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold underline">
          Back to the queue
        </Link>
      </div>
    );
  }

  const sla = slaState(ticket, Date.now());

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Active queue
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-widest text-muted-foreground">
                {ticket.ref}
              </span>
              <PriorityTag priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
            <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{ticket.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {ticket.requester} · {ticket.location} · {ticket.category}
            </p>
            <p className="mt-5 text-sm leading-relaxed">{ticket.description}</p>
          </section>

          <section className="rounded-3xl bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Timeline</h2>
            <ol className="mt-5 space-y-4">
              {ticket.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No updates yet.</p>
              ) : null}
              {ticket.notes.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "rounded-2xl border p-4",
                    n.internal ? "border-warn/30 bg-warn-soft" : "border-border bg-background",
                  )}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Initial email={n.author} />
                    <span className="truncate text-sm font-medium">{n.author}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {n.internal ? (
                        <>
                          <Lock className="h-3 w-3" /> Internal note
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-3 w-3" /> Public reply
                        </>
                      )}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{n.body}</p>
                </li>
              ))}
            </ol>

            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (body.trim().length < 3) return;
                addNote(ticket.id, body.trim(), internal);
                setBody("");
                toast.success(internal ? "Internal note added" : "Reply sent to requester");
              }}
            >
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={internal ? "Visible to technicians only…" : "Reply to the requester…"}
                aria-label="Add an update"
                className={cn(controlCls, "resize-y")}
              />
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-full border border-border p-1">
                  {[
                    { v: false, l: "Public reply" },
                    { v: true, l: "Internal note" },
                  ].map((o) => (
                    <button
                      type="button"
                      key={o.l}
                      onClick={() => setInternal(o.v)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                        internal === o.v
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="ml-auto rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Add update
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-4 rounded-3xl bg-card p-6 shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              SLA
            </p>
            <p
              className={cn(
                "mt-2 font-display text-2xl font-semibold",
                sla.overdue ? "text-alert" : "",
              )}
            >
              {sla.settled ? "Met" : sla.label}
            </p>
            <div className="sla-bar mt-3">
              <div
                className={cn("h-full rounded-full", sla.overdue ? "bg-alert" : "bg-warn")}
                style={{ width: `${Math.round(sla.progress * 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className={controlCls}
              value={ticket.status}
              onChange={(e) => update(ticket.id, { status: e.target.value as Status })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="priority">
              Priority
            </label>
            <select
              id="priority"
              className={controlCls}
              value={ticket.priority}
              onChange={(e) => update(ticket.id, { priority: e.target.value as Priority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="assignee">
              Assignee
            </label>
            <select
              id="assignee"
              className={controlCls}
              value={ticket.assignee ?? ""}
              onChange={(e) => update(ticket.id, { assignee: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {TECHNICIANS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{new Date(ticket.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
