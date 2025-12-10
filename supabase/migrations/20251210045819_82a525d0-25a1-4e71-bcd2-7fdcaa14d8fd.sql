-- Create show_favorites table for starring shows
CREATE TABLE public.show_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, show_id)
);

-- Enable RLS
ALTER TABLE public.show_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.show_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can add their own favorites"
ON public.show_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can remove their own favorites"
ON public.show_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Add hidden column to show_members for hiding shared shows
ALTER TABLE public.show_members 
ADD COLUMN hidden BOOLEAN DEFAULT false;

-- Enable realtime for show_favorites
ALTER PUBLICATION supabase_realtime ADD TABLE public.show_favorites;