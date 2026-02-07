import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cue, CueSuggestion } from '@/types/cue';
import { useToast } from '@/hooks/use-toast';

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

export function useCues(showId: string | null) {
  const [cues, setCues] = useState<Cue[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatingCues, setAnimatingCues] = useState<{ id: string; type: 'add' | 'delete' | 'update' }[]>([]);
  const { toast } = useToast();

  const fetchCues = useCallback(async () => {
    if (!showId) {
      setCues([]);
      setLoading(false);
      return;
    }
    
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

    if (!showId) return;

    // Subscribe to realtime changes with optimistic updates
    const channel = supabase
      .channel(`cues-changes-${showId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cues',
          filter: `show_id=eq.${showId}`
        },
        (payload) => {
          const newCue = payload.new as Cue;
          // Trigger add animation
          setAnimatingCues(prev => [...prev, { id: newCue.id, type: 'add' }]);
          setCues(prev => {
            const exists = prev.some(c => c.id === newCue.id);
            if (exists) return prev;
            const updated = [...prev, { ...newCue, effects: newCue.effects || [] }];
            return updated.sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));
          });
          // Clear animation after delay
          setTimeout(() => {
            setAnimatingCues(prev => prev.filter(a => a.id !== newCue.id));
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cues',
          filter: `show_id=eq.${showId}`
        },
        (payload) => {
          const updatedCue = payload.new as Cue;
          // Trigger update animation
          setAnimatingCues(prev => [...prev, { id: updatedCue.id, type: 'update' }]);
          setCues(prev => {
            const updated = prev.map(c => c.id === updatedCue.id ? { ...updatedCue, effects: updatedCue.effects || [] } : c);
            return updated.sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));
          });
          // Clear animation after delay
          setTimeout(() => {
            setAnimatingCues(prev => prev.filter(a => a.id !== updatedCue.id));
          }, 400);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'cues',
          filter: `show_id=eq.${showId}`
        },
        (payload) => {
          const deletedId = payload.old.id;
          // Trigger delete animation, then remove
          setAnimatingCues(prev => [...prev, { id: deletedId, type: 'delete' }]);
          setTimeout(() => {
            setCues(prev => prev.filter(c => c.id !== deletedId));
            setAnimatingCues(prev => prev.filter(a => a.id !== deletedId));
          }, 300);
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
    if (!showId) {
      toast({
        title: 'No show selected',
        description: 'Please select or create a show first',
        variant: 'destructive'
      });
      return null;
    }
    
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
        } as any)
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
        .update(updates as any)
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

  // Reorder cues by updating their start times based on new position
  const reorderCues = async (draggedCueId: string, targetIndex: number) => {
    const sortedCues = [...cues].sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));
    const draggedCueIndex = sortedCues.findIndex(c => c.id === draggedCueId);
    
    if (draggedCueIndex === -1 || draggedCueIndex === targetIndex) return;

    // Remove dragged cue and insert at new position
    const [draggedCue] = sortedCues.splice(draggedCueIndex, 1);
    sortedCues.splice(targetIndex, 0, draggedCue);

    // Recalculate start times sequentially
    let currentTime = 0;
    const updatedCues = sortedCues.map((cue, i) => {
      const newStartTime = secondsToTime(currentTime);
      currentTime += parseDuration(cue.duration);
      return { ...cue, start_time: newStartTime, order_index: i };
    });

    // OPTIMISTIC UPDATE - Apply immediately for instant UI feedback
    setCues(updatedCues);

    try {
      // Batch updates in parallel for speed
      const updatePromises = updatedCues
        .filter((cue, i) => {
          const original = cues.find(c => c.id === cue.id);
          return original?.start_time !== cue.start_time || original?.order_index !== cue.order_index;
        })
        .map(cue => 
          supabase
            .from('cues')
            .update({ start_time: cue.start_time, order_index: cue.order_index })
            .eq('id', cue.id)
        );

      await Promise.all(updatePromises);

      toast({
        title: 'Cues reordered',
        description: 'Timeline order has been updated'
      });
    } catch (error) {
      console.error('Error reordering cues:', error);
      // Revert on error
      await fetchCues();
      toast({
        title: 'Error reordering',
        description: 'Could not update cue order',
        variant: 'destructive'
      });
    }
  };

  // Bulk update multiple cues
  const bulkUpdateCues = async (cueIds: string[], updates: Partial<Cue>) => {
    try {
      const updatePromises = cueIds.map(id =>
        supabase
          .from('cues')
          .update(updates as any)
          .eq('id', id)
          .then(({ error }) => {
            if (error) throw error;
          })
      );
      
      await Promise.all(updatePromises);
      
      toast({
        title: 'Cues updated',
        description: `${cueIds.length} cues have been updated`
      });
      
      await fetchCues();
    } catch (error) {
      console.error('Error bulk updating cues:', error);
      toast({
        title: 'Error updating cues',
        description: 'Could not update selected cues',
        variant: 'destructive'
      });
    }
  };

  // Bulk delete multiple cues
  const bulkDeleteCues = async (cueIds: string[]) => {
    try {
      const { error } = await supabase
        .from('cues')
        .delete()
        .in('id', cueIds);
      
      if (error) throw error;
      
      toast({
        title: 'Cues deleted',
        description: `${cueIds.length} cues have been deleted`,
        variant: 'destructive'
      });
      
      await fetchCues();
    } catch (error) {
      console.error('Error bulk deleting cues:', error);
      toast({
        title: 'Error deleting cues',
        description: 'Could not delete selected cues',
        variant: 'destructive'
      });
    }
  };

  // Fire a cue (mark as fired with timestamp)
  const fireCue = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cues')
        .update({ 
          status: 'fired', 
          fired_at: new Date().toISOString() 
        } as any)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error firing cue:', error);
      toast({
        title: 'Error firing cue',
        description: 'Could not fire cue',
        variant: 'destructive'
      });
    }
  };

  // Skip a cue (mark as skipped)
  const skipCue = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cues')
        .update({ status: 'skipped' } as any)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error skipping cue:', error);
      toast({
        title: 'Error skipping cue',
        description: 'Could not skip cue',
        variant: 'destructive'
      });
    }
  };

  // Reset a single cue's status to standby
  const resetCueStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cues')
        .update({ 
          status: 'standby', 
          fired_at: null,
          paused_at: null 
        } as any)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting cue status:', error);
      toast({
        title: 'Error resetting cue',
        description: 'Could not reset cue status',
        variant: 'destructive'
      });
    }
  };

  // Reset all cues in show to standby
  const resetAllCues = async () => {
    if (!showId) return;
    
    try {
      const { error } = await supabase
        .from('cues')
        .update({ 
          status: 'standby', 
          fired_at: null,
          paused_at: null 
        } as any)
        .eq('show_id', showId);

      if (error) throw error;
      
      toast({
        title: 'Show reset',
        description: 'All cues have been reset to standby'
      });
      
      await fetchCues();
    } catch (error) {
      console.error('Error resetting all cues:', error);
      toast({
        title: 'Error resetting show',
        description: 'Could not reset all cues',
        variant: 'destructive'
      });
    }
  };

  return {
    cues,
    loading,
    animatingCues,
    addCue,
    updateCue,
    deleteCue,
    duplicateCue,
    reorderCues,
    bulkUpdateCues,
    bulkDeleteCues,
    // Live show control
    fireCue,
    skipCue,
    resetCueStatus,
    resetAllCues,
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
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('suggest-cue', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
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
