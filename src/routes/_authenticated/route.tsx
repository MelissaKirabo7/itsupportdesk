import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { Bell, Menu, Megaphone, Search } from "lucide-react";
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAnnouncement } from "@/lib/ticket-store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

function TopBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open navigation"
            className="grid h-10 w-10 place-items-center rounded-full border border-border lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-0 p-0">
            <AppSidebar onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <nav className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
          <span className="font-medium text-foreground">ServeDesk</span>
          <span>›</span>
          <span className="truncate">IT service desk</span>
        </nav>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ to: "/search", search: { q } });
        }}
        className="relative mx-auto w-full max-w-md"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tickets..."
          aria-label="Search tickets"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
        />
      </form>

      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="grid h-10 w-10 place-items-center rounded-full bg-card shadow-sm"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function OutageBanner() {
  const { data } = useAnnouncement();
  if (!data) return null;
  return (
    <div className="flex items-start gap-3 bg-alert-soft px-4 py-3 text-sm text-foreground lg:px-8">
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-alert" />
      <p>{data.message}</p>
    </div>
  );
}

function AppShell() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 p-3 lg:block">
        <div className="h-full overflow-hidden rounded-3xl">
          <AppSidebar />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <OutageBanner />
        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
