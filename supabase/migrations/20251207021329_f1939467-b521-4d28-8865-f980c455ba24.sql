-- Create shows table
CREATE TABLE public.shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cues table
CREATE TABLE public.cues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('audio', 'video', 'lighting', 'stage')),
  track TEXT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '00:00:00',
  duration TEXT NOT NULL DEFAULT '00:00:30',
  position INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 100,
  color TEXT DEFAULT 'bg-runway-teal',
  notes TEXT,
  effects TEXT[] DEFAULT '{}',
  auto_follow BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cues ENABLE ROW LEVEL SECURITY;

-- Create public access policies (for now, no auth required)
CREATE POLICY "Anyone can view shows" ON public.shows FOR SELECT USING (true);
CREATE POLICY "Anyone can create shows" ON public.shows FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update shows" ON public.shows FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete shows" ON public.shows FOR DELETE USING (true);

CREATE POLICY "Anyone can view cues" ON public.cues FOR SELECT USING (true);
CREATE POLICY "Anyone can create cues" ON public.cues FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cues" ON public.cues FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cues" ON public.cues FOR DELETE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_shows_updated_at
  BEFORE UPDATE ON public.shows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cues_updated_at
  BEFORE UPDATE ON public.cues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for cues table
ALTER PUBLICATION supabase_realtime ADD TABLE public.cues;

-- Insert a default show
INSERT INTO public.shows (id, name, description) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Summer Festival 2025', 'Main event run of show');