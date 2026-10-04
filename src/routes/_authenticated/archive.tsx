import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TicketTable } from "@/components/ticket-table";
import { useTickets } from "@/lib/ticket-store";
import { isActive, ticketsToCsv } from "@/lib/tickets";

export const Route = createFileRoute("/_authenticated/archive")({
  head: () => ({
    meta: [
      { title: "Archive — ServeDesk" },
      {
        name: "description",
        content: "Browse resolved and closed IT tickets with their full resolution history.",
      },
      { property: "og:title", content: "Archive — ServeDesk" },
      { property: "og:description", content: "Browse resolved and closed IT tickets." },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const { tickets, isLoading } = useTickets();
  const archived = tickets.filter((t) => !isActive(t));
  const withTimes = archived.filter((t) => t.resolved_at);
  const avgHours = withTimes.length
    ? withTimes.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / withTimes.length / 3_600_000
    : 0;
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const thisWeek = withTimes.filter((t) => new Date(t.resolved_at!) >= weekStart).length;
  const avgLabel = !withTimes.length ? "—" : avgHours < 48 ? `${avgHours.toFixed(1)}h` : `${(avgHours / 24).toFixed(1)}d`;

  function exportCsv() {
    const blob = new Blob([ticketsToCsv(archived)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servedesk-archive-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Archive"
        subtitle="Read-only history of resolved and closed tickets, kept for reporting."
        action={
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-full bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Average resolution time" value={avgLabel} hint="From logged to resolved" tone="dark" />
        <StatCard label="Resolved this week" value={thisWeek} hint="Since Monday" />
        <StatCard label="Archived total" value={archived.length} hint="Resolved and closed" />
      </div>
      <section className="rounded-3xl bg-card shadow-sm">
        {isLoading ? (
          <p className="px-6 py-14 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <TicketTable
            tickets={archived}
            now={Date.now()}
            showClaim={false}
            emptyLabel="Nothing archived yet."
          />
        )}
      </section>
    </div>
  );
}
