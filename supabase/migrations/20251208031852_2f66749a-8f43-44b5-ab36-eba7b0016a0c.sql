-- Add show_code column to shows table
ALTER TABLE public.shows 
ADD COLUMN show_code TEXT UNIQUE;

-- Create function to generate unique show codes
CREATE OR REPLACE FUNCTION public.generate_show_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN := TRUE;
BEGIN
  WHILE code_exists LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.shows WHERE show_code = result) INTO code_exists;
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger to auto-generate show_code on insert
CREATE OR REPLACE FUNCTION public.set_show_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.show_code IS NULL THEN
    NEW.show_code := public.generate_show_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_show_code
BEFORE INSERT ON public.shows
FOR EACH ROW
EXECUTE FUNCTION public.set_show_code();

-- Generate codes for existing shows
UPDATE public.shows 
SET show_code = public.generate_show_code()
WHERE show_code IS NULL;

-- Make show_code NOT NULL after populating existing rows
ALTER TABLE public.shows 
ALTER COLUMN show_code SET NOT NULL;

-- Create index for fast lookups
CREATE INDEX idx_shows_show_code ON public.shows(show_code);

-- Allow anyone to look up a show by code (for joining)
CREATE POLICY "Anyone can lookup shows by code"
ON public.shows
FOR SELECT
USING (show_code IS NOT NULL);