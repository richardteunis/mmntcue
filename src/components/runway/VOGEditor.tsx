import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Mic, 
  RefreshCw, 
  Play, 
  Pause,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VOGGeneration, VOICE_OPTIONS, VOICE_STYLES } from '@/types/vog';
import { useToast } from '@/hooks/use-toast';

interface VOGEditorProps {
  cueId: string;
  showId: string;
  cueName: string;
  generation?: VOGGeneration | null;
  defaultVoiceId?: string;
  voiceLocked?: boolean;
  onGenerate: (script: string, voiceId: string, style: string) => Promise<void>;
  onRetry?: () => Promise<void>;
}

const VOGEditor: React.FC<VOGEditorProps> = ({
  cueId,
  showId,
  cueName,
  generation,
  defaultVoiceId = 'alloy',
  voiceLocked = false,
  onGenerate,
  onRetry,
}) => {
  const { toast } = useToast();
  const [script, setScript] = useState(generation?.script || '');
  const [voiceId, setVoiceId] = useState(generation?.voice_id || defaultVoiceId);
  const [style, setStyle] = useState(generation?.voice_style || 'calm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (generation) {
      setScript(generation.script);
      setVoiceId(generation.voice_id);
      setStyle(generation.voice_style);
    }
  }, [generation]);

  const handleGenerate = async () => {
    if (!script.trim()) {
      toast({
        title: 'Script required',
        description: 'Please enter a script for the VOG.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerate(script, voiceId, style);
      toast({
        title: 'VOG generation started',
        description: 'Your audio is being generated...',
      });
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to start generation',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = async () => {
    if (onRetry) {
      setIsGenerating(true);
      try {
        await onRetry();
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !generation?.audio_url) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    if (!generation) return null;
    
    const statusConfig = {
      pending: { icon: Clock, label: 'Pending', variant: 'secondary' as const },
      queued: { icon: Clock, label: 'Queued', variant: 'secondary' as const },
      processing: { icon: Loader2, label: 'Processing', variant: 'default' as const },
      succeeded: { icon: CheckCircle2, label: 'Ready', variant: 'default' as const },
      failed: { icon: AlertCircle, label: 'Failed', variant: 'destructive' as const },
    };
    
    const config = statusConfig[generation.status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3", generation.status === 'processing' && "animate-spin")} />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <Label className="font-semibold">Voice of God</Label>
        </div>
        {getStatusBadge()}
      </div>

      {/* Script Input */}
      <div className="space-y-2">
        <Label htmlFor="vog-script">Script</Label>
        <Textarea
          id="vog-script"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Enter the announcement text..."
          className="min-h-[120px] font-mono text-sm"
          disabled={isGenerating}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{script.length} characters</span>
          <span>~{Math.ceil(script.length / 15)} seconds</span>
        </div>
      </div>

      {/* Voice Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Voice</Label>
          <Select
            value={voiceId}
            onValueChange={setVoiceId}
            disabled={voiceLocked || isGenerating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select voice" />
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
          {voiceLocked && (
            <p className="text-xs text-muted-foreground">Voice locked after rehearsal</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Style</Label>
          <Select
            value={style}
            onValueChange={setStyle}
            disabled={isGenerating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select style" />
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

      {/* Generate/Regenerate Button */}
      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !script.trim()}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : generation ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Generate Audio
            </>
          )}
        </Button>
        
        {generation?.status === 'failed' && onRetry && (
          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={isGenerating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>

      {/* Error Message */}
      {generation?.status === 'failed' && generation.error_message && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{generation.error_message}</span>
          </div>
        </div>
      )}

      {/* Audio Preview */}
      {generation?.status === 'succeeded' && generation.audio_url && (
        <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{generation.file_name || `${cueName}_vog.mp3`}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDuration(generation.audio_duration)}
            </span>
          </div>

          {/* Simple Waveform Placeholder */}
          <div className="h-12 bg-background rounded flex items-center justify-center overflow-hidden">
            <div className="flex items-center gap-0.5 h-full px-2">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 bg-primary/60 rounded-full transition-all",
                    isPlaying && "animate-pulse"
                  )}
                  style={{
                    height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 20}%`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1 h-12"
              onClick={togglePlayback}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pause Preview
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Play Preview
                </>
              )}
            </Button>
          </div>

          <audio
            ref={audioRef}
            src={generation.audio_url}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        </div>
      )}
    </div>
  );
};

export default VOGEditor;
