import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  ChevronRight, 
  Play, 
  SkipForward, 
  Clock, 
  Plus, 
  Pause, 
  RotateCcw,
  Scissors,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimelineCue {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  time: string;
  duration: string;
  position: number;
  width: number;
}

interface TimelineTrack {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  cues: TimelineCue[];
  expanded: boolean;
}

interface TimelineProps {
  className?: string;
}

const mockTracks: TimelineTrack[] = [
  {
    id: 'track-1',
    name: 'Audio Main',
    type: 'audio',
    expanded: true,
    cues: [
      { id: 'cue-1', name: 'Intro Music', type: 'audio', time: '00:00:00', duration: '0:30', position: 0, width: 120 },
      { id: 'cue-2', name: 'Applause', type: 'audio', time: '00:01:30', duration: '0:10', position: 180, width: 60 },
    ]
  },
  {
    id: 'track-2',
    name: 'Video Wall',
    type: 'video',
    expanded: true,
    cues: [
      { id: 'cue-3', name: 'Opening Video', type: 'video', time: '00:00:10', duration: '1:20', position: 20, width: 160 },
      { id: 'cue-4', name: 'Logo Display', type: 'video', time: '00:02:00', duration: '5:00', position: 240, width: 200 },
    ]
  },
  {
    id: 'track-3',
    name: 'Stage Lighting',
    type: 'lighting',
    expanded: true,
    cues: [
      { id: 'cue-5', name: 'House Lights Down', type: 'lighting', time: '00:00:05', duration: '0:05', position: 10, width: 40 },
      { id: 'cue-6', name: 'Stage Wash', type: 'lighting', time: '00:00:15', duration: '1:45', position: 30, width: 180 },
    ]
  },
  {
    id: 'track-4',
    name: 'Stage Direction',
    type: 'stage',
    expanded: true,
    cues: [
      { id: 'cue-7', name: 'Host Enter', type: 'stage', time: '00:01:00', duration: '0:30', position: 120, width: 80 },
      { id: 'cue-8', name: 'Speaker Introduction', type: 'stage', time: '00:03:00', duration: '0:15', position: 360, width: 60 },
    ]
  },
];

