import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BookPlus, Lock, MessageSquare, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Initial, PriorityTag, StatusBadge } from "@/components/badges";
import { useAuth } from "@/lib/auth";
import {
  useCannedResponses,
  useNotes,
  useStaffDirectory,
  useTicket,
  useTicketActions,
} from "@/lib/ticket-store";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  REOPEN_WINDOW_DAYS,
  STATUSES,
  STATUS_LABEL,
  ago,
  canReopen,
  isStaffRole,
  needsEscalation,
  pendingState,
  slaState,
  type Priority,
  type Status,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { ImagePicker } from "@/components/image-picker";
import { uploadImages, useAttachments, useFeedback } from "@/lib/extras-store";

export const Route = createFileRoute("/_authenticated/tickets/$ticketId")({
  head: () => ({
    meta: [
      { title: "Ticket workspace — ServeDesk" },
      {
        name: "description",
        content:
          "Work a single IT ticket: SLA countdown, status and assignee controls, internal work log and public replies.",
      },
      { property: "og:title", content: "Ticket workspace — ServeDesk" },
      { property: "og:description", content: "Work a single IT ticket end to end." },
    ],
  }),
  component: TicketPage,
});

const selectClass =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/25";

function TicketPage() {
  const { ticketId } = Route.useParams();
  const { user, role } = useAuth();
  const staff = isStaffRole(role);
  const { data: ticket, isLoading } = useTicket(ticketId);
  const { data: notes = [] } = useNotes(ticketId);
  const { data: directory = [] } = useStaffDirectory();
  const { data: canned = [] } = useCannedResponses();
  const { update, claim, assign, addNote, resolve, reopen, publishFaq } = useTicketActions();

  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [resolution, setResolution] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [stars, setStars] = useState(0);
  const [reason, setReason] = useState("");
  const { data: attachments = [], refetch: refetchAttachments } = useAttachments(ticketId);
  const { feedback, save: saveFeedback } = useFeedback(ticketId);
  const now = Date.now();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading ticket…</p>;
  if (!ticket)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Ticket not available</h1>
        <p className="text-sm text-muted-foreground">
          It may have been removed, or you don't have access to it.
        </p>
        <Link to="/my-requests" className="text-sm underline">
          Back to my requests
        </Link>
      </div>
    );

  const sla = slaState(ticket, now);
  const pending = pendingState(ticket, now);
  const isRequester = ticket.requester_id === user?.id;
  const settled = ticket.status === "resolved" || ticket.status === "closed";
  const staffActs = staff && !isRequester;
  const canReply = staffActs || isRequester;

  function notify(message: string) {
    return {
      onSuccess: () => toast.success(message),
      onError: (e: Error) => toast.error(e.message),
    };
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground">{ticket.ref}</span>
          <StatusBadge status={ticket.status} />
          <PriorityTag priority={ticket.priority} />
          {needsEscalation(ticket, now) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-alert-soft px-3 py-1 text-xs font-semibold text-alert">
              <AlertTriangle className="h-3 w-3" /> Escalated
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold">{ticket.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ticket.requester_email} · {ticket.location}
          {ticket.workstation ? ` · ${ticket.workstation}` : ""} ·{" "}
          {ago(ticket.created_at, now)}
        </p>

        {!sla.settled ? (
          <div className="mt-5 max-w-sm">
            <p className={cn("text-sm font-medium", sla.overdue ? "text-alert" : "text-muted-foreground")}>
              First response SLA · {sla.label}
            </p>
            <div className="sla-bar mt-2">
              <div
                className={cn("h-full rounded-full", sla.overdue ? "bg-alert" : "bg-warn")}
                style={{ width: `${Math.round(sla.progress * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        {pending?.nudgeDue ? (
          <p className="mt-5 rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
            Waiting on the requester for {pending.hours}h. It will auto-close if there is no reply.
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {ticket.description}
            </p>
            {attachments.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {attachments.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" title={a.file_name}>
                    <img src={a.url} alt={a.file_name} className="h-24 w-24 rounded-xl object-cover" />
                  </a>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Activity</h2>
            <ol className="mt-5 space-y-5">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No updates yet.</p>
              ) : null}
              {notes.map((n) => (
                <li key={n.id} className="flex gap-3">
                  <Initial email={n.author_email} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {n.author_email}
                      <span className="text-xs font-normal text-muted-foreground">
                        {ago(n.created_at, now)}
                      </span>
                      {n.internal ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          <Lock className="h-3 w-3" /> Internal
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {n.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {!canReply ? (
              <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
                {isRequester ? "" : "Only the IT team and the person who raised this ticket can reply."}
              </p>
            ) : (
            <div className="mt-6 space-y-3 border-t border-border pt-5">
              {staffActs && canned.length > 0 ? (
                <select
                  aria-label="Insert a canned response"
                  className={selectClass}
                  value=""
                  onChange={(e) => {
                    const found = canned.find((c) => c.id === e.target.value);
                    if (found) setReply(found.body);
                  }}
                >
                  <option value="">Insert a canned response…</option>
                  {canned.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              ) : null}
              <textarea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={internal ? "Internal work log — the requester will not see this." : "Reply to the requester…"}
                aria-label="Add an update"
                className={cn(selectClass, "resize-y")}
              />
              <ImagePicker files={files} onChange={setFiles} />
              <div className="flex flex-wrap items-center gap-3">
                {staffActs ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={internal}
                      onChange={(e) => setInternal(e.target.checked)}
                    />
                    Internal note
                  </label>
                ) : null}
                <button
                  onClick={() => {
                    if (reply.trim().length < 2) return;
                    addNote.mutate(
                      { ticketId: ticket.id, body: reply.trim(), internal: staffActs && internal },
                      {
                        onSuccess: async (noteId) => {
                          if (files.length && user) {
                            try {
                              await uploadImages(user.id, ticket.id, files, noteId);
                              void refetchAttachments();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Image upload failed");
                            }
                          }
                          setFiles([]);
                          setReply("");
                          toast.success("Update posted");
                        },
                        onError: (e) => toast.error(e.message),
                      },
                    );
                  }}
                  className="ml-auto flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <MessageSquare className="h-4 w-4" />
                  Post update
                </button>
              </div>
            </div>
            )}
          </section>

          {settled && ticket.resolution_notes ? (
            <section className="rounded-3xl bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-semibold">Resolution</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {ticket.resolution_notes}
              </p>
              {staffActs ? (
                <button
                  onClick={() =>
                    publishFaq.mutate(
                      {
                        title: ticket.title,
                        body: ticket.resolution_notes ?? "",
                        category: ticket.category,
                        ticketId: ticket.id,
                      },
                      notify("Published to Self-Help & FAQ"),
                    )
                  }
                  className="mt-4 flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <BookPlus className="h-4 w-4" />
                  Publish as FAQ article
                </button>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          {staff && isRequester ? (
            <p className="rounded-3xl bg-card p-6 text-sm text-muted-foreground shadow-sm">
              You raised this ticket, so another technician must claim and work it.
            </p>
          ) : null}
          {staffActs ? (
            <section className="space-y-4 rounded-3xl bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-semibold">Controls</h2>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="status">
                  Status
                </label>
                <select
                  id="status"
                  className={selectClass}
                  value={ticket.status}
                  onChange={(e) =>
                    update.mutate(
                      { id: ticket.id, patch: { status: e.target.value as Status } },
                      notify("Status updated"),
                    )
                  }
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
                  className={selectClass}
                  value={ticket.priority}
                  onChange={(e) =>
                    update.mutate(
                      { id: ticket.id, patch: { priority: e.target.value as Priority } },
                      notify("Priority updated — SLA recalculated"),
                    )
                  }
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
                  className={selectClass}
                  value={ticket.assignee_id ?? ""}
                  onChange={(e) => {
                    const person = directory.find((p) => p.id === e.target.value);
                    if (person)
                      assign.mutate(
                        { id: ticket.id, userId: person.id, email: person.email },
                        notify(`Delegated to ${person.email}`),
                      );
                  }}
                >
                  <option value="">Unassigned</option>
                  {directory.filter((p) => p.id !== ticket.requester_id).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.email}
                      {p.on_leave ? " (on leave)" : ""}
                    </option>
                  ))}
                </select>
                {!ticket.assignee_id ? (
                  <button
                    onClick={() =>
                      claim.mutate(
                        { id: ticket.id, status: ticket.status },
                        notify("Assigned to you"),
                      )
                    }
                    className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Claim this ticket
                  </button>
                ) : null}
              </div>

              {!settled ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <label className="text-sm font-medium" htmlFor="resolution">
                    Resolution notes (required)
                  </label>
                  <textarea
                    id="resolution"
                    rows={4}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="What fixed it? Steps taken, parts replaced, follow-up needed."
                    className={cn(selectClass, "resize-y")}
                  />
                  <button
                    onClick={() => {
                      if (resolution.trim().length < 10) {
                        toast.error("Add at least 10 characters of resolution notes.");
                        return;
                      }
                      resolve.mutate(
                        { id: ticket.id, notes: resolution.trim() },
                        notify("Ticket resolved and archived"),
                      );
                    }}
                    className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Resolve ticket
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {isRequester && settled ? (
            <section className="space-y-4 rounded-3xl bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-semibold">How was the service you received?</h2>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    aria-label={`Rate ${n} out of 5`}
                    onClick={() => setStars(n)}
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-full border transition-colors",
                      (stars || feedback?.rating || 0) >= n
                        ? "border-warn bg-warn-soft text-warn"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <Star className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={feedback?.comment ?? "Tell us why you gave this rating (required)"}
                aria-label="Reason for your rating"
                className={cn(selectClass, "resize-y")}
              />
              <button
                onClick={() => {
                  const rating = stars || feedback?.rating || 0;
                  if (!rating) { toast.error("Choose a star rating first."); return; }
                  if (reason.trim().length < 5) { toast.error("Please explain your rating (at least 5 characters)."); return; }
                  saveFeedback.mutate(
                    { rating, comment: reason.trim() },
                    { onSuccess: () => { setReason(""); toast.success("Thanks for your feedback"); }, onError: (e) => toast.error(e.message) },
                  );
                }}
                className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {feedback ? "Update feedback" : "Submit feedback"}
              </button>
              {feedback ? (
                <p className="text-xs text-muted-foreground">You rated {feedback.rating}/5: “{feedback.comment}”</p>
              ) : null}
              {canReopen(ticket, now) ? (
                <button
                  onClick={() =>
                    reopen.mutate(
                      { id: ticket.id, reason: "The issue came back." },
                      notify("Ticket reopened"),
                    )
                  }
                  className="w-full rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Reopen this ticket
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The {REOPEN_WINDOW_DAYS}-day reopen window has passed — raise a new request if it
                  happens again.
                </p>
              )}
            </section>
          ) : null}

          <section className="rounded-3xl bg-card p-6 shadow-sm text-sm">
            <h2 className="font-display text-lg font-semibold">Details</h2>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Category</dt>
                <dd>{ticket.category}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Department</dt>
                <dd>{ticket.department || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Workstation</dt>
                <dd>{ticket.workstation || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Last update</dt>
                <dd>{ago(ticket.updated_at, now)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
