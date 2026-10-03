import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

const BUCKET = "ticket-attachments";

export function useWorkstations() {
  return useQuery({
    queryKey: ["workstations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workstations").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkstationActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["workstations"] });
  const add = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("workstations").insert({ name });
      if (error) throw error;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workstations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  return { add, remove };
}

/** Every FAQ article (staff see unpublished too, thanks to RLS). */
export function useAllFaq() {
  return useQuery({
    queryKey: ["faq-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFaqActions() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["faq-all"] });
    void qc.invalidateQueries({ queryKey: ["faq"] });
  };
  const create = useMutation({
    mutationFn: async (a: { title: string; body: string; category: string; auto_generated?: boolean }) => {
      const { error } = await supabase.from("faq_articles").insert(a);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const patch = useMutation({
    mutationFn: async ({ id, ...p }: { id: string; published?: boolean; show_in_panel?: boolean }) => {
      const { error } = await supabase.from("faq_articles").update(p).eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  return { create, patch, remove };
}

export function useAnnouncementsAdmin() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["announcements-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["announcements-all"] });
    void qc.invalidateQueries({ queryKey: ["announcement"] });
  };
  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (active) await supabase.from("announcements").update({ active: false }).eq("active", true);
      const { error } = await supabase.from("announcements").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  return { list, setActive, remove, refresh: done };
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["notifications", user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["notifications"] });
          void qc.invalidateQueries({ queryKey: ["tickets"] });
          void qc.invalidateQueries({ queryKey: ["ticket"] });
          void qc.invalidateQueries({ queryKey: ["notes"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, qc]);
  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return { items: query.data ?? [], markAll, markOne };
}

export async function uploadImages(userId: string, ticketId: string, files: File[], noteId?: string) {
  for (const f of files) {
    const path = `${userId}/${ticketId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (error) throw error;
    const { error: e2 } = await supabase.from("ticket_attachments").insert({
      ticket_id: ticketId,
      note_id: noteId ?? null,
      uploader_id: userId,
      path,
      file_name: f.name,
    });
    if (e2) throw e2;
  }
}

export function useAttachments(ticketId: string) {
  return useQuery({
    queryKey: ["attachments", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_attachments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at");
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(rows.map((r) => r.path), 3600);
      return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? "" }));
    },
  });
}

export function useFeedback(ticketId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["feedback", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_feedback")
        .select("*")
        .eq("ticket_id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase
        .from("ticket_feedback")
        .upsert({ ticket_id: ticketId, user_id: user.id, rating, comment }, { onConflict: "ticket_id" });
      if (error) throw error;
      await supabase.from("tickets").update({ satisfaction: rating }).eq("id", ticketId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["feedback", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket"] });
    },
  });
  return { feedback: query.data, save };
}
