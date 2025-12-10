export interface Asset {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_url: string;
  file_type: 'audio' | 'video' | 'image' | 'document';
  mime_type: string;
  file_size: number;
  duration?: number | null;
  thumbnail_url?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ShowAsset {
  id: string;
  show_id: string;
  asset_id: string;
  added_by?: string | null;
  created_at: string;
  asset?: Asset;
}

export interface CueAsset {
  id: string;
  cue_id: string;
  asset_id: string;
  volume: number;
  playback_speed: number;
  loop_enabled: boolean;
  fade_in_duration: number;
  fade_out_duration: number;
  trim_start: number;
  trim_end?: number | null;
  start_offset: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  asset?: Asset;
}

export interface PlaybackSettings {
  volume: number;
  playback_speed: number;
  loop_enabled: boolean;
  fade_in_duration: number;
  fade_out_duration: number;
  trim_start: number;
  trim_end?: number | null;
  start_offset: number;
}

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  volume: 1.0,
  playback_speed: 1.0,
  loop_enabled: false,
  fade_in_duration: 0,
  fade_out_duration: 0,
  trim_start: 0,
  trim_end: null,
  start_offset: 0,
};

export const getFileTypeFromMime = (mimeType: string): Asset['file_type'] => {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
