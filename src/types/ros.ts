// Run of Show Types

export interface ROSItem {
  id: string;
  show_id: string;
  cue_id?: string;
  order_index: number;
  start_time?: string;
  duration?: string;
  hard_time: boolean;
  title: string;
  item_type: 'segment' | 'cue' | 'buffer' | 'moment';
  speaker?: string;
  owner?: string;
  notes?: string;
  audio?: string;
  lighting?: string;
  video?: string;
  slide_ref?: string;
  room?: string;
  status: 'pending' | 'ready' | 'complete' | 'skipped';
  source_row_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ROSVersion {
  id: string;
  show_id: string;
  version_number: number;
  created_by?: string;
  approved_by?: string;
  summary?: string;
  source_type: 'manual' | 'csv' | 'google_sheet' | 'excel' | 'ai';
  created_at: string;
}

export interface ROSSnapshot {
  id: string;
  version_id: string;
  show_id: string;
  snapshot_data: ROSItem[];
  created_at: string;
}

export interface ROSImportTemplate {
  id: string;
  workspace_id?: string;
  show_id?: string;
  name: string;
  column_mapping: ColumnMapping;
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ROSSyncSource {
  id: string;
  show_id: string;
  source_type: 'csv' | 'google_sheet' | 'excel';
  source_url: string;
  source_name?: string;
  column_mapping?: ColumnMapping;
  last_synced_at?: string;
  last_snapshot?: ROSItem[];
  sync_enabled: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ROSChangeRequest {
  id: string;
  show_id: string;
  version_id?: string;
  request_type: 'ai' | 'sync' | 'manual';
  status: 'pending' | 'approved' | 'rejected';
  diff_payload: ChangeOperation[];
  summary?: string;
  proposed_by?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  ai_prompt?: string;
  ai_response?: string;
  created_at: string;
  updated_at: string;
}

export interface ROSChatMessage {
  id: string;
  show_id: string;
  user_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  change_request_id?: string;
  created_at: string;
}

// Column mapping for imports
export interface ColumnMapping {
  start_time?: string;
  duration?: string;
  title: string;
  item_type?: string;
  speaker?: string;
  owner?: string;
  notes?: string;
  audio?: string;
  lighting?: string;
  video?: string;
  slide_ref?: string;
  room?: string;
  status?: string;
  hard_time?: string;
}

// Change item types for AI operations
export interface CueChangeItem {
  name?: string;
  title?: string; // alias for name
  type?: string;
  track?: string;
  start_time?: string;
  duration?: string;
  notes?: string;
}

export interface SegmentChangeItem {
  name?: string;
  target_duration?: number;
  color?: string;
}

// Change operations for diffs
export type ChangeOperation = 
  | { target?: 'cue' | 'segment'; type: 'insert'; item?: CueChangeItem | SegmentChangeItem; index?: number }
  | { target?: 'cue' | 'segment'; type: 'update'; id?: string; changes?: Record<string, unknown>; previous?: Record<string, unknown> }
  | { target?: 'cue' | 'segment'; type: 'delete'; id?: string; item?: Record<string, unknown> }
  | { target?: 'cue' | 'segment'; type: 'move'; id?: string; from_index?: number; to_index?: number }
  | { target?: 'cue'; type: 'shift'; ids?: string[]; time_delta?: number; direction?: 'forward' | 'backward' }
  | { target?: 'cue'; type: 'duplicate'; id?: string; new_name?: string }
  | { target?: 'segment'; type: 'reorder'; order?: string[] };

// CSV parsing result
export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: CSVError[];
}

export interface CSVError {
  row: number;
  column?: string;
  message: string;
}

// Import preview row
export interface ImportPreviewRow {
  data: Record<string, string>;
  rowIndex: number;
  errors: CSVError[];
  isValid: boolean;
}

// Required and optional fields for mapping
export const REQUIRED_FIELDS = ['title'] as const;
export const TIMING_FIELDS = ['start_time', 'duration'] as const;
export const OPTIONAL_FIELDS = [
  'item_type', 'speaker', 'owner', 'notes', 'audio', 'lighting', 
  'video', 'slide_ref', 'room', 'status', 'hard_time'
] as const;

export const ALL_TARGET_FIELDS = [
  ...REQUIRED_FIELDS,
  ...TIMING_FIELDS,
  ...OPTIONAL_FIELDS
] as const;

export type TargetField = typeof ALL_TARGET_FIELDS[number];
