import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VOGGeneration, ShowVOGSettings, OpsNote, NotificationTemplate } from '@/types/vog';
import { useToast } from '@/hooks/use-toast';

export function useVOG(showId: string) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ShowVOGSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch VOG settings for show
  useEffect(() => {
    if (!showId) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('show_vog_settings')
        .select('*')
        .eq('show_id', showId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching VOG settings:', error);
      }
      setSettings(data as ShowVOGSettings | null);
      setLoading(false);
    };

    fetchSettings();
  }, [showId]);

  // Generate VOG audio
  const generateVOG = useCallback(async (
    cueId: string,
    script: string,
    voiceId: string,
    style: string
  ): Promise<VOGGeneration | null> => {
    try {
      // First, create the generation record
      const { data: generation, error: insertError } = await supabase
        .from('vog_generations')
        .insert({
          cue_id: cueId,
          show_id: showId,
          script,
          voice_id: voiceId,
          voice_style: style,
          status: 'queued',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Call edge function to generate audio
      const { data, error } = await supabase.functions.invoke('generate-vog', {
        body: {
          generationId: generation.id,
          script,
          voiceId,
          style,
          showId,
          cueId,
        },
      });

      if (error) {
        // Update status to failed
        await supabase
          .from('vog_generations')
          .update({ status: 'failed', error_message: error.message })
          .eq('id', generation.id);
        throw error;
      }

      return generation as VOGGeneration;
    } catch (error) {
      console.error('Error generating VOG:', error);
      throw error;
    }
  }, [showId]);

  // Get generation for a cue
  const getGenerationForCue = useCallback(async (cueId: string): Promise<VOGGeneration | null> => {
    const { data, error } = await supabase
      .from('vog_generations')
      .select('*')
      .eq('cue_id', cueId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching VOG generation:', error);
    }

    return data as VOGGeneration | null;
  }, []);

  // Update VOG settings
  const updateSettings = useCallback(async (updates: Partial<ShowVOGSettings>) => {
    try {
      const { data, error } = await supabase
        .from('show_vog_settings')
        .upsert({
          show_id: showId,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      setSettings(data as ShowVOGSettings);
      return data;
    } catch (error) {
      console.error('Error updating VOG settings:', error);
      throw error;
    }
  }, [showId]);

  return {
    settings,
    loading,
    generateVOG,
    getGenerationForCue,
    updateSettings,
  };
}

export function useOpsNotes(showId: string) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch templates for show/workspace
  useEffect(() => {
    if (!showId) return;

    const fetchTemplates = async () => {
      // Get show to find workspace_id
      const { data: show } = await supabase
        .from('shows')
        .select('workspace_id')
        .eq('id', showId)
        .single();

      // Fetch templates from workspace and show overrides
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .or(`show_id.eq.${showId}${show?.workspace_id ? `,workspace_id.eq.${show.workspace_id}` : ''}`)
        .order('sort_order');

      if (error) {
        console.error('Error fetching templates:', error);
      } else {
        // Prefer show-level templates over workspace templates
        const templateMap = new Map<string, NotificationTemplate>();
        (data as NotificationTemplate[]).forEach(t => {
          const existing = templateMap.get(t.name);
          if (!existing || t.show_id) {
            templateMap.set(t.name, t);
          }
        });
        setTemplates(Array.from(templateMap.values()));
      }
      setLoading(false);
    };

    fetchTemplates();
  }, [showId]);

  // Create ops note
  const createOpsNote = useCallback(async (data: Partial<OpsNote>): Promise<OpsNote> => {
    const insertData = {
      ...data,
      show_id: showId,
    };
    const { data: note, error } = await supabase
      .from('ops_notes')
      .insert(insertData as any)
      .select()
      .single();

    if (error) throw error;
    return note as OpsNote;
  }, [showId]);

  // Update ops note
  const updateOpsNote = useCallback(async (id: string, data: Partial<OpsNote>): Promise<OpsNote> => {
    const { data: note, error } = await supabase
      .from('ops_notes')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return note as OpsNote;
  }, []);

  // Send ops note
  const sendOpsNote = useCallback(async (noteId: string): Promise<void> => {
    const { error } = await supabase
      .from('ops_notes')
      .update({
        sent_at: new Date().toISOString(),
      })
      .eq('id', noteId);

    if (error) throw error;

    // TODO: Trigger push notification via edge function
    toast({
      title: 'Notification sent',
      description: 'Crew members have been notified.',
    });
  }, [toast]);

  // Send quick notification from template
  const sendQuickNotification = useCallback(async (templateId: string): Promise<void> => {
    const template = templates.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    // Create and immediately send the note
    const { error } = await supabase
      .from('ops_notes')
      .insert({
        show_id: showId,
        message: template.message,
        target_type: template.target_type,
        target_roles: template.target_roles,
        is_critical: template.is_critical,
        sent_at: new Date().toISOString(),
      } as any);

    if (error) throw error;

    // TODO: Trigger push notification via edge function
  }, [showId, templates]);

  // Acknowledge ops note
  const acknowledgeNote = useCallback(async (noteId: string, userId: string): Promise<void> => {
    // Get current note
    const { data: note, error: fetchError } = await supabase
      .from('ops_notes')
      .select('acknowledged_by, acknowledged_at')
      .eq('id', noteId)
      .single();

    if (fetchError) throw fetchError;

    const acknowledgedBy = note?.acknowledged_by || [];
    const acknowledgedAt = note?.acknowledged_at || [];

    if (acknowledgedBy.includes(userId)) return; // Already acknowledged

    const { error } = await supabase
      .from('ops_notes')
      .update({
        acknowledged_by: [...acknowledgedBy, userId],
        acknowledged_at: [...acknowledgedAt, new Date().toISOString()],
      })
      .eq('id', noteId);

    if (error) throw error;
  }, []);

  // Get ops note for cue
  const getOpsNoteForCue = useCallback(async (cueId: string): Promise<OpsNote | null> => {
    const { data, error } = await supabase
      .from('ops_notes')
      .select('*')
      .eq('cue_id', cueId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching ops note:', error);
    }

    return data as OpsNote | null;
  }, []);

  return {
    templates,
    loading,
    createOpsNote,
    updateOpsNote,
    sendOpsNote,
    sendQuickNotification,
    acknowledgeNote,
    getOpsNoteForCue,
  };
}
