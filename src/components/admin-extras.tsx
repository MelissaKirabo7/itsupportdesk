import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAnnouncementsAdmin, useWorkstationActions, useWorkstations } from "@/lib/extras-store";

const input =
  "min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/25";

export function WorkstationManager() {
  const { data = [] } = useWorkstations();
  const { add, remove } = useWorkstationActions();
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          add.mutate(name.trim(), {
            onSuccess: () => {
              setName("");
              toast.success("Workstation added");
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. WS-LAB-14" aria-label="New workstation name" className={input} />
        <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add</button>
      </form>
      <ul className="flex flex-wrap gap-2">
        {data.map((w) => (
          <li key={w.id} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
            {w.name}
            <button aria-label={`Remove ${w.name}`} onClick={() => remove.mutate(w.id)} className="text-muted-foreground hover:text-alert">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {data.length === 0 ? <p className="text-sm text-muted-foreground">No workstations yet.</p> : null}
      </ul>
    </div>
  );
}

export function BannerList() {
  const { list, setActive, remove } = useAnnouncementsAdmin();
  const rows = list.data ?? [];
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No banners published yet.</p>;
  return (
    <ul className="divide-y divide-border text-sm">
      {rows.map((b) => (
        <li key={b.id} className="flex flex-wrap items-center gap-2 py-3">
          <span className="min-w-0 flex-1">
            {b.active ? <span className="mr-2 rounded-full bg-alert-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-alert">Live</span> : null}
            {b.message}
          </span>
          <button
            onClick={() => setActive.mutate({ id: b.id, active: !b.active }, { onSuccess: () => toast.success(b.active ? "Banner taken down" : "Banner republished") })}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
          >
            {b.active ? "Take down" : "Republish"}
          </button>
          <button
            aria-label="Delete banner"
            onClick={() => remove.mutate(b.id, { onSuccess: () => toast.success("Banner deleted") })}
            className="rounded-full border border-border p-1.5 hover:bg-muted"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
