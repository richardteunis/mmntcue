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
  Filter,
  Move,
  Undo2,
  ClipboardCopy,
  ClipboardPaste,
  Lock,
  Pencil
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

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  cues: TimelineCue[];
  expanded: boolean;
  muted?: boolean;
  solo?: boolean;
  locked?: boolean;
  color?: string;
}

export interface TimelineProps {
  className?: string;
  onCueSelect?: (cueId: string | null, cue: TimelineCue | null) => void;
  selectedCueId?: string | null;
  onCueChange?: (updatedCue: TimelineCue) => void;
  selectedCue?: TimelineCue | null;
  cues?: TimelineCue[];
  tracks?: TimelineTrack[];
  onTrackEdit?: (trackId: string) => void;
  onAddTrack?: () => void;
  setIsInEditMode?: (isInEditMode: boolean) => void;
}

interface DeletedCue {
  cue: TimelineCue;
  trackId: string;
  index: number;
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
  selectedCue,
  cues,
  tracks: propTracks,
  onTrackEdit,
  onAddTrack,
  setIsInEditMode
}) => {
  const [tracks, setTracks] = useState<TimelineTrack[]>(propTracks || mockTracks);
  
  useEffect(() => {
    if (propTracks) {
      setTracks(propTracks);
    }
  }, [propTracks]);
  
  useEffect(() => {
    if (cues && cues.length > 0) {
      const trackMap = new Map<string, TimelineCue[]>();
      
      cues.forEach(cue => {
        const trackName = cue.track || 'Default Track';
        if (!trackMap.has(trackName)) {
          trackMap.set(trackName, []);
        }
        const trackCues = trackMap.get(trackName);
        if (trackCues) {
          trackCues.push(cue);
        }
      });
      
      if (!propTracks) {
        const updatedTracks = Array.from(trackMap.entries()).map(([trackName, trackCues]) => {
          const existingTrack = tracks.find(t => t.name === trackName);
          
          let trackType: 'audio' | 'video' | 'lighting' | 'stage' = 'audio';
          if (trackCues.length > 0) {
            trackType = trackCues[0].type;
          } else if (existingTrack) {
            trackType = existingTrack.type;
          }
          
          return {
            id: existingTrack?.id || `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: trackName,
            type: trackType,
            cues: trackCues,
            expanded: existingTrack?.expanded ?? true,
            muted: existingTrack?.muted ?? false,
            solo: existingTrack?.solo ?? false,
            locked: existingTrack?.locked ?? false,
            color: existingTrack?.color
          };
        });
        
        setTracks(updatedTracks);
      } else {
        setTracks(prevTracks => 
          prevTracks.map(track => {
            const trackCues = trackMap.get(track.name) || [];
            return { ...track, cues: trackCues };
          })
        );
      }
    }
  }, [cues, propTracks]);
  
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineScale, setTimelineScale] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [trackFilters, setTrackFilters] = useState<string[]>([]);
  const [showTimelineGrid, setShowTimelineGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isPanModeActive, setIsPanModeActive] = useState(false);
  const [draggedCue, setDraggedCue] = useState<{ cueId: string, startX: number, initialPosition: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeInSecondsRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingTimelineRef = useRef(false);
  const lastClientXRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const lastPinchDistanceRef = useRef(0);
  const isPinchingRef = useRef(false);
  const { toast } = useToast();
  const [deletedCues, setDeletedCues] = useState<DeletedCue[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [copiedCue, setCopiedCue] = useState<TimelineCue | null>(null);
  
  useEffect(() => {
    setCanUndo(deletedCues.length > 0);
  }, [deletedCues]);
  
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
      let lastTimestamp = performance.now();
      
      const animate = (timestamp: number) => {
        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        
        timeInSecondsRef.current += deltaTime / 1000;
        setCurrentTime(secondsToTime(timeInSecondsRef.current));
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
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
    const cueId = e.dataTransfer.getData('cueId');
    const sourceTrackId = e.dataTransfer.getData('sourceTrackId');
    const cueType = e.dataTransfer.getData('cueType') as 'audio' | 'video' | 'lighting' | 'stage';
    
    const trackElement = e.currentTarget as HTMLElement;
    const rect = trackElement.getBoundingClientRect();
    const position = e.clientX - rect.left;
    
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    // If it's a cue being moved
    if (cueId && sourceTrackId) {
      let movedCue: TimelineCue | null = null;
      let sourceTrack: TimelineTrack | null = null;
      
      // Find the cue in the tracks
      for (const t of tracks) {
        if (t.id === sourceTrackId) {
          sourceTrack = t;
          movedCue = t.cues.find(c => c.id === cueId) || null;
          break;
        }
      }
      
      if (movedCue && sourceTrack) {
        // Update cue position
        const updatedCue: TimelineCue = {
          ...movedCue,
          position: position,
          time: calculateTimeFromPosition(position),
          track: track.name
        };
        
        if (onCueChange) {
          onCueChange(updatedCue);
        }
        
        toast({
          title: "Cue moved",
          description: `${movedCue.name} moved to position ${updatedCue.time}`,
        });
      }
      return;
    }
    
    // If it's a new cue being created
    const newCue: TimelineCue = {
      id: `cue-${Date.now()}`,
      name: `New ${cueType} Cue`,
      type: cueType,
      time: calculateTimeFromPosition(position),
      duration: '0:30',
      position: position,
      width: 100,
      track: track.name,
      effects: [],
      notes: '',
      autoFollow: false,
      color: track.type === 'audio' ? 'bg-runway-teal' : 
             track.type === 'video' ? 'bg-runway-success' :
             track.type === 'lighting' ? 'bg-runway-highlight' : 'bg-runway-warning'
    };
    
    if (onCueChange) {
      onCueChange(newCue);
    } else {
      setTracks(tracks.map(t => 
        t.id === trackId 
          ? { ...t, cues: [...t.cues, newCue] } 
          : t
      ));
    }
    
    document.dispatchEvent(new CustomEvent('timeline-add-cue', { 
      detail: { cue: newCue }
    }));
    
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
  
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    setIsPlaying(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    document.addEventListener('mousemove', handlePlayheadMouseMove);
    document.addEventListener('mouseup', handlePlayheadMouseUp);
  };
  
  const handlePlayheadMouseMove = (e: MouseEvent) => {
    if (!isDraggingPlayhead || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const moveX = Math.max(0, e.clientX - rect.left);
    
    const secondsPerPixel = 0.6 / timelineScale;
    const seconds = moveX * secondsPerPixel;
    
    timeInSecondsRef.current = seconds;
    setCurrentTime(secondsToTime(seconds));
  };
  
  const handlePlayheadMouseUp = () => {
    setIsDraggingPlayhead(false);
    
    document.removeEventListener('mousemove', handlePlayheadMouseMove);
    document.removeEventListener('mouseup', handlePlayheadMouseUp);
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
        const cueIndex = track.cues.findIndex(cue => cue.id === selectedCue.id);
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
    if (onAddTrack) {
      onAddTrack();
      return;
    }
    
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
  
  const handleEditTrack = (trackId: string) => {
    if (onTrackEdit) {
      onTrackEdit(trackId);
    }
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
    
    if (selectedCue && selectedCue.id === cueId && onCueSelect) {
      onCueSelect(null, null);
    }
    
    toast({
      title: "Cue deleted",
      description: `${deletedCueName} has been removed`,
      variant: "destructive",
    });
  };
  
  const handleCueDelete = (cueId: string, trackId: string) => {
    let deletedCueInfo: DeletedCue | null = null;
    
    const trackIndex = tracks.findIndex(track => track.id === trackId);
    if (trackIndex === -1) return;
    
    const track = tracks[trackIndex];
    const cueIndex = track.cues.findIndex(cue => cue.id === cueId);
    if (cueIndex === -1) return;
    
    const cueToDelete = track.cues[cueIndex];
    deletedCueInfo = {
      cue: cueToDelete,
      trackId,
      index: cueIndex
    };
    
    setTracks(prevTracks => {
      const newTracks = [...prevTracks];
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        cues: newTracks[trackIndex].cues.filter(cue => cue.id !== cueId)
      };
      return newTracks;
    });
    
    setDeletedCues(prev => [...prev, deletedCueInfo]);
    
    if (selectedCueId === cueId && onCueSelect) {
      onCueSelect(null, null);
    }
    
    toast({
      title: "Cue deleted",
      description: `${cueToDelete.name} has been removed. Click undo to restore.`,
      variant: "destructive",
    });
  };
  
  const handleUndoDelete = () => {
    if (deletedCues.length === 0) return;
    
    const lastDeletedCue = deletedCues[deletedCues.length - 1];
    
    setTracks(prevTracks => {
      const newTracks = [...prevTracks];
      const trackIndex = newTracks.findIndex(track => track.id === lastDeletedCue.trackId);
      
      if (trackIndex === -1) return prevTracks;
      
      const newCues = [...newTracks[trackIndex].cues];
      
      if (lastDeletedCue.index <= newCues.length) {
        newCues.splice(lastDeletedCue.index, 0, lastDeletedCue.cue);
      } else {
        newCues.push(lastDeletedCue.cue);
      }
      
      newTracks[trackIndex] = {
        ...newTracks[trackIndex],
        cues: newCues
      };
      
      return newTracks;
    });
    
    setDeletedCues(prev => prev.slice(0, prev.length - 1));
    
    toast({
      title: "Cue restored",
      description: `${lastDeletedCue.cue.name} has been restored to the timeline.`,
    });
  };
  
  const handleCueDragStart = (e: React.DragEvent<HTMLDivElement>, cue: TimelineCue, trackId: string) => {
    if (setIsInEditMode) {
      setIsInEditMode(false);
    }
    
    e.dataTransfer.setData('cueId', cue.id);
    e.dataTransfer.setData('sourceTrackId', trackId);
    
    // Set drag image if needed
    if (e.dataTransfer.setDragImage) {
      const dragImage = document.createElement('div');
      dragImage.textContent = cue.name;
      dragImage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      dragImage.style.color = 'white';
      dragImage.style.padding = '4px 8px';
      dragImage.style.borderRadius = '4px';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      document.body.appendChild(dragImage);
      
      e.dataTransfer.setDragImage(dragImage, 10, 10);
      
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    }
  };
  
  useEffect(() => {
    const handleTimelineUndo = () => {
      console.log("Timeline received undo event");
      handleUndoDelete();
    };
    
    const handleTimelineDeleteCue = (e: CustomEvent<{ cueId: string }>) => {
      console.log("Timeline received delete event", e.detail.cueId);
      let trackId = '';
      tracks.forEach(track => {
        if (track.cues.some(cue => cue.id === e.detail.cueId)) {
          trackId = track.id;
        }
      });
      
      if (trackId) {
        handleCueDelete(e.detail.cueId, trackId);
      }
    };
    
    const handleTimelineDuplicateCue = (e: CustomEvent<{ cueId: string }>) => {
      console.log("Timeline received duplicate event", e.detail.cueId);
      duplicateCue(e.detail.cueId);
    };
    
    const handleTimelineCopyCue = (e: CustomEvent<{ cue: TimelineCue }>) => {
      console.log("Timeline received copy event", e.detail.cue);
      setCopiedCue({...e.detail.cue});
    };
    
    const handleTimelinePasteCue = (e: CustomEvent<{ cue: TimelineCue }>) => {
      console.log("Timeline received paste event", e.detail.cue);
      if (!e.detail.cue) return;
      
      handlePasteCue();
    };
    
    document.addEventListener('timeline-undo', handleTimelineUndo as EventListener);
    document.addEventListener('timeline-delete-cue', handleTimelineDeleteCue as EventListener);
    document.addEventListener('timeline-duplicate-cue', handleTimelineDuplicateCue as EventListener);
    document.addEventListener('timeline-copy-cue', handleTimelineCopyCue as EventListener);
    document.addEventListener('timeline-paste-cue', handleTimelinePasteCue as EventListener);
    
    return () => {
      document.removeEventListener('timeline-undo', handleTimelineUndo as EventListener);
      document.removeEventListener('timeline-delete-cue', handleTimelineDeleteCue as EventListener);
      document.removeEventListener('timeline-duplicate-cue', handleTimelineDuplicateCue as EventListener);
      document.removeEventListener('timeline-copy-cue', handleTimelineCopyCue as EventListener);
      document.removeEventListener('timeline-paste-cue', handleTimelinePasteCue as EventListener);
    };
  }, [tracks, copiedCue]);
  
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isPanModeActive) || e.altKey) {
      e.preventDefault();
      isDraggingTimelineRef.current = true;
      lastClientXRef.current = e.clientX;
      document.body.style.cursor = 'grabbing';
      
      document.addEventListener('mousemove', handleTimelineMouseMove);
      document.addEventListener('mouseup', handleTimelineMouseUp);
    }
  };
  
  const handleTimelineMouseMove = (e: MouseEvent) => {
    if (!isDraggingTimelineRef.current || !scrollAreaRef.current) return;
    
    const deltaX = lastClientXRef.current - e.clientX;
    lastClientXRef.current = e.clientX;
    
    scrollAreaRef.current.scrollLeft += deltaX;
  };
  
  const handleTimelineMouseUp = () => {
    isDraggingTimelineRef.current = false;
    document.body.style.cursor = 'default';
    
    document.removeEventListener('mousemove', handleTimelineMouseMove);
    document.removeEventListener('mouseup', handleTimelineMouseUp);
  };
  
  const handlePasteCue = () => {
    if (!copiedCue) {
      toast({
        title: "No cue to paste",
        description: "Copy a cue first before pasting",
        variant: "destructive",
      });
      return;
    }
    
    const newCue: TimelineCue = {
      ...copiedCue,
      id: `cue-${Date.now()}`,
      name: `${copiedCue.name} (Copy)`,
      position: copiedCue.position + 20,
    };
    
    if (onCueChange) {
      onCueChange(newCue);
    } else {
      // Find the track that matches the copied cue's track name
      const trackToAddTo = tracks.find(t => t.name === newCue.track);
      
      if (trackToAddTo) {
        setTracks(prevTracks => 
          prevTracks.map(track => 
            track.id === trackToAddTo.id
              ? { ...track, cues: [...track.cues, newCue] }
              : track
          )
        );
      } else {
        // If track not found, add to first track
        setTracks(prevTracks => {
          if (prevTracks.length === 0) return prevTracks;
          
          const updatedTracks = [...prevTracks];
          updatedTracks[0] = {
            ...updatedTracks[0],
            cues: [...updatedTracks[0].cues, newCue]
          };
          
          return updatedTracks;
        });
      }
    }
    
    toast({
      title: "Cue pasted",
      description: `${newCue.name} added to timeline`,
    });
  };
  
  const renderToolbar = () => (
    <div className="flex items-center p-2 gap-2 border-b border-border">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            className="h-8 w-8"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{isPlaying ? "Pause" : "Play"}</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextCue}
            className="h-8 w-8"
          >
            <SkipForward size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Next Cue</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-8 w-8"
          >
            <RotateCcw size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Reset</TooltipContent>
      </Tooltip>
      
      <Separator orientation="vertical" className="h-5 mx-1" />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSplitCue}
            disabled={!selectedCue}
            className="h-8 w-8"
          >
            <Scissors size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Split Cue</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (selectedCue) {
                setCopiedCue(selectedCue);
                toast({
                  title: "Cue copied",
                  description: `${selectedCue.name} copied to clipboard`,
                });
              }
            }}
            disabled={!selectedCue}
            className="h-8 w-8"
          >
            <Copy size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Copy</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePasteCue}
            disabled={!copiedCue}
            className="h-8 w-8"
          >
            <ClipboardPaste size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Paste</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndoDelete}
            disabled={!canUndo}
            className="h-8 w-8"
          >
            <Undo2 size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Undo</TooltipContent>
      </Tooltip>
      
      <Separator orientation="vertical" className="h-5 mx-1" />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="h-8 w-8"
          >
            <ZoomIn size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Zoom In</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="h-8 w-8"
          >
            <ZoomOut size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Zoom Out</TooltipContent>
      </Tooltip>
    </div>
  );
  
  const renderTrack = (track: TimelineTrack) => (
    <div 
      key={track.id}
      className="runway-timeline-track"
      onDragOver={handleDragOver}
      onDrop={e => handleTrackDrop(e, track.id)}
    >
      <div className="flex items-center h-full w-40 min-w-40 px-2 border-r border-border bg-background">
        <button
          onClick={() => toggleTrackExpand(track.id)}
          className="mr-1 h-6 w-6 flex items-center justify-center rounded hover:bg-muted"
        >
          {track.expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        
        <div 
          className={cn(
            "flex-grow truncate font-medium text-sm",
            track.locked && "text-muted-foreground"
          )}
        >
          {track.name}
        </div>
        
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleTrackLock(track.id)}
                className={cn(
                  "h-6 w-6 rounded flex items-center justify-center",
                  track.locked ? "text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Lock size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{track.locked ? "Unlock Track" : "Lock Track"}</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleTrackSolo(track.id)}
                className={cn(
                  "h-6 w-6 rounded flex items-center justify-center",
                  track.solo ? "text-yellow-500" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Zap size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{track.solo ? "Un-Solo Track" : "Solo Track"}</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleEditTrack(track.id)}
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <Pencil size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Edit Track</TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      <div 
        className="relative flex-grow h-full overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={e => handleTrackDrop(e, track.id)}
      >
        {track.cues.map(cue => (
          <div 
            key={cue.id}
            className={cn(
              "runway-cue absolute top-1",
              `runway-cue-${cue.type}`,
              cue.color,
              selectedCueId === cue.id && "ring-2 ring-white"
            )}
            style={{ 
              left: `${cue.position}px`, 
              width: `${cue.width}px`,
            }}
            onClick={e => {
              e.stopPropagation();
              handleCueClick(cue.id);
            }}
            draggable={!track.locked}
            onDragStart={e => handleCueDragStart(e, cue, track.id)}
          >
            <div className="truncate text-xs">{cue.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {renderToolbar()}
      
      <div 
        className="flex flex-col flex-grow overflow-hidden"
        ref={timelineContainerRef}
      >
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-full relative"
        >
          <div 
            className="h-full"
            ref={timelineRef}
            onClick={handleTimelineClick}
            onMouseDown={handleTimelineMouseDown}
          >
            <div className="min-w-[2000px]">
              {tracks.map(track => renderTrack(track))}
              
              <div className="h-12 flex items-center px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex gap-1.5 text-muted-foreground"
                  onClick={() => onAddTrack ? onAddTrack() : addNewTrack()}
                >
                  <PlusCircle size={16} />
                  <span>Add Track</span>
                </Button>
              </div>
            </div>
            
            <div 
              ref={playheadRef}
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
              style={{
                left: `${timeInSecondsRef.current * (100 * timelineScale) / 60}px`,
              }}
            >
              <div 
                className="absolute -left-2.5 top-0 w-5 h-5 bg-primary rounded-full cursor-grab"
                style={{ pointerEvents: 'auto' }}
                onMouseDown={handlePlayheadMouseDown}
              />
              <div className="absolute -left-10 -top-7 bg-background border border-border rounded px-1 py-0.5 text-xs whitespace-nowrap">
                {currentTime}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Timeline;
