import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ROSChatMessage, ROSChangeRequest, ChangeOperation } from '@/types/ros';
import type { Cue } from '@/types/cue';

export function useCuePilot(showId: string | null, cues: Cue[]) {
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
        switch (change.type) {
          case 'insert':
            // Create new cue
            await supabase.from('cues').insert({
              show_id: showId,
              name: change.item.title || 'New Cue',
              type: (change.item as unknown as Cue).type || 'custom',
              track: (change.item as unknown as Cue).track || 'Stage',
              start_time: change.item.start_time || '00:00:00',
              duration: change.item.duration || '00:00:30',
              order_index: change.index,
              notes: change.item.notes,
              position: change.index * 100,
              width: 100
            });
            break;

          case 'update':
            await supabase.from('cues')
              .update(change.changes as Partial<Cue>)
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
            for (const id of change.ids) {
              const cue = cues.find(c => c.id === id);
              if (cue) {
                const currentSeconds = timeToSeconds(cue.start_time);
                const newSeconds = change.direction === 'forward'
                  ? currentSeconds + change.time_delta
                  : currentSeconds - change.time_delta;
                
                await supabase.from('cues')
                  .update({ start_time: secondsToTime(Math.max(0, newSeconds)) })
                  .eq('id', id);
              }
            }
            break;
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
        description: `${changes.length} changes have been made to the show`
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
    shiftTime: (minutes: number) => sendMessage(`Shift all cues by ${minutes} minutes`),
    insertCue: (name: string, after?: string) => 
      sendMessage(`Add a new cue called "${name}"${after ? ` after "${after}"` : ''}`),
    moveCue: (name: string, position: string) => 
      sendMessage(`Move "${name}" ${position}`),
    updateSpeaker: (cueName: string, speaker: string) => 
      sendMessage(`Set the speaker for "${cueName}" to ${speaker}`)
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
