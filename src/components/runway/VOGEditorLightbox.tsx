import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Mic2, 
  Play, 
  Pause, 
  RefreshCw,
  Loader2,
  Volume2,
  FileAudio,
  Check,
  X,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VOICE_OPTIONS, VOICE_STYLES } from '@/types/vog';
import { useVOG } from '@/hooks/useVOG';

interface VOGEditorLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId?: string | null;
  cueId?: string | null;
  cueName?: string;
  onGenerated?: (audioUrl: string, fileName: string) => void;
  onSave?: (script: string, voiceId: string, style: string) => void;
}

const VOGEditorLightbox: React.FC<VOGEditorLightboxProps> = ({
  open,
  onOpenChange,
  showId,
  cueId,
  cueName,
  onGenerated,
  onSave,
}) => {
  const { toast } = useToast();
  const { settings, generateVOG, getGenerationForCue } = useVOG(showId || '');
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [script, setScript] = useState('');
  const [voiceId, setVoiceId] = useState('alloy');
  const [style, setStyle] = useState('calm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioProgress, setAudioProgress] = useState<number>(0);

  // Reset state when dialog opens/closes or cue changes
  useEffect(() => {
    if (open && cueId && showId) {
      getGenerationForCue(cueId).then(gen => {
        if (gen) {
          setScript(gen.script);
          setVoiceId(gen.voice_id);
          if (gen.voice_style) setStyle(gen.voice_style);
          if (gen.audio_url) {
            setGeneratedAudioUrl(gen.audio_url);
            setGeneratedFileName(gen.file_name || 'Generated VOG');
          }
        }
      });
    } else if (!open) {
      // Reset on close
      setScript('');
      setVoiceId('alloy');
      setStyle('calm');
      setGeneratedAudioUrl(null);
      setGeneratedFileName(null);
      setIsPlaying(false);
    }
  }, [open, cueId, showId, getGenerationForCue]);

  const handleGenerate = useCallback(async () => {
    if (!script.trim() || !showId || !cueId) {
      toast({
        title: 'Missing information',
        description: 'Please enter a script',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateVOG(cueId, script, voiceId, style);

      if (result && result.audio_url) {
        setGeneratedAudioUrl(result.audio_url);
        setGeneratedFileName(result.file_name || 'VOG Audio');
        onGenerated?.(result.audio_url, result.file_name || 'VOG Audio');
        toast({
          title: 'VOG Generated',
          description: 'Audio has been generated successfully',
        });
      } else {
        toast({
          title: 'Generation started',
          description: 'Audio is being generated...',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate VOG audio',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [script, voiceId, style, showId, cueId, generateVOG, onGenerated, toast]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !generatedAudioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, generatedAudioUrl]);

  const handleSave = useCallback(() => {
    onSave?.(script, voiceId, style);
    onOpenChange(false);
    toast({
      title: 'Saved',
      description: 'VOG settings saved',
    });
  }, [script, voiceId, style, onSave, onOpenChange, toast]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic2 className="h-5 w-5 text-runway-teal" />
            VOG Editor
            {cueName && (
              <Badge variant="outline" className="ml-2 text-xs">
                {cueName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Script Input */}
          <div className="space-y-2">
            <Label htmlFor="vog-script" className="text-sm">Script</Label>
            <Textarea
              id="vog-script"
              placeholder="Enter your announcement script..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Voice and Style Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Voice</Label>
              <Select value={voiceId} onValueChange={setVoiceId} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex flex-col">
                        <span>{voice.name}</span>
                        <span className="text-xs text-muted-foreground">{voice.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Style</Label>
              <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex flex-col">
                        <span>{s.name}</span>
                        <span className="text-xs text-muted-foreground">{s.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Audio Preview Player */}
          {generatedAudioUrl && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <audio
                ref={audioRef}
                src={generatedAudioUrl}
                onTimeUpdate={() => {
                  if (audioRef.current) setAudioProgress(audioRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (audioRef.current) setAudioDuration(audioRef.current.duration);
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  setAudioProgress(0);
                }}
              />
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileAudio className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{generatedFileName}</span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-runway-teal transition-all"
                      style={{ width: `${audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-sm font-mono text-muted-foreground">
                  {formatDuration(audioProgress)} / {formatDuration(audioDuration)}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !script.trim()}
              className="bg-runway-teal hover:bg-runway-teal/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : generatedAudioUrl ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              ) : (
                <>
                  <Mic2 className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
            {generatedAudioUrl && (
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save & Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VOGEditorLightbox;
