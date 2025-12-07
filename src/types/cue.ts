export interface Cue {
  id: string;
  show_id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  track: string;
  start_time: string;
  duration: string;
  position: number;
  width: number;
  color: string;
  notes: string | null;
  effects: string[];
  auto_follow: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Show {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CueSuggestion {
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  duration: string;
  notes: string;
}

export type ViewMode = 'timeline' | 'table';
