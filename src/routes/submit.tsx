import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import {
  CATEGORIES,
  CURRENT_USER,
  PRIORITIES,
  PRIORITY_LABEL,
  SLA_HOURS,
  type Category,
  type Priority,
} from "@/lib/tickets";
import { useTickets } from "@/lib/ticket-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit a Request — ServeDesk" },
      {
        name: "description",
        content:
          "Raise an IT support request: describe the issue, pick a category and priority, and get an SLA-backed response.",
      },
      { property: "og:title", content: "Submit a Request — ServeDesk" },
      { property: "og:description", content: "Raise an IT support request in under a minute." },
    ],
  }),
  component: SubmitPage,
});

const field =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/25";
const labelCls = "block text-sm font-medium";

function SubmitPage() {
  const { create } = useTickets();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<Category>("Hardware");
  const [priority, setPriority] = useState<Priority>("medium");
  type Errors = { title?: string; description?: string; location?: string };
  const [errors, setErrors] = useState<Errors>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (title.trim().length < 8) next.title = "Give a summary of at least 8 characters.";
    if (description.trim().length < 20)
      next.description = "Add at least 20 characters so the technician can triage it.";
    if (!location.trim()) next.location = "Tell us where the issue is.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const ticket = create({
      title: title.trim(),
      description: description.trim(),
      requester: CURRENT_USER.email,
      location: location.trim(),
      category,
      priority,
    });
    toast.success(`Request ${ticket.ref} submitted`, {
      description: `First response target: ${SLA_HOURS[priority]}h.`,
    });
    navigate({ to: "/tickets/$ticketId", params: { ticketId: ticket.id } });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Submit a request"
        subtitle="Tell us what's broken. The desk triages new tickets within the SLA window."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="space-y-5 rounded-3xl bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <label className={labelCls} htmlFor="title">
              Summary
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Printer is not working/turning on."
              className={field}
            />
            {errors.title ? <p className="text-xs text-alert">{errors.title}</p> : null}
          </div>

          <div className="space-y-2">
            <label className={labelCls} htmlFor="description">
              What is happening?
            </label>
            <textarea
              id="description"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Include error messages, when it started and anything you already tried."
              className={cn(field, "resize-y")}
            />
            {errors.description ? <p className="text-xs text-alert">{errors.description}</p> : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={labelCls} htmlFor="location">
                Location
              </label>
              <input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Block B · Room 214"
                className={field}
              />
              {errors.location ? <p className="text-xs text-alert">{errors.location}</p> : null}
            </div>
            <div className="space-y-2">
              <label className={labelCls} htmlFor="category">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={field}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className={labelCls}>Priority</legend>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    priority === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              First-response target for {PRIORITY_LABEL[priority]}: {SLA_HOURS[priority]} hours.
            </p>
          </fieldset>

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
          >
            Submit request
          </button>
        </form>

        <aside className="space-y-4 rounded-3xl bg-primary p-6 text-primary-foreground">
          <h2 className="text-lg font-semibold">Priority matrix</h2>
          <ul className="space-y-3 text-sm text-primary-foreground/80">
            <li>
              <strong className="text-primary-foreground">Critical</strong> — a whole site, class or
              service is down. 2h response.
            </li>
            <li>
              <strong className="text-primary-foreground">High</strong> — several people blocked, no
              workaround. 4h response.
            </li>
            <li>
              <strong className="text-primary-foreground">Medium</strong> — one person blocked or a
              workaround exists. 8h response.
            </li>
            <li>
              <strong className="text-primary-foreground">Low</strong> — requests, questions and
              nice-to-haves. 24h response.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
