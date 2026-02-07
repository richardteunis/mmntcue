-- Create table for script annotations
CREATE TABLE public.script_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  color VARCHAR(20) NOT NULL,
  note TEXT,
  start_offset INTEGER,
  end_offset INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for cue-page links
CREATE TABLE public.script_cue_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  cue_id UUID NOT NULL REFERENCES public.cues(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(show_id, cue_id)
);

-- Enable RLS
ALTER TABLE public.script_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_cue_links ENABLE ROW LEVEL SECURITY;

-- Policies for script_annotations
CREATE POLICY "Users can view annotations for shows they have access to"
ON public.script_annotations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.show_members 
    WHERE show_id = script_annotations.show_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = script_annotations.show_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create annotations for shows they have access to"
ON public.script_annotations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.show_members 
    WHERE show_id = script_annotations.show_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = script_annotations.show_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own annotations"
ON public.script_annotations FOR DELETE
USING (created_by = auth.uid());

-- Policies for script_cue_links
CREATE POLICY "Users can view cue links for shows they have access to"
ON public.script_cue_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.show_members 
    WHERE show_id = script_cue_links.show_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = script_cue_links.show_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create cue links for shows they have access to"
ON public.script_cue_links FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.show_members 
    WHERE show_id = script_cue_links.show_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = script_cue_links.show_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete cue links for shows they have access to"
ON public.script_cue_links FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.show_members 
    WHERE show_id = script_cue_links.show_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.shows 
    WHERE id = script_cue_links.show_id 
    AND user_id = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX idx_script_annotations_show_id ON public.script_annotations(show_id);
CREATE INDEX idx_script_cue_links_show_id ON public.script_cue_links(show_id);
CREATE INDEX idx_script_cue_links_cue_id ON public.script_cue_links(cue_id);

-- Triggers for updated_at
CREATE TRIGGER update_script_annotations_updated_at
BEFORE UPDATE ON public.script_annotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();