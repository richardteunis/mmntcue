import { Json } from '@/integrations/supabase/types';

// Cue type enum matching database
export type CueType = 'vog' | 'audio' | 'lights' | 'video' | 'stage_action' | 'segment_marker';

// Cue status for live show control
export type CueStatus = 'standby' | 'fired' | 'skipped';

// Track type for organizing cues
export type TrackType = 'audio' | 'video' | 'lights' | 'stage';

export interface Cue {
  id: string;
  show_id: string;
  name: string;
  display_name?: string | null;
  description?: string | null;
  type: string;
  track: string;
  track_id?: string | null;
  segment_id?: string | null;
  template_id?: string | null;
  start_time: string;
  duration: string;
  position: number;
  width: number;
  color: string;
  notes: string | null;
  effects: string[];
  auto_follow: boolean;
  order_index: number;
  // Live show control fields
  status?: CueStatus | string;
  cue_type?: CueType | string;
  fired_at?: string | null;
  paused_at?: string | null;
  // Grouping fields
  group_id?: string | null;
  group_order?: number;
  is_segment_marker?: boolean;
  // Media fields
  audio_url?: string | null;
  icon?: string | null;
  created_at: string;
  updated_at: string;
}

// Track for timeline organization
export interface CueTrack {
  id: string;
  show_id: string;
  name: string;
  type: TrackType | string;
  color: string;
  cue_count: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Cue template for quick creation
export interface CueTemplate {
  id: string;
  workspace_id?: string | null;
  created_by?: string | null;
  name: string;
  cue_type: CueType | string;
  default_duration: number;
  default_notes?: string | null;
  color?: string | null;
  icon?: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Show mode for operational states
export type ShowMode = 'planning' | 'rehearsal' | 'live';

export interface Show {
  id: string;
  name: string;
  description: string | null;
  folder_id?: string | null;
  user_id?: string | null;
  workspace_id?: string | null;
  created_at: string;
  updated_at: string;
  // Event Details
  event_name?: string | null;
  venue?: string | null;
  room_name?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  call_time?: string | null;
  doors_time?: string | null;
  show_time?: string | null;
  timezone?: string | null;
  // Branding
  logo_url?: string | null;
  brand_color?: string | null;
  secondary_color?: string | null;
  apply_branding?: boolean | null;
  // Settings
  timecode_format?: string | null;
  default_tracks?: string[] | null;
  custom_tracks?: Json | null;
  autosave_interval?: number | null;
  show_template?: string | null;
  // Advanced
  rehearsal_mode?: boolean | null;
  locked?: boolean | null;
  audio_latency_offset?: number | null;
  video_latency_offset?: number | null;
  safety_mode?: boolean | null;
  // Team
  team_show_caller?: string | null;
  team_technical_director?: string | null;
  team_producer?: string | null;
  team_stage_manager?: string | null;
  team_lighting_lead?: string | null;
  team_audio_lead?: string | null;
  team_video_lead?: string | null;
  // Show Code
  show_code?: string;
  // Live show control
  show_mode?: ShowMode | string;
  is_playing?: boolean;
  total_duration?: number;
  cue_count?: number;
}

export interface CueSuggestion {
  name: string;
  type: string;
  duration: string;
  notes: string;
}

export type ViewMode = 'timeline' | 'table';

export type ShowTemplate = 'general' | 'corporate' | 'awards' | 'festival' | 'conference' | 'custom';

export const SHOW_TEMPLATES: { value: ShowTemplate; label: string; description: string }[] = [
  { value: 'general', label: 'General Session', description: 'Standard show format for most events' },
  { value: 'corporate', label: 'Corporate Keynote', description: 'Executive presentations and product launches' },
  { value: 'awards', label: 'Awards Show', description: 'Ceremonies with winners, presenters, and entertainment' },
  { value: 'festival', label: 'Festival', description: 'Multi-stage music and entertainment events' },
  { value: 'conference', label: 'Conference', description: 'Multi-session educational events' },
  { value: 'custom', label: 'Custom', description: 'Start from scratch with your own configuration' },
];

export const TIMECODE_FORMATS = [
  { value: '24fps', label: '24 fps (Film)' },
  { value: '25fps', label: '25 fps (PAL)' },
  { value: '29.97df', label: '29.97 fps Drop-Frame (NTSC)' },
  { value: '29.97ndf', label: '29.97 fps Non-Drop (NTSC)' },
  { value: '30fps', label: '30 fps' },
  { value: '60fps', label: '60 fps' },
];

export const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];
