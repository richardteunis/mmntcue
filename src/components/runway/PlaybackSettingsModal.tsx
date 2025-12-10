import React, { useState, useEffect } from 'react';
import { Asset, PlaybackSettings, DEFAULT_PLAYBACK_SETTINGS, formatDuration } from '@/types/asset';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Volume2, 
  Clock, 
  Repeat, 
  TrendingUp, 
  Scissors,
  Play,
  Music,
  Video,
  Image,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaybackSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: PlaybackSettings) => void;
  asset: Asset | null;
  initialSettings?: PlaybackSettings;
}

const getAssetIcon = (fileType: Asset['file_type']) => {
  switch (fileType) {
    case 'audio': return Music;
    case 'video': return Video;
    case 'image': return Image;
    case 'document': return FileText;
    default: return FileText;
  }
};

const PlaybackSettingsModal: React.FC<PlaybackSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  asset,
  initialSettings = DEFAULT_PLAYBACK_SETTINGS,
}) => {
  const [settings, setSettings] = useState<PlaybackSettings>(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, isOpen]);

  if (!asset) return null;

  const Icon = getAssetIcon(asset.file_type);
  const isMedia = asset.file_type === 'audio' || asset.file_type === 'video';
  const duration = asset.duration || 0;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const updateSetting = <K extends keyof PlaybackSettings>(key: K, value: PlaybackSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg">Playback Settings</p>
              <p className="text-sm text-muted-foreground font-normal truncate max-w-[300px]">
                {asset.name}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Volume */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                Volume
              </Label>
              <span className="text-sm text-muted-foreground">{Math.round(settings.volume * 100)}%</span>
            </div>
            <Slider
              value={[settings.volume * 100]}
              onValueChange={([v]) => updateSetting('volume', v / 100)}
              max={100}
              step={1}
            />
          </div>

          {isMedia && (
            <>
              <Separator />

              {/* Playback Speed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Playback Speed
                  </Label>
                  <span className="text-sm text-muted-foreground">{settings.playback_speed}x</span>
                </div>
                <Slider
                  value={[settings.playback_speed * 100]}
                  onValueChange={([v]) => updateSetting('playback_speed', v / 100)}
                  min={50}
                  max={200}
                  step={10}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.5x</span>
                  <span>1x</span>
                  <span>2x</span>
                </div>
              </div>

              <Separator />

              {/* Loop */}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  Loop Playback
                </Label>
                <Switch
                  checked={settings.loop_enabled}
                  onCheckedChange={(checked) => updateSetting('loop_enabled', checked)}
                />
              </div>

              <Separator />

              {/* Fade In/Out */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Fade In (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    step={0.1}
                    value={settings.fade_in_duration}
                    onChange={(e) => updateSetting('fade_in_duration', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Fade Out (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    step={0.1}
                    value={settings.fade_out_duration}
                    onChange={(e) => updateSetting('fade_out_duration', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
              </div>

              <Separator />

              {/* Trim Points */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-muted-foreground" />
                  Trim Points
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Start (seconds)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={settings.trim_start}
                      onChange={(e) => updateSetting('trim_start', parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">End (seconds)</Label>
                    <Input
                      type="number"
                      min={settings.trim_start}
                      max={duration || 9999}
                      step={0.1}
                      value={settings.trim_end ?? (duration || '')}
                      onChange={(e) => updateSetting('trim_end', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Full"
                      className="h-8"
                    />
                  </div>
                </div>
                {duration > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {formatDuration(duration)} • 
                    Playing: {formatDuration((settings.trim_end ?? duration) - settings.trim_start)}
                  </p>
                )}
              </div>

              <Separator />

              {/* Start Offset */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Start Offset (seconds into cue)
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={settings.start_offset}
                  onChange={(e) => updateSetting('start_offset', parseFloat(e.target.value) || 0)}
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Asset will start playing {settings.start_offset}s after cue is triggered
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            <Play className="mr-2 h-4 w-4" />
            Add to Cue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlaybackSettingsModal;
