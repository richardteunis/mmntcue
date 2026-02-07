import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Mic2, 
  Play, 
  Pause, 
  RefreshCw, 
  Loader2, 
  Volume2, 
  Download, 
  Save,
  Maximize2,
  Settings2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VOGPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId?: string | null;
  cueId?: string | null;
  cueName?: string;
  onGenerated?: (audioUrl: string, audioBlob: Blob) => void;
  onAttachToCue?: (audioBlob: Blob, fileName: string) => void;
}

// ElevenLabs voices
const VOICES = [
  { id: 'george', name: 'George', description: 'British, warm, professional' },
  { id: 'roger', name: 'Roger', description: 'American, authoritative' },
  { id: 'sarah', name: 'Sarah', description: 'American, friendly, clear' },
  { id: 'brian', name: 'Brian', description: 'American, deep, announcer' },
  { id: 'daniel', name: 'Daniel', description: 'British, calm, narrator' },
  { id: 'lily', name: 'Lily', description: 'British, soft, elegant' },
  { id: 'alice', name: 'Alice', description: 'British, young, warm' },
  { id: 'charlie', name: 'Charlie', description: 'Australian, casual' },
  { id: 'eric', name: 'Eric', description: 'American, friendly, conversational' },
  { id: 'jessica', name: 'Jessica', description: 'American, expressive' },
  { id: 'matilda', name: 'Matilda', description: 'American, warm, friendly' },
  { id: 'chris', name: 'Chris', description: 'American, casual, narrator' },
];

const VOGPanel: React.FC<VOGPanelProps> = ({
  open,
  onOpenChange,
  showId,
  cueId,
  cueName,
  onGenerated,
  onAttachToCue,
}) => {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [script, setScript] = useState('');
  const [voiceId, setVoiceId] = useState('george');
  const [stability, setStability] = useState([0.5]);
  const [style, setStyle] = useState([0.5]);
  const [speed, setSpeed] = useState([1.0]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);

  const handleGenerate = useCallback(async () => {
    if (!script.trim()) {
      toast({
        title: 'Script required',
        description: 'Please enter a script to generate audio',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: script,
            voiceId,
            stability: stability[0],
            style: style[0],
            speed: speed[0],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Generation failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Clean up previous URL
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
      
      setGeneratedAudioUrl(audioUrl);
      setGeneratedBlob(audioBlob);
      onGenerated?.(audioUrl, audioBlob);
      
      toast({
        title: 'Audio generated',
        description: 'Your VOG audio has been created successfully',
      });
    } catch (error) {
      console.error('TTS generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate audio',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [script, voiceId, stability, style, speed, generatedAudioUrl, onGenerated, toast]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !generatedAudioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, generatedAudioUrl]);

  const handleDownload = useCallback(() => {
    if (!generatedBlob) return;
    
    const url = URL.createObjectURL(generatedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vog-${cueName || 'audio'}-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: 'Audio file has been downloaded',
    });
  }, [generatedBlob, cueName, toast]);

  const handleAttachToCue = useCallback(() => {
    if (!generatedBlob || !cueId) return;
    
    const fileName = `VOG-${cueName || 'Announcement'}.mp3`;
    onAttachToCue?.(generatedBlob, fileName);
    
    toast({
      title: 'Attached to cue',
      description: `Audio attached to ${cueName || 'selected cue'}`,
    });
  }, [generatedBlob, cueId, cueName, onAttachToCue, toast]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedVoice = VOICES.find(v => v.id === voiceId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-[440px] sm:max-w-[440px] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic2 className="h-4 w-4 text-runway-teal" />
              <SheetTitle className="text-base">Voice of God</SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Script Input */}
            <div className="space-y-2">
              <Label htmlFor="vog-script" className="text-sm font-medium">Script</Label>
              <Textarea
                id="vog-script"
                placeholder="Enter your announcement script...

Example: Ladies and gentlemen, please welcome to the stage our keynote speaker, Tony Lamb!"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-[140px] resize-none"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                {script.length} characters • ~{Math.ceil(script.length / 15)} seconds
              </p>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Voice</Label>
              <Select value={voiceId} onValueChange={setVoiceId} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue>
                    {selectedVoice && (
                      <div className="flex items-center gap-2">
                        <span>{selectedVoice.name}</span>
                        <span className="text-xs text-muted-foreground">• {selectedVoice.description}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{voice.name}</span>
                        <span className="text-xs text-muted-foreground">{voice.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voice Settings */}
            <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Voice Settings
              </h4>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Stability</span>
                    <span className="text-muted-foreground">{Math.round(stability[0] * 100)}%</span>
                  </div>
                  <Slider
                    value={stability}
                    onValueChange={setStability}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={isGenerating}
                  />
                  <p className="text-[10px] text-muted-foreground">Lower = more expressive, Higher = more consistent</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Style Intensity</span>
                    <span className="text-muted-foreground">{Math.round(style[0] * 100)}%</span>
                  </div>
                  <Slider
                    value={style}
                    onValueChange={setStyle}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Speed</span>
                    <span className="text-muted-foreground">{speed[0].toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={speed}
                    onValueChange={setSpeed}
                    min={0.7}
                    max={1.2}
                    step={0.05}
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>

            {/* Audio Preview Player */}
            {generatedAudioUrl && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
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
                    className="h-10 w-10 rounded-full bg-runway-teal/10 hover:bg-runway-teal/20"
                    onClick={togglePlayback}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 text-runway-teal" />
                    ) : (
                      <Play className="h-5 w-5 text-runway-teal" />
                    )}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-runway-teal transition-all"
                        style={{ width: `${audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-sm font-mono text-muted-foreground min-w-[70px] text-right">
                    {formatDuration(audioProgress)} / {formatDuration(audioDuration)}
                  </div>
                </div>

                {/* Audio Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Download
                  </Button>
                  {cueId && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-runway-teal hover:bg-runway-teal/90"
                      onClick={handleAttachToCue}
                    >
                      <Save className="h-4 w-4 mr-1.5" />
                      Attach to Cue
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer / Generate Button */}
        <div className="p-4 border-t border-border bg-muted/30">
          <Button 
            className="w-full bg-runway-teal hover:bg-runway-teal/90"
            onClick={handleGenerate}
            disabled={isGenerating || !script.trim()}
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
                Generate Audio
              </>
            )}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Powered by ElevenLabs
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VOGPanel;
