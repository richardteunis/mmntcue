
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Play, SkipForward, Clock, Plus, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  
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
    toast({
      title: "Next cue triggered",
      description: "Moving to the next cue in the timeline",
    });
  };
  
  const handleReset = () => {
    setCurrentTime('00:00:00');
    setIsPlaying(false);
    toast({
      title: "Timeline reset",
      description: "Playback reset to beginning",
    });
  };
  
  const handleCueClick = (cueId: string) => {
    setSelectedCue(cueId);
    
    // Find the cue to show its details
    let selectedCueDetails: TimelineCue | undefined;
    
    tracks.forEach(track => {
      const found = track.cues.find(cue => cue.id === cueId);
      if (found) selectedCueDetails = found;
    });
    
    if (selectedCueDetails) {
      toast({
        title: `Selected: ${selectedCueDetails.name}`,
        description: `${selectedCueDetails.type} cue at ${selectedCueDetails.time}`,
      });
    }
  };
  
  const handleTrackDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const cueType = e.dataTransfer.getData('cueType') as 'audio' | 'video' | 'lighting' | 'stage';
    
    // Calculate drop position
    const trackElement = e.currentTarget as HTMLElement;
    const rect = trackElement.getBoundingClientRect();
    const position = e.clientX - rect.left;
    
    // Create a new cue
    const newCue: TimelineCue = {
      id: `cue-${Date.now()}`,
      name: `New ${cueType} Cue`,
      type: cueType,
      time: calculateTimeFromPosition(position),
      duration: '0:30',
      position: position,
      width: 100,
    };
    
    // Add to track
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
    // Convert position to seconds (simple calculation for example)
    const seconds = Math.floor(position / 100) * 60;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `00:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-2 p-2 border-b border-border">
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
        
        <div className="ml-4 flex items-center gap-1">
          <Clock size={16} className="text-muted-foreground" />
          <span className="text-sm font-mono">{currentTime}</span>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 border-r border-border overflow-y-auto">
          {tracks.map(track => (
            <div key={track.id} className="border-b border-border">
              <div 
                className="flex items-center px-3 py-2 hover:bg-muted cursor-pointer"
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
        
        <div className="flex-1 overflow-auto relative">
          {/* Timeline header with time markers */}
          <div className="h-8 border-b border-border sticky top-0 bg-background pl-2 flex items-end text-xs text-muted-foreground">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="absolute" style={{ left: `${i * 100}px` }}>
                <div className="h-2 border-l border-border"></div>
                <div>{`${i * 60}s`}</div>
              </div>
            ))}
          </div>
          
          {/* Timeline tracks */}
          <div>
            {tracks.map(track => (
              <div key={track.id} className="relative">
                <div 
                  className="runway-timeline-track" 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleTrackDrop(e, track.id)}
                >
                  {track.cues.map(cue => (
                    <div
                      key={cue.id}
                      className={cn(
                        "runway-cue absolute",
                        `runway-cue-${cue.type}`,
                        selectedCue === cue.id && "ring-2 ring-white"
                      )}
                      style={{ 
                        left: `${cue.position}px`, 
                        width: `${cue.width}px`,
                      }}
                      onClick={() => handleCueClick(cue.id)}
                    >
                      {cue.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
