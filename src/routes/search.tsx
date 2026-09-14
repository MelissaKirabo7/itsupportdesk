import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { TicketTable } from "@/components/ticket-table";
import { useTickets } from "@/lib/ticket-store";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => ({
    meta: [
      { title: "Search tickets — ServeDesk" },
      {
        name: "description",
        content: "Search every IT ticket by reference, title, requester, location or category.",
      },
      { property: "og:title", content: "Search tickets — ServeDesk" },
      { property: "og:description", content: "Search every IT ticket across the service desk." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { tickets } = useTickets();
  const term = q.trim().toLowerCase();

  const results = term
    ? tickets.filter((t) =>
        [t.ref, t.title, t.requester, t.location, t.category, t.description]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Search"
        subtitle={term ? `${results.length} result(s) for “${q}”` : "Type a query in the search bar above."}
      />
      <section className="rounded-3xl bg-card shadow-sm">
        <TicketTable tickets={results} now={Date.now()} emptyLabel="No tickets matched." />
      </section>
    </div>
  );
}
