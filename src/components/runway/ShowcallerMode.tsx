import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Cue } from '@/types/cue';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShowcallerModeProps {
  cues: Cue[];
  currentCueIndex: number;
  isPlaying: boolean;
  currentTime: string;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onReset: () => void;
  onGo: () => void;
  onClose: () => void;
}

const ShowcallerMode: React.FC<ShowcallerModeProps> = ({
  cues,
  currentCueIndex,
  isPlaying,
  currentTime,
  onPlay,
  onPause,
  onNext,
  onReset,
  onGo,
  onClose,
}) => {
  const [safeMode, setSafeMode] = useState(true);
  const [confirmGo, setConfirmGo] = useState(false);

  const currentCue = cues[currentCueIndex];
  const nextCue = cues[currentCueIndex + 1];

  const handleGo = () => {
    if (safeMode && !confirmGo) {
      setConfirmGo(true);
      setTimeout(() => setConfirmGo(false), 3000);
    } else {
      onGo();
      setConfirmGo(false);
    }
  };

  const getCueTypeColor = (type: string) => {
    switch (type) {
      case 'audio': return 'bg-runway-teal';
      case 'video': return 'bg-runway-success';
      case 'lighting': return 'bg-runway-highlight';
      case 'stage': return 'bg-runway-warning';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-1.5 font-mono">
            <Clock className="h-4 w-4 mr-2" />
            {currentTime}
          </Badge>
          <div className="flex items-center gap-2">
            <Switch 
              id="safe-mode" 
              checked={safeMode} 
              onCheckedChange={setSafeMode}
            />
            <Label htmlFor="safe-mode" className="flex items-center gap-1.5 cursor-pointer">
              <AlertTriangle className={cn("h-4 w-4", safeMode ? "text-runway-warning" : "text-muted-foreground")} />
              Safe Mode
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Current Cue Panel */}
        <div className="flex-1 p-8 flex flex-col">
          <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Current Cue</div>
          {currentCue ? (
            <Card className="flex-1 bg-card/50 border-2 border-primary/30">
              <CardContent className="h-full flex flex-col justify-center items-center p-8">
                <Badge className={cn("mb-4 text-base px-4 py-1", getCueTypeColor(currentCue.type))}>
                  {currentCue.type.toUpperCase()}
                </Badge>
                <h1 className="text-5xl font-bold text-center mb-4 leading-tight">
                  {currentCue.name}
                </h1>
                <div className="flex items-center gap-4 text-2xl text-muted-foreground font-mono">
                  <span>{currentCue.start_time}</span>
                  <ArrowRight className="h-5 w-5" />
                  <span>{currentCue.duration}</span>
                </div>
                {currentCue.notes && (
                  <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-xl text-center">
                    <p className="text-lg text-muted-foreground">{currentCue.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <p className="text-xl">No active cue</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Divider */}
        <Separator orientation="vertical" className="h-auto" />

        {/* Next Cue Panel */}
        <div className="w-[400px] p-8 flex flex-col bg-muted/30">
          <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Up Next</div>
          {nextCue ? (
            <Card className="bg-card/30 border border-border/50">
              <CardContent className="p-6">
                <Badge className={cn("mb-3", getCueTypeColor(nextCue.type))} variant="outline">
                  {nextCue.type}
                </Badge>
                <h2 className="text-2xl font-semibold mb-2">{nextCue.name}</h2>
                <div className="flex items-center gap-2 text-muted-foreground font-mono">
                  <Clock className="h-4 w-4" />
                  <span>{nextCue.start_time}</span>
                </div>
                {nextCue.notes && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{nextCue.notes}</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/30 border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-runway-success" />
                <p>End of show</p>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Cues List */}
          <div className="mt-6 flex-1">
            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Coming Up</div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {cues.slice(currentCueIndex + 2, currentCueIndex + 6).map((cue, idx) => (
                  <div key={cue.id} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                    <span className="text-xs font-mono text-muted-foreground w-8">+{idx + 2}</span>
                    <div className={cn("w-2 h-2 rounded-full", getCueTypeColor(cue.type))} />
                    <span className="text-sm truncate flex-1">{cue.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{cue.start_time}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="h-32 border-t border-border bg-card flex items-center justify-center gap-6 px-8">
        <Button
          variant="outline"
          size="lg"
          className="h-16 px-8"
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? (
            <>
              <Pause className="h-6 w-6 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-6 w-6 mr-2" />
              Play
            </>
          )}
        </Button>

        <Button
          size="lg"
          className={cn(
            "h-20 px-16 text-2xl font-bold transition-all",
            confirmGo 
              ? "bg-runway-warning hover:bg-runway-warning/90 animate-pulse" 
              : "bg-runway-success hover:bg-runway-success/90"
          )}
          onClick={handleGo}
        >
          {confirmGo ? (
            <>
              <AlertTriangle className="h-8 w-8 mr-3" />
              CONFIRM GO
            </>
          ) : (
            <>
              <ChevronRight className="h-8 w-8 mr-2" />
              GO
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-16 px-8"
          onClick={onNext}
        >
          <SkipForward className="h-6 w-6 mr-2" />
          Skip
        </Button>
      </div>
    </div>
  );
};

export default ShowcallerMode;
