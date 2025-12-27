import { useState, useCallback, useMemo, useEffect } from 'react';
import { Cue } from '@/types/cue';

export type CueStatus = 'upcoming' | 'ready' | 'fired' | 'skipped' | 'failed';
export type ShowStatus = 'on_time' | 'behind' | 'ahead' | 'significantly_behind';
export type ShowControlState = 'idle' | 'standby' | 'go' | 'hold';

interface CueState {
  status: CueStatus;
  firedAt?: Date;
  actualDuration?: number;
}

interface ShowTiming {
  scheduledElapsed: number;  // Seconds elapsed based on schedule
  actualElapsed: number;     // Actual seconds elapsed
  overUnder: number;         // Positive = behind, negative = ahead
  status: ShowStatus;
}

interface UseShowStateReturn {
  // Cue states
  cueStates: Map<string, CueState>;
  getCueStatus: (cueId: string) => CueStatus;
  nextCue: Cue | null;
  nextCueIndex: number;
  upcomingCues: Cue[];
  lastFiredCue: Cue | null;
  lastFiredAt: Date | null;
  
  // Show control
  controlState: ShowControlState;
  setControlState: (state: ShowControlState) => void;
  
  // Show timing
  showTiming: ShowTiming;
  
  // Navigation
  currentCueIndex: number;
  setCurrentCueIndex: (index: number) => void;
  jumpToCue: (cueId: string) => void;
  
  // Actions
  fireCue: (cueId: string) => void;
  skipCue: (cueId: string) => void;
  markCueFailed: (cueId: string) => void;
  resetCue: (cueId: string) => void;
  resetAllCues: () => void;
  goToNext: () => void;
  standby: () => void;
  hold: () => void;
  resume: () => void;
  
  // Rehearsal mode
  isRehearsalMode: boolean;
  setRehearsalMode: (mode: boolean) => void;
}

