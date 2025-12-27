-- Create segments table for show structure
CREATE TABLE public.show_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_duration INTEGER NOT NULL DEFAULT 900, -- in seconds, default 15 minutes
  order_index INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.show_segments ENABLE ROW LEVEL SECURITY;

-- Create policies - same access as cues (show members can view, editors can modify)
CREATE POLICY "Show members can view segments"
ON public.show_segments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = show_segments.show_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR EXISTS (
      SELECT 1 FROM show_members sm
      WHERE sm.show_id = s.id AND sm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Show editors can create segments"
ON public.show_segments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = show_segments.show_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR EXISTS (
      SELECT 1 FROM show_members sm
      WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role = ANY(ARRAY['owner', 'editor'])
    ))
  )
);

CREATE POLICY "Show editors can update segments"
ON public.show_segments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = show_segments.show_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR EXISTS (
      SELECT 1 FROM show_members sm
      WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role = ANY(ARRAY['owner', 'editor'])
    ))
  )
);

CREATE POLICY "Show editors can delete segments"
ON public.show_segments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = show_segments.show_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR EXISTS (
      SELECT 1 FROM show_members sm
      WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role = ANY(ARRAY['owner', 'editor'])
    ))
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_show_segments_updated_at
BEFORE UPDATE ON public.show_segments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.show_segments;