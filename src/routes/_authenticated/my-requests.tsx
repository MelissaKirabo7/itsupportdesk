import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Lightbulb, Plus, Search } from "lucide-react";
import { useState } from "react";
import { PriorityTag, StatusBadge } from "@/components/badges";
import { PageHeader } from "@/components/page-header";
import { TicketTable } from "@/components/ticket-table";
import { useAuth } from "@/lib/auth";
import { useFaqArticles, useTickets } from "@/lib/ticket-store";
import { ago, isActive } from "@/lib/tickets";

export const Route = createFileRoute("/_authenticated/my-requests")({
  head: () => ({
    meta: [
      { title: "My Requests — ServeDesk" },
      {
        name: "description",
        content: "Follow the IT requests you raised, their current status and SLA countdown.",
      },
      { property: "og:title", content: "My Requests — ServeDesk" },
      {
        property: "og:description",
        content: "Follow the IT requests you raised and their current status.",
      },
    ],
  }),
  component: MyRequests,
});

function MyRequests() {
  const { user, profile } = useAuth();
  const { tickets, isLoading } = useTickets();
  const { data: faqs = [] } = useFaqArticles();
  const [q, setQ] = useState("");
  const now = Date.now();
  const mine = tickets.filter((t) => t.requester_id === user?.id);
  const term = q.trim().toLowerCase();
  const filtered = term
    ? mine.filter((t) => `${t.ref} ${t.title} ${t.description} ${t.category}`.toLowerCase().includes(term))
    : mine;
  const recent = mine.filter(isActive).slice(0, 3);
  const helpful = (term
    ? faqs.filter((a) => `${a.title} ${a.body}`.toLowerCase().includes(term))
    : faqs.filter((a) => a.show_in_panel)
  ).slice(0, 4);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} — how can IT help?`}
        subtitle="Search your requests and self-help articles, or log something new."
        action={
          <Link to="/submit" className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> New request
          </Link>
        }
      />

      <div className="relative max-w-2xl">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Describe your problem or search a ticket number…"
          aria-label="Search requests and help"
          className="w-full rounded-full border border-border bg-card py-4 pl-12 pr-5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {recent.length > 0 && !term ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {recent.map((t) => (
                <Link key={t.id} to="/tickets/$ticketId" params={{ ticketId: t.id }} className="group rounded-3xl bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {t.ref}
                    <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-2 line-clamp-2 font-medium">{t.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={t.status} />
                    <PriorityTag priority={t.priority} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Updated {ago(t.updated_at, now)}</p>
                </Link>
              ))}
            </div>
          ) : null}
          <section className="rounded-3xl bg-card shadow-sm">
            {isLoading ? (
              <p className="px-6 py-14 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <TicketTable tickets={filtered} now={now} showClaim={false} emptyLabel="No requests found." />
            )}
          </section>
        </div>

        <aside className="rounded-3xl bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Lightbulb className="h-4 w-4" /> Self-help
          </h2>
          <ul className="mt-4 space-y-4">
            {helpful.map((a) => (
              <li key={a.id}>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              </li>
            ))}
            {helpful.length === 0 ? <p className="text-sm text-muted-foreground">No matching articles.</p> : null}
          </ul>
          <Link to="/faq" className="mt-5 inline-block text-sm underline">Browse all articles</Link>
        </aside>
      </div>
    </div>
  );
}
