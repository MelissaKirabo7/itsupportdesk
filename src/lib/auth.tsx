import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Role } from "./tickets";

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setRole(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  async function loadIdentity(current: User) {
    const meta = (current.user_metadata ?? {}) as Record<string, string>;
    await supabase.from("profiles").upsert(
      {
        id: current.id,
        email: current.email ?? "",
        full_name: meta["full_name"] ?? meta["name"] ?? current.email?.split("@")[0] ?? "",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    const [{ data: prof }, { data: assigned }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", current.id).maybeSingle(),
      supabase.rpc("bootstrap_role"),
    ]);
    setProfile(prof ?? null);
    setRole((assigned as Role | null) ?? null);
  }

  useEffect(() => {
    if (!user) return;
    void loadIdentity(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value: AuthState = {
    user,
    session,
    profile,
    role,
    loading,
    async signOut() {
      await supabase.auth.signOut();
      queryClient.clear();
    },
    async refreshProfile() {
      if (user) await loadIdentity(user);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
