-- Drop the problematic policies
DROP POLICY IF EXISTS "Show owners can manage members" ON public.show_members;

-- Create security definer function to check show membership (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_show_member(_show_id uuid, _user_id uuid, _roles text[] DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.show_members
    WHERE show_id = _show_id
      AND user_id = _user_id
      AND (_roles IS NULL OR role = ANY(_roles))
  )
$$;

-- Create security definer function to check show ownership via shows table
CREATE OR REPLACE FUNCTION public.is_show_owner(_show_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shows
    WHERE id = _show_id
      AND (user_id = _user_id OR user_id IS NULL)
  )
$$;

-- Recreate show_members policies using security definer functions
CREATE POLICY "Show owners and editors can manage members"
  ON public.show_members FOR ALL
  USING (
    public.is_show_owner(show_id, auth.uid()) OR
    public.is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor'])
  );