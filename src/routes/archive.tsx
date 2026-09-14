import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { TicketTable } from "@/components/ticket-table";
import { useTickets } from "@/lib/ticket-store";
import { isActive } from "@/lib/tickets";

export const Route = createFileRoute("/archive")({
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
  const { tickets } = useTickets();
  const archived = tickets.filter((t) => !isActive(t));

  return (
    <div className="space-y-8">
      <PageHeader title="Archive" subtitle="Resolved and closed tickets, kept for reporting." />
      <section className="rounded-3xl bg-card shadow-sm">
        <TicketTable
          tickets={archived}
          now={Date.now()}
          showClaim={false}
          emptyLabel="Nothing archived yet."
        />
      </section>
    </div>
  );
}
