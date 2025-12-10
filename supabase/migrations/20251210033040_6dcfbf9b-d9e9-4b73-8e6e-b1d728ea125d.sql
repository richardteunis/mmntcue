-- Update cues RLS policy to also allow viewing for show code access
-- This allows any authenticated user who looked up a show by code to view cues temporarily
-- The proper solution is ensuring show_members entries are created when joining via code

-- First, we need to ensure guests who join via show code get added to show_members
-- Create a function that can be called to join a show as a guest
CREATE OR REPLACE FUNCTION public.join_show_as_guest(_show_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.show_members WHERE show_id = _show_id AND user_id = _user_id) THEN
    RETURN true;
  END IF;
  
  -- Add as guest viewer
  INSERT INTO public.show_members (show_id, user_id, role, accepted_at)
  VALUES (_show_id, _user_id, 'viewer', now());
  
  RETURN true;
END;
$$;