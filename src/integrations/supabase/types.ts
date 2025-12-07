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
      shows: {
        Row: {
          apply_branding: boolean | null
          audio_latency_offset: number | null
          autosave_interval: number | null
          brand_color: string | null
          call_time: string | null
          created_at: string
          default_tracks: string[] | null
          description: string | null
          doors_time: string | null
          event_end_date: string | null
          event_name: string | null
          event_start_date: string | null
          id: string
          locked: boolean | null
          logo_url: string | null
          name: string
          rehearsal_mode: boolean | null
          room_name: string | null
          safety_mode: boolean | null
          secondary_color: string | null
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
          default_tracks?: string[] | null
          description?: string | null
          doors_time?: string | null
          event_end_date?: string | null
          event_name?: string | null
          event_start_date?: string | null
          id?: string
          locked?: boolean | null
          logo_url?: string | null
          name: string
          rehearsal_mode?: boolean | null
          room_name?: string | null
          safety_mode?: boolean | null
          secondary_color?: string | null
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
          default_tracks?: string[] | null
          description?: string | null
          doors_time?: string | null
          event_end_date?: string | null
          event_name?: string | null
          event_start_date?: string | null
          id?: string
          locked?: boolean | null
          logo_url?: string | null
          name?: string
          rehearsal_mode?: boolean | null
          room_name?: string | null
          safety_mode?: boolean | null
          secondary_color?: string | null
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
          venue?: string | null
          video_latency_offset?: number | null
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
