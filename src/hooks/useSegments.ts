import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Segment {
  id: string;
  show_id: string;
  name: string;
  target_duration: number;
  order_index: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface SegmentWithStats extends Segment {
  startTime: number;
  endTime: number;
  actualDuration: number;
  cueCount: number;
  status: 'empty' | 'balanced' | 'overloaded';
}

export function useSegments(showId: string | null) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch segments
  const fetchSegments = useCallback(async () => {
    if (!showId) {
      setSegments([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('show_segments')
        .select('*')
        .eq('show_id', showId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setSegments(data || []);
    } catch (error: any) {
      console.error('Error fetching segments:', error);
      toast({
        title: 'Error loading segments',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [showId, toast]);

  // Create segment
  const createSegment = useCallback(async (name: string, targetDuration: number) => {
    if (!showId) return null;

    try {
      const { data, error } = await supabase
        .from('show_segments')
        .insert({
          show_id: showId,
          name,
          target_duration: targetDuration,
          order_index: segments.length,
        })
        .select()
        .single();

      if (error) throw error;
      
      setSegments(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      console.error('Error creating segment:', error);
      toast({
        title: 'Error creating segment',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [showId, segments.length, toast]);

  // Update segment
  const updateSegment = useCallback(async (segmentId: string, updates: { name?: string; target_duration?: number; color?: string }) => {
    try {
      const { data, error } = await supabase
        .from('show_segments')
        .update(updates)
        .eq('id', segmentId)
        .select()
        .single();

      if (error) throw error;
      
      setSegments(prev => prev.map(s => s.id === segmentId ? data : s));
      return data;
    } catch (error: any) {
      console.error('Error updating segment:', error);
      toast({
        title: 'Error updating segment',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Delete segment
  const deleteSegment = useCallback(async (segmentId: string) => {
    try {
      const { error } = await supabase
        .from('show_segments')
        .delete()
        .eq('id', segmentId);

      if (error) throw error;
      
      // Re-order remaining segments
      const remaining = segments.filter(s => s.id !== segmentId);
      setSegments(remaining);
      
      // Update order_index for all remaining segments
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order_index !== i) {
          await supabase
            .from('show_segments')
            .update({ order_index: i })
            .eq('id', remaining[i].id);
        }
      }
      
      return true;
    } catch (error: any) {
      console.error('Error deleting segment:', error);
      toast({
        title: 'Error deleting segment',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [segments, toast]);

  // Reorder segment
  const reorderSegment = useCallback(async (segmentId: string, newIndex: number) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;

    const filtered = segments.filter(s => s.id !== segmentId);
    const reordered = [
      ...filtered.slice(0, newIndex),
      segment,
      ...filtered.slice(newIndex)
    ];

    // Optimistic update
    setSegments(reordered.map((s, i) => ({ ...s, order_index: i })));

    try {
      // Update all order_index values
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from('show_segments')
          .update({ order_index: i })
          .eq('id', reordered[i].id);
      }
    } catch (error: any) {
      console.error('Error reordering segments:', error);
      toast({
        title: 'Error reordering segments',
        description: error.message,
        variant: 'destructive',
      });
      // Revert on error
      fetchSegments();
    }
  }, [segments, toast, fetchSegments]);

  // Initial fetch
  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  // Realtime subscription
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`segments-${showId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'show_segments',
          filter: `show_id=eq.${showId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSegments(prev => {
              if (prev.find(s => s.id === (payload.new as Segment).id)) return prev;
              return [...prev, payload.new as Segment].sort((a, b) => a.order_index - b.order_index);
            });
          } else if (payload.eventType === 'UPDATE') {
            setSegments(prev => 
              prev.map(s => s.id === (payload.new as Segment).id ? payload.new as Segment : s)
                .sort((a, b) => a.order_index - b.order_index)
            );
          } else if (payload.eventType === 'DELETE') {
            setSegments(prev => prev.filter(s => s.id !== (payload.old as Segment).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId]);

  return {
    segments,
    loading,
    createSegment,
    updateSegment,
    deleteSegment,
    reorderSegment,
    refetch: fetchSegments,
  };
}
