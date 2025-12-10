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
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          show_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          show_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          show_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          duration: number | null
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          metadata: Json | null
          mime_type: string
          name: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          metadata?: Json | null
          mime_type: string
          name: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_path?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          metadata?: Json | null
          mime_type?: string
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cue_assets: {
        Row: {
          asset_id: string
          created_at: string
          cue_id: string
          fade_in_duration: number
          fade_out_duration: number
          id: string
          loop_enabled: boolean
          order_index: number
          playback_speed: number
          start_offset: number
          trim_end: number | null
          trim_start: number
          updated_at: string
          volume: number
        }
        Insert: {
          asset_id: string
          created_at?: string
          cue_id: string
          fade_in_duration?: number
          fade_out_duration?: number
          id?: string
          loop_enabled?: boolean
          order_index?: number
          playback_speed?: number
          start_offset?: number
          trim_end?: number | null
          trim_start?: number
          updated_at?: string
          volume?: number
        }
        Update: {
          asset_id?: string
          created_at?: string
          cue_id?: string
          fade_in_duration?: number
          fade_out_duration?: number
          id?: string
          loop_enabled?: boolean
          order_index?: number
          playback_speed?: number
          start_offset?: number
          trim_end?: number | null
          trim_start?: number
          updated_at?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "cue_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cue_assets_cue_id_fkey"
            columns: ["cue_id"]
            isOneToOne: false
            referencedRelation: "cues"
            referencedColumns: ["id"]
          },
        ]
      }
      cues: {
        Row: {
          auto_follow: boolean | null
          color: string | null
          created_at: string
          duration: string
          effects: string[] | null
          id: string
          name: string
          notes: string | null
          order_index: number
          position: number
          show_id: string
          start_time: string
          track: string
          type: string
          updated_at: string
          width: number
        }
        Insert: {
          auto_follow?: boolean | null
          color?: string | null
          created_at?: string
          duration?: string
          effects?: string[] | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number
          position?: number
          show_id: string
          start_time?: string
          track: string
          type: string
          updated_at?: string
          width?: number
        }
        Update: {
          auto_follow?: boolean | null
          color?: string | null
          created_at?: string
          duration?: string
          effects?: string[] | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          position?: number
          show_id?: string
          start_time?: string
          track?: string
          type?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "cues_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          parent_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          parent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          parent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean | null
          show_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          show_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          show_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      passkey_credentials: {
        Row: {
          backed_up: boolean | null
          counter: number
          created_at: string
          credential_id: string
          device_type: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          backed_up?: boolean | null
          counter?: number
          created_at?: string
          credential_id: string
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          backed_up?: boolean | null
          counter?: number
          created_at?: string
          credential_id?: string
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          email_notifications: boolean | null
          full_name: string | null
          id: string
          keyboard_shortcuts_enabled: boolean | null
          theme: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id: string
          keyboard_shortcuts_enabled?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          keyboard_shortcuts_enabled?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      show_assets: {
        Row: {
          added_by: string | null
          asset_id: string
          created_at: string
          id: string
          show_id: string
        }
        Insert: {
          added_by?: string | null
          asset_id: string
          created_at?: string
          id?: string
          show_id: string
        }
        Update: {
          added_by?: string | null
          asset_id?: string
          created_at?: string
          id?: string
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_assets_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      show_members: {
        Row: {
          accepted_at: string | null
          guest_email: string | null
          id: string
          invited_at: string
          invited_by: string | null
          role: string
          show_id: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          guest_email?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          show_id: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          guest_email?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          show_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "show_members_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          apply_branding: boolean | null
          audio_latency_offset: number | null
          autosave_interval: number | null
          brand_color: string | null
          call_time: string | null
          created_at: string
          custom_tracks: Json | null
          default_tracks: string[] | null
          description: string | null
          doors_time: string | null
          event_end_date: string | null
          event_name: string | null
          event_start_date: string | null
          folder_id: string | null
          id: string
          locked: boolean | null
          logo_url: string | null
          name: string
          rehearsal_mode: boolean | null
          room_name: string | null
          safety_mode: boolean | null
          secondary_color: string | null
          show_code: string
          show_template: string | null
          show_time: string | null
          team_audio_lead: string | null
          team_lighting_lead: string | null
          team_producer: string | null
          team_show_caller: string | null
          team_stage_manager: string | null
          team_technical_director: string | null
          team_video_lead: string | null
          timecode_format: string | null
          timezone: string | null
          updated_at: string
          user_id: string | null
          venue: string | null
          video_latency_offset: number | null
        }
        Insert: {
          apply_branding?: boolean | null
          audio_latency_offset?: number | null
          autosave_interval?: number | null
          brand_color?: string | null
          call_time?: string | null
          created_at?: string
          custom_tracks?: Json | null
          default_tracks?: string[] | null
          description?: string | null
          doors_time?: string | null
          event_end_date?: string | null
          event_name?: string | null
          event_start_date?: string | null
          folder_id?: string | null
          id?: string
          locked?: boolean | null
          logo_url?: string | null
          name: string
          rehearsal_mode?: boolean | null
          room_name?: string | null
          safety_mode?: boolean | null
          secondary_color?: string | null
          show_code: string
          show_template?: string | null
          show_time?: string | null
          team_audio_lead?: string | null
          team_lighting_lead?: string | null
          team_producer?: string | null
          team_show_caller?: string | null
          team_stage_manager?: string | null
          team_technical_director?: string | null
          team_video_lead?: string | null
          timecode_format?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string | null
          venue?: string | null
          video_latency_offset?: number | null
        }
        Update: {
          apply_branding?: boolean | null
          audio_latency_offset?: number | null
          autosave_interval?: number | null
          brand_color?: string | null
          call_time?: string | null
          created_at?: string
          custom_tracks?: Json | null
          default_tracks?: string[] | null
          description?: string | null
          doors_time?: string | null
          event_end_date?: string | null
          event_name?: string | null
          event_start_date?: string | null
          folder_id?: string | null
          id?: string
          locked?: boolean | null
          logo_url?: string | null
          name?: string
          rehearsal_mode?: boolean | null
          room_name?: string | null
          safety_mode?: boolean | null
          secondary_color?: string | null
          show_code?: string
          show_template?: string | null
          show_time?: string | null
          team_audio_lead?: string | null
          team_lighting_lead?: string | null
          team_producer?: string | null
          team_show_caller?: string | null
          team_stage_manager?: string | null
          team_technical_director?: string | null
          team_video_lead?: string | null
          timecode_format?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string | null
          venue?: string | null
          video_latency_offset?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_challenges: { Args: never; Returns: undefined }
      generate_show_code: { Args: never; Returns: string }
      is_show_member: {
        Args: { _roles?: string[]; _show_id: string; _user_id: string }
        Returns: boolean
      }
      is_show_owner: {
        Args: { _show_id: string; _user_id: string }
        Returns: boolean
      }
      join_show_as_guest: {
        Args: { _show_id: string; _user_id: string }
        Returns: boolean
      }
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
