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
  ZoomOut,
  Save,
  Copy,
  Trash2,
  PlusCircle,
  Layers,
  Zap,
  Wand2,
  PenLine,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

export interface TimelineCue {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  time: string;
  duration: string;
  position: number;
  width: number;
  notes?: string;
  effects?: string[];
  autoFollow?: boolean;
  color?: string;
  track?: string;
}

interface TimelineTrack {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  cues: TimelineCue[];
  expanded: boolean;
  muted?: boolean;
  solo?: boolean;
  locked?: boolean;
}

export interface TimelineProps {
  className?: string;
  onCueSelect?: (cueId: string | null, cue: TimelineCue | null) => void;
  selectedCueId?: string | null;
  onCueChange?: (updatedCue: TimelineCue) => void;
  selectedCue?: TimelineCue | null;
}

const mockTracks: TimelineTrack[] = [
  {
    id: 'track-1',
    name: 'Audio Main',
    type: 'audio',
    expanded: true,
    cues: [
      { 
        id: 'cue-1', 
        name: 'Intro Music', 
        type: 'audio', 
        time: '00:00:00', 
        duration: '0:30', 
        position: 0, 
        width: 120,
        track: 'Audio Main',
        color: 'bg-runway-teal',
        autoFollow: false,
        notes: 'Fade in gradually with the lights.',
        effects: ['fade-in', 'crossfade']
      },
      { 
        id: 'cue-2', 
        name: 'Applause', 
        type: 'audio', 
        time: '00:01:30', 
        duration: '0:10', 
        position: 180, 
        width: 60,
        track: 'Audio Main',
        color: 'bg-runway-teal',
        notes: '',
        effects: []
      },
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

const Timeline: React.FC<TimelineProps> = ({ 
  className, 
  onCueSelect, 
  selectedCueId,
  onCueChange,
  selectedCue
}) => {
  const [tracks, setTracks] = useState<TimelineTrack[]>(mockTracks);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineScale, setTimelineScale] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [trackFilters, setTrackFilters] = useState<string[]>([]);
  const [showTimelineGrid, setShowTimelineGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
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
    let selectedCueDetails: TimelineCue | null = null;
    
    tracks.forEach(track => {
      const found = track.cues.find(cue => cue.id === cueId);
      if (found) {
        selectedCueDetails = {
          ...found,
          track: track.name
        };
      }
    });
    
    if (onCueSelect) {
      onCueSelect(cueId, selectedCueDetails);
    }
    
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
  
  const addNewTrack = (type?: 'audio' | 'video' | 'lighting' | 'stage') => {
    const trackTypes: ('audio' | 'video' | 'lighting' | 'stage')[] = ['audio', 'video', 'lighting', 'stage'];
    const randomType = type || trackTypes[Math.floor(Math.random() * trackTypes.length)];
    
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
    setTimelineScale(prev => {
      const newScale = Math.min(prev * 1.2, 3);
      toast({
        title: "Timeline zoomed in",
        description: `Current zoom: ${Math.round(newScale * 100)}%`,
      });
      return newScale;
    });
  };
  
  const handleZoomOut = () => {
    setTimelineScale(prev => {
      const newScale = Math.max(prev / 1.2, 0.5);
      toast({
        title: "Timeline zoomed out",
        description: `Current zoom: ${Math.round(newScale * 100)}%`,
      });
      return newScale;
    });
  };
  
  const toggleTrackMute = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, muted: !track.muted } : track
    ));
    
    const trackName = tracks.find(track => track.id === trackId)?.name;
    toast({
      title: "Track muted",
      description: `${trackName} ${tracks.find(track => track.id === trackId)?.muted ? 'unmuted' : 'muted'}`,
    });
  };
  
  const toggleTrackSolo = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, solo: !track.solo } : track
    ));
    
    const trackName = tracks.find(track => track.id === trackId)?.name;
    toast({
      title: "Track soloed",
      description: `${trackName} ${tracks.find(track => track.id === trackId)?.solo ? 'unsoloed' : 'soloed'}`,
    });
  };
  
  const toggleTrackLock = (trackId: string) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, locked: !track.locked } : track
    ));
    
    const trackName = tracks.find(track => track.id === trackId)?.name;
    toast({
      title: "Track locked",
      description: `${trackName} ${tracks.find(track => track.id === trackId)?.locked ? 'unlocked' : 'locked'}`,
    });
  };
  
  const duplicateCue = (cueId: string) => {
    if (!cueId) return;
    
    setTracks(currentTracks => {
      return currentTracks.map(track => {
        const cueIndex = track.cues.findIndex(cue => cue.id === cueId);
        if (cueIndex === -1) return track;
        
        const cue = track.cues[cueIndex];
        const newCue = {
          ...cue,
          id: `cue-${Date.now()}`,
          name: `${cue.name} (copy)`,
          position: cue.position + cue.width + 10
        };
        
        return {
          ...track,
          cues: [...track.cues, newCue]
        };
      });
    });
    
    toast({
      title: "Cue duplicated",
      description: "A copy of the cue has been created",
    });
  };
  
  const deleteCue = (cueId: string) => {
    if (!cueId) return;
    
    let deletedCueName = '';
    
    setTracks(currentTracks => {
      return currentTracks.map(track => {
        const cueIndex = track.cues.findIndex(cue => cue.id === cueId);
        if (cueIndex === -1) return track;
        
        deletedCueName = track.cues[cueIndex].name;
        
        return {
          ...track,
          cues: track.cues.filter(cue => cue.id !== cueId)
        };
      });
    });
    
    if (selectedCue === cueId) {
      setSelectedCue(null);
    }
    
    toast({
      title: "Cue deleted",
      description: `${deletedCueName} has been removed`,
      variant: "destructive",
    });
  };
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!selectedCue) return;
    
    if (e.key === "Delete") {
      deleteCue(selectedCue);
    }
    
    if (e.key === "d" && e.ctrlKey) {
      e.preventDefault();
      duplicateCue(selectedCue);
    }
    
    if (e.key === "x" && e.ctrlKey) {
      deleteCue(selectedCue);
    }
  };
  
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedCue]);
  
  const filteredTracks = tracks.filter(track => {
    const matchesSearch = searchFilter === '' || 
      track.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      track.cues.some(cue => cue.name.toLowerCase().includes(searchFilter.toLowerCase()));
    
    const matchesType = trackFilters.length === 0 || trackFilters.includes(track.type);
    
    return matchesSearch && matchesType;
  });
  
  const toggleTrackFilter = (type: 'audio' | 'video' | 'lighting' | 'stage') => {
    setTrackFilters(current => {
      if (current.includes(type)) {
        return current.filter(t => t !== type);
      } else {
        return [...current, type];
      }
    });
  };
  
  const getFilterButtonClass = (type: 'audio' | 'video' | 'lighting' | 'stage') => {
    const baseClass = "px-2 py-1 text-xs rounded";
    const isActive = trackFilters.includes(type);
    
    switch (type) {
      case 'audio':
        return cn(baseClass, isActive ? "bg-runway-teal text-white" : "bg-runway-teal/20 hover:bg-runway-teal/30");
      case 'video':
        return cn(baseClass, isActive ? "bg-runway-success text-white" : "bg-runway-success/20 hover:bg-runway-success/30");
      case 'lighting':
        return cn(baseClass, isActive ? "bg-runway-highlight text-white" : "bg-runway-highlight/20 hover:bg-runway-highlight/30");
      case 'stage':
        return cn(baseClass, isActive ? "bg-runway-warning text-white" : "bg-runway-warning/20 hover:bg-runway-warning/30");
    }
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
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1"
                onClick={handleNextCue}
              >
                <SkipForward size={14} />
                Next Cue
              </Button>
            </TooltipTrigger>
            <TooltipContent>Jump to next cue (Shift+Right)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1"
                onClick={handleReset}
              >
                <RotateCcw size={14} />
                Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset timeline (Home)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={handleSplitCue}
              >
                <Scissors size={14} />
                Split
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split selected cue at current time (S)</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomOut}
              >
                <ZoomOut size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out (Ctrl+-)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomIn}
              >
                <ZoomIn size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in (Ctrl++)</TooltipContent>
          </Tooltip>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              placeholder="Search tracks and cues..."
              className="h-8 w-64 pl-8"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            <Filter size={14} className="absolute left-2.5 top-2 text-muted-foreground" />
            {searchFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => setSearchFilter('')}
              >
                <ChevronDown size={14} />
              </Button>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className={getFilterButtonClass('audio')}
              onClick={() => toggleTrackFilter('audio')}
            >
              Audio
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={getFilterButtonClass('video')}
              onClick={() => toggleTrackFilter('video')}
            >
              Video
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={getFilterButtonClass('lighting')}
              onClick={() => toggleTrackFilter('lighting')}
            >
              Lighting
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={getFilterButtonClass('stage')}
              onClick={() => toggleTrackFilter('stage')}
            >
              Stage
            </Button>
          </div>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-1">
          <Clock size={16} className="text-muted-foreground" />
          <span className="text-sm font-mono">{currentTime}</span>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 border-r border-border overflow-y-auto">
          <div className="sticky top-0 z-10 bg-background backdrop-blur bg-opacity-80">
            <div className="flex justify-between items-center px-3 py-2 border-b border-border">
              <span className="font-semibold">Tracks</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <PlusCircle size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => addNewTrack('audio')}>
                    <div className="w-2 h-2 rounded-full bg-runway-teal mr-2" />
                    Audio Track
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addNewTrack('video')}>
                    <div className="w-2 h-2 rounded-full bg-runway-success mr-2" />
                    Video Track
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addNewTrack('lighting')}>
                    <div className="w-2 h-2 rounded-full bg-runway-highlight mr-2" />
                    Lighting Track
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addNewTrack('stage')}>
                    <div className="w-2 h-2 rounded-full bg-runway-warning mr-2" />
                    Stage Track
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {filteredTracks.map(track => (
            <div key={track.id} className="border-b border-border">
              <div 
                className={cn(
                  "flex items-center px-3 py-2 hover:bg-muted cursor-pointer",
                  track.expanded ? "bg-muted/50" : ""
                )}
              >
                <div 
                  className="flex-1 flex items-center"
                  onClick={() => toggleTrackExpand(track.id)}
                >
                  {track.expanded ? 
                    <ChevronDown size={16} className="mr-2 text-muted-foreground" /> : 
                    <ChevronRight size={16} className="mr-2 text-muted-foreground" />
                  }
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mr-2",
                      track.type === 'audio' && "bg-runway-teal",
                      track.type === 'video' && "bg-runway-success",
                      track.type === 'lighting' && "bg-runway-highlight",
                      track.type === 'stage' && "bg-runway-warning",
                    )}
                  />
                  <span className={cn(
                    "font-medium",
                    track.muted && "text-muted-foreground line-through",
                    track.locked && "text-muted-foreground"
                  )}>
                    {track.name}
                  </span>
                </div>
                
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-6 w-6 p-0", track.muted && "text-destructive")}
                        onClick={() => toggleTrackMute(track.id)}
                      >
                        <Zap size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{track.muted ? "Unmute" : "Mute"}</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-6 w-6 p-0", track.solo && "text-amber-400")}
                        onClick={() => toggleTrackSolo(track.id)}
                      >
                        <Wand2 size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{track.solo ? "Unsolo" : "Solo"}</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-6 w-6 p-0", track.locked && "text-amber-500")}
                        onClick={() => toggleTrackLock(track.id)}
                      >
                        <PenLine size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{track.locked ? "Unlock" : "Lock"}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              {track.expanded && (
                <div className="pl-8 pr-2 py-1 bg-muted/30 text-xs text-muted-foreground">
                  {track.cues.length} cues · {track.type}
                </div>
              )}
            </div>
          ))}
          
          <Button 
            variant="ghost" 
            className="w-full justify-start mt-2 ml-2"
            onClick={() => addNewTrack()}
          >
            <Plus size={16} className="mr-2" />
            Add Track
          </Button>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
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
                {filteredTracks.map(track => (
                  <div key={track.id} className="relative">
                    <div 
                      className={cn(
                        "runway-timeline-track h-16 border-b border-border relative",
                        track.type === 'audio' && "bg-runway-teal/10",
                        track.type === 'video' && "bg-runway-success/10",
                        track.type === 'lighting' && "bg-runway-highlight/10",
                        track.type === 'stage' && "bg-runway-warning/10",
                        track.muted && "opacity-50",
                        track.locked && "bg-muted/20"
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
                            selectedCueId === cue.id && "ring-2 ring-white"
                          )}
                          style={{ 
                            left: `${cue.position * timelineScale}px`, 
                            width: `${cue.width * timelineScale}px`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCueClick(cue.id);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleCueClick(cue.id);
                          }}
                          draggable={!tracks.find(t => t.id === track.id)?.locked}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('cueId', cue.id);
                            e.dataTransfer.setData('sourceTrackId', track.id);
                          }}
                        >
                          <div className="font-medium truncate">{cue.name}</div>
                          <div className="text-xs opacity-90 truncate">{cue.time} ({cue.duration})</div>
                        </div>
                      ))}
                      
                      {showTimelineGrid && (
                        <div className="absolute inset-0 pointer-events-none">
                          {Array.from({ length: 30 }).map((_, i) => (
                            <div 
                              key={i}
                              className="absolute h-full border-l border-border/20"
                              style={{ left: `${i * 30 * timelineScale}px` }}
                            ></div>
                          ))}
                        </div>
                      )}
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
