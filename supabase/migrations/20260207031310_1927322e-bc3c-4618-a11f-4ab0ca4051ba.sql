-- Create cue_type enum
CREATE TYPE public.cue_type AS ENUM (
  'vog',
  'audio',
  'lights',
  'video',
  'stage_action',
  'segment_marker'
);

-- Create cue_tracks table
CREATE TABLE public.cue_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'stage',
  color TEXT DEFAULT '#22c55e',
  cue_count INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on cue_tracks
ALTER TABLE public.cue_tracks ENABLE ROW LEVEL SECURITY;

-- RLS policies for cue_tracks
CREATE POLICY "Show editors can manage tracks"
  ON public.cue_tracks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = cue_tracks.show_id 
    AND (s.user_id = auth.uid() OR s.user_id IS NULL 
         OR EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'editor')))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = cue_tracks.show_id 
    AND (s.user_id = auth.uid() OR s.user_id IS NULL 
         OR EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'editor')))
  ));

CREATE POLICY "Show members can view tracks"
  ON public.cue_tracks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = cue_tracks.show_id 
    AND (s.user_id = auth.uid() OR s.user_id IS NULL 
         OR EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid()))
  ));

-- Enable realtime for cue_tracks
ALTER PUBLICATION supabase_realtime ADD TABLE public.cue_tracks;

-- Add new columns to cues table
ALTER TABLE public.cues 
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'standby',
  ADD COLUMN IF NOT EXISTS cue_type cue_type DEFAULT 'stage_action',
  ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES public.show_segments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES public.cue_tracks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS group_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_segment_marker BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS fired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Add start_time column to show_segments (integer for seconds from show start)
ALTER TABLE public.show_segments
  ADD COLUMN IF NOT EXISTS start_time INTEGER DEFAULT 0;

-- Add show management columns to shows table
ALTER TABLE public.shows
  ADD COLUMN IF NOT EXISTS show_mode TEXT DEFAULT 'planning',
  ADD COLUMN IF NOT EXISTS is_playing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cue_count INTEGER DEFAULT 0;

-- Create cue_templates table
CREATE TABLE public.cue_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID,
  name TEXT NOT NULL,
  cue_type cue_type DEFAULT 'stage_action',
  default_duration INTEGER DEFAULT 30,
  default_notes TEXT,
  color TEXT,
  icon TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on cue_templates
ALTER TABLE public.cue_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for cue_templates
CREATE POLICY "Workspace members can view templates"
  ON public.cue_templates FOR SELECT
  USING (
    workspace_id IS NULL 
    OR is_workspace_member(workspace_id, auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Workspace admins can manage templates"
  ON public.cue_templates FOR ALL
  USING (
    created_by = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid(), ARRAY['owner'::workspace_role, 'admin'::workspace_role]))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid(), ARRAY['owner'::workspace_role, 'admin'::workspace_role]))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cues_segment_id ON public.cues(segment_id);
CREATE INDEX IF NOT EXISTS idx_cues_track_id ON public.cues(track_id);
CREATE INDEX IF NOT EXISTS idx_cues_status ON public.cues(status);
CREATE INDEX IF NOT EXISTS idx_cues_group_id ON public.cues(group_id);
CREATE INDEX IF NOT EXISTS idx_cue_tracks_show_id ON public.cue_tracks(show_id);
CREATE INDEX IF NOT EXISTS idx_cue_templates_workspace_id ON public.cue_templates(workspace_id);