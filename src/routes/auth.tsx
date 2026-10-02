import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Headset } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — ServeDesk IT Service Desk" },
      {
        name: "description",
        content:
          "Sign in to ServeDesk to raise IT requests, track SLA timers and manage the support queue.",
      },
      { property: "og:title", content: "Sign in — ServeDesk IT Service Desk" },
      { property: "og:description", content: "Sign in to the corporate IT service desk." },
    ],
  }),
  component: AuthPage,
});

const field =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/25";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/my-requests" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created", {
          description: "Check your inbox to confirm your email address, then sign in.",
        });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/my-requests" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/my-requests" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-sidebar">
            <Headset className="h-5 w-5 text-sidebar-primary" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">ServeDesk</h1>
            <p className="text-sm text-muted-foreground">Corporate IT service desk</p>
          </div>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-sm">
          <div className="mb-6 flex rounded-full bg-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={field}
                  placeholder="Melissa Kirabo"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={() => void google()}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
