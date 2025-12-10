import { useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CueAsset } from '@/types/asset';

interface PlaybackState {
  cueId: string;
  assets: CueAsset[];
  audioElements: HTMLAudioElement[];
}

export const useCuePlayback = () => {
  const playingCuesRef = useRef<Map<string, PlaybackState>>(new Map());
  const cueAssetsCache = useRef<Map<string, CueAsset[]>>(new Map());

  const fetchCueAssets = useCallback(async (cueId: string): Promise<CueAsset[]> => {
    // Check cache first
    if (cueAssetsCache.current.has(cueId)) {
      return cueAssetsCache.current.get(cueId)!;
    }

    const { data, error } = await supabase
      .from('cue_assets')
      .select('*, asset:assets(*)')
      .eq('cue_id', cueId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching cue assets:', error);
      return [];
    }

    const assets = (data || []) as CueAsset[];
    cueAssetsCache.current.set(cueId, assets);
    return assets;
  }, []);

  const playCue = useCallback(async (cueId: string) => {
    // Don't restart if already playing
    if (playingCuesRef.current.has(cueId)) return;

    const assets = await fetchCueAssets(cueId);
    if (assets.length === 0) return;

    const audioElements: HTMLAudioElement[] = [];

    for (const cueAsset of assets) {
      const asset = cueAsset.asset;
      if (!asset) continue;

      // Only play audio/video assets
      if (asset.file_type !== 'audio' && asset.file_type !== 'video') continue;

      const audio = new Audio(asset.file_url);
      audio.volume = cueAsset.volume;
      audio.playbackRate = cueAsset.playback_speed;
      audio.loop = cueAsset.loop_enabled;
      audio.currentTime = cueAsset.trim_start + cueAsset.start_offset;

      // Handle fade in
      if (cueAsset.fade_in_duration > 0) {
        audio.volume = 0;
        const targetVolume = cueAsset.volume;
        const fadeInSteps = cueAsset.fade_in_duration * 20; // 50ms intervals
        let currentStep = 0;
        const fadeInInterval = setInterval(() => {
          currentStep++;
          audio.volume = Math.min(targetVolume, (currentStep / fadeInSteps) * targetVolume);
          if (currentStep >= fadeInSteps) {
            clearInterval(fadeInInterval);
          }
        }, 50);
      }

      // Handle trim end
      if (cueAsset.trim_end) {
        audio.ontimeupdate = () => {
          if (audio.currentTime >= cueAsset.trim_end!) {
            if (!cueAsset.loop_enabled) {
              audio.pause();
            } else {
              audio.currentTime = cueAsset.trim_start;
            }
          }
        };
      }

      audio.onended = () => {
        // Remove from playing list when done
        const state = playingCuesRef.current.get(cueId);
        if (state) {
          const idx = state.audioElements.indexOf(audio);
          if (idx > -1) state.audioElements.splice(idx, 1);
          if (state.audioElements.length === 0) {
            playingCuesRef.current.delete(cueId);
          }
        }
      };

      audioElements.push(audio);
      audio.play().catch(console.error);
    }

    if (audioElements.length > 0) {
      playingCuesRef.current.set(cueId, {
        cueId,
        assets,
        audioElements,
      });
    }
  }, [fetchCueAssets]);

  const stopCue = useCallback((cueId: string) => {
    const state = playingCuesRef.current.get(cueId);
    if (!state) return;

    for (const audio of state.audioElements) {
      audio.pause();
      audio.currentTime = 0;
    }

    playingCuesRef.current.delete(cueId);
  }, []);

  const stopAllCues = useCallback(() => {
    playingCuesRef.current.forEach((state, cueId) => {
      stopCue(cueId);
    });
  }, [stopCue]);

  const isPlaying = useCallback((cueId: string): boolean => {
    return playingCuesRef.current.has(cueId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllCues();
    };
  }, [stopAllCues]);

  // Clear cache when needed
  const clearCache = useCallback((cueId?: string) => {
    if (cueId) {
      cueAssetsCache.current.delete(cueId);
    } else {
      cueAssetsCache.current.clear();
    }
  }, []);

  return {
    playCue,
    stopCue,
    stopAllCues,
    isPlaying,
    clearCache,
  };
};
