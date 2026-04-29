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
      activities: {
        Row: {
          child_id: string
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          child_id: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          child_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_notification_settings: {
        Row: {
          child_id: string
          created_at: string
          id: string
          notify_day_before: boolean
          notify_same_day: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          notify_day_before?: boolean
          notify_same_day?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          notify_day_before?: boolean
          notify_same_day?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_notification_settings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          avatar_url: string | null
          birth_date: string
          color: string
          created_at: string
          full_name: string | null
          id: string
          name: string
          owner_id: string
          profile_photo_path: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date: string
          color?: string
          created_at?: string
          full_name?: string | null
          id?: string
          name: string
          owner_id: string
          profile_photo_path?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string
          color?: string
          created_at?: string
          full_name?: string | null
          id?: string
          name?: string
          owner_id?: string
          profile_photo_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          child_id: string
          color: string
          created_at: string
          date: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          child_id: string
          color?: string
          created_at?: string
          date: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          child_id?: string
          color?: string
          created_at?: string
          date?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      family_shares: {
        Row: {
          can_edit: boolean
          created_at: string
          family_owner_id: string
          id: string
          invite_code: string | null
          relationship: string | null
          role: string
          shared_by: string
          shared_with_email: string
          shared_with_user_id: string | null
        }
        Insert: {
          can_edit?: boolean
          created_at?: string
          family_owner_id: string
          id?: string
          invite_code?: string | null
          relationship?: string | null
          role?: string
          shared_by: string
          shared_with_email: string
          shared_with_user_id?: string | null
        }
        Update: {
          can_edit?: boolean
          created_at?: string
          family_owner_id?: string
          id?: string
          invite_code?: string | null
          relationship?: string | null
          role?: string
          shared_by?: string
          shared_with_email?: string
          shared_with_user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_tags: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_tags_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          child_id: string
          created_at: string
          event_id: string | null
          id: string
          is_shared: boolean
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          storage_path: string
          taken_at: string
          thumbnail_path: string | null
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          child_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          is_shared?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          storage_path: string
          taken_at?: string
          thumbnail_path?: string | null
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          child_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          is_shared?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          storage_path?: string
          taken_at?: string
          thumbnail_path?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          inactivity_days: number
          last_reminder_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          inactivity_days?: number
          last_reminder_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          inactivity_days?: number
          last_reminder_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          icon: string
          id: string
          is_predefined: boolean
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          is_predefined?: boolean
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          is_predefined?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      my_family_memberships: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          family_owner_id: string | null
          id: string | null
          relationship: string | null
          role: string | null
          shared_by: string | null
          shared_with_email: string | null
          shared_with_user_id: string | null
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string | null
          family_owner_id?: string | null
          id?: string | null
          relationship?: string | null
          role?: string | null
          shared_by?: string | null
          shared_with_email?: string | null
          shared_with_user_id?: string | null
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string | null
          family_owner_id?: string | null
          id?: string | null
          relationship?: string | null
          role?: string | null
          shared_by?: string | null
          shared_with_email?: string | null
          shared_with_user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_child: { Args: { child_uuid: string }; Returns: boolean }
      can_edit_child: { Args: { child_uuid: string }; Returns: boolean }
      is_parent_of_child: { Args: { child_uuid: string }; Returns: boolean }
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
