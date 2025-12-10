-- Create assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets', 
  'assets', 
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/aac', 'audio/m4a',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for assets bucket
CREATE POLICY "Users can upload their own assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create assets table for user's asset library
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'audio', 'video', 'image', 'document'
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration REAL, -- Duration in seconds for audio/video
  thumbnail_url TEXT, -- For video/image preview
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for assets
CREATE POLICY "Users can view their own assets"
ON public.assets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets"
ON public.assets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
ON public.assets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
ON public.assets FOR DELETE
USING (auth.uid() = user_id);

-- Create show_assets table for linking assets to shows
CREATE TABLE public.show_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(show_id, asset_id)
);

-- Enable RLS
ALTER TABLE public.show_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for show_assets
CREATE POLICY "Show members can view show assets"
ON public.show_assets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = show_assets.show_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR
         EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid()))
  )
);

CREATE POLICY "Show editors can add assets to shows"
ON public.show_assets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = show_assets.show_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR
         EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'editor')))
  )
);

CREATE POLICY "Show editors can remove assets from shows"
ON public.show_assets FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM shows s
    WHERE s.id = show_assets.show_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR
         EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'editor')))
  )
);

-- Create cue_assets table for linking assets to cues with playback settings
CREATE TABLE public.cue_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cue_id UUID NOT NULL REFERENCES public.cues(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  -- Playback settings
  volume REAL NOT NULL DEFAULT 1.0, -- 0.0 to 1.0
  playback_speed REAL NOT NULL DEFAULT 1.0, -- 0.5 to 2.0
  loop_enabled BOOLEAN NOT NULL DEFAULT false,
  fade_in_duration REAL NOT NULL DEFAULT 0, -- seconds
  fade_out_duration REAL NOT NULL DEFAULT 0, -- seconds
  trim_start REAL NOT NULL DEFAULT 0, -- seconds from start
  trim_end REAL, -- seconds from start (null = full duration)
  start_offset REAL NOT NULL DEFAULT 0, -- seconds into cue when asset starts
  -- Ordering for multiple assets per cue
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cue_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for cue_assets (inherit from cues)
CREATE POLICY "Users can view cue assets for accessible cues"
ON public.cue_assets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cues c
    JOIN shows s ON s.id = c.show_id
    WHERE c.id = cue_assets.cue_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR
         EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid()))
  )
);

CREATE POLICY "Users can add assets to accessible cues"
ON public.cue_assets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cues c
    JOIN shows s ON s.id = c.show_id
    WHERE c.id = cue_assets.cue_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR
         EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'editor')))
  )
);

CREATE POLICY "Users can update cue assets for accessible cues"
ON public.cue_assets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cues c
    JOIN shows s ON s.id = c.show_id
    WHERE c.id = cue_assets.cue_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR
         EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'editor')))
  )
);

CREATE POLICY "Users can delete cue assets for accessible cues"
ON public.cue_assets FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM cues c
    JOIN shows s ON s.id = c.show_id
    WHERE c.id = cue_assets.cue_id
    AND (s.user_id = auth.uid() OR s.user_id IS NULL OR
         EXISTS (SELECT 1 FROM show_members sm WHERE sm.show_id = s.id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'editor')))
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cue_assets_updated_at
BEFORE UPDATE ON public.cue_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();