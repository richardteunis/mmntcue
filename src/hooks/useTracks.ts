import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CueTrack, TrackType } from '@/types/cue';

export function useTracks(showId: string | null) {
  const [tracks, setTracks] = useState<CueTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch tracks
  const fetchTracks = useCallback(async () => {
    if (!showId) {
      setTracks([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cue_tracks')
        .select('*')
        .eq('show_id', showId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setTracks((data || []) as CueTrack[]);
    } catch (error: any) {
      console.error('Error fetching tracks:', error);
      toast({
        title: 'Error loading tracks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [showId, toast]);

  // Create track
  const createTrack = useCallback(async (name: string, type: TrackType = 'stage', color?: string) => {
    if (!showId) return null;

    try {
      const { data, error } = await supabase
        .from('cue_tracks')
        .insert({
          show_id: showId,
          name,
          type,
          color: color || '#22c55e',
          order_index: tracks.length,
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      setTracks(prev => [...prev, data as CueTrack]);
      toast({
        title: 'Track created',
        description: `${name} track has been added`,
      });
      return data as CueTrack;
    } catch (error: any) {
      console.error('Error creating track:', error);
      toast({
        title: 'Error creating track',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [showId, tracks.length, toast]);

  // Update track
  const updateTrack = useCallback(async (trackId: string, updates: Partial<CueTrack>) => {
    try {
      const { data, error } = await supabase
        .from('cue_tracks')
        .update(updates as any)
        .eq('id', trackId)
        .select()
        .single();

      if (error) throw error;
      
      setTracks(prev => prev.map(t => t.id === trackId ? data as CueTrack : t));
      return data as CueTrack;
    } catch (error: any) {
      console.error('Error updating track:', error);
      toast({
        title: 'Error updating track',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Delete track
  const deleteTrack = useCallback(async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('cue_tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;
      
      // Re-order remaining tracks
      const remaining = tracks.filter(t => t.id !== trackId);
      setTracks(remaining);
      
      // Update order_index for all remaining tracks
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order_index !== i) {
          await supabase
            .from('cue_tracks')
            .update({ order_index: i })
            .eq('id', remaining[i].id);
        }
      }
      
      toast({
        title: 'Track deleted',
        description: 'Track has been removed',
        variant: 'destructive',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting track:', error);
      toast({
        title: 'Error deleting track',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [tracks, toast]);

  // Reorder track
  const reorderTrack = useCallback(async (trackId: string, newIndex: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const filtered = tracks.filter(t => t.id !== trackId);
    const reordered = [
      ...filtered.slice(0, newIndex),
      track,
      ...filtered.slice(newIndex)
    ];

    // Optimistic update
    setTracks(reordered.map((t, i) => ({ ...t, order_index: i })));

    try {
      // Update all order_index values
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from('cue_tracks')
          .update({ order_index: i })
          .eq('id', reordered[i].id);
      }
    } catch (error: any) {
      console.error('Error reordering tracks:', error);
      toast({
        title: 'Error reordering tracks',
        description: error.message,
        variant: 'destructive',
      });
      // Revert on error
      fetchTracks();
    }
  }, [tracks, toast, fetchTracks]);

  // Initial fetch
  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Realtime subscription
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`tracks-${showId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cue_tracks',
          filter: `show_id=eq.${showId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTracks(prev => {
              if (prev.find(t => t.id === (payload.new as CueTrack).id)) return prev;
              return [...prev, payload.new as CueTrack].sort((a, b) => a.order_index - b.order_index);
            });
          } else if (payload.eventType === 'UPDATE') {
            setTracks(prev => 
              prev.map(t => t.id === (payload.new as CueTrack).id ? payload.new as CueTrack : t)
                .sort((a, b) => a.order_index - b.order_index)
            );
          } else if (payload.eventType === 'DELETE') {
            setTracks(prev => prev.filter(t => t.id !== (payload.old as CueTrack).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId]);

  return {
    tracks,
    loading,
    createTrack,
    updateTrack,
    deleteTrack,
    reorderTrack,
    refetch: fetchTracks,
  };
}