const Timeline: React.FC<TimelineProps> = ({ className }) => {
  const [tracks, setTracks] = useState<TimelineTrack[]>(mockTracks);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCue, setSelectedCue] = useState<string | null>(null);
  const [timelineScale, setTimelineScale] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeInSecondsRef = useRef(0);
  const { toast } = useToast();
  
  const timeToSeconds = (timeString: string): number => {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };
  
  const secondsToTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        timeInSecondsRef.current += 0.1;
        setCurrentTime(secondsToTime(timeInSecondsRef.current));
      }, 100);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying]);
  
  const toggleTrackExpand = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, expanded: !track.expanded } : track
    ));
  };
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    toast({
      title: isPlaying ? "Playback paused" : "Playback started",
      description: `Current time: ${currentTime}`,
    });
  };
  
  const handleNextCue = () => {
    let nextCuePosition = Infinity;
    let nextCueFound = false;
    
    tracks.forEach(track => {
      track.cues.forEach(cue => {
        const cueTimeInSeconds = timeToSeconds(cue.time);
        if (cueTimeInSeconds > timeInSecondsRef.current && cueTimeInSeconds < nextCuePosition) {
          nextCuePosition = cueTimeInSeconds;
          nextCueFound = true;
        }
      });
    });
    
    if (nextCueFound) {
      timeInSecondsRef.current = nextCuePosition;
      setCurrentTime(secondsToTime(nextCuePosition));
      toast({
        title: "Jumped to next cue",
        description: `Time: ${secondsToTime(nextCuePosition)}`,
      });
    } else {
      toast({
        title: "No next cue found",
        description: "You've reached the end of the timeline",
      });
    }
  };
  
  const handleReset = () => {
    timeInSecondsRef.current = 0;
    setCurrentTime('00:00:00');
    setIsPlaying(false);
    toast({
      title: "Timeline reset",
      description: "Playback reset to beginning",
    });
  };
  
  const handleCueClick = (cueId: string) => {
    setSelectedCue(cueId);
    
    let selectedCueDetails: TimelineCue | undefined;
    
    tracks.forEach(track => {
      const found = track.cues.find(cue => cue.id === cueId);
      if (found) selectedCueDetails = found;
    });
    
    if (selectedCueDetails) {
      timeInSecondsRef.current = timeToSeconds(selectedCueDetails.time);
      setCurrentTime(selectedCueDetails.time);
      
      toast({
        title: `Selected: ${selectedCueDetails.name}`,
        description: `${selectedCueDetails.type} cue at ${selectedCueDetails.time}`,
      });
    }
  };
  
  const handleTrackDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const cueType = e.dataTransfer.getData('cueType') as 'audio' | 'video' | 'lighting' | 'stage';
    
    const trackElement = e.currentTarget as HTMLElement;
    const rect = trackElement.getBoundingClientRect();
    const position = e.clientX - rect.left;
    
    const newCue: TimelineCue = {
      id: `cue-${Date.now()}`,
      name: `New ${cueType} Cue`,
      type: cueType,
      time: calculateTimeFromPosition(position),
      duration: '0:30',
      position: position,
      width: 100,
    };
    
    setTracks(tracks.map(track => 
      track.id === trackId 
        ? { ...track, cues: [...track.cues, newCue] } 
        : track
    ));
    
    toast({
      title: "New cue created",
      description: `${newCue.name} added to timeline`,
    });
  };
  
  const calculateTimeFromPosition = (position: number): string => {
    const seconds = Math.floor(position / 100) * 60;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `00:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    const secondsPerPixel = 0.6 / timelineScale;
    const seconds = clickX * secondsPerPixel;
    
    timeInSecondsRef.current = seconds;
    setCurrentTime(secondsToTime(seconds));
  };
  
  const handleSplitCue = () => {
    if (!selectedCue) {
      toast({
        title: "No cue selected",
        description: "Select a cue first to split it",
        variant: "destructive",
      });
      return;
    }
    
    setTracks(currentTracks => {
      return currentTracks.map(track => {
        const cueIndex = track.cues.findIndex(cue => cue.id === selectedCue);
        if (cueIndex === -1) return track;
        
        const cue = track.cues[cueIndex];
        const currentTimeInSeconds = timeToSeconds(currentTime);
        const cueStartInSeconds = timeToSeconds(cue.time);
        
        if (currentTimeInSeconds < cueStartInSeconds || 
            currentTimeInSeconds > cueStartInSeconds + timeToSeconds(cue.duration)) {
          return track;
        }
        
        const firstDuration = secondsToTime(currentTimeInSeconds - cueStartInSeconds);
        const secondDuration = secondsToTime(
          cueStartInSeconds + timeToSeconds(cue.duration) - currentTimeInSeconds
        );
        
        const totalWidth = cue.width;
        const splitRatio = (currentTimeInSeconds - cueStartInSeconds) / timeToSeconds(cue.duration);
        const firstWidth = Math.round(totalWidth * splitRatio);
        const secondWidth = totalWidth - firstWidth;
        
        const firstCue = {
          ...cue,
          width: firstWidth,
          duration: firstDuration,
        };
        
        const secondCue = {
          ...cue,
          id: `cue-${Date.now()}`,
          name: `${cue.name} (split)`,
          position: cue.position + firstWidth,
          width: secondWidth, 
          time: currentTime,
          duration: secondDuration,
        };
        
        const newCues = [...track.cues];
        newCues.splice(cueIndex, 1, firstCue, secondCue);
        
        return {
          ...track,
          cues: newCues,
        };
      });
    });
    
    toast({
      title: "Cue split",
      description: `Cue split at ${currentTime}`,
    });
  };
  
  const addNewTrack = () => {
    const trackTypes: ('audio' | 'video' | 'lighting' | 'stage')[] = ['audio', 'video', 'lighting', 'stage'];
    const randomType = trackTypes[Math.floor(Math.random() * trackTypes.length)];
    
    const newTrack: TimelineTrack = {
      id: `track-${Date.now()}`,
      name: `New ${randomType} Track`,
      type: randomType,
      expanded: true,
      cues: []
    };
    
    setTracks([...tracks, newTrack]);
    
    toast({
      title: "Track added",
      description: `${newTrack.name} added to the timeline`,
    });
  };
  
  const handleZoomIn = () => {
    setTimelineScale(prev => Math.min(prev * 1.2, 3));
  };
  
  const handleZoomOut = () => {
    setTimelineScale(prev => Math.max(prev / 1.2, 0.5));
  };
  
  const getPlayheadPosition = () => {
    return timeInSecondsRef.current * (100 * timelineScale / 60);
  };
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant="secondary" 
            className="gap-1"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1"
            onClick={handleNextCue}
          >
            <SkipForward size={14} />
            Next Cue
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1"
            onClick={handleReset}
          >
            <RotateCcw size={14} />
            Reset
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={handleSplitCue}
          >
            <Scissors size={14} />
            Split
          </Button>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
          >
            <ZoomOut size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
          >
            <ZoomIn size={14} />
          </Button>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-1">
          <Clock size={16} className="text-muted-foreground" />
          <span className="text-sm font-mono">{currentTime}</span>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 border-r border-border overflow-y-auto">
          {tracks.map(track => (
            <div key={track.id} className="border-b border-border">
              <div 
                className={cn(
                  "flex items-center px-3 py-2 hover:bg-muted cursor-pointer",
                  track.expanded ? "bg-muted/50" : ""
                )}
                onClick={() => toggleTrackExpand(track.id)}
              >
                {track.expanded ? 
                  <ChevronDown size={16} className="mr-2 text-muted-foreground" /> : 
                  <ChevronRight size={16} className="mr-2 text-muted-foreground" />
                }
                <span className="font-medium">{track.name}</span>
              </div>
            </div>
          ))}
          <Button 
            variant="ghost" 
            className="w-full justify-start mt-2 ml-2"
            onClick={addNewTrack}
          >
            <Plus size={16} className="mr-2" />
            Add Track
          </Button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="h-8 border-b border-border sticky top-0 bg-background pl-2 flex items-end text-xs text-muted-foreground">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="absolute" style={{ 
                left: `${i * 100 * timelineScale}px` 
              }}>
                <div className="h-2 border-l border-border"></div>
                <div>{`${i * 60}s`}</div>
              </div>
            ))}
          </div>
          
          <div className="relative">
            <div 
              className="absolute h-full border-l-2 border-red-500 z-10 pointer-events-none" 
              style={{ 
                left: `${getPlayheadPosition()}px`,
                top: '0'
              }}
            />
            
            <ScrollArea className="h-[calc(100vh-12rem)]" onClick={handleTimelineClick}>
              <div ref={timelineRef} className="relative min-h-full min-w-[1000px]">
                {tracks.map(track => (
                  <div key={track.id} className="relative">
                    <div 
                      className={cn(
                        "runway-timeline-track h-16 border-b border-border relative",
                        track.type === 'audio' && "bg-runway-teal/10",
                        track.type === 'video' && "bg-runway-success/10",
                        track.type === 'lighting' && "bg-runway-highlight/10",
                        track.type === 'stage' && "bg-runway-warning/10"
                      )}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleTrackDrop(e, track.id)}
                    >
                      {track.cues.map(cue => (
                        <div
                          key={cue.id}
                          className={cn(
                            "runway-cue absolute top-2 h-12 p-1 rounded border overflow-hidden cursor-pointer text-xs",
                            `runway-cue-${cue.type}`,
                            cue.type === 'audio' && "bg-runway-teal/80 border-runway-teal",
                            cue.type === 'video' && "bg-runway-success/80 border-runway-success",
                            cue.type === 'lighting' && "bg-runway-highlight/80 border-runway-highlight",
                            cue.type === 'stage' && "bg-runway-warning/80 border-runway-warning",
                            selectedCue === cue.id && "ring-2 ring-white"
                          )}
                          style={{ 
                            left: `${cue.position * timelineScale}px`, 
                            width: `${cue.width * timelineScale}px`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCueClick(cue.id);
                          }}
                        >
                          <div className="font-medium truncate">{cue.name}</div>
                          <div className="text-xs opacity-90 truncate">{cue.time} ({cue.duration})</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
