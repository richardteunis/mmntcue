import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ViewportState {
  scrollX: number;
  scrollY: number;
  zoom?: number;
}

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  color: string;
  cursor?: { x: number; y: number };
  area?: 'timeline' | 'cue-panel' | 'table' | 'sidebar';
  selectedCueId?: string | null;
  viewport?: ViewportState;
  lastActive: string;
}

interface PresenceState {
  [key: string]: PresenceUser[];
}

interface CursorBroadcast {
  userId: string;
  cursor: { x: number; y: number };
}

interface ViewportBroadcast {
  userId: string;
  viewport: ViewportState;
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
  const usersRef = useRef<Map<string, PresenceUser>>(new Map());
  const trackingRef = useRef<{
    area: PresenceUser['area'];
    selectedCueId: string | null;
    viewport: ViewportState;
  }>({
    area: 'timeline',
    selectedCueId: null,
    viewport: { scrollX: 0, scrollY: 0, zoom: 1 },
  });

  // Broadcast cursor position (fast, no persistence)
  const updateCursor = useCallback((x: number, y: number) => {
    if (channelRef.current && currentUser) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          userId: currentUser.id,
          cursor: { x, y },
        },
      });
    }
  }, [currentUser]);

  // Track which area the user is in (slower, uses presence)
  const updateArea = useCallback((area: PresenceUser['area']) => {
    trackingRef.current.area = area;
    
    if (channelRef.current && currentUser) {
      channelRef.current.track({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar_url: currentUser.avatar_url,
        color: getUserColor(currentUser.id),
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
        area: trackingRef.current.area,
        selectedCueId: cueId,
        lastActive: new Date().toISOString(),
      });
    }
  }, [currentUser]);

  // Broadcast viewport state (fast, for follow mode)
  const updateViewport = useCallback((viewport: ViewportState) => {
    trackingRef.current.viewport = viewport;
    
    if (channelRef.current && currentUser) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'viewport',
        payload: {
          userId: currentUser.id,
          viewport,
        },
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
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUser.id },
      },
    });
    channelRef.current = channel;

    channel
      // Handle presence sync for user join/leave
      .on('presence', { event: 'sync' }, () => {
        const state: PresenceState = channel.presenceState();
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.id !== currentUser.id) {
              const existing = usersRef.current.get(presence.id);
              usersRef.current.set(presence.id, {
                ...presence,
                cursor: existing?.cursor, // Preserve cursor from broadcasts
              });
            }
          });
        });
        
        // Remove users not in state
        const currentIds = new Set(
          Object.values(state).flatMap(p => p.map(u => u.id))
        );
        usersRef.current.forEach((_, id) => {
          if (!currentIds.has(id) && id !== currentUser.id) {
            usersRef.current.delete(id);
          }
        });
        
        setActiveUsers(Array.from(usersRef.current.values()));
      })
      // Handle fast cursor broadcasts
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const { userId, cursor } = payload as CursorBroadcast;
        
        if (userId !== currentUser.id) {
          const existing = usersRef.current.get(userId);
          if (existing) {
            usersRef.current.set(userId, { ...existing, cursor });
            setActiveUsers(Array.from(usersRef.current.values()));
          }
        }
      })
      // Handle viewport broadcasts for follow mode
      .on('broadcast', { event: 'viewport' }, ({ payload }) => {
        const { userId, viewport } = payload as ViewportBroadcast;
        
        if (userId !== currentUser.id) {
          const existing = usersRef.current.get(userId);
          if (existing) {
            usersRef.current.set(userId, { ...existing, viewport });
            setActiveUsers(Array.from(usersRef.current.values()));
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          
          // Track initial presence (without cursor - that's broadcast separately)
          await channel.track({
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            avatar_url: currentUser.avatar_url,
            color: getUserColor(currentUser.id),
            area: 'timeline',
            selectedCueId: null,
            lastActive: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      usersRef.current.clear();
      setIsConnected(false);
    };
  }, [showId, currentUser]);

  return {
    activeUsers,
    isConnected,
    updateCursor,
    updateArea,
    updateSelectedCue,
    updateViewport,
  };
};
