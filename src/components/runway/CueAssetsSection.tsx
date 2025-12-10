import React, { useEffect, useRef } from 'react';
import { useCueAssets } from '@/hooks/useAssets';
import { CueAsset, PlaybackSettings, formatDuration } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Music, 
  Video, 
  Image, 
  FileText, 
  Trash2, 
  Volume2, 
  Play, 
  Pause,
  Repeat,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CueAssetsSectionProps {
  cueId: string | null;
}

const getAssetIcon = (fileType: string) => {
  switch (fileType) {
    case 'audio': return Music;
    case 'video': return Video;
    case 'image': return Image;
    default: return FileText;
  }
};

const CueAssetsSection: React.FC<CueAssetsSectionProps> = ({ cueId }) => {
  const { cueAssets, loading, updateCueAsset, removeCueAsset, refetch } = useCueAssets(cueId);
  const [expandedAsset, setExpandedAsset] = React.useState<string | null>(null);
  const [playingAsset, setPlayingAsset] = React.useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    refetch();
  }, [cueId, refetch]);

  const handlePlayPreview = (cueAsset: CueAsset) => {
    const asset = cueAsset.asset;
    if (!asset || (asset.file_type !== 'audio' && asset.file_type !== 'video')) return;

    if (playingAsset === cueAsset.id) {
      // Stop
      const audio = audioRefs.current.get(cueAsset.id);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingAsset(null);
    } else {
      // Stop any currently playing
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });

      // Play this one
      let audio = audioRefs.current.get(cueAsset.id);
      if (!audio) {
        audio = new Audio(asset.file_url);
        audioRefs.current.set(cueAsset.id, audio);
      }
      audio.volume = cueAsset.volume;
      audio.playbackRate = cueAsset.playback_speed;
      audio.loop = cueAsset.loop_enabled;
      audio.currentTime = cueAsset.trim_start;
      audio.onended = () => setPlayingAsset(null);
      audio.play();
      setPlayingAsset(cueAsset.id);
    }
  };

  const handleSettingChange = (cueAssetId: string, key: keyof PlaybackSettings, value: number | boolean) => {
    updateCueAsset(cueAssetId, { [key]: value });
  };

  if (!cueId) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Select a cue to view attached assets
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Loading assets...
      </div>
    );
  }

  if (cueAssets.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        <p>No assets attached to this cue</p>
        <p className="text-xs mt-2">Drag an asset from the library onto this cue</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cueAssets.map((cueAsset) => {
        const asset = cueAsset.asset;
        if (!asset) return null;

        const Icon = getAssetIcon(asset.file_type);
        const isExpanded = expandedAsset === cueAsset.id;
        const isPlaying = playingAsset === cueAsset.id;
        const canPlay = asset.file_type === 'audio' || asset.file_type === 'video';

        return (
          <Collapsible
            key={cueAsset.id}
            open={isExpanded}
            onOpenChange={(open) => setExpandedAsset(open ? cueAsset.id : null)}
          >
            <div className={cn(
              "rounded-lg border border-border bg-muted/30 overflow-hidden transition-colors",
              isExpanded && "ring-1 ring-primary/50"
            )}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                  <div className={cn(
                    "w-8 h-8 rounded flex items-center justify-center shrink-0",
                    asset.file_type === 'audio' && "bg-runway-teal/20 text-runway-teal",
                    asset.file_type === 'video' && "bg-runway-success/20 text-runway-success",
                    asset.file_type === 'image' && "bg-runway-highlight/20 text-runway-highlight",
                    asset.file_type === 'document' && "bg-muted text-muted-foreground"
                  )}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{asset.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {asset.file_type}
                      </Badge>
                      {asset.duration && (
                        <span>{formatDuration(asset.duration)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Volume2 size={10} />
                        {Math.round(cueAsset.volume * 100)}%
                      </span>
                      {cueAsset.loop_enabled && (
                        <Repeat size={10} className="text-primary" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canPlay && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPreview(cueAsset);
                        }}
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCueAsset(cueAsset.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                    <Settings2 size={14} className={cn(
                      "text-muted-foreground transition-transform",
                      isExpanded && "rotate-90"
                    )} />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <Separator />
                <div className="p-3 space-y-4 bg-background/50">
                  {/* Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Volume</Label>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(cueAsset.volume * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[cueAsset.volume * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([val]) => handleSettingChange(cueAsset.id, 'volume', val / 100)}
                    />
                  </div>

                  {/* Playback Speed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Playback Speed</Label>
                      <span className="text-xs text-muted-foreground">
                        {cueAsset.playback_speed}x
                      </span>
                    </div>
                    <Slider
                      value={[cueAsset.playback_speed * 100]}
                      min={25}
                      max={200}
                      step={5}
                      onValueChange={([val]) => handleSettingChange(cueAsset.id, 'playback_speed', val / 100)}
                    />
                  </div>

                  {/* Loop */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Loop Playback</Label>
                    <Switch
                      checked={cueAsset.loop_enabled}
                      onCheckedChange={(checked) => handleSettingChange(cueAsset.id, 'loop_enabled', checked)}
                    />
                  </div>

                  {/* Fade In/Out */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Fade In</Label>
                        <span className="text-xs text-muted-foreground">
                          {cueAsset.fade_in_duration}s
                        </span>
                      </div>
                      <Slider
                        value={[cueAsset.fade_in_duration]}
                        min={0}
                        max={10}
                        step={0.5}
                        onValueChange={([val]) => handleSettingChange(cueAsset.id, 'fade_in_duration', val)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Fade Out</Label>
                        <span className="text-xs text-muted-foreground">
                          {cueAsset.fade_out_duration}s
                        </span>
                      </div>
                      <Slider
                        value={[cueAsset.fade_out_duration]}
                        min={0}
                        max={10}
                        step={0.5}
                        onValueChange={([val]) => handleSettingChange(cueAsset.id, 'fade_out_duration', val)}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default CueAssetsSection;
