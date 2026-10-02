import { createFileRoute } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account Settings — ServeDesk" },
      {
        name: "description",
        content: "Manage your ServeDesk account: change your password and review your profile details.",
      },
      { property: "og:title", content: "Account Settings — ServeDesk" },
      { property: "og:description", content: "Change your ServeDesk password." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, profile } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    const email = user?.email ?? "";
    if (!email) return;
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: checkError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (checkError) {
        toast.error("Your current password is incorrect.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated. Use it next time you sign in.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/25";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Account settings"
        subtitle="Your profile details and password."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-medium">{user?.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="truncate font-medium">{profile?.full_name || "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Department</dt>
              <dd className="truncate font-medium">{profile?.department || "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Workstation</dt>
              <dd className="truncate font-medium">{profile?.workstation || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <KeyRound className="h-5 w-5" />
            Change password
          </h2>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void changePassword();
            }}
          >
            <div>
              <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium">
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
