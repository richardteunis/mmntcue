import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import TimelineControls from './TimelineControls';
import TrackList, { TimelineTrack, TimelineCue } from './TrackList';
import CueTimeline from './CueTimeline';

export interface TimelineProps {
  className?: string;
  onCueSelect?: (cueId: string | null) => void;
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

const Timeline: React.FC<TimelineProps> = ({ className, onCueSelect }) => {
  const [tracks, setTracks] = useState<TimelineTrack[]>(mockTracks);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCue, setSelectedCue] = useState<string | null>(null);
  const [timelineScale, setTimelineScale] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [trackFilters, setTrackFilters] = useState<string[]>([]);
  const [showTimelineGrid, setShowTimelineGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [draggedCue, setDraggedCue] = useState<{id: string, initialX: number, trackId: string} | null>(null);
  const [deletedCues, setDeletedCues] = useState<{trackId: string, cue: TimelineCue, timestamp: number}[]>([]);
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
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === trackId ? { ...track, expanded: !track.expanded } : track
      )
    );
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
    
    if (onCueSelect) {
      onCueSelect(cueId);
    }
    
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
    
    const cueType = e.dataTransfer.getData('cueType');
    if (cueType) {
      const trackElement = e.currentTarget as HTMLElement;
      const rect = trackElement.getBoundingClientRect();
      const position = e.clientX - rect.left;
      
      const newCue: TimelineCue = {
        id: `cue-${Date.now()}`,
        name: `New ${cueType} Cue`,
        type: cueType as 'audio' | 'video' | 'lighting' | 'stage',
        time: calculateTimeFromPosition(position),
        duration: '0:30',
        position: position,
        width: 100,
      };
      
      setTracks(prevTracks => 
        prevTracks.map(track => 
          track.id === trackId 
            ? { ...track, cues: [...track.cues, newCue] } 
            : track
        )
      );
      
      toast({
        title: "New cue created",
        description: `${newCue.name} added to timeline`,
      });
    }
  };
  
  const calculateTimeFromPosition = (position: number): string => {
    let adjustedPosition = position;
    if (snapToGrid) {
      const gridSize = 20 * timelineScale;
      adjustedPosition = Math.round(position / gridSize) * gridSize;
    }
    
    const seconds = Math.floor(adjustedPosition / 100) * 60;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `00:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedCue) {
      const trackElement = e.currentTarget as HTMLElement;
      if (!trackElement || !trackElement.id) return;
      
      const trackId = trackElement.id;
      const rect = trackElement.getBoundingClientRect();
      let newPosition = e.clientX - rect.left;
      
      if (snapToGrid) {
        const gridSize = 20 * timelineScale;
        newPosition = Math.round(newPosition / gridSize) * gridSize;
      }
      
      setTracks(prevTracks => {
        return prevTracks.map(track => {
          const trackWithCue = prevTracks.find(t => 
            t.cues.some(c => c.id === draggedCue.id)
          );
          
          if (!trackWithCue) return track;
          
          const cueToUpdate = trackWithCue.cues.find(c => c.id === draggedCue.id);
          
          if (!cueToUpdate) return track;
          
          if (track.id === trackId) {
            if (trackWithCue.id === track.id) {
              return {
                ...track,
                cues: track.cues.map(cue => {
                  if (cue.id === draggedCue.id) {
                    const newTime = calculateTimeFromPosition(newPosition);
                    return {
                      ...cue,
                      position: newPosition,
                      time: newTime
                    };
                  }
                  return cue;
                })
              };
            } 
            else if (trackWithCue.id !== track.id) {
              return track;
            }
          }
          return track;
        });
      });
    }
  };
  
  const handleCueDragStart = (e: React.DragEvent, cueId: string, trackId: string) => {
    e.stopPropagation();
    const initialX = e.clientX;
    setDraggedCue({ id: cueId, initialX, trackId });
    
    e.dataTransfer.setData('cueId', cueId);
    e.dataTransfer.setData('sourceTrackId', trackId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleCueDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedCue(null);
  };
  
  const handleCueDropOnTrack = (e: React.DragEvent, targetTrackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const cueId = e.dataTransfer.getData('cueId');
    const sourceTrackId = e.dataTransfer.getData('sourceTrackId');
    
    if (!cueId) return;
    
    const trackElement = e.currentTarget as HTMLElement;
    const rect = trackElement.getBoundingClientRect();
    const newPosition = e.clientX - rect.left;
    
    setTracks(prevTracks => {
      let cueToMove: TimelineCue | undefined;
      let sourceTrack: TimelineTrack | undefined;
      
      prevTracks.forEach(track => {
        const cue = track.cues.find(c => c.id === cueId);
        if (cue && track.id === sourceTrackId) {
          cueToMove = {...cue};
          sourceTrack = track;
        }
      });
      
      if (!cueToMove) return prevTracks;
      
      let adjustedPosition = newPosition;
      if (snapToGrid) {
        const gridSize = 20 * timelineScale;
        adjustedPosition = Math.round(newPosition / gridSize) * gridSize;
      }
      
      const newTime = calculateTimeFromPosition(adjustedPosition);
      
      return prevTracks.map(track => {
        if (track.id === sourceTrackId) {
          return {
            ...track,
            cues: track.cues.filter(c => c.id !== cueId)
          };
        }
        
        if (track.id === targetTrackId) {
          const updatedCue = {
            ...cueToMove!,
            position: adjustedPosition,
            time: newTime
          };
          
          return {
            ...track,
            cues: [...track.cues, updatedCue]
          };
        }
        
        return track;
      });
    });
    
    toast({
      title: "Cue moved",
      description: sourceTrackId === targetTrackId ? 
        "Cue repositioned within track" : 
        "Cue moved to different track",
    });
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
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === trackId ? { ...track, muted: !track.muted } : track
      )
    );
    
    const track = tracks.find(track => track.id === trackId);
    toast({
      title: "Track muted",
      description: `${track?.name} ${track?.muted ? 'unmuted' : 'muted'}`,
    });
  };
  
  const toggleTrackSolo = (trackId: string) => {
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === trackId ? { ...track, solo: !track.solo } : track
      )
    );
    
    const track = tracks.find(track => track.id === trackId);
    toast({
      title: "Track soloed",
      description: `${track?.name} ${track?.solo ? 'unsoloed' : 'soloed'}`,
    });
  };
  
  const deleteCue = (cueId: string) => {
    if (!cueId) return;
    
    let deletedCueName = '';
    let deletedCueInfo: {trackId: string, cue: TimelineCue} | null = null;
    
    setTracks(currentTracks => {
      const updatedTracks = currentTracks.map(track => {
        const cueToDelete = track.cues.find(cue => cue.id === cueId);
        if (cueToDelete) {
          deletedCueName = cueToDelete.name;
          deletedCueInfo = {
            trackId: track.id,
            cue: {...cueToDelete}
          };
        }
        
        return {
          ...track,
          cues: track.cues.filter(cue => cue.id !== cueId)
        };
      });
      
      return updatedTracks;
    });
    
    if (deletedCueInfo) {
      setDeletedCues(prev => [
        ...prev, 
        {...deletedCueInfo, timestamp: Date.now()}
      ]);
    }
    
    if (selectedCue === cueId) {
      setSelectedCue(null);
      if (onCueSelect) {
        onCueSelect(null);
      }
    }
    
    toast({
      title: "Cue deleted",
      description: `${deletedCueName} has been removed`,
      variant: "destructive",
    });
  };
  
  const undoDelete = () => {
    if (deletedCues.length === 0) return;
    
    const lastDeleted = deletedCues[deletedCues.length - 1];
    
    setDeletedCues(prev => prev.slice(0, -1));
    
    setTracks(currentTracks => {
      return currentTracks.map(track => {
        if (track.id === lastDeleted.trackId) {
          return {
            ...track,
            cues: [...track.cues, lastDeleted.cue]
          };
        }
        return track;
      });
    });
    
    toast({
      title: "Undo delete",
      description: `Restored: ${lastDeleted.cue.name}`,
    });
  };
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undoDelete();
      return;
    }
    
    if (!selectedCue) return;
    
    if (e.key === "Delete" || e.key === "Backspace") {
      deleteCue(selectedCue);
    }
    
    if (e.key === "d" && e.ctrlKey) {
      e.preventDefault();
      duplicateCue(selectedCue);
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
  
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedCue, deletedCues]);
  
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
  
  const toggleSnapToGrid = () => {
    setSnapToGrid(prev => !prev);
    toast({
      title: snapToGrid ? "Snap to grid disabled" : "Snap to grid enabled",
      description: snapToGrid ? "Cues will move freely" : "Cues will snap to grid lines"
    });
  };
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <TimelineControls 
        isPlaying={isPlaying}
        currentTime={currentTime}
        searchFilter={searchFilter}
        selectedCue={selectedCue}
        trackFilters={trackFilters}
        snapToGrid={snapToGrid}
        canUndo={deletedCues.length > 0}
        onPlayPause={handlePlayPause}
        onNextCue={handleNextCue}
        onReset={handleReset}
        onSplitCue={handleSplitCue}
        onDeleteCue={deleteCue}
        onUndoDelete={undoDelete}
        onToggleSnapToGrid={toggleSnapToGrid}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onSearchChange={setSearchFilter}
        onClearSearch={() => setSearchFilter('')}
        onToggleTrackFilter={toggleTrackFilter}
        getFilterButtonClass={getFilterButtonClass}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <TrackList 
          tracks={filteredTracks}
          onToggleTrackExpand={toggleTrackExpand}
          onToggleTrackMute={toggleTrackMute}
          onToggleTrackSolo={toggleTrackSolo}
          onAddNewTrack={addNewTrack}
          onCueDragStart={handleCueDragStart}
          onCueDragEnd={handleCueDragEnd}
          onCueDropOnTrack={handleCueDropOnTrack}
          onTrackDrop={handleTrackDrop}
          onCueClick={handleCueClick}
          onDragOver={handleDragOver}
          selectedCue={selectedCue}
        />
        
        <CueTimeline 
          tracks={filteredTracks}
          timelineScale={timelineScale}
          selectedCue={selectedCue}
          currentTime={currentTime}
          snapToGrid={snapToGrid}
          getPlayheadPosition={getPlayheadPosition}
          onCueClick={handleCueClick}
          onCueDragStart={handleCueDragStart}
          onCueDragEnd={handleCueDragEnd}
          onTimelineClick={handleTimelineClick}
        />
      </div>
    </div>
  );
};

export type { TimelineCue };
export default Timeline;
