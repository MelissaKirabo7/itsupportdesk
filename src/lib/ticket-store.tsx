import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import type {
  Announcement,
  CannedResponse,
  Category,
  FaqArticle,
  Priority,
  Role,
  Status,
  Ticket,
  TicketNote,
} from "./tickets";

export type NewTicket = {
  title: string;
  description: string;
  location: string;
  department: string;
  workstation: string;
  category: Category;
  priority: Priority;
  parent_ticket_id?: string | null;
};

export function useTickets() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["tickets", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Ticket[]> => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return { tickets: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useTicket(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ticket", id, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Ticket | null> => {
      const { data, error } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useNotes(ticketId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notes", ticketId, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<TicketNote[]> => {
      const { data, error } = await supabase
        .from("ticket_notes")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useFaqArticles() {
  return useQuery({
    queryKey: ["faq"],
    queryFn: async (): Promise<FaqArticle[]> => {
      const { data, error } = await supabase
        .from("faq_articles")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCannedResponses() {
  return useQuery({
    queryKey: ["canned"],
    queryFn: async (): Promise<CannedResponse[]> => {
      const { data, error } = await supabase.from("canned_responses").select("*").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAnnouncement() {
  return useQuery({
    queryKey: ["announcement"],
    queryFn: async (): Promise<Announcement | null> => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTicketActions() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["tickets"] });
    void qc.invalidateQueries({ queryKey: ["ticket"] });
    void qc.invalidateQueries({ queryKey: ["notes"] });
  };

  const create = useMutation({
    mutationFn: async (input: NewTicket): Promise<Ticket> => {
      if (!user) throw new Error("You must be signed in.");
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          ...input,
          requester_id: user.id,
          requester_email: user.email ?? profile?.email ?? "",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Ticket> }) => {
      const { error } = await supabase.from("tickets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const claim = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase
        .from("tickets")
        .update({
          assignee_id: user.id,
          assignee_email: user.email ?? "",
          status: status === "new" ? "in_progress" : status,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const assign = useMutation({
    mutationFn: async ({ id, userId, email }: { id: string; userId: string; email: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ assignee_id: userId, assignee_email: email })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addNote = useMutation({
    mutationFn: async ({
      ticketId,
      body,
      internal,
    }: {
      ticketId: string;
      body: string;
      internal: boolean;
    }) => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("ticket_notes").insert({
        ticket_id: ticketId,
        author_id: user.id,
        author_email: user.email ?? "",
        body,
        internal,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const resolve = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status: "resolved", resolution_notes: notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reopen = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("tickets").update({ status: "new" }).eq("id", id);
      if (error) throw error;
      await supabase.from("ticket_notes").insert({
        ticket_id: id,
        author_id: user.id,
        author_email: user.email ?? "",
        body: `Ticket reopened: ${reason}`,
        internal: false,
      });
    },
    onSuccess: invalidate,
  });

  const rate = useMutation({
    mutationFn: async ({ id, score }: { id: string; score: number }) => {
      const { error } = await supabase.from("tickets").update({ satisfaction: score }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const publishFaq = useMutation({
    mutationFn: async (article: { title: string; body: string; category: string; ticketId: string }) => {
      const { error } = await supabase.from("faq_articles").insert({
        title: article.title,
        body: article.body,
        category: article.category,
        source_ticket_id: article.ticketId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faq"] }),
  });

  return { create, update, claim, assign, addNote, resolve, reopen, rate, publishFaq };
}

/** Every person with an account, plus their assigned role (admin view). */
export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("*").order("email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      if (rErr) throw rErr;
      const map = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({ ...p, role: map.get(p.id) ?? null }));
    },
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (error) throw error;
      const { error: iErr } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (iErr) throw iErr;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["people"] });
      void qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useStaffDirectory() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["technician", "admin"]);
      if (error) throw error;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids);
      if (pErr) throw pErr;
      return profiles ?? [];
    },
  });
}
