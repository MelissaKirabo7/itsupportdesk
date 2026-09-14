import { createFileRoute } from "@tanstack/react-router";
import { Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TicketTable } from "@/components/ticket-table";
import { useTickets } from "@/lib/ticket-store";
import {
  CATEGORIES,
  CURRENT_USER,
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  isActive,
  slaState,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Active Queue — ServeDesk IT Service Desk" },
      {
        name: "description",
        content:
          "Triage the live IT ticket queue: claim unassigned work, watch SLA timers and filter by priority, status or category.",
      },
      { property: "og:title", content: "Active Queue — ServeDesk IT Service Desk" },
      {
        property: "og:description",
        content: "Triage the live IT ticket queue with SLA timers and quick filters.",
      },
    ],
  }),
  component: ActiveQueue,
});

type QuickFilter = "all" | "mine" | "unassigned" | "overdue";

const quickFilters: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "All active" },
  { id: "mine", label: "Assigned to me" },
  { id: "unassigned", label: "Unassigned" },
  { id: "overdue", label: "Overdue SLAs" },
];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

const selectClass =
  "rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";

function ActiveQueue() {
  const { tickets } = useTickets();
  const now = Date.now();
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [sort, setSort] = useState<"newest" | "priority">("newest");
  const [category, setCategory] = useState("any");
  const [priority, setPriority] = useState("any");
  const [status, setStatus] = useState("any");

  const active = tickets.filter(isActive);

  const stats = {
    open: active.length,
    unassigned: active.filter((t) => !t.assignee).length,
    inProgress: active.filter((t) => t.status === "in_progress").length,
    overdue: active.filter((t) => slaState(t, now).overdue).length,
  };

  const rows = useMemo(() => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return active
      .filter((t) => {
        if (quick === "mine" && t.assignee !== CURRENT_USER.email) return false;
        if (quick === "unassigned" && t.assignee) return false;
        if (quick === "overdue" && !slaState(t, now).overdue) return false;
        if (category !== "any" && t.category !== category) return false;
        if (priority !== "any" && t.priority !== priority) return false;
        if (status !== "any" && t.status !== status) return false;
        return true;
      })
      .sort((a, b) =>
        sort === "priority"
          ? order[a.priority] - order[b.priority]
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, quick, category, priority, status, sort]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Active queue"
        action={
          <div className="flex rounded-full bg-card p-1 shadow-sm">
            {(["newest", "priority"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                  sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {s === "newest" ? "Newest First" : "By Priority"}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open tickets"
          value={stats.open}
          hint="Resolved tickets auto-archive"
          tone="dark"
        />
        <StatCard label="Unassigned" value={stats.unassigned} hint="Waiting on triage" />
        <StatCard label="In progress" value={stats.inProgress} hint="Being worked right now" />
        <StatCard
          label="Overdue SLAs"
          value={stats.overdue}
          hint="Past first-response target"
          tone="alert"
        />
      </div>

      <section className="rounded-3xl bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-5">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((f) => (
              <Chip key={f.id} active={quick === f.id} onClick={() => setQuick(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
            >
              <option value="any">Any category</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Filter by priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={selectClass}
            >
              <option value="any">Any priority</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              <option value="any">Any status</option>
              {STATUSES.filter((s) => s !== "closed").map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <TicketTable tickets={rows} now={now} />
      </section>
    </div>
  );
}
