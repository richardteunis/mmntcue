-- VOG Generations table to track TTS jobs
CREATE TABLE public.vog_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cue_id UUID REFERENCES public.cues(id) ON DELETE CASCADE NOT NULL,
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE NOT NULL,
  script TEXT NOT NULL,
  voice_id TEXT NOT NULL DEFAULT 'alloy',
  voice_style TEXT DEFAULT 'calm',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'succeeded', 'failed')),
  error_message TEXT,
  audio_url TEXT,
  audio_duration NUMERIC,
  file_name TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Show VOG settings for defaults
CREATE TABLE public.show_vog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_voice_id TEXT DEFAULT 'alloy',
  voice_locked BOOLEAN DEFAULT false,
  naming_convention TEXT DEFAULT '{show_name}_{cue_name}_{timestamp}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Ops Notes table
CREATE TABLE public.ops_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cue_id UUID REFERENCES public.cues(id) ON DELETE CASCADE,
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'role', 'user')),
  target_roles TEXT[],
  target_user_ids UUID[],
  is_critical BOOLEAN DEFAULT false,
  auto_send BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID,
  acknowledged_by UUID[],
  acknowledged_at TIMESTAMP WITH TIME ZONE[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Notification templates (org/workspace level with show overrides)
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT DEFAULT 'all',
  target_roles TEXT[],
  is_critical BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT templates_scope_check CHECK (workspace_id IS NOT NULL OR show_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.vog_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_vog_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- VOG Generations policies - show members can view, caller/TD can create
CREATE POLICY "Show members can view VOG generations"
  ON public.vog_generations FOR SELECT
  USING (public.is_show_member(show_id, auth.uid()));

CREATE POLICY "Show members can create VOG generations"
  ON public.vog_generations FOR INSERT
  WITH CHECK (public.is_show_member(show_id, auth.uid()));

CREATE POLICY "Show members can update VOG generations"
  ON public.vog_generations FOR UPDATE
  USING (public.is_show_member(show_id, auth.uid()));

-- Show VOG Settings policies
CREATE POLICY "Show members can view VOG settings"
  ON public.show_vog_settings FOR SELECT
  USING (public.is_show_member(show_id, auth.uid()));

CREATE POLICY "Show owner can manage VOG settings"
  ON public.show_vog_settings FOR ALL
  USING (public.is_show_owner(show_id, auth.uid()));

-- Ops Notes policies
CREATE POLICY "Show members can view ops notes"
  ON public.ops_notes FOR SELECT
  USING (public.is_show_member(show_id, auth.uid()));

CREATE POLICY "Show members can create ops notes"
  ON public.ops_notes FOR INSERT
  WITH CHECK (public.is_show_member(show_id, auth.uid()));

CREATE POLICY "Show members can update ops notes"
  ON public.ops_notes FOR UPDATE
  USING (public.is_show_member(show_id, auth.uid()));

CREATE POLICY "Show members can delete ops notes"
  ON public.ops_notes FOR DELETE
  USING (public.is_show_member(show_id, auth.uid()));

-- Notification templates policies
CREATE POLICY "Workspace members can view templates"
  ON public.notification_templates FOR SELECT
  USING (
    (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()))
    OR (show_id IS NOT NULL AND public.is_show_member(show_id, auth.uid()))
  );

CREATE POLICY "Workspace admins can manage templates"
  ON public.notification_templates FOR ALL
  USING (
    (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid(), ARRAY['owner', 'admin']::workspace_role[]))
    OR (show_id IS NOT NULL AND public.is_show_owner(show_id, auth.uid()))
  );

-- Insert default notification templates
INSERT INTO public.notification_templates (workspace_id, name, message, target_type, is_critical, sort_order)
SELECT w.id, t.name, t.message, t.target_type, t.is_critical, t.sort_order
FROM public.workspaces w
CROSS JOIN (VALUES
  ('Silence Phones', 'Please silence all phones and electronic devices.', 'all', false, 1),
  ('Bio Break', 'Bio break opportunity - 5 minutes.', 'all', false, 2),
  ('10 Minutes to Doors', '10 minutes to doors. Final checks.', 'all', false, 3),
  ('Stand By', 'STAND BY for next cue.', 'all', false, 4),
  ('Hold', 'HOLD - Do not proceed until further notice.', 'all', true, 5)
) AS t(name, message, target_type, is_critical, sort_order);

-- Triggers for updated_at
CREATE TRIGGER update_vog_generations_updated_at
  BEFORE UPDATE ON public.vog_generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_show_vog_settings_updated_at
  BEFORE UPDATE ON public.show_vog_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ops_notes_updated_at
  BEFORE UPDATE ON public.ops_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();