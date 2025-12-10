import { useState, useRef, useCallback, useEffect } from 'react';
import { useCuePlayback } from './useCuePlayback';

interface Cue {
  id: string;
  time: string;
  duration: string;
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

const secondsToTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const usePlaybackState = (cues: Cue[] = []) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const animationRef = useRef<number | null>(null);
  const triggeredCuesRef = useRef<Set<string>>(new Set());
  const { playCue, stopAllCues, clearCache } = useCuePlayback();

  // Playback animation loop with cue triggering
  useEffect(() => {
    if (isPlaying) {
      let lastTime = performance.now();
      
      const animate = (now: number) => {
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        
        setCurrentTimeSeconds(prev => {
          const newTime = prev + delta;
          
          // Check for cues that should be triggered
          for (const cue of cues) {
            const cueStartSeconds = timeToSeconds(cue.time);
            const cueDurationSeconds = timeToSeconds(cue.duration);
            const cueEndSeconds = cueStartSeconds + cueDurationSeconds;
            
            // Trigger cue if playhead just crossed the start time
            if (newTime >= cueStartSeconds && 
                newTime < cueEndSeconds &&
                !triggeredCuesRef.current.has(cue.id)) {
              triggeredCuesRef.current.add(cue.id);
              playCue(cue.id);
            }
            
            // Remove from triggered if we've passed the cue
            if (newTime >= cueEndSeconds) {
              triggeredCuesRef.current.delete(cue.id);
            }
          }
          
          return newTime;
        });
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, cues, playCue]);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const reset = useCallback(() => {
    setCurrentTimeSeconds(0);
    setIsPlaying(false);
    triggeredCuesRef.current.clear();
    stopAllCues();
    clearCache();
  }, [stopAllCues, clearCache]);

  const seekTo = useCallback((seconds: number) => {
    setCurrentTimeSeconds(Math.max(0, seconds));
    // Clear triggered cues when seeking
    triggeredCuesRef.current.clear();
  }, []);

  const seekToTime = useCallback((timeString: string) => {
    seekTo(timeToSeconds(timeString));
  }, [seekTo]);

  const jumpToNextCue = useCallback(() => {
    const sortedCues = [...cues].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
    const nextCue = sortedCues.find(c => timeToSeconds(c.time) > currentTimeSeconds);
    if (nextCue) {
      seekTo(timeToSeconds(nextCue.time));
      return nextCue;
    }
    return null;
  }, [cues, currentTimeSeconds, seekTo]);

  return {
    isPlaying,
    currentTimeSeconds,
    currentTime: secondsToTime(currentTimeSeconds),
    play,
    pause,
    togglePlay,
    reset,
    seekTo,
    seekToTime,
    jumpToNextCue,
  };
};
