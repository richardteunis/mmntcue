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
  
  // Show control
  controlState: ShowControlState;
  setControlState: (state: ShowControlState) => void;
  
  // Show timing
  showTiming: ShowTiming;
  
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

  // Sort cues by start time
  const sortedCues = useMemo(() => {
    return [...cues].sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));
  }, [cues]);

  // Get cue status
  const getCueStatus = useCallback((cueId: string): CueStatus => {
    return cueStates.get(cueId)?.status || 'upcoming';
  }, [cueStates]);

  // Find next unfired cue
  const nextCueInfo = useMemo(() => {
    const index = sortedCues.findIndex(cue => {
      const state = cueStates.get(cue.id);
      return !state || state.status === 'upcoming' || state.status === 'ready';
    });
    return {
      cue: index >= 0 ? sortedCues[index] : null,
      index
    };
  }, [sortedCues, cueStates]);

  const nextCue = nextCueInfo.cue;
  const nextCueIndex = nextCueInfo.index;

  // Get upcoming cues (next 5 unfired)
  const upcomingCues = useMemo(() => {
    return sortedCues
      .filter(cue => {
        const state = cueStates.get(cue.id);
        return !state || state.status === 'upcoming' || state.status === 'ready';
      })
      .slice(0, 5);
  }, [sortedCues, cueStates]);

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
    
    // Start show timer on first cue
    if (!showStartTime) {
      setShowStartTime(new Date());
    }
    
    setControlState('idle');
  }, [showStartTime]);

  // Skip a cue
  const skipCue = useCallback((cueId: string) => {
    setCueStates(prev => {
      const next = new Map(prev);
      next.set(cueId, { status: 'skipped' });
      return next;
    });
  }, []);

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
  }, []);

  // Go to next cue
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
    controlState,
    setControlState,
    showTiming,
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
