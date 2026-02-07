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

  // Update segment duration with cascading timing updates
  const updateSegmentDuration = useCallback(async (segmentId: string, newDuration: number) => {
    const segmentIndex = segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) return null;

    const oldDuration = segments[segmentIndex].target_duration;
    const durationDelta = newDuration - oldDuration;
    
    if (durationDelta === 0) return segments[segmentIndex];

    // Optimistic update - calculate new start times for all segments
    const sortedSegments = [...segments].sort((a, b) => a.order_index - b.order_index);
    let accumulatedTime = 0;
    const updatedSegments = sortedSegments.map((seg, i) => {
      const newStartTime = accumulatedTime;
      const duration = seg.id === segmentId ? newDuration : seg.target_duration;
      accumulatedTime += duration;
      return { ...seg, start_time: newStartTime, target_duration: seg.id === segmentId ? newDuration : seg.target_duration };
    });

    // Apply optimistic update
    setSegments(updatedSegments);

    try {
      // Update the target segment's duration
      const { error: targetError } = await supabase
        .from('show_segments')
        .update({ target_duration: newDuration })
        .eq('id', segmentId);

      if (targetError) throw targetError;

      // Update start_times for all segments after the changed one
      const updatePromises = updatedSegments.map(seg => 
        supabase
          .from('show_segments')
          .update({ start_time: seg.start_time })
          .eq('id', seg.id)
      );
      await Promise.all(updatePromises);

      // Now cascade timing changes to cues
      // Fetch all cues for this show
      const { data: cuesData, error: cuesError } = await supabase
        .from('cues')
        .select('id, start_time, show_id')
        .eq('show_id', showId!);

      if (cuesError) throw cuesError;

      if (cuesData && cuesData.length > 0) {
        // Build old and new segment time ranges
        const oldSegmentRanges = sortedSegments.map(seg => {
          let start = 0;
          for (const s of sortedSegments) {
            if (s.id === seg.id) break;
            start += s.target_duration;
          }
          return { id: seg.id, startTime: start, endTime: start + seg.target_duration };
        });

        const newSegmentRanges = updatedSegments.map(seg => ({
          id: seg.id,
          startTime: seg.start_time,
          endTime: seg.start_time + seg.target_duration
        }));

        const cueUpdates: { id: string; newStartTime: string }[] = [];

        for (const cue of cuesData) {
          const cueStartSeconds = timeStringToSeconds(cue.start_time);
          
          // Find which segment this cue was in
          let oldSegmentId: string | null = null;
          for (const range of oldSegmentRanges) {
            if (cueStartSeconds >= range.startTime && cueStartSeconds < range.endTime) {
              oldSegmentId = range.id;
              break;
            }
          }
          
          if (!oldSegmentId) {
            // Cue before all segments - assign to first
            if (oldSegmentRanges.length > 0 && cueStartSeconds < oldSegmentRanges[0].startTime) {
              oldSegmentId = oldSegmentRanges[0].id;
            } else if (oldSegmentRanges.length > 0) {
              // Cue after all segments - assign to last
              oldSegmentId = oldSegmentRanges[oldSegmentRanges.length - 1].id;
            }
          }

          if (!oldSegmentId) continue;

          const oldRange = oldSegmentRanges.find(r => r.id === oldSegmentId);
          const newRange = newSegmentRanges.find(r => r.id === oldSegmentId);

          if (!oldRange || !newRange) continue;

          // Calculate offset within the segment and apply to new position
          const offsetWithinSegment = cueStartSeconds - oldRange.startTime;
          const newCueStartSeconds = newRange.startTime + offsetWithinSegment;
          const newStartTimeStr = secondsToTimeString(newCueStartSeconds);

          if (cue.start_time !== newStartTimeStr) {
            cueUpdates.push({ id: cue.id, newStartTime: newStartTimeStr });
          }
        }

        // Apply cue updates in parallel
        if (cueUpdates.length > 0) {
          const cueUpdatePromises = cueUpdates.map(update =>
            supabase
              .from('cues')
              .update({ start_time: update.newStartTime })
              .eq('id', update.id)
          );
          await Promise.all(cueUpdatePromises);
        }
      }

      toast({
        title: 'Segment duration updated',
        description: 'Show timing has been recalculated',
      });

      return updatedSegments.find(s => s.id === segmentId);
    } catch (error: any) {
      console.error('Error updating segment duration:', error);
      toast({
        title: 'Error updating segment',
        description: error.message,
        variant: 'destructive',
      });
      // Revert on error
      fetchSegments();
      return null;
    }
  }, [segments, showId, toast, fetchSegments]);

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

  // Find which segment a cue belongs to based on its start_time
  const findCueSegment = (cueStartSeconds: number, segmentList: Segment[]): Segment | null => {
    for (let i = segmentList.length - 1; i >= 0; i--) {
      const seg = segmentList[i];
      const segStart = seg.start_time || 0;
      if (cueStartSeconds >= segStart) {
        return seg;
      }
    }
    return segmentList[0] || null;
  };

  // Reorder segment and move its cues
  const reorderSegment = useCallback(async (segmentId: string, newIndex: number) => {
    console.log('useSegments.reorderSegment called:', { segmentId, newIndex });
    
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) {
      console.log('Segment not found:', segmentId);
      return;
    }

    const currentIndex = segments.findIndex(s => s.id === segmentId);
    if (currentIndex === newIndex) {
      console.log('Same position, no reorder needed');
      return;
    }

    // Build old segment time ranges before reorder
    const oldSegmentRanges = segments.map((s, i) => {
      const startTime = s.start_time || 0;
      const endTime = startTime + s.target_duration;
      return { id: s.id, startTime, endTime, index: i };
    });

    // Create new order
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

    // Build new segment time ranges
    const newSegmentRanges = segmentsWithNewTimes.map((s, i) => {
      const startTime = s.start_time;
      const endTime = startTime + s.target_duration;
      return { id: s.id, startTime, endTime, index: i };
    });

    // Optimistic update for segments
    setSegments(segmentsWithNewTimes);

    try {
      // Fetch all cues for this show
      const showIdFromSegment = segment.show_id;
      const { data: cuesData, error: cuesError } = await supabase
        .from('cues')
        .select('id, start_time, show_id')
        .eq('show_id', showIdFromSegment);

      if (cuesError) {
        console.error('Error fetching cues:', cuesError);
        throw cuesError;
      }

      console.log('Fetched cues:', cuesData?.length || 0);

      // Update segments order and start times in parallel for speed
      const segmentUpdatePromises = segmentsWithNewTimes.map(seg =>
        supabase
          .from('show_segments')
          .update({ order_index: seg.order_index, start_time: seg.start_time })
          .eq('id', seg.id)
      );
      await Promise.all(segmentUpdatePromises);

      // Now update cue start times based on which segment they were in
      if (cuesData && cuesData.length > 0) {
        const cueUpdates: { id: string; newStartTime: string }[] = [];

        for (const cue of cuesData) {
          const cueStartSeconds = timeStringToSeconds(cue.start_time);
          
          // Find which segment this cue was in (by old time ranges)
          let oldSegmentId: string | null = null;
          for (let i = oldSegmentRanges.length - 1; i >= 0; i--) {
            const range = oldSegmentRanges[i];
            if (cueStartSeconds >= range.startTime && cueStartSeconds < range.endTime) {
              oldSegmentId = range.id;
              break;
            }
          }
          // If no segment found, assign to first segment if cue is before all segments
          if (!oldSegmentId && oldSegmentRanges.length > 0) {
            if (cueStartSeconds < oldSegmentRanges[0].startTime) {
              oldSegmentId = oldSegmentRanges[0].id;
            } else {
              // Cue is after all segments, assign to last
              oldSegmentId = oldSegmentRanges[oldSegmentRanges.length - 1].id;
            }
          }

          if (!oldSegmentId) continue;

          // Find the old and new positions for this segment
          const oldRange = oldSegmentRanges.find(r => r.id === oldSegmentId);
          const newRange = newSegmentRanges.find(r => r.id === oldSegmentId);

          if (!oldRange || !newRange) continue;

          // Calculate offset within the segment
          const offsetWithinSegment = cueStartSeconds - oldRange.startTime;
          
          // Calculate new absolute start time
          const newCueStartSeconds = newRange.startTime + offsetWithinSegment;
          const newStartTimeStr = secondsToTimeString(newCueStartSeconds);

          if (cue.start_time !== newStartTimeStr) {
            cueUpdates.push({ id: cue.id, newStartTime: newStartTimeStr });
          }
        }

        console.log('Cue updates to apply:', cueUpdates.length);

        // Apply cue updates in parallel for speed
        if (cueUpdates.length > 0) {
          const cueUpdatePromises = cueUpdates.map(update =>
            supabase
              .from('cues')
              .update({ start_time: update.newStartTime })
              .eq('id', update.id)
          );
          await Promise.all(cueUpdatePromises);
        }
      }

      toast({
        title: 'Segments reordered',
        description: 'Cues have been moved with their segments',
      });

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
    updateSegmentDuration,
    deleteSegment,
    reorderSegment,
    refetch: fetchSegments,
  };
}
