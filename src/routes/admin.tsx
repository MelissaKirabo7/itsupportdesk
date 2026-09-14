import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useTickets } from "@/lib/ticket-store";
import {
  CATEGORIES,
  PRIORITY_LABEL,
  PRIORITIES,
  SLA_HOURS,
  STATUS_LABEL,
  STATUSES,
  TECHNICIANS,
  isActive,
  slaState,
} from "@/lib/tickets";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — ServeDesk" },
      {
        name: "description",
        content:
          "Service desk analytics: workload per technician, SLA compliance, category volume and workflow rules.",
      },
      { property: "og:title", content: "Admin Console — ServeDesk" },
      { property: "og:description", content: "Service desk analytics and workflow configuration." },
    ],
  }),
  component: AdminPage,
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm">{label}</p>
        <div className="mt-2 h-2 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${max ? (value / max) * 100 : 0}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function AdminPage() {
  const { tickets } = useTickets();
  const now = Date.now();
  const active = tickets.filter(isActive);
  const breached = tickets.filter((t) => slaState(t, now).overdue).length;
  const compliance = tickets.length
    ? Math.round(((tickets.length - breached) / tickets.length) * 100)
    : 100;

  const perTech = TECHNICIANS.map((tech) => ({
    tech,
    count: active.filter((t) => t.assignee === tech).length,
  }));
  const perCategory = CATEGORIES.map((c) => ({
    c,
    count: tickets.filter((t) => t.category === c).length,
  })).filter((r) => r.count > 0);

  const maxTech = Math.max(1, ...perTech.map((r) => r.count));
  const maxCat = Math.max(1, ...perCategory.map((r) => r.count));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin console"
        subtitle="Workload, SLA compliance and the rules that drive the queue."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total tickets" value={tickets.length} hint="All time" tone="dark" />
        <StatCard label="Active" value={active.length} hint="Open across the desk" />
        <StatCard label="SLA compliance" value={`${compliance}%`} hint="First response met" />
        <StatCard label="Breached" value={breached} hint="Needs escalation" tone="alert" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Workload by technician">
          {perTech.map((r) => (
            <Bar key={r.tech} label={r.tech} value={r.count} max={maxTech} />
          ))}
        </Panel>

        <Panel title="Volume by category">
          {perCategory.map((r) => (
            <Bar key={r.c} label={r.c} value={r.count} max={maxCat} />
          ))}
        </Panel>

        <Panel title="SLA policy">
          <ul className="divide-y divide-border text-sm">
            {PRIORITIES.map((p) => (
              <li key={p} className="flex items-center justify-between py-3">
                <span>{PRIORITY_LABEL[p]}</span>
                <span className="font-semibold">{SLA_HOURS[p]}h first response</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Workflow rules">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>New tickets stay unassigned until a technician claims them.</li>
            <li>Claiming a new ticket moves it straight to In Progress.</li>
            <li>
              Statuses flow {STATUSES.map((s) => STATUS_LABEL[s]).join(" → ")} and resolved tickets
              auto-archive.
            </li>
            <li>Internal notes are technician-only; public replies are visible to the requester.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
