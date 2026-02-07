import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CueTemplate, CueType } from '@/types/cue';

export function useTemplates(workspaceId: string | null) {
  const [templates, setTemplates] = useState<CueTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      let query = supabase
        .from('cue_templates')
        .select('*')
        .eq('is_archived', false)
        .order('name', { ascending: true });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTemplates((data || []) as CueTemplate[]);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error loading templates',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, toast]);

  // Create template
  const createTemplate = useCallback(async (
    name: string, 
    cueType: CueType = 'stage_action',
    defaultDuration: number = 30,
    options?: { color?: string; icon?: string; defaultNotes?: string }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('cue_templates')
        .insert({
          workspace_id: workspaceId,
          created_by: user?.id,
          name,
          cue_type: cueType,
          default_duration: defaultDuration,
          color: options?.color,
          icon: options?.icon,
          default_notes: options?.defaultNotes,
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => [...prev, data as CueTemplate]);
      toast({
        title: 'Template created',
        description: `${name} template has been created`,
      });
      return data as CueTemplate;
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error creating template',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [workspaceId, toast]);

  // Update template
  const updateTemplate = useCallback(async (templateId: string, updates: Partial<CueTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('cue_templates')
        .update(updates as any)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => prev.map(t => t.id === templateId ? data as CueTemplate : t));
      return data as CueTemplate;
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error updating template',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Archive template (soft delete)
  const archiveTemplate = useCallback(async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('cue_templates')
        .update({ is_archived: true })
        .eq('id', templateId);

      if (error) throw error;
      
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast({
        title: 'Template archived',
        description: 'Template has been archived',
      });
      return true;
    } catch (error: any) {
      console.error('Error archiving template:', error);
      toast({
        title: 'Error archiving template',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    archiveTemplate,
    refetch: fetchTemplates,
  };
}
