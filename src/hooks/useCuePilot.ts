import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ROSChatMessage, ROSChangeRequest, ChangeOperation } from '@/types/ros';
import type { Cue } from '@/types/cue';

interface Segment {
  id: string;
  name: string;
  target_duration: number;
  color?: string;
  order_index: number;
}

export function useCuePilot(showId: string | null, cues: Cue[], segments: Segment[] = []) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ROSChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChangeRequest, setPendingChangeRequest] = useState<ROSChangeRequest | null>(null);
  const [canApply, setCanApply] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch chat history
  const fetchMessages = useCallback(async () => {
    if (!showId) return;

    const { data, error } = await supabase
      .from('ros_chat_messages')
      .select('*')
      .eq('show_id', showId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching chat:', error);
      return;
    }

    setMessages(data as unknown as ROSChatMessage[]);
  }, [showId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!showId) return;

    fetchMessages();

    const channel = supabase
      .channel(`cuepilot-${showId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ros_chat_messages',
          filter: `show_id=eq.${showId}`
        },
        (payload) => {
          const newMessage = payload.new as unknown as ROSChatMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId, fetchMessages]);

  // Send a message and get AI response
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!showId || !content.trim()) return;

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      // Save user message
      const { data: userMessage, error: userError } = await supabase
        .from('ros_chat_messages')
        .insert({
          show_id: showId,
          role: 'user',
          content: content.trim()
        })
        .select()
        .single();

      if (userError) throw userError;

      // Call the AI edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cuepilot-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            show_id: showId,
            message: content,
            cues: cues.map(c => ({
              id: c.id,
              name: c.name,
              type: c.type,
              track: c.track,
              start_time: c.start_time,
              duration: c.duration,
              order_index: c.order_index,
              notes: c.notes
            })),
            segments: segments.map(s => ({
              id: s.id,
              name: s.name,
              target_duration: s.target_duration,
              color: s.color,
              order_index: s.order_index
            })),
            history: messages.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            }))
          }),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI request failed');
      }

      const data = await response.json();

      // Save AI response
      const { data: aiMessage, error: aiError } = await supabase
        .from('ros_chat_messages')
        .insert({
          show_id: showId,
          role: 'assistant',
          content: data.message,
          change_request_id: data.change_request_id
        })
        .select()
        .single();

      if (aiError) throw aiError;

      // If there are proposed changes, fetch them
      if (data.change_request_id) {
        const { data: changeRequest } = await supabase
          .from('ros_change_requests')
          .select('*')
          .eq('id', data.change_request_id)
          .single();

        if (changeRequest) {
          setPendingChangeRequest(changeRequest as unknown as ROSChangeRequest);
        }
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }

      console.error('CuePilot error:', error);
      toast({
        title: 'CuePilot error',
        description: error instanceof Error ? error.message : 'Failed to process request',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [showId, cues, messages, toast]);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Apply proposed changes
  const applyChanges = useCallback(async (): Promise<boolean> => {
    if (!pendingChangeRequest || !showId) return false;

    try {
      const changes = pendingChangeRequest.diff_payload as ChangeOperation[];

      for (const change of changes) {
        const target = (change as any).target || 'cue'; // Default to cue for backward compat
        const item = (change as any).item as Record<string, unknown> | undefined;

        if (target === 'segment') {
          // Segment operations
          switch (change.type) {
            case 'insert':
              await supabase.from('show_segments').insert([{
                show_id: showId,
                name: String(item?.name || 'New Segment'),
                target_duration: Number(item?.target_duration || 1800),
                color: item?.color ? String(item.color) : null,
                order_index: change.index || 0
              }]);
              break;

            case 'update':
              await supabase.from('show_segments')
                .update((change as any).changes || {})
                .eq('id', (change as any).id);
              break;

            case 'delete':
              await supabase.from('show_segments')
                .delete()
                .eq('id', (change as any).id);
              break;

            case 'reorder':
              // Reorder segments by updating order_index
              const orderList = (change as any).order as string[];
              if (orderList) {
                for (let i = 0; i < orderList.length; i++) {
                  await supabase.from('show_segments')
                    .update({ order_index: i })
                    .eq('id', orderList[i]);
                }
              }
              break;
          }
        } else {
          // Cue operations
          switch (change.type) {
            case 'insert':
              await supabase.from('cues').insert({
                show_id: showId,
                name: String(item?.name || item?.title || 'New Cue'),
                type: String(item?.type || 'custom'),
                track: String(item?.track || 'Stage'),
                start_time: String(item?.start_time || '00:00:00'),
                duration: String(item?.duration || '00:00:30'),
                order_index: change.index || 0,
                notes: item?.notes ? String(item.notes) : undefined,
                position: (change.index || 0) * 100,
                width: 100
              });
              break;

            case 'update':
              await supabase.from('cues')
                .update(change.changes as any)
                .eq('id', change.id);
              break;

            case 'delete':
              await supabase.from('cues')
                .delete()
                .eq('id', change.id);
              break;

            case 'move':
              await supabase.from('cues')
                .update({ order_index: change.to_index })
                .eq('id', change.id);
              break;

            case 'shift':
              // Shift multiple cues by time delta
              for (const id of change.ids || []) {
                const cue = cues.find(c => c.id === id);
                if (cue) {
                  const currentSeconds = timeToSeconds(cue.start_time);
                  const newSeconds = change.direction === 'forward'
                    ? currentSeconds + (change.time_delta || 0)
                    : currentSeconds - (change.time_delta || 0);
                  
                  await supabase.from('cues')
                    .update({ start_time: secondsToTime(Math.max(0, newSeconds)) })
                    .eq('id', id);
                }
              }
              break;

            case 'duplicate':
              const originalCue = cues.find(c => c.id === change.id);
              if (originalCue) {
                await supabase.from('cues').insert({
                  show_id: showId,
                  name: (change as any).new_name || `Copy of ${originalCue.name}`,
                  type: originalCue.type,
                  track: originalCue.track,
                  start_time: originalCue.start_time,
                  duration: originalCue.duration,
                  order_index: originalCue.order_index + 1,
                  notes: originalCue.notes,
                  position: originalCue.position + 50,
                  width: originalCue.width
                });
              }
              break;
          }
        }
      }

      // Mark change request as approved
      await supabase.from('ros_change_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', pendingChangeRequest.id);

      toast({
        title: 'Changes applied',
        description: `${changes.length} change${changes.length > 1 ? 's' : ''} made to the show`
      });

      setPendingChangeRequest(null);
      return true;

    } catch (error) {
      console.error('Error applying changes:', error);
      toast({
        title: 'Failed to apply changes',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    }
  }, [pendingChangeRequest, showId, cues, toast]);

  // Reject proposed changes
  const rejectChanges = useCallback(async () => {
    if (!pendingChangeRequest) return;

    await supabase.from('ros_change_requests')
      .update({ 
        status: 'rejected',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', pendingChangeRequest.id);

    setPendingChangeRequest(null);
    toast({ title: 'Changes cancelled' });
  }, [pendingChangeRequest, toast]);

  // Clear chat history
  const clearHistory = useCallback(async () => {
    if (!showId) return;

    await supabase
      .from('ros_chat_messages')
      .delete()
      .eq('show_id', showId);

    setMessages([]);
    toast({ title: 'Chat cleared' });
  }, [showId, toast]);

  // Quick action helpers
  const quickActions = {
    // Cue operations
    shiftTime: (minutes: number) => sendMessage(`Shift all cues by ${minutes} minutes`),
    insertCue: (name: string, after?: string) => 
      sendMessage(`Add a new cue called "${name}"${after ? ` after "${after}"` : ''}`),
    moveCue: (name: string, position: string) => 
      sendMessage(`Move "${name}" ${position}`),
    duplicateCue: (name: string) => sendMessage(`Duplicate the cue "${name}"`),
    deleteCue: (name: string) => sendMessage(`Delete the cue "${name}"`),
    updateCueNotes: (name: string, notes: string) => 
      sendMessage(`Update notes for "${name}" to: ${notes}`),
    
    // Segment operations
    addSegment: (name: string, durationMinutes: number) => 
      sendMessage(`Add a new segment called "${name}" with a duration of ${durationMinutes} minutes`),
    updateSegment: (name: string, changes: string) => 
      sendMessage(`Update segment "${name}": ${changes}`),
    deleteSegment: (name: string) => sendMessage(`Delete the segment "${name}"`),
    reorderSegments: (order: string) => sendMessage(`Reorder segments: ${order}`),
    
    // Analysis
    analyzeShow: () => sendMessage('Analyze the show and suggest improvements'),
    findOverlaps: () => sendMessage('Check for any timing overlaps or issues'),
    suggestBreaks: () => sendMessage('Suggest where to add breaks based on the current schedule')
  };

  return {
    messages,
    isLoading,
    pendingChangeRequest,
    canApply,
    sendMessage,
    cancelRequest,
    applyChanges,
    rejectChanges,
    clearHistory,
    quickActions,
    setCanApply
  };
}

// Time helpers
function timeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function secondsToTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
