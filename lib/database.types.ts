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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      document_entities: {
        Row: {
          attributes: Json
          created_at: string | null
          entity_name: string
          entity_type: string
          id: string
          notebook_id: string
          source_file_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attributes?: Json
          created_at?: string | null
          entity_name: string
          entity_type: string
          id?: string
          notebook_id: string
          source_file_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attributes?: Json
          created_at?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          notebook_id?: string
          source_file_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_entities_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_entities_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sessions: {
        Row: {
          comments: Json | null
          compiled_content: string | null
          created_at: string | null
          current_compiled_content: string | null
          document_structure: Json | null
          extracted_text: string
          field_completion_status: Json | null
          file_type: string
          id: string
          notebook_id: string
          original_file_name: string
          status: string
          updated_at: string | null
          user_edits: Json | null
          user_id: string
        }
        Insert: {
          comments?: Json | null
          compiled_content?: string | null
          created_at?: string | null
          current_compiled_content?: string | null
          document_structure?: Json | null
          extracted_text: string
          field_completion_status?: Json | null
          file_type: string
          id?: string
          notebook_id: string
          original_file_name: string
          status?: string
          updated_at?: string | null
          user_edits?: Json | null
          user_id: string
        }
        Update: {
          comments?: Json | null
          compiled_content?: string | null
          created_at?: string | null
          current_compiled_content?: string | null
          document_structure?: Json | null
          extracted_text?: string
          field_completion_status?: Json | null
          file_type?: string
          id?: string
          notebook_id?: string
          original_file_name?: string
          status?: string
          updated_at?: string | null
          user_edits?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sessions_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      file_search_stores: {
        Row: {
          created_at: string | null
          file_search_store_name: string
          id: string
          notebook_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_search_store_name: string
          id?: string
          notebook_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_search_store_name?: string
          id?: string
          notebook_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_search_stores_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          file_search_store_id: string | null
          gemini_uri: string
          id: string
          mime_type: string
          name: string
          notebook_id: string
          size_bytes: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_search_store_id?: string | null
          gemini_uri: string
          id?: string
          mime_type: string
          name: string
          notebook_id: string
          size_bytes: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_search_store_id?: string | null
          gemini_uri?: string
          id?: string
          mime_type?: string
          name?: string
          notebook_id?: string
          size_bytes?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_file_search_store_id_fkey"
            columns: ["file_search_store_id"]
            isOneToOne: false
            referencedRelation: "file_search_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          document_session_id: string | null
          file_uris: string[] | null
          id: string
          notebook_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string | null
          document_session_id?: string | null
          file_uris?: string[] | null
          id?: string
          notebook_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string | null
          document_session_id?: string | null
          file_uris?: string[] | null
          id?: string
          notebook_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_document_session_id_fkey"
            columns: ["document_session_id"]
            isOneToOne: false
            referencedRelation: "document_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
