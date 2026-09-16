import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lightbulb, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";
import { useFaqArticles, useTicketActions, useTickets } from "@/lib/ticket-store";
import {
  CATEGORIES,
  PRIORITIES,
  PRIORITY_LABEL,
  SLA_HOURS,
  isActive,
  type Category,
  type Priority,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/submit")({
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

const STOPWORDS = new Set([
  "the","and","not","with","from","that","this","have","will","for","are","was","when","cant","cannot","my","is","it","on","in","to","a","of",
]);

function tokens(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function SubmitPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { create } = useTicketActions();
  const { tickets } = useTickets();
  const { data: faqs = [] } = useFaqArticles();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
  const [workstation, setWorkstation] = useState(profile?.workstation ?? "");
  const [category, setCategory] = useState<Category>("Hardware");
  const [priority, setPriority] = useState<Priority>("medium");
  type Errors = { title?: string; description?: string; location?: string };
  const [errors, setErrors] = useState<Errors>({});

  const words = useMemo(() => tokens(`${title} ${category}`), [title, category]);

  const suggestions = useMemo(() => {
    if (words.length === 0) return [];
    return faqs
      .map((a) => ({
        a,
        score: tokens(`${a.title} ${a.category}`).filter((w) => words.includes(w)).length,
      }))
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3)
      .map((r) => r.a);
  }, [faqs, words]);

  const duplicates = useMemo(() => {
    if (title.trim().length < 6) return [];
    const recent = Date.now() - 3 * 86_400_000;
    return tickets
      .filter(isActive)
      .filter((t) => new Date(t.created_at).getTime() > recent)
      .filter((t) => {
        const overlap = tokens(t.title).filter((w) => tokens(title).includes(w)).length;
        const sameSpot =
          (workstation && t.workstation === workstation) || (location && t.location === location);
        return overlap >= 2 || (sameSpot && t.category === category);
      })
      .slice(0, 3);
  }, [tickets, title, workstation, location, category]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (title.trim().length < 8) next.title = "Give a summary of at least 8 characters.";
    if (description.trim().length < 20)
      next.description = "Add at least 20 characters so the technician can triage it.";
    if (!location.trim()) next.location = "Tell us where the issue is.";
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      const ticket = await create.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        department: department.trim(),
        workstation: workstation.trim(),
        category,
        priority,
      });
      if (user) {
        await import("@/integrations/supabase/client").then(({ supabase }) =>
          supabase
            .from("profiles")
            .update({
              location: location.trim(),
              department: department.trim(),
              workstation: workstation.trim(),
            })
            .eq("id", user.id),
        );
        await refreshProfile();
      }
      toast.success(`Request ${ticket.ref} submitted`, {
        description: `First response target: ${SLA_HOURS[priority]}h. A confirmation is on your ticket page.`,
      });
      void navigate({ to: "/tickets/$ticketId", params: { ticketId: ticket.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the request");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Submit a request"
        subtitle="Tell us what's broken. The desk triages new tickets within the SLA window."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="space-y-5 rounded-3xl bg-card p-6 shadow-sm">
          <div className="rounded-2xl bg-muted/60 p-4 text-sm">
            <p className="font-medium">Submitting as {profile?.full_name || user?.email}</p>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>

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

          {duplicates.length > 0 ? (
            <div className="rounded-2xl border border-warn/40 bg-warn-soft p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-warn">
                <Users className="h-4 w-4" />
                Similar open tickets already exist
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {duplicates.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.ref}</span>
                    <span className="truncate">{t.title}</span>
                    <span className="text-muted-foreground">· {t.location}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                If one of these is your issue, you can follow it instead of logging a duplicate.
              </p>
            </div>
          ) : null}

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
              <label className={labelCls} htmlFor="workstation">
                Workstation ID
              </label>
              <input
                id="workstation"
                value={workstation}
                onChange={(e) => setWorkstation(e.target.value)}
                placeholder="VIC-2141"
                className={field}
              />
            </div>
            <div className="space-y-2">
              <label className={labelCls} htmlFor="department">
                Department
              </label>
              <input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Finance"
                className={field}
              />
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
              First response target: {SLA_HOURS[priority]} hours.
            </p>
          </fieldset>

          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {create.isPending ? "Submitting…" : "Submit request"}
          </button>
        </form>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Lightbulb className="h-4 w-4" />
              Try this first
            </h2>
            {suggestions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Start typing a summary and matching self-help steps appear here.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {suggestions.map((a) => (
                  <li key={a.id}>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Priority matrix</h2>
            <ul className="mt-4 divide-y divide-border text-sm">
              {PRIORITIES.slice()
                .reverse()
                .map((p) => (
                  <li key={p} className="flex items-center justify-between py-3">
                    <span>{PRIORITY_LABEL[p]}</span>
                    <span className="font-semibold">{SLA_HOURS[p]}h first response</span>
                  </li>
                ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
