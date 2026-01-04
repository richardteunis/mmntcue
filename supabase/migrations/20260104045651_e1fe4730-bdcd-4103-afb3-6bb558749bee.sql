-- Run of Show Items (source of truth for imported/synced rows)
CREATE TABLE public.ros_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
    cue_id UUID REFERENCES public.cues(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    start_time TEXT,
    duration TEXT,
    hard_time BOOLEAN DEFAULT false,
    title TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'cue',
    speaker TEXT,
    owner TEXT,
    notes TEXT,
    audio TEXT,
    lighting TEXT,
    video TEXT,
    slide_ref TEXT,
    room TEXT,
    status TEXT DEFAULT 'pending',
    source_row_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROS Versions (version history)
CREATE TABLE public.ros_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    summary TEXT,
    source_type TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROS Snapshots (serialized state per version)
CREATE TABLE public.ros_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.ros_versions(id) ON DELETE CASCADE,
    show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Import Templates (saved column mappings)
CREATE TABLE public.ros_import_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    column_mapping JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync Sources (external sheet connections)
CREATE TABLE public.ros_sync_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_name TEXT,
    column_mapping JSONB,
    last_synced_at TIMESTAMPTZ,
    last_snapshot JSONB,
    sync_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Change Requests (AI and sync diffs)
CREATE TABLE public.ros_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
    version_id UUID REFERENCES public.ros_versions(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL DEFAULT 'ai',
    status TEXT NOT NULL DEFAULT 'pending',
    diff_payload JSONB NOT NULL,
    summary TEXT,
    proposed_by UUID REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Chat Messages (for CuePilot)
CREATE TABLE public.ros_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL DEFAULT 'user',
    content TEXT NOT NULL,
    change_request_id UUID REFERENCES public.ros_change_requests(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ros_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ros_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ros_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ros_import_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ros_sync_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ros_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ros_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ros_items
CREATE POLICY "Show members can view ros_items"
ON public.ros_items FOR SELECT
USING (is_show_member(show_id, auth.uid()));

CREATE POLICY "Show editors can manage ros_items"
ON public.ros_items FOR ALL
USING (is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor']))
WITH CHECK (is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor']));

-- RLS Policies for ros_versions
CREATE POLICY "Show members can view ros_versions"
ON public.ros_versions FOR SELECT
USING (is_show_member(show_id, auth.uid()));

CREATE POLICY "Show editors can manage ros_versions"
ON public.ros_versions FOR ALL
USING (is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor']))
WITH CHECK (is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor']));

-- RLS Policies for ros_snapshots
CREATE POLICY "Show members can view ros_snapshots"
ON public.ros_snapshots FOR SELECT
USING (is_show_member(show_id, auth.uid()));

CREATE POLICY "Show editors can manage ros_snapshots"
ON public.ros_snapshots FOR ALL
USING (is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor']))
WITH CHECK (is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor']));

-- RLS Policies for ros_import_templates
CREATE POLICY "Users can view their templates"
ON public.ros_import_templates FOR SELECT
USING (
    created_by = auth.uid() OR
    (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid())) OR
    (show_id IS NOT NULL AND is_show_member(show_id, auth.uid()))
);

CREATE POLICY "Users can manage their templates"
ON public.ros_import_templates FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- RLS Policies for ros_sync_sources
CREATE POLICY "Show members can view sync_sources"
ON public.ros_sync_sources FOR SELECT
USING (is_show_member(show_id, auth.uid()));

CREATE POLICY "Show editors can manage sync_sources"
ON public.ros_sync_sources FOR ALL
USING (is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor']))
WITH CHECK (is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor']));

-- RLS Policies for ros_change_requests
CREATE POLICY "Show members can view change_requests"
ON public.ros_change_requests FOR SELECT
USING (is_show_member(show_id, auth.uid()));

CREATE POLICY "Show members can create change_requests"
ON public.ros_change_requests FOR INSERT
WITH CHECK (is_show_member(show_id, auth.uid()));

CREATE POLICY "Show editors can update change_requests"
ON public.ros_change_requests FOR UPDATE
USING (is_show_member(show_id, auth.uid(), ARRAY['owner', 'editor']));

-- RLS Policies for ros_chat_messages
CREATE POLICY "Show members can view chat_messages"
ON public.ros_chat_messages FOR SELECT
USING (is_show_member(show_id, auth.uid()));

CREATE POLICY "Show members can create chat_messages"
ON public.ros_chat_messages FOR INSERT
WITH CHECK (is_show_member(show_id, auth.uid()));

-- Indexes for performance
CREATE INDEX idx_ros_items_show_id ON public.ros_items(show_id);
CREATE INDEX idx_ros_items_order ON public.ros_items(show_id, order_index);
CREATE INDEX idx_ros_versions_show_id ON public.ros_versions(show_id);
CREATE INDEX idx_ros_snapshots_version_id ON public.ros_snapshots(version_id);
CREATE INDEX idx_ros_sync_sources_show_id ON public.ros_sync_sources(show_id);
CREATE INDEX idx_ros_change_requests_show_id ON public.ros_change_requests(show_id);
CREATE INDEX idx_ros_chat_messages_show_id ON public.ros_chat_messages(show_id);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ros_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ros_change_requests;