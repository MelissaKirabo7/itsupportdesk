import { Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  BookOpen,
  Headset,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  Ticket,
  TicketPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_LABEL, isStaffRole } from "@/lib/tickets";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const staff = isStaffRole(role);

  const nav = [
    ...(staff ? [{ to: "/", label: "Active Queue", icon: LayoutGrid }] : []),
    { to: "/submit", label: "Submit a Request", icon: TicketPlus },
    { to: "/my-requests", label: "My Requests", icon: Ticket },
    { to: "/faq", label: "Self-Help & FAQ", icon: BookOpen },
    ...(staff ? [{ to: "/archive", label: "Archive", icon: Archive }] : []),
    ...(role === "admin" ? [{ to: "/admin", label: "Admin Console", icon: ShieldCheck }] : []),
  ] as const;

  const email = profile?.email ?? user?.email ?? "";

  return (
    <div className="flex h-full flex-col bg-sidebar p-5 text-sidebar-foreground">
      <div className="flex items-center gap-3 px-1 pb-8 pt-1">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-sidebar-primary">
          <Headset className="h-5 w-5 text-sidebar-primary-foreground" />
        </span>
        <span className="font-display text-xl font-semibold">ServeDesk</span>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.to === "/" }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:font-semibold data-[status=active]:text-sidebar-primary-foreground"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-sidebar-accent p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">
          Signed in as
        </p>
        <div className="mt-3 flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            {(email || "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{email}</p>
            <p className="text-xs text-sidebar-foreground/60">
              {role ? ROLE_LABEL[role] : "Loading…"}
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            void signOut().then(() => navigate({ to: "/auth", replace: true }))
          }
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sidebar-primary px-4 py-2.5 text-sm font-semibold text-sidebar-primary-foreground transition-opacity hover:opacity-90"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
