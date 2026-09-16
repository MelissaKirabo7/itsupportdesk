import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useFaqArticles } from "@/lib/ticket-store";

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

function FaqPage() {
  const { data: articles = [], isLoading } = useFaqArticles();
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const rows = term
    ? articles.filter((a) => `${a.title} ${a.body} ${a.category}`.toLowerCase().includes(term))
    : articles;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Self-help & FAQ"
        subtitle="Fix it yourself in a minute — these articles come from real resolved tickets."
      />
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
            <article key={a.id} className="rounded-3xl bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {a.category}
              </p>
              <h2 className="mt-2 font-display text-lg font-semibold">{a.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{a.body}</p>
            </article>
          ))}
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No articles matched that search.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
