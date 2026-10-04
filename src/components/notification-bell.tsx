import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/lib/extras-store";
import { ago } from "@/lib/tickets";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { items, markAll, markOne } = useNotifications();
  const navigate = useNavigate();
  const unread = items.filter((n) => !n.read).length;
  const now = Date.now();

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative grid h-10 w-10 place-items-center rounded-full bg-card shadow-sm"
      >
        <Bell className="h-4 w-4" />
        {unread ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-alert px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm font-semibold">Alerts</p>
          {unread ? (
            <button onClick={() => markAll.mutate()} className="text-xs underline">
              Mark all read
            </button>
          ) : null}
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</li>
          ) : null}
          {items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => {
                  markOne.mutate(n.id);
                  if (n.ticket_id) void navigate({ to: "/tickets/$ticketId", params: { ticketId: n.ticket_id } });
                }}
                className={cn(
                  "block w-full border-b border-border px-4 py-3 text-left text-sm transition-colors hover:bg-muted",
                  !n.read && "bg-accent/15",
                )}
              >
                <p className={cn(!n.read && "font-medium")}>{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ago(n.created_at, now)}</p>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
