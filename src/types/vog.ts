export interface VOGGeneration {
  id: string;
  cue_id: string;
  show_id: string;
  script: string;
  voice_id: string;
  voice_style: string;
  status: 'pending' | 'queued' | 'processing' | 'succeeded' | 'failed';
  error_message: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  file_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShowVOGSettings {
  id: string;
  show_id: string;
  default_voice_id: string;
  voice_locked: boolean;
  naming_convention: string;
  created_at: string;
  updated_at: string;
}

export interface OpsNote {
  id: string;
  cue_id: string | null;
  show_id: string;
  message: string;
  target_type: 'all' | 'role' | 'user';
  target_roles: string[] | null;
  target_user_ids: string[] | null;
  is_critical: boolean;
  auto_send: boolean;
  sent_at: string | null;
  sent_by: string | null;
  acknowledged_by: string[] | null;
  acknowledged_at: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  workspace_id: string | null;
  show_id: string | null;
  name: string;
  message: string;
  target_type: string;
  target_roles: string[] | null;
  is_critical: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and authoritative' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and resonant' },
  { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear and engaging' },
] as const;

export const VOICE_STYLES = [
  { id: 'calm', name: 'Calm', description: 'Relaxed, measured delivery' },
  { id: 'energetic', name: 'Energetic', description: 'Upbeat, enthusiastic tone' },
  { id: 'authoritative', name: 'Authoritative', description: 'Confident, commanding presence' },
  { id: 'warm', name: 'Warm', description: 'Friendly, welcoming tone' },
  { id: 'dramatic', name: 'Dramatic', description: 'Bold, theatrical delivery' },
] as const;

export const CREW_ROLES = [
  'Show Caller',
  'Technical Director',
  'Stage Manager',
  'Audio Lead',
  'Video Lead',
  'Lighting Lead',
  'Producer',
  'Crew',
] as const;
