import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cue, CueSuggestion } from '@/types/cue';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_SHOW_ID = '00000000-0000-0000-0000-000000000001';

// Helper to convert time string to seconds for sorting
const timeToSeconds = (timeString: string): number => {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

// Helper to convert seconds to time string
const secondsToTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Helper to parse duration string to seconds
const parseDuration = (duration: string): number => {
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 30; // default 30 seconds
};

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
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      // Sort by start_time (already sorted by DB, but ensure client-side too)
      const sortedCues = (data || [])
        .map(cue => ({
          ...cue,
          type: cue.type as 'audio' | 'video' | 'lighting' | 'stage',
          effects: cue.effects || []
        }))
        .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));
      
      setCues(sortedCues);
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

  // Calculate the next start time based on existing cues
  const getNextStartTime = useCallback((): string => {
    if (cues.length === 0) return '00:00:00';
    
    // Find the last cue by time
    const sortedCues = [...cues].sort((a, b) => 
      timeToSeconds(a.start_time) - timeToSeconds(b.start_time)
    );
    const lastCue = sortedCues[sortedCues.length - 1];
    
    const lastStartSeconds = timeToSeconds(lastCue.start_time);
    const lastDurationSeconds = parseDuration(lastCue.duration);
    const nextStartSeconds = lastStartSeconds + lastDurationSeconds;
    
    return secondsToTime(nextStartSeconds);
  }, [cues]);

  const addCue = async (cue: Omit<Cue, 'id' | 'show_id' | 'created_at' | 'updated_at'>, autoStartTime: boolean = true) => {
    try {
      // If autoStartTime is true and start_time is default, calculate it
      let startTime = cue.start_time;
      if (autoStartTime && cue.start_time === '00:00:00' && cues.length > 0) {
        startTime = getNextStartTime();
      }

      const { data, error } = await supabase
        .from('cues')
        .insert({
          ...cue,
          start_time: startTime,
          show_id: showId,
          order_index: cues.length
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cue added',
        description: `${cue.name} has been added at ${startTime}`
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
    
    // Calculate next start time based on the duplicated cue
    const originalStartSeconds = timeToSeconds(cueToDuplicate.start_time);
    const durationSeconds = parseDuration(cueToDuplicate.duration);
    const newStartTime = secondsToTime(originalStartSeconds + durationSeconds);
    
    await addCue({
      ...cueData,
      name: `${cueData.name} (Copy)`,
      start_time: newStartTime,
      position: cueData.position + 20,
      order_index: cues.length
    }, false); // Don't auto-calculate, we set it explicitly
  };

  return {
    cues,
    loading,
    addCue,
    updateCue,
    deleteCue,
    duplicateCue,
    refetch: fetchCues,
    getNextStartTime
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
