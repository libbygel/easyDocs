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
      case_activity_log: {
        Row: {
          action_type: Database["public"]["Enums"]["case_activity_type"]
          case_id: string
          created_at: string
          description: string
          id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["case_activity_type"]
          case_id: string
          created_at?: string
          description: string
          id?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["case_activity_type"]
          case_id?: string
          created_at?: string
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_activity_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_charges: {
        Row: {
          advisor_id: string
          amount: number
          case_id: string
          charged_at: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          paid_manually: boolean
        }
        Insert: {
          advisor_id: string
          amount: number
          case_id: string
          charged_at?: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          paid_manually?: boolean
        }
        Update: {
          advisor_id?: string
          amount?: number
          case_id?: string
          charged_at?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          paid_manually?: boolean
        }
        Relationships: []
      }
      case_documents: {
        Row: {
          advisor_note: string | null
          case_id: string
          client_note: string | null
          created_at: string
          declaration_statement: string | null
          display_order: number | null
          doc_name: string
          document_type: string
          due_date: string | null
          id: string
          last_upload_id: string | null
          required: boolean
          review_status: Database["public"]["Enums"]["review_status"]
          sent_status: Database["public"]["Enums"]["sent_status"]
          sent_to_client_at: string | null
        }
        Insert: {
          advisor_note?: string | null
          case_id: string
          client_note?: string | null
          created_at?: string
          declaration_statement?: string | null
          display_order?: number | null
          doc_name: string
          document_type?: string
          due_date?: string | null
          id?: string
          last_upload_id?: string | null
          required?: boolean
          review_status?: Database["public"]["Enums"]["review_status"]
          sent_status?: Database["public"]["Enums"]["sent_status"]
          sent_to_client_at?: string | null
        }
        Update: {
          advisor_note?: string | null
          case_id?: string
          client_note?: string | null
          created_at?: string
          declaration_statement?: string | null
          display_order?: number | null
          doc_name?: string
          document_type?: string
          due_date?: string | null
          id?: string
          last_upload_id?: string | null
          required?: boolean
          review_status?: Database["public"]["Enums"]["review_status"]
          sent_status?: Database["public"]["Enums"]["sent_status"]
          sent_to_client_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_last_upload"
            columns: ["last_upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      case_payments: {
        Row: {
          advisor_id: string
          amount: number
          case_id: string
          charge_id: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          paid_at: string
          payment_method: string | null
        }
        Insert: {
          advisor_id: string
          amount: number
          case_id: string
          charge_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string
          payment_method?: string | null
        }
        Update: {
          advisor_id?: string
          amount?: number
          case_id?: string
          charge_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string
          payment_method?: string | null
        }
        Relationships: []
      }
      case_time_entries: {
        Row: {
          advisor_id: string
          case_id: string
          client_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          ended_at: string | null
          hourly_rate: number | null
          id: string
          source: string
          started_at: string
        }
        Insert: {
          advisor_id: string
          case_id: string
          client_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          source?: string
          started_at: string
        }
        Update: {
          advisor_id?: string
          case_id?: string
          client_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          source?: string
          started_at?: string
        }
        Relationships: []
      }
      case_types: {
        Row: {
          advisor_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          advisor_id?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          advisor_id: string
          case_type_id: string | null
          client_id: string
          created_at: string
          id: string
          last_client_activity_at: string | null
          last_portal_link_sent_at: string | null
          last_reminder_sent_at: string | null
          portal_enabled: boolean
          portal_password: string | null
          portal_token: string
          status: Database["public"]["Enums"]["case_status"]
          title: string
        }
        Insert: {
          advisor_id: string
          case_type_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          last_client_activity_at?: string | null
          last_portal_link_sent_at?: string | null
          last_reminder_sent_at?: string | null
          portal_enabled?: boolean
          portal_password?: string | null
          portal_token?: string
          status?: Database["public"]["Enums"]["case_status"]
          title: string
        }
        Update: {
          advisor_id?: string
          case_type_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          last_client_activity_at?: string | null
          last_portal_link_sent_at?: string | null
          last_reminder_sent_at?: string | null
          portal_enabled?: boolean
          portal_password?: string | null
          portal_token?: string
          status?: Database["public"]["Enums"]["case_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cases_case_type_id_fkey"
            columns: ["case_type_id"]
            isOneToOne: false
            referencedRelation: "case_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_categories: {
        Row: {
          advisor_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_conversations: {
        Row: {
          advisor_id: string
          client_id: string
          conversation_date: string
          created_at: string
          id: string
          summary: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          client_id: string
          conversation_date?: string
          created_at?: string
          id?: string
          summary: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          client_id?: string
          conversation_date?: string
          created_at?: string
          id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          advisor_id: string
          client_id: string
          created_at: string
          doc_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          advisor_id: string
          client_id: string
          created_at?: string
          doc_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          client_id?: string
          created_at?: string
          doc_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_passwords: {
        Row: {
          advisor_id: string
          client_id: string
          created_at: string
          id: string
          notes_ciphertext: string | null
          notes_iv: string | null
          password_ciphertext: string
          password_iv: string
          service_name: string
          updated_at: string
          username_ciphertext: string | null
          username_iv: string | null
        }
        Insert: {
          advisor_id: string
          client_id: string
          created_at?: string
          id?: string
          notes_ciphertext?: string | null
          notes_iv?: string | null
          password_ciphertext: string
          password_iv: string
          service_name: string
          updated_at?: string
          username_ciphertext?: string | null
          username_iv?: string | null
        }
        Update: {
          advisor_id?: string
          client_id?: string
          created_at?: string
          id?: string
          notes_ciphertext?: string | null
          notes_iv?: string | null
          password_ciphertext?: string
          password_iv?: string
          service_name?: string
          updated_at?: string
          username_ciphertext?: string | null
          username_iv?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          advisor_id: string
          category_id: string | null
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          id_number: string | null
          notes: string | null
          phone: string | null
          spouse_email: string | null
          spouse_full_name: string | null
          spouse_id_number: string | null
          spouse_phone: string | null
        }
        Insert: {
          advisor_id: string
          category_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          spouse_email?: string | null
          spouse_full_name?: string | null
          spouse_id_number?: string | null
          spouse_phone?: string | null
        }
        Update: {
          advisor_id?: string
          category_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          spouse_email?: string | null
          spouse_full_name?: string | null
          spouse_id_number?: string | null
          spouse_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contacts: {
        Row: {
          advisor_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          advisor_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          advisor_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      doc_templates: {
        Row: {
          advisor_id: string
          case_type_id: string
          created_at: string
          declaration_statement: string | null
          default_due_days: number | null
          default_required: boolean
          doc_name: string
          document_type: string
          id: string
          template_file_url: string | null
        }
        Insert: {
          advisor_id: string
          case_type_id: string
          created_at?: string
          declaration_statement?: string | null
          default_due_days?: number | null
          default_required?: boolean
          doc_name: string
          document_type?: string
          id?: string
          template_file_url?: string | null
        }
        Update: {
          advisor_id?: string
          case_type_id?: string
          created_at?: string
          declaration_statement?: string | null
          default_due_days?: number | null
          default_required?: boolean
          doc_name?: string
          document_type?: string
          id?: string
          template_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_templates_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doc_templates_case_type_id_fkey"
            columns: ["case_type_id"]
            isOneToOne: false
            referencedRelation: "case_types"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          advisor_id: string
          body_preview: string | null
          case_id: string | null
          client_id: string | null
          email_type: Database["public"]["Enums"]["email_type"]
          id: string
          sent_at: string
          subject: string
          to_email: string
        }
        Insert: {
          advisor_id: string
          body_preview?: string | null
          case_id?: string | null
          client_id?: string | null
          email_type: Database["public"]["Enums"]["email_type"]
          id?: string
          sent_at?: string
          subject: string
          to_email: string
        }
        Update: {
          advisor_id?: string
          body_preview?: string | null
          case_id?: string | null
          client_id?: string | null
          email_type?: Database["public"]["Enums"]["email_type"]
          id?: string
          sent_at?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          advisor_id: string
          case_id: string | null
          client_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
        }
        Insert: {
          advisor_id: string
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
        }
        Update: {
          advisor_id?: string
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_tasks: {
        Row: {
          advisor_id: string
          case_id: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          priority: string
          reminder_at: string | null
          reminder_sent_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          reminder_at?: string | null
          reminder_sent_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          reminder_at?: string | null
          reminder_sent_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          document_preview_mode: string
          email: string
          enable_daily_reminders: boolean
          enable_urgent_alerts: boolean
          hourly_rate: number | null
          id: string
          inactivity_days: number
          is_paid: boolean
          name: string
          reminder_hour: number
          sender_display_name: string
          timer_mode: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_preview_mode?: string
          email: string
          enable_daily_reminders?: boolean
          enable_urgent_alerts?: boolean
          hourly_rate?: number | null
          id?: string
          inactivity_days?: number
          is_paid?: boolean
          name: string
          reminder_hour?: number
          sender_display_name?: string
          timer_mode?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_preview_mode?: string
          email?: string
          enable_daily_reminders?: boolean
          enable_urgent_alerts?: boolean
          hourly_rate?: number | null
          id?: string
          inactivity_days?: number
          is_paid?: boolean
          name?: string
          reminder_hour?: number
          sender_display_name?: string
          timer_mode?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_charges: {
        Row: {
          advisor_id: string
          amount: number
          case_id: string
          client_id: string
          created_at: string
          day_of_month: number
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_on: string | null
          updated_at: string
        }
        Insert: {
          advisor_id: string
          amount: number
          case_id: string
          client_id: string
          created_at?: string
          day_of_month?: number
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_on?: string | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          amount?: number
          case_id?: string
          client_id?: string
          created_at?: string
          day_of_month?: number
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_on?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          case_document_id: string
          case_id: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_at: string
          uploaded_by: Database["public"]["Enums"]["uploaded_by_type"]
        }
        Insert: {
          case_document_id: string
          case_id: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by: Database["public"]["Enums"]["uploaded_by_type"]
        }
        Update: {
          case_document_id?: string
          case_id?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: Database["public"]["Enums"]["uploaded_by_type"]
        }
        Relationships: [
          {
            foreignKeyName: "uploads_case_document_id_fkey"
            columns: ["case_document_id"]
            isOneToOne: false
            referencedRelation: "case_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploads_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_settings: {
        Row: {
          advisor_id: string
          created_at: string
          id: string
          salt: string
          updated_at: string
          verifier: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          id?: string
          salt: string
          updated_at?: string
          verifier: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          id?: string
          salt?: string
          updated_at?: string
          verifier?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      case_activity_type:
        | "העלאת מסמך"
        | "אישור מסמך"
        | "דחיית מסמך"
        | "שליחת תזכורת"
        | "שליחת לינק"
        | "השלמת תיק"
        | "מחיקת מסמך"
      case_status: "פתוח" | "ממתין למסמכים" | "בבדיקה" | "הושלם" | "מוקפא"
      email_type: "הודעה על העלאה" | "תזכורת יומית" | "לינק פורטל" | "מסמך נדחה"
      review_status: "חסר" | "הועלה" | "תקין" | "לא תקין" | "נחתם"
      sent_status: "לא נשלח" | "נשלח"
      uploaded_by_type: "לקוח" | "יועץ"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      case_activity_type: [
        "העלאת מסמך",
        "אישור מסמך",
        "דחיית מסמך",
        "שליחת תזכורת",
        "שליחת לינק",
        "השלמת תיק",
        "מחיקת מסמך",
      ],
      case_status: ["פתוח", "ממתין למסמכים", "בבדיקה", "הושלם", "מוקפא"],
      email_type: ["הודעה על העלאה", "תזכורת יומית", "לינק פורטל", "מסמך נדחה"],
      review_status: ["חסר", "הועלה", "תקין", "לא תקין", "נחתם"],
      sent_status: ["לא נשלח", "נשלח"],
      uploaded_by_type: ["לקוח", "יועץ"],
    },
  },
} as const