// Helper to convert time string to seconds
const timeToSeconds = (timeString: string): number => {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

export const useShowState = (cues: Cue[], currentTimeSeconds: number = 0): UseShowStateReturn => {
  const [cueStates, setCueStates] = useState<Map<string, CueState>>(new Map());
  const [controlState, setControlState] = useState<ShowControlState>('idle');
  const [isRehearsalMode, setRehearsalMode] = useState(false);
  const [showStartTime, setShowStartTime] = useState<Date | null>(null);
  const [manualCueIndex, setManualCueIndex] = useState<number | null>(null);
  const [lastFiredCueId, setLastFiredCueId] = useState<string | null>(null);
  const [lastFiredAt, setLastFiredAt] = useState<Date | null>(null);

  // Sort cues by order_index first, then by start_time
  const sortedCues = useMemo(() => {
    return [...cues].sort((a, b) => {
      // First sort by order_index
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      // Then by start_time as fallback
      return timeToSeconds(a.start_time) - timeToSeconds(b.start_time);
    });
  }, [cues]);

  // Get cue status
  const getCueStatus = useCallback((cueId: string): CueStatus => {
    return cueStates.get(cueId)?.status || 'upcoming';
  }, [cueStates]);

  // Determine current cue index - use manual if set, otherwise find first unfired
  const currentCueIndex = useMemo(() => {
    if (manualCueIndex !== null && manualCueIndex >= 0 && manualCueIndex < sortedCues.length) {
      return manualCueIndex;
    }
    // Find first unfired cue
    const index = sortedCues.findIndex(cue => {
      const state = cueStates.get(cue.id);
      return !state || state.status === 'upcoming' || state.status === 'ready';
    });
    return index >= 0 ? index : sortedCues.length - 1;
  }, [sortedCues, cueStates, manualCueIndex]);

  // Next cue is the cue at current index
  const nextCue = sortedCues[currentCueIndex] || null;
  const nextCueIndex = currentCueIndex;

  // Get upcoming cues starting from current position
  const upcomingCues = useMemo(() => {
    return sortedCues.slice(currentCueIndex, currentCueIndex + 6);
  }, [sortedCues, currentCueIndex]);

  // Get last fired cue
  const lastFiredCue = useMemo(() => {
    if (!lastFiredCueId) return null;
    return sortedCues.find(c => c.id === lastFiredCueId) || null;
  }, [sortedCues, lastFiredCueId]);

  // Calculate show timing
  const showTiming = useMemo((): ShowTiming => {
    if (!showStartTime) {
      return {
        scheduledElapsed: 0,
        actualElapsed: 0,
        overUnder: 0,
        status: 'on_time'
      };
    }

    const actualElapsed = (Date.now() - showStartTime.getTime()) / 1000;
    
    // Calculate scheduled elapsed based on fired cues
    let scheduledElapsed = 0;
    sortedCues.forEach(cue => {
      const state = cueStates.get(cue.id);
      if (state?.status === 'fired') {
        scheduledElapsed = Math.max(scheduledElapsed, timeToSeconds(cue.start_time) + timeToSeconds(cue.duration));
      }
    });

    const overUnder = actualElapsed - scheduledElapsed;

    let status: ShowStatus = 'on_time';
    if (overUnder > 120) {
      status = 'significantly_behind';
    } else if (overUnder > 30) {
      status = 'behind';
    } else if (overUnder < -30) {
      status = 'ahead';
    }

    return { scheduledElapsed, actualElapsed, overUnder, status };
  }, [showStartTime, sortedCues, cueStates]);

  // Set current cue index manually (for navigation)
  const setCurrentCueIndex = useCallback((index: number) => {
    if (index >= 0 && index < sortedCues.length) {
      setManualCueIndex(index);
    }
  }, [sortedCues.length]);

  // Jump to a specific cue by ID
  const jumpToCue = useCallback((cueId: string) => {
    const index = sortedCues.findIndex(c => c.id === cueId);
    if (index >= 0) {
      setManualCueIndex(index);
    }
  }, [sortedCues]);

  // Fire a cue
  const fireCue = useCallback((cueId: string) => {
    setCueStates(prev => {
      const next = new Map(prev);
      next.set(cueId, {
        status: 'fired',
        firedAt: new Date()
      });
      return next;
    });
    
    // Track last fired cue
    setLastFiredCueId(cueId);
    setLastFiredAt(new Date());
    
    // Start show timer on first cue
    if (!showStartTime) {
      setShowStartTime(new Date());
    }
    
    // Move to next cue after firing
    const firedIndex = sortedCues.findIndex(c => c.id === cueId);
    if (firedIndex >= 0 && firedIndex < sortedCues.length - 1) {
      setManualCueIndex(firedIndex + 1);
    }
    
    setControlState('idle');
  }, [showStartTime, sortedCues]);

  // Skip a cue
  const skipCue = useCallback((cueId: string) => {
    setCueStates(prev => {
      const next = new Map(prev);
      next.set(cueId, { status: 'skipped' });
      return next;
    });
    
    // Move to next cue after skipping
    const skippedIndex = sortedCues.findIndex(c => c.id === cueId);
    if (skippedIndex >= 0 && skippedIndex < sortedCues.length - 1) {
      setManualCueIndex(skippedIndex + 1);
    }
  }, [sortedCues]);

  // Mark cue as failed
  const markCueFailed = useCallback((cueId: string) => {
    setCueStates(prev => {
      const next = new Map(prev);
      next.set(cueId, { status: 'failed' });
      return next;
    });
  }, []);

  // Reset a cue
  const resetCue = useCallback((cueId: string) => {
    setCueStates(prev => {
      const next = new Map(prev);
      next.delete(cueId);
      return next;
    });
  }, []);

  // Reset all cues
  const resetAllCues = useCallback(() => {
    setCueStates(new Map());
    setControlState('idle');
    setShowStartTime(null);
    setManualCueIndex(null);
    setLastFiredCueId(null);
    setLastFiredAt(null);
  }, []);

  // Go to next cue (fire current)
  const goToNext = useCallback(() => {
    if (nextCue) {
      fireCue(nextCue.id);
    }
  }, [nextCue, fireCue]);

  // Set standby
  const standby = useCallback(() => {
    setControlState('standby');
    if (nextCue) {
      setCueStates(prev => {
        const next = new Map(prev);
        const current = next.get(nextCue.id) || { status: 'upcoming' as CueStatus };
        next.set(nextCue.id, { ...current, status: 'ready' });
        return next;
      });
    }
  }, [nextCue]);

  // Hold
  const hold = useCallback(() => {
    setControlState('hold');
  }, []);

  // Resume from hold
  const resume = useCallback(() => {
    setControlState('idle');
  }, []);

  return {
    cueStates,
    getCueStatus,
    nextCue,
    nextCueIndex,
    upcomingCues,
    lastFiredCue,
    lastFiredAt,
    controlState,
    setControlState,
    showTiming,
    currentCueIndex,
    setCurrentCueIndex,
    jumpToCue,
    fireCue,
    skipCue,
    markCueFailed,
    resetCue,
    resetAllCues,
    goToNext,
    standby,
    hold,
    resume,
    isRehearsalMode,
    setRehearsalMode
  };
};
