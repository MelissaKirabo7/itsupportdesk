import { createFileRoute } from "@tanstack/react-router";
import { Download, Megaphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { BannerList, WorkstationManager } from "@/components/admin-extras";
import { useAnnouncementsAdmin } from "@/lib/extras-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePeople, useSetRole, useStaffDirectory, useTickets } from "@/lib/ticket-store";
import {
  CATEGORIES,
  ROLE_LABEL,
  type Role,
  PENDING_AUTOCLOSE_DAYS,
  PENDING_NUDGE_HOURS,
  PRIORITIES,
  PRIORITY_LABEL,
  REOPEN_WINDOW_DAYS,
  SLA_HOURS,
  isActive,
  slaState,
  ticketsToCsv,
} from "@/lib/tickets";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — ServeDesk" },
      {
        name: "description",
        content:
          "Service desk analytics: workload per technician, SLA compliance, satisfaction scores, outage banners and CSV export.",
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
  const { role } = useAuth();
  const { tickets } = useTickets();
  const { data: staff = [] } = useStaffDirectory();
  const { data: people = [] } = usePeople();
  const setRole = useSetRole();
  const [banner, setBanner] = useState("");
  const banners = useAnnouncementsAdmin();
  const now = Date.now();

  if (role !== "admin") {
    return (
      <PageHeader
        title="Admin console"
        subtitle="You need administrator access to view service desk analytics."
      />
    );
  }

  const active = tickets.filter(isActive);
  const breached = tickets.filter((t) => slaState(t, now).overdue).length;
  const compliance = tickets.length
    ? Math.round(((tickets.length - breached) / tickets.length) * 100)
    : 100;
  const rated = tickets.filter((t) => t.satisfaction);
  const csat = rated.length
    ? (rated.reduce((s, t) => s + (t.satisfaction ?? 0), 0) / rated.length).toFixed(1)
    : "—";

  const perTech = staff.map((p) => ({
    tech: p.email,
    count: active.filter((t) => t.assignee_id === p.id).length,
  }));
  const perCategory = CATEGORIES.map((c) => ({
    c,
    count: tickets.filter((t) => t.category === c).length,
  })).filter((r) => r.count > 0);

  const workstations = Object.entries(
    tickets.reduce<Record<string, number>>((acc, t) => {
      if (!t.workstation) return acc;
      acc[t.workstation] = (acc[t.workstation] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const maxTech = Math.max(1, ...perTech.map((r) => r.count));
  const maxCat = Math.max(1, ...perCategory.map((r) => r.count));
  const maxWs = Math.max(1, ...workstations.map((r) => r[1]));

  function exportCsv() {
    const blob = new Blob([ticketsToCsv(tickets)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servedesk-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function publishBanner() {
    if (banner.trim().length < 5) return;
    await supabase.from("announcements").update({ active: false }).eq("active", true);
    const { error } = await supabase.from("announcements").insert({ message: banner.trim() });
    if (error) toast.error(error.message);
    else {
      toast.success("Outage banner published to everyone");
      setBanner("");
      banners.refresh();
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin console"
        subtitle="Workload, SLA compliance and the rules that drive the queue."
        action={
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-full bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export all tickets
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total tickets" value={tickets.length} hint="All time" tone="dark" />
        <StatCard label="Active" value={active.length} hint="Open across the desk" />
        <StatCard label="SLA compliance" value={`${compliance}%`} hint="First response met" />
        <StatCard label="Satisfaction" value={csat} hint={`${rated.length} ratings`} />
        <StatCard label="Unassigned" value={active.filter((t) => !t.assignee_id).length} hint="Waiting for a technician" />
        <StatCard label="Critical open" value={active.filter((t) => t.priority === "critical").length} hint="2h response target" />
        <StatCard label="Overdue SLAs" value={active.filter((t) => slaState(t, now).overdue).length} hint="Needs attention now" />
        <StatCard label="People" value={people.length} hint={`${staff.length} on the IT team`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Workload by technician">
          {perTech.length === 0 ? (
            <p className="text-sm text-muted-foreground">No technicians yet.</p>
          ) : (
            perTech.map((r) => <Bar key={r.tech} label={r.tech} value={r.count} max={maxTech} />)
          )}
        </Panel>

        <Panel title="Volume by category">
          {perCategory.map((r) => (
            <Bar key={r.c} label={r.c} value={r.count} max={maxCat} />
          ))}
        </Panel>

        <Panel title="Recurring workstations">
          {workstations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No workstation IDs recorded on tickets yet.
            </p>
          ) : (
            workstations.map(([ws, count]) => (
              <Bar key={ws} label={ws} value={count} max={maxWs} />
            ))
          )}
        </Panel>

        <Panel title="Outage banner">
          <div className="space-y-3">
            <textarea
              rows={3}
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              placeholder="Email is down campus-wide — engineers are on it, no need to log a ticket."
              aria-label="Outage banner message"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/25"
            />
            <button
              onClick={() => void publishBanner()}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Megaphone className="h-4 w-4" />
              Publish banner
            </button>
            <div className="border-t border-border pt-3">
              <BannerList />
            </div>
          </div>
        </Panel>

        <Panel title="Workstations">
          <WorkstationManager />
        </Panel>

        <Panel title="People & roles">
          <ul className="divide-y divide-border text-sm">
            {people.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1 truncate">{p.email}</span>
                <select
                  aria-label={`Role for ${p.email}`}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm"
                  value={p.role ?? "submitter"}
                  onChange={(e) =>
                    setRole.mutate(
                      { userId: p.id, role: e.target.value as Role },
                      {
                        onSuccess: () => toast.success(`${p.email} is now ${ROLE_LABEL[e.target.value as Role]}`),
                        onError: (err) => toast.error(err.message),
                      },
                    )
                  }
                >
                  {(["submitter", "technician", "admin"] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="SLA policy">
          <ul className="divide-y divide-border text-sm">
            {PRIORITIES.slice()
              .reverse()
              .map((p) => (
                <li key={p} className="flex items-center justify-between py-3">
                  <span>{PRIORITY_LABEL[p]}</span>
                  <span className="font-semibold">{SLA_HOURS[p]}h first response</span>
                </li>
              ))}
          </ul>
        </Panel>

        <Panel title="Workflow rules">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>New tickets stay unassigned until a technician claims or delegates them.</li>
            <li>Claiming a new ticket moves it straight to In Progress.</li>
            <li>Unclaimed critical tickets are flagged as escalated for supervisors.</li>
            <li>Pending tickets nudge the submitter after {PENDING_NUDGE_HOURS}h and close after {PENDING_AUTOCLOSE_DAYS} days of silence.</li>
            <li>Resolution notes are mandatory before a ticket can be resolved.</li>
            <li>Submitters can rate 1–5 and reopen within {REOPEN_WINDOW_DAYS} days.</li>
            <li>Internal notes are technician-only; public replies are visible to the requester.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
