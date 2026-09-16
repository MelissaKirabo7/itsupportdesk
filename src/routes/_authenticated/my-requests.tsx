import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { TicketTable } from "@/components/ticket-table";
import { useAuth } from "@/lib/auth";
import { useTickets } from "@/lib/ticket-store";

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
  const { user } = useAuth();
  const { tickets, isLoading } = useTickets();
  const now = Date.now();
  const mine = tickets.filter((t) => t.requester_id === user?.id);

  return (
    <div className="space-y-8">
      <PageHeader title="My requests" subtitle="Everything you have raised with the service desk." />
      <section className="rounded-3xl bg-card shadow-sm">
        {isLoading ? (
          <p className="px-6 py-14 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <TicketTable
            tickets={mine}
            now={now}
            showClaim={false}
            emptyLabel="You haven't raised any requests yet."
          />
        )}
      </section>
    </div>
  );
}
