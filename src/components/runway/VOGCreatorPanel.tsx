import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  Mic2, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  Pause, 
  RefreshCw,
  Loader2,
  Volume2,
  FileAudio,
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VOICE_OPTIONS, VOICE_STYLES } from '@/types/vog';
import { useVOG } from '@/hooks/useVOG';

interface VOGCreatorPanelProps {
  showId?: string | null;
  cueId?: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onGenerated?: (audioUrl: string, fileName: string) => void;
}

const VOGCreatorPanel: React.FC<VOGCreatorPanelProps> = ({
  showId,
  cueId,
  isExpanded,
  onToggleExpand,
  onGenerated,
}) => {
  const { toast } = useToast();
  const { settings, generateVOG, getGenerationForCue } = useVOG(showId || '');
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [script, setScript] = useState('');
  const [voiceId, setVoiceId] = useState(settings?.default_voice_id || 'alloy');
  const [style, setStyle] = useState('calm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [jobStatus, setJobStatus] = useState<'idle' | 'queued' | 'processing' | 'succeeded' | 'failed'>('idle');

  // Load existing generation for cue
  useEffect(() => {
    if (cueId && showId) {
      getGenerationForCue(cueId).then(gen => {
        if (gen) {
          setScript(gen.script);
          setVoiceId(gen.voice_id);
          if (gen.voice_style) setStyle(gen.voice_style);
          if (gen.audio_url) {
            setGeneratedAudioUrl(gen.audio_url);
            setGeneratedFileName(gen.file_name || 'Generated VOG');
          }
          setJobStatus(gen.status as typeof jobStatus);
        }
      });
    }
  }, [cueId, showId, getGenerationForCue]);

  const handleGenerate = useCallback(async () => {
    if (!script.trim() || !showId || !cueId) {
      toast({
        title: 'Missing information',
        description: 'Please enter a script and select a cue',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setJobStatus('queued');

    try {
      // generateVOG takes 4 separate arguments: cueId, script, voiceId, style
      const result = await generateVOG(cueId, script, voiceId, style);

      if (result && result.audio_url) {
        setGeneratedAudioUrl(result.audio_url);
        setGeneratedFileName(result.file_name || 'VOG Audio');
        setJobStatus('succeeded');
        onGenerated?.(result.audio_url, result.file_name || 'VOG Audio');
        toast({
          title: 'VOG Generated',
          description: 'Audio has been generated and attached to the cue',
        });
      } else if (result) {
        // Generation initiated but not completed yet - poll for status
        setJobStatus('processing');
        toast({
          title: 'Generation started',
          description: 'Audio is being generated...',
        });
      } else {
        setJobStatus('failed');
        toast({
          title: 'Generation failed',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setJobStatus('failed');
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

  const handleAudioTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setAudioProgress(audioRef.current.currentTime);
    }
  }, []);

  const handleAudioLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setAudioProgress(0);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className={cn(
        "w-full border-t border-border bg-card/80 backdrop-blur-sm transition-all",
        isExpanded && "border-primary/30"
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button 
            className={cn(
              "w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            )}
          >
            <div className="flex items-center gap-2">
              <Mic2 className="h-4 w-4 text-runway-teal" />
              <span className="text-sm font-medium">VOG Creator</span>
              {jobStatus !== 'idle' && jobStatus !== 'succeeded' && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    jobStatus === 'processing' && "bg-runway-warning/20 text-runway-warning",
                    jobStatus === 'queued' && "bg-muted",
                    jobStatus === 'failed' && "bg-destructive/20 text-destructive"
                  )}
                >
                  {jobStatus === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {jobStatus}
                </Badge>
              )}
              {generatedAudioUrl && jobStatus === 'succeeded' && (
                <Badge variant="outline" className="text-xs bg-runway-success/20 text-runway-success">
                  <Check className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Script Input */}
            <div className="space-y-2">
              <Label htmlFor="vog-script" className="text-xs text-muted-foreground">Script</Label>
              <Textarea
                id="vog-script"
                placeholder="Enter your announcement script..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-[80px] resize-none bg-background/50"
                disabled={isGenerating}
              />
            </div>

            {/* Voice and Style Selectors */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Voice</Label>
                <Select value={voiceId} onValueChange={setVoiceId} disabled={isGenerating}>
                  <SelectTrigger className="h-9 bg-background/50">
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
              
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Style</Label>
                <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
                  <SelectTrigger className="h-9 bg-background/50">
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

            {/* Generate Button */}
            <div className="flex gap-2">
              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || !script.trim() || !cueId}
                className="flex-1 bg-runway-teal hover:bg-runway-teal/90"
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
                    Generate VOG
                  </>
                )}
              </Button>
            </div>

            {/* Audio Preview Player */}
            {generatedAudioUrl && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <audio
                  ref={audioRef}
                  src={generatedAudioUrl}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={handleAudioLoadedMetadata}
                  onEnded={handleAudioEnded}
                />
                
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9"
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
                      <FileAudio className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium truncate">{generatedFileName}</span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-runway-teal transition-all"
                        style={{ width: `${audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs font-mono text-muted-foreground">
                    {formatDuration(audioProgress)} / {formatDuration(audioDuration)}
                  </div>
                </div>
              </div>
            )}

            {!cueId && (
              <p className="text-xs text-muted-foreground text-center">
                Select a VOG cue to generate audio
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default VOGCreatorPanel;
