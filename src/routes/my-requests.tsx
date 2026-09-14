import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { TicketTable } from "@/components/ticket-table";
import { useTickets } from "@/lib/ticket-store";
import { CURRENT_USER } from "@/lib/tickets";

export const Route = createFileRoute("/my-requests")({
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
  const { tickets } = useTickets();
  const now = Date.now();
  const mine = tickets.filter(
    (t) => t.requester === CURRENT_USER.email || t.requester === CURRENT_USER.name,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="My requests"
        subtitle="Everything you have raised with the service desk."
      />
      <section className="rounded-3xl bg-card shadow-sm">
        <TicketTable
          tickets={mine}
          now={now}
          showClaim={false}
          emptyLabel="You haven't raised any requests yet."
        />
      </section>
    </div>
  );
}
