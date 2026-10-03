export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          created_at: string
          id: string
          message: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      canned_responses: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      faq_articles: {
        Row: {
          auto_generated: boolean
          body: string
          category: string
          created_at: string
          id: string
          published: boolean
          show_in_panel: boolean
          source_ticket_id: string | null
          title: string
        }
        Insert: {
          auto_generated?: boolean
          body: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          show_in_panel?: boolean
          source_ticket_id?: string | null
          title: string
        }
        Update: {
          auto_generated?: boolean
          body?: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          show_in_panel?: boolean
          source_ticket_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_articles_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          read: boolean
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          read?: boolean
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          read?: boolean
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          location: string
          on_leave: boolean
          workstation: string
        }
        Insert: {
          created_at?: string
          department?: string
          email: string
          full_name?: string
          id: string
          location?: string
          on_leave?: boolean
          workstation?: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          location?: string
          on_leave?: boolean
          workstation?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          note_id: string | null
          path: string
          ticket_id: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string
          id?: string
          note_id?: string | null
          path: string
          ticket_id: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          note_id?: string | null
          path?: string
          ticket_id?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "ticket_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_feedback: {
        Row: {
          comment: string
          created_at: string
          id: string
          rating: number
          ticket_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          rating: number
          ticket_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          rating?: number
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_feedback_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_notes: {
        Row: {
          author_email: string
          author_id: string | null
          body: string
          created_at: string
          id: string
          internal: boolean
          ticket_id: string
        }
        Insert: {
          author_email: string
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          internal?: boolean
          ticket_id: string
        }
        Update: {
          author_email?: string
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assignee_email: string | null
          assignee_id: string | null
          category: string
          created_at: string
          department: string
          description: string
          id: string
          location: string
          parent_ticket_id: string | null
          pending_since: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          ref: string
          reopened_at: string | null
          requester_email: string
          requester_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          satisfaction: number | null
          sla_due_at: string
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at: string
          workstation: string
        }
        Insert: {
          assignee_email?: string | null
          assignee_id?: string | null
          category: string
          created_at?: string
          department?: string
          description: string
          id?: string
          location?: string
          parent_ticket_id?: string | null
          pending_since?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          ref?: string
          reopened_at?: string | null
          requester_email: string
          requester_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          satisfaction?: number | null
          sla_due_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at?: string
          workstation?: string
        }
        Update: {
          assignee_email?: string | null
          assignee_id?: string | null
          category?: string
          created_at?: string
          department?: string
          description?: string
          id?: string
          location?: string
          parent_ticket_id?: string | null
          pending_since?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          ref?: string
          reopened_at?: string | null
          requester_email?: string
          requester_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          satisfaction?: number | null
          sla_due_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          updated_at?: string
          workstation?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workstations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "submitter" | "technician" | "admin"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "new" | "in_progress" | "pending" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["submitter", "technician", "admin"],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: ["new", "in_progress", "pending", "resolved", "closed"],
    },
  },
} as const
