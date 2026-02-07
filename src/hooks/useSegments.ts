import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Segment {
  id: string;
  show_id: string;
  name: string;
  target_duration: number;
  start_time: number;
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

    // Calculate start_time based on existing segments
    const lastSegment = segments[segments.length - 1];
    const startTime = lastSegment 
      ? (lastSegment.start_time || 0) + lastSegment.target_duration 
      : 0;

    try {
      const { data, error } = await supabase
        .from('show_segments')
        .insert({
          show_id: showId,
          name,
          target_duration: targetDuration,
          start_time: startTime,
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
  }, [showId, segments, toast]);

  // Update segment
  const updateSegment = useCallback(async (segmentId: string, updates: { name?: string; target_duration?: number; color?: string; start_time?: number }) => {
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

  // Reorder segment and move its cues
  const reorderSegment = useCallback(async (segmentId: string, newIndex: number) => {
    console.log('useSegments.reorderSegment called:', { segmentId, newIndex });
    
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) {
      console.log('Segment not found:', segmentId);
      return;
    }

    const filtered = segments.filter(s => s.id !== segmentId);
    const reordered = [
      ...filtered.slice(0, newIndex),
      segment,
      ...filtered.slice(newIndex)
    ];
    
    console.log('Reordered segments:', reordered.map(s => s.name));

    // Calculate new start times for all segments
    let accumulatedTime = 0;
    const segmentsWithNewTimes = reordered.map((s, i) => {
      const newStartTime = accumulatedTime;
      accumulatedTime += s.target_duration;
      return { ...s, order_index: i, start_time: newStartTime };
    });

    // Optimistic update for segments
    setSegments(segmentsWithNewTimes);

    try {
      // First, fetch all cues that belong to any segment in this show
      const { data: cuesData, error: cuesError } = await supabase
        .from('cues')
        .select('id, segment_id, start_time')
        .in('segment_id', segments.map(s => s.id));

      if (cuesError) throw cuesError;

      // Build a map of old segment start times
      const oldStartTimes = new Map<string, number>();
      segments.forEach(s => {
        oldStartTimes.set(s.id, s.start_time || 0);
      });

      // Build a map of new segment start times
      const newStartTimes = new Map<string, number>();
      segmentsWithNewTimes.forEach(s => {
        newStartTimes.set(s.id, s.start_time);
      });

      // Update segments order and start times
      for (const seg of segmentsWithNewTimes) {
        await supabase
          .from('show_segments')
          .update({ order_index: seg.order_index, start_time: seg.start_time })
          .eq('id', seg.id);
      }

      // Update cue start times based on segment movement
      if (cuesData && cuesData.length > 0) {
        for (const cue of cuesData) {
          if (!cue.segment_id) continue;
          
          const oldSegmentStart = oldStartTimes.get(cue.segment_id) || 0;
          const newSegmentStart = newStartTimes.get(cue.segment_id);
          
          if (newSegmentStart === undefined) continue;
          
          // Calculate cue's offset within its segment
          const cueStartSeconds = timeStringToSeconds(cue.start_time);
          const offsetWithinSegment = cueStartSeconds - oldSegmentStart;
          
          // Calculate new absolute start time
          const newCueStartSeconds = newSegmentStart + offsetWithinSegment;
          const newStartTimeStr = secondsToTimeString(newCueStartSeconds);
          
          if (cue.start_time !== newStartTimeStr) {
            await supabase
              .from('cues')
              .update({ start_time: newStartTimeStr })
              .eq('id', cue.id);
          }
        }
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

  // Helper to convert time string to seconds
  const timeStringToSeconds = (timeString: string): number => {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  // Helper to convert seconds to time string
  const secondsToTimeString = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
