-- Create folders table for organizing shows
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to shows table
ALTER TABLE public.shows ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- Enable RLS on folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Create policies for folders (public access like shows)
CREATE POLICY "Anyone can view folders" ON public.folders FOR SELECT USING (true);
CREATE POLICY "Anyone can create folders" ON public.folders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update folders" ON public.folders FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete folders" ON public.folders FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();