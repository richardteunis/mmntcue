import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  color: string;
  cursor?: { x: number; y: number };
  area?: 'timeline' | 'cue-panel' | 'table' | 'sidebar';
  selectedCueId?: string | null;
  lastActive: string;
}

interface PresenceState {
  [key: string]: PresenceUser[];
}

// Generate a consistent color for a user based on their ID
const getUserColor = (userId: string): string => {
  const colors = [
    'bg-red-500',
    'bg-orange-500', 
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export const useRealtimePresence = (
  showId: string | null,
  currentUser: { id: string; name: string; email: string; avatar_url?: string } | null
) => {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const trackingRef = useRef<{
    cursor: { x: number; y: number } | undefined;
    area: PresenceUser['area'];
    selectedCueId: string | null;
  }>({
    cursor: undefined,
    area: 'timeline',
    selectedCueId: null,
  });

  // Track cursor position
  const updateCursor = useCallback((x: number, y: number) => {
    trackingRef.current.cursor = { x, y };
    
    if (channelRef.current && currentUser) {
      channelRef.current.track({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar_url: currentUser.avatar_url,
        color: getUserColor(currentUser.id),
        cursor: { x, y },
        area: trackingRef.current.area,
        selectedCueId: trackingRef.current.selectedCueId,
        lastActive: new Date().toISOString(),
      });
    }
  }, [currentUser]);

  // Track which area the user is in
  const updateArea = useCallback((area: PresenceUser['area']) => {
    trackingRef.current.area = area;
    
    if (channelRef.current && currentUser) {
      channelRef.current.track({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar_url: currentUser.avatar_url,
        color: getUserColor(currentUser.id),
        cursor: trackingRef.current.cursor,
        area,
        selectedCueId: trackingRef.current.selectedCueId,
        lastActive: new Date().toISOString(),
      });
    }
  }, [currentUser]);

  // Track which cue the user has selected
  const updateSelectedCue = useCallback((cueId: string | null) => {
    trackingRef.current.selectedCueId = cueId;
    
    if (channelRef.current && currentUser) {
      channelRef.current.track({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar_url: currentUser.avatar_url,
        color: getUserColor(currentUser.id),
        cursor: trackingRef.current.cursor,
        area: trackingRef.current.area,
        selectedCueId: cueId,
        lastActive: new Date().toISOString(),
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!showId || !currentUser) {
      setActiveUsers([]);
      setIsConnected(false);
      return;
    }

    const channelName = `presence:show:${showId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state: PresenceState = channel.presenceState();
        const users: PresenceUser[] = [];
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            // Don't include current user in the list
            if (presence.id !== currentUser.id) {
              users.push(presence);
            }
          });
        });
        
        setActiveUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          
          // Track initial presence
          await channel.track({
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            avatar_url: currentUser.avatar_url,
            color: getUserColor(currentUser.id),
            cursor: undefined,
            area: 'timeline',
            selectedCueId: null,
            lastActive: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [showId, currentUser]);

  return {
    activeUsers,
    isConnected,
    updateCursor,
    updateArea,
    updateSelectedCue,
  };
};
