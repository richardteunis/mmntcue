-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  theme TEXT DEFAULT 'dark',
  keyboard_shortcuts_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create show_members table for sharing shows
CREATE TABLE public.show_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer', 'guest')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(show_id, user_id),
  UNIQUE(show_id, guest_email)
);

ALTER TABLE public.show_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memberships"
  ON public.show_members FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = invited_by);

CREATE POLICY "Show owners can manage members"
  ON public.show_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.show_members sm 
      WHERE sm.show_id = show_members.show_id 
      AND sm.user_id = auth.uid() 
      AND sm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can insert as owner"
  ON public.show_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'owner');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invite', 'update', 'comment', 'mention', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Show members can view activity"
  ON public.activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.show_members sm 
      WHERE sm.show_id = activity_log.show_id 
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Show members can create activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.show_members sm 
      WHERE sm.show_id = activity_log.show_id 
      AND sm.user_id = auth.uid()
    )
  );

-- Add user_id to shows table for ownership
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update shows RLS policies for user-based access
DROP POLICY IF EXISTS "Anyone can view shows" ON public.shows;
DROP POLICY IF EXISTS "Anyone can create shows" ON public.shows;
DROP POLICY IF EXISTS "Anyone can update shows" ON public.shows;
DROP POLICY IF EXISTS "Anyone can delete shows" ON public.shows;

CREATE POLICY "Users can view their own shows or shared shows"
  ON public.shows FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.show_members sm 
      WHERE sm.show_id = shows.id 
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create shows"
  ON public.shows FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Show owners can update shows"
  ON public.shows FOR UPDATE
  USING (
    user_id = auth.uid() OR
    user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.show_members sm 
      WHERE sm.show_id = shows.id 
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Show owners can delete shows"
  ON public.shows FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Update cues RLS for user-based access
DROP POLICY IF EXISTS "Anyone can view cues" ON public.cues;
DROP POLICY IF EXISTS "Anyone can create cues" ON public.cues;
DROP POLICY IF EXISTS "Anyone can update cues" ON public.cues;
DROP POLICY IF EXISTS "Anyone can delete cues" ON public.cues;

CREATE POLICY "Users can view cues for accessible shows"
  ON public.cues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shows s 
      WHERE s.id = cues.show_id 
      AND (
        s.user_id = auth.uid() OR
        s.user_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.show_members sm 
          WHERE sm.show_id = s.id 
          AND sm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create cues for accessible shows"
  ON public.cues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shows s 
      WHERE s.id = cues.show_id 
      AND (
        s.user_id = auth.uid() OR
        s.user_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.show_members sm 
          WHERE sm.show_id = s.id 
          AND sm.user_id = auth.uid()
          AND sm.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can update cues for accessible shows"
  ON public.cues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shows s 
      WHERE s.id = cues.show_id 
      AND (
        s.user_id = auth.uid() OR
        s.user_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.show_members sm 
          WHERE sm.show_id = s.id 
          AND sm.user_id = auth.uid()
          AND sm.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can delete cues for accessible shows"
  ON public.cues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.shows s 
      WHERE s.id = cues.show_id 
      AND (
        s.user_id = auth.uid() OR
        s.user_id IS NULL OR
        EXISTS (
          SELECT 1 FROM public.show_members sm 
          WHERE sm.show_id = s.id 
          AND sm.user_id = auth.uid()
          AND sm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Update folders RLS
DROP POLICY IF EXISTS "Anyone can view folders" ON public.folders;
DROP POLICY IF EXISTS "Anyone can create folders" ON public.folders;
DROP POLICY IF EXISTS "Anyone can update folders" ON public.folders;
DROP POLICY IF EXISTS "Anyone can delete folders" ON public.folders;

ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users can view their own folders"
  ON public.folders FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create their own folders"
  ON public.folders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own folders"
  ON public.folders FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete their own folders"
  ON public.folders FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;