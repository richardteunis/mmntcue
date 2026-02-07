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
      cue_templates: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          cue_type: Database["public"]["Enums"]["cue_type"] | null
          default_duration: number | null
          default_notes: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          cue_type?: Database["public"]["Enums"]["cue_type"] | null
          default_duration?: number | null
          default_notes?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          cue_type?: Database["public"]["Enums"]["cue_type"] | null
          default_duration?: number | null
          default_notes?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cue_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cue_tracks: {
        Row: {
          color: string | null
          created_at: string | null
          cue_count: number | null
          id: string
          name: string
          order_index: number | null
          show_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          cue_count?: number | null
          id?: string
          name: string
          order_index?: number | null
          show_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          cue_count?: number | null
          id?: string
          name?: string
          order_index?: number | null
          show_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cue_tracks_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      cues: {
        Row: {
          audio_url: string | null
          auto_follow: boolean | null
          color: string | null
          created_at: string
          cue_type: Database["public"]["Enums"]["cue_type"] | null
          description: string | null
          display_name: string | null
          duration: string
          effects: string[] | null
          fired_at: string | null
          group_id: string | null
          group_order: number | null
          icon: string | null
          id: string
          is_segment_marker: boolean | null
          name: string
          notes: string | null
          order_index: number
          paused_at: string | null
          position: number
          segment_id: string | null
          show_id: string
          start_time: string
          status: string | null
          template_id: string | null
          track: string
          track_id: string | null
          type: string
          updated_at: string
          width: number
        }
        Insert: {
          audio_url?: string | null
          auto_follow?: boolean | null
          color?: string | null
          created_at?: string
          cue_type?: Database["public"]["Enums"]["cue_type"] | null
          description?: string | null
          display_name?: string | null
          duration?: string
          effects?: string[] | null
          fired_at?: string | null
          group_id?: string | null
          group_order?: number | null
          icon?: string | null
          id?: string
          is_segment_marker?: boolean | null
          name: string
          notes?: string | null
          order_index?: number
          paused_at?: string | null
          position?: number
          segment_id?: string | null
          show_id: string
          start_time?: string
          status?: string | null
          template_id?: string | null
          track: string
          track_id?: string | null
          type: string
          updated_at?: string
          width?: number
        }
        Update: {
          audio_url?: string | null
          auto_follow?: boolean | null
          color?: string | null
          created_at?: string
          cue_type?: Database["public"]["Enums"]["cue_type"] | null
          description?: string | null
          display_name?: string | null
          duration?: string
          effects?: string[] | null
          fired_at?: string | null
          group_id?: string | null
          group_order?: number | null
          icon?: string | null
          id?: string
          is_segment_marker?: boolean | null
          name?: string
          notes?: string | null
          order_index?: number
          paused_at?: string | null
          position?: number
          segment_id?: string | null
          show_id?: string
          start_time?: string
          status?: string | null
          template_id?: string | null
          track?: string
          track_id?: string | null
          type?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "cues_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "show_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cues_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cues_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "cue_tracks"
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
      notification_templates: {
        Row: {
          created_at: string
          id: string
          is_critical: boolean | null
          message: string
          name: string
          show_id: string | null
          sort_order: number | null
          target_roles: string[] | null
          target_type: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_critical?: boolean | null
          message: string
          name: string
          show_id?: string | null
          sort_order?: number | null
          target_roles?: string[] | null
          target_type?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_critical?: boolean | null
          message?: string
          name?: string
          show_id?: string | null
          sort_order?: number | null
          target_roles?: string[] | null
          target_type?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          read: boolean | null
          show_id: string | null
          title: string
          type: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          show_id?: string | null
          title: string
          type: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          show_id?: string | null
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_notes: {
        Row: {
          acknowledged_at: string[] | null
          acknowledged_by: string[] | null
          auto_send: boolean | null
          created_at: string
          created_by: string | null
          cue_id: string | null
          id: string
          is_critical: boolean | null
          message: string
          sent_at: string | null
          sent_by: string | null
          show_id: string
          target_roles: string[] | null
          target_type: string
          target_user_ids: string[] | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string[] | null
          acknowledged_by?: string[] | null
          auto_send?: boolean | null
          created_at?: string
          created_by?: string | null
          cue_id?: string | null
          id?: string
          is_critical?: boolean | null
          message: string
          sent_at?: string | null
          sent_by?: string | null
          show_id: string
          target_roles?: string[] | null
          target_type?: string
          target_user_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string[] | null
          acknowledged_by?: string[] | null
          auto_send?: boolean | null
          created_at?: string
          created_by?: string | null
          cue_id?: string | null
          id?: string
          is_critical?: boolean | null
          message?: string
          sent_at?: string | null
          sent_by?: string | null
          show_id?: string
          target_roles?: string[] | null
          target_type?: string
          target_user_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_notes_cue_id_fkey"
            columns: ["cue_id"]
            isOneToOne: false
            referencedRelation: "cues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_notes_show_id_fkey"
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
      ros_change_requests: {
        Row: {
          ai_prompt: string | null
          ai_response: string | null
          created_at: string
          diff_payload: Json
          id: string
          proposed_by: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          show_id: string
          status: string
          summary: string | null
          updated_at: string
          version_id: string | null
        }
        Insert: {
          ai_prompt?: string | null
          ai_response?: string | null
          created_at?: string
          diff_payload: Json
          id?: string
          proposed_by?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_id: string
          status?: string
          summary?: string | null
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          ai_prompt?: string | null
          ai_response?: string | null
          created_at?: string
          diff_payload?: Json
          id?: string
          proposed_by?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_id?: string
          status?: string
          summary?: string | null
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ros_change_requests_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ros_change_requests_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "ros_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ros_chat_messages: {
        Row: {
          change_request_id: string | null
          content: string
          created_at: string
          id: string
          role: string
          show_id: string
          user_id: string | null
        }
        Insert: {
          change_request_id?: string | null
          content: string
          created_at?: string
          id?: string
          role?: string
          show_id: string
          user_id?: string | null
        }
        Update: {
          change_request_id?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          show_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ros_chat_messages_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "ros_change_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ros_chat_messages_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      ros_import_templates: {
        Row: {
          column_mapping: Json
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean | null
          name: string
          show_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          column_mapping: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          show_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          column_mapping?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          show_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ros_import_templates_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ros_import_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ros_items: {
        Row: {
          audio: string | null
          created_at: string
          cue_id: string | null
          duration: string | null
          hard_time: boolean | null
          id: string
          item_type: string
          lighting: string | null
          notes: string | null
          order_index: number
          owner: string | null
          room: string | null
          show_id: string
          slide_ref: string | null
          source_row_id: string | null
          speaker: string | null
          start_time: string | null
          status: string | null
          title: string
          updated_at: string
          video: string | null
        }
        Insert: {
          audio?: string | null
          created_at?: string
          cue_id?: string | null
          duration?: string | null
          hard_time?: boolean | null
          id?: string
          item_type?: string
          lighting?: string | null
          notes?: string | null
          order_index?: number
          owner?: string | null
          room?: string | null
          show_id: string
          slide_ref?: string | null
          source_row_id?: string | null
          speaker?: string | null
          start_time?: string | null
          status?: string | null
          title: string
          updated_at?: string
          video?: string | null
        }
        Update: {
          audio?: string | null
          created_at?: string
          cue_id?: string | null
          duration?: string | null
          hard_time?: boolean | null
          id?: string
          item_type?: string
          lighting?: string | null
          notes?: string | null
          order_index?: number
          owner?: string | null
          room?: string | null
          show_id?: string
          slide_ref?: string | null
          source_row_id?: string | null
          speaker?: string | null
          start_time?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ros_items_cue_id_fkey"
            columns: ["cue_id"]
            isOneToOne: false
            referencedRelation: "cues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ros_items_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      ros_snapshots: {
        Row: {
          created_at: string
          id: string
          show_id: string
          snapshot_data: Json
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          show_id: string
          snapshot_data: Json
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          show_id?: string
          snapshot_data?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ros_snapshots_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ros_snapshots_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "ros_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ros_sync_sources: {
        Row: {
          column_mapping: Json | null
          created_at: string
          created_by: string | null
          id: string
          last_snapshot: Json | null
          last_synced_at: string | null
          show_id: string
          source_name: string | null
          source_type: string
          source_url: string
          sync_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          column_mapping?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_snapshot?: Json | null
          last_synced_at?: string | null
          show_id: string
          source_name?: string | null
          source_type: string
          source_url: string
          sync_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          column_mapping?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_snapshot?: Json | null
          last_synced_at?: string | null
          show_id?: string
          source_name?: string | null
          source_type?: string
          source_url?: string
          sync_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ros_sync_sources_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      ros_versions: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          show_id: string
          source_type: string
          summary: string | null
          version_number: number
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          show_id: string
          source_type?: string
          summary?: string | null
          version_number?: number
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          show_id?: string
          source_type?: string
          summary?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ros_versions_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
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
      show_favorites: {
        Row: {
          created_at: string
          id: string
          show_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          show_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          show_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_favorites_show_id_fkey"
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
          hidden: boolean | null
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
          hidden?: boolean | null
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
          hidden?: boolean | null
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
      show_segments: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          order_index: number
          show_id: string
          start_time: number | null
          target_duration: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          order_index?: number
          show_id: string
          start_time?: number | null
          target_duration?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          show_id?: string
          start_time?: number | null
          target_duration?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_segments_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      show_vog_settings: {
        Row: {
          created_at: string
          default_voice_id: string | null
          id: string
          naming_convention: string | null
          show_id: string
          updated_at: string
          voice_locked: boolean | null
        }
        Insert: {
          created_at?: string
          default_voice_id?: string | null
          id?: string
          naming_convention?: string | null
          show_id: string
          updated_at?: string
          voice_locked?: boolean | null
        }
        Update: {
          created_at?: string
          default_voice_id?: string | null
          id?: string
          naming_convention?: string | null
          show_id?: string
          updated_at?: string
          voice_locked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "show_vog_settings_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: true
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
          cue_count: number | null
          custom_tracks: Json | null
          default_tracks: string[] | null
          description: string | null
          doors_time: string | null
          event_end_date: string | null
          event_name: string | null
          event_start_date: string | null
          folder_id: string | null
          id: string
          is_playing: boolean | null
          locked: boolean | null
          logo_url: string | null
          name: string
          rehearsal_mode: boolean | null
          room_name: string | null
          safety_mode: boolean | null
          secondary_color: string | null
          show_code: string
          show_mode: string | null
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
          total_duration: number | null
          updated_at: string
          user_id: string | null
          venue: string | null
          video_latency_offset: number | null
          workspace_id: string | null
        }
        Insert: {
          apply_branding?: boolean | null
          audio_latency_offset?: number | null
          autosave_interval?: number | null
          brand_color?: string | null
          call_time?: string | null
          created_at?: string
          cue_count?: number | null
          custom_tracks?: Json | null
          default_tracks?: string[] | null
          description?: string | null
          doors_time?: string | null
          event_end_date?: string | null
          event_name?: string | null
          event_start_date?: string | null
          folder_id?: string | null
          id?: string
          is_playing?: boolean | null
          locked?: boolean | null
          logo_url?: string | null
          name: string
          rehearsal_mode?: boolean | null
          room_name?: string | null
          safety_mode?: boolean | null
          secondary_color?: string | null
          show_code: string
          show_mode?: string | null
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
          total_duration?: number | null
          updated_at?: string
          user_id?: string | null
          venue?: string | null
          video_latency_offset?: number | null
          workspace_id?: string | null
        }
        Update: {
          apply_branding?: boolean | null
          audio_latency_offset?: number | null
          autosave_interval?: number | null
          brand_color?: string | null
          call_time?: string | null
          created_at?: string
          cue_count?: number | null
          custom_tracks?: Json | null
          default_tracks?: string[] | null
          description?: string | null
          doors_time?: string | null
          event_end_date?: string | null
          event_name?: string | null
          event_start_date?: string | null
          folder_id?: string | null
          id?: string
          is_playing?: boolean | null
          locked?: boolean | null
          logo_url?: string | null
          name?: string
          rehearsal_mode?: boolean | null
          room_name?: string | null
          safety_mode?: boolean | null
          secondary_color?: string | null
          show_code?: string
          show_mode?: string | null
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
          total_duration?: number | null
          updated_at?: string
          user_id?: string | null
          venue?: string | null
          video_latency_offset?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vog_generations: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          created_at: string
          created_by: string | null
          cue_id: string
          error_message: string | null
          file_name: string | null
          id: string
          script: string
          show_id: string
          status: string
          updated_at: string
          voice_id: string
          voice_style: string | null
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          cue_id: string
          error_message?: string | null
          file_name?: string | null
          id?: string
          script: string
          show_id: string
          status?: string
          updated_at?: string
          voice_id?: string
          voice_style?: string | null
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          cue_id?: string
          error_message?: string | null
          file_name?: string | null
          id?: string
          script?: string
          show_id?: string
          status?: string
          updated_at?: string
          voice_id?: string
          voice_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vog_generations_cue_id_fkey"
            columns: ["cue_id"]
            isOneToOne: false
            referencedRelation: "cues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vog_generations_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
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
      workspace_invites: {
        Row: {
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
        }
        Insert: {
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
        }
        Update: {
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          plan: Database["public"]["Enums"]["workspace_plan"]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["workspace_plan"]
          slug?: string
          updated_at?: string
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
      is_workspace_member: {
        Args: {
          _roles?: Database["public"]["Enums"]["workspace_role"][]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      join_show_as_guest: {
        Args: { _show_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      cue_type:
        | "vog"
        | "audio"
        | "lights"
        | "video"
        | "stage_action"
        | "segment_marker"
      workspace_plan: "free" | "starter" | "professional" | "enterprise"
      workspace_role: "owner" | "admin" | "member"
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
      cue_type: [
        "vog",
        "audio",
        "lights",
        "video",
        "stage_action",
        "segment_marker",
      ],
      workspace_plan: ["free", "starter", "professional", "enterprise"],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const
