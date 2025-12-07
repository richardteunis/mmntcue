import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cue, CueSuggestion } from '@/types/cue';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_SHOW_ID = '00000000-0000-0000-0000-000000000001';

export function useCues() {
  const [cues, setCues] = useState<Cue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showId] = useState(DEFAULT_SHOW_ID);
  const { toast } = useToast();

  const fetchCues = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cues')
        .select('*')
        .eq('show_id', showId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      
      setCues(data?.map(cue => ({
        ...cue,
        type: cue.type as 'audio' | 'video' | 'lighting' | 'stage',
        effects: cue.effects || []
      })) || []);
    } catch (error) {
      console.error('Error fetching cues:', error);
      toast({
        title: 'Error loading cues',
        description: 'Could not load cues from the database',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [showId, toast]);

  useEffect(() => {
    fetchCues();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('cues-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cues',
          filter: `show_id=eq.${showId}`
        },
        () => {
          fetchCues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCues, showId]);

  const addCue = async (cue: Omit<Cue, 'id' | 'show_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('cues')
        .insert({
          ...cue,
          show_id: showId,
          order_index: cues.length
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cue added',
        description: `${cue.name} has been added to the timeline`
      });

      return data;
    } catch (error) {
      console.error('Error adding cue:', error);
      toast({
        title: 'Error adding cue',
        description: 'Could not add cue to the database',
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateCue = async (id: string, updates: Partial<Cue>) => {
    try {
      const { error } = await supabase
        .from('cues')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cue updated',
        description: 'Changes have been saved'
      });
    } catch (error) {
      console.error('Error updating cue:', error);
      toast({
        title: 'Error updating cue',
        description: 'Could not save changes',
        variant: 'destructive'
      });
    }
  };

  const deleteCue = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cues')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cue deleted',
        description: 'Cue has been removed from the timeline',
        variant: 'destructive'
      });
    } catch (error) {
      console.error('Error deleting cue:', error);
      toast({
        title: 'Error deleting cue',
        description: 'Could not delete cue',
        variant: 'destructive'
      });
    }
  };

  const duplicateCue = async (id: string) => {
    const cueToDuplicate = cues.find(c => c.id === id);
    if (!cueToDuplicate) return;

    const { id: _, created_at, updated_at, show_id, ...cueData } = cueToDuplicate;
    
    await addCue({
      ...cueData,
      name: `${cueData.name} (Copy)`,
      position: cueData.position + 20,
      order_index: cues.length
    });
  };

  return {
    cues,
    loading,
    addCue,
    updateCue,
    deleteCue,
    duplicateCue,
    refetch: fetchCues
  };
}

export function useAISuggestions() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CueSuggestion[]>([]);
  const { toast } = useToast();

  const getSuggestions = async (showName: string, existingCues: Cue[], cueType?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-cue', {
        body: { showName, existingCues, cueType }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'AI Error',
          description: data.error,
          variant: 'destructive'
        });
        return [];
      }

      setSuggestions(data.suggestions || []);
      return data.suggestions || [];
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast({
        title: 'Error',
        description: 'Could not get AI suggestions',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { suggestions, loading, getSuggestions, setSuggestions };
}
