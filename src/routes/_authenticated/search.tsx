import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { TicketTable } from "@/components/ticket-table";
import { useTickets } from "@/lib/ticket-store";

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Search tickets — ServeDesk" },
      {
        name: "description",
        content: "Search IT tickets by reference, title, requester, location or category.",
      },
      { property: "og:title", content: "Search tickets — ServeDesk" },
      { property: "og:description", content: "Search tickets across the service desk." },
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
        [t.ref, t.title, t.requester_email, t.location, t.category, t.description, t.workstation]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Search"
        subtitle={
          term
            ? `${results.length} result(s) for “${q}”`
            : "Type a query in the search bar above. You only see tickets you are allowed to view."
        }
      />
      <section className="rounded-3xl bg-card shadow-sm">
        <TicketTable tickets={results} now={Date.now()} emptyLabel="No tickets matched." />
      </section>
    </div>
  );
}
