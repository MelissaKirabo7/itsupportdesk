import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, PanelRight, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";
import { useAllFaq, useFaqActions } from "@/lib/extras-store";
import { useFaqArticles, useTickets } from "@/lib/ticket-store";
import { CATEGORIES, isStaffRole, type Ticket } from "@/lib/tickets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/faq")({
  head: () => ({
    meta: [
      { title: "Self-Help & FAQ — ServeDesk" },
      {
        name: "description",
        content:
          "Troubleshooting articles written by the IT team from real ticket resolutions: printing, Wi-Fi, passwords, hardware.",
      },
      { property: "og:title", content: "Self-Help & FAQ — ServeDesk" },
      { property: "og:description", content: "Troubleshooting steps from real ticket fixes." },
    ],
  }),
  component: FaqPage,
});

const field =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/25";

/** Turn recent resolved tickets into one plain-language report per busy category. */
function buildReports(tickets: Ticket[]) {
  const since = Date.now() - 90 * 86_400_000;
  const resolved = tickets.filter(
    (t) => t.resolution_notes && t.resolved_at && new Date(t.resolved_at).getTime() > since,
  );
  return CATEGORIES.map((c) => {
    const rows = resolved.filter((t) => t.category === c);
    if (rows.length < 2) return null;
    const fixes = Array.from(new Set(rows.map((t) => t.resolution_notes!.trim()))).slice(0, 4);
    const body =
      `We fixed ${rows.length} ${c.toLowerCase()} problems in the last 3 months. ` +
      `Here is what usually solved them — try these before logging a request:\n\n` +
      fixes.map((f, i) => `${i + 1}. ${f}`).join("\n") +
      `\n\nStill stuck? Submit a request and mention what you already tried.`;
    return { title: `Common ${c} fixes`, body, category: c };
  }).filter((r): r is { title: string; body: string; category: string } => r !== null);
}

function FaqPage() {
  const { role } = useAuth();
  const staff = isStaffRole(role);
  const { data: published = [], isLoading } = useFaqArticles();
  const { data: all = [] } = useAllFaq();
  const { tickets } = useTickets();
  const { create, patch, remove } = useFaqActions();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState({ title: "", body: "", category: "General" });
  const autoRan = useRef(false);

  const articles = staff ? all : published;
  const term = q.trim().toLowerCase();
  const rows = term
    ? articles.filter((a) => `${a.title} ${a.body} ${a.category}`.toLowerCase().includes(term))
    : articles;

  async function generate(silent = false) {
    const reports = buildReports(tickets);
    const existing = new Map(all.filter((a) => a.auto_generated).map((a) => [a.title, a.id]));
    for (const r of reports) {
      const id = existing.get(r.title);
      if (id) await remove.mutateAsync(id);
      await create.mutateAsync({ ...r, auto_generated: true });
    }
    if (!silent) toast.success(reports.length ? `${reports.length} trend reports refreshed` : "Not enough resolved tickets yet");
  }

  // Refresh automated reports weekly whenever a technician opens this page.
  useEffect(() => {
    if (!staff || autoRan.current || tickets.length === 0) return;
    const latest = all.filter((a) => a.auto_generated).map((a) => new Date(a.created_at).getTime());
    if (latest.length && Date.now() - Math.max(...latest) < 7 * 86_400_000) return;
    autoRan.current = true;
    void generate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, tickets.length, all.length]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Self-help & FAQ"
        subtitle="Fix it yourself in a minute — these articles come from real resolved tickets."
        action={
          staff ? (
            <button
              onClick={() => void generate()}
              className="flex items-center gap-2 rounded-full bg-card px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-muted"
            >
              <Sparkles className="h-4 w-4" /> Refresh trend reports
            </button>
          ) : undefined
        }
      />

      {staff ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.title.trim().length < 5 || draft.body.trim().length < 20)
              return toast.error("Add a title (5+) and steps (20+ characters).");
            create.mutate(
              { title: draft.title.trim(), body: draft.body.trim(), category: draft.category },
              { onSuccess: () => { setDraft({ title: "", body: "", category: "General" }); toast.success("Article published"); } },
            );
          }}
          className="grid gap-3 rounded-3xl bg-card p-6 shadow-sm md:grid-cols-[2fr_1fr]"
        >
          <h2 className="font-display text-lg font-semibold md:col-span-2">Write a self-help article</h2>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" aria-label="Article title" className={field} />
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} aria-label="Category" className={field}>
            {["General", ...CATEGORIES].map((c) => <option key={c}>{c}</option>)}
          </select>
          <textarea rows={4} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Plain-language steps anyone can follow" aria-label="Article steps" className={cn(field, "md:col-span-2")} />
          <button className="justify-self-start rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Publish</button>
        </form>
      ) : null}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search self-help articles..."
        aria-label="Search self-help articles"
        className="w-full max-w-lg rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading articles…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((a) => (
            <article key={a.id} className={cn("rounded-3xl bg-card p-6 shadow-sm", !a.published && "opacity-60")}>
              <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {a.category}
                {a.auto_generated ? <span className="rounded-full bg-accent/30 px-2 py-0.5 text-foreground">Trend report</span> : null}
                {staff && !a.published ? <span>· Hidden</span> : null}
              </p>
              <h2 className="mt-2 font-display text-lg font-semibold">{a.title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              {staff ? (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <button onClick={() => patch.mutate({ id: a.id, show_in_panel: !a.show_in_panel })} className={cn("flex items-center gap-1 rounded-full border px-3 py-1", a.show_in_panel ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    <PanelRight className="h-3.5 w-3.5" /> {a.show_in_panel ? "In request side panel" : "Not in side panel"}
                  </button>
                  <button onClick={() => patch.mutate({ id: a.id, published: !a.published })} className="flex items-center gap-1 rounded-full border border-border px-3 py-1">
                    {a.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {a.published ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => remove.mutate(a.id)} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:text-alert">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">No articles matched that search.</p> : null}
        </div>
      )}
    </div>
  );
}
