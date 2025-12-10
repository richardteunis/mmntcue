import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, SkipForward, RotateCcw, ZoomIn, ZoomOut, Hand, Volume2, Settings2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

export interface TimelineCue {
  id: string;
  name: string;
  type: string;
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
  label: string;
  color: string;
}

export interface TimelineViewProps {
  className?: string;
  cues?: TimelineCue[];
  tracks?: TimelineTrack[];
  selectedCueId?: string | null;
  selectedCueIds?: string[];
  showCountdown?: { text: string; isLive: boolean } | null;
  animatingCues?: { id: string; type: 'add' | 'delete' | 'update' }[];
  onCueSelect?: (cueId: string | null, cue: TimelineCue | null) => void;
  onCueMultiSelect?: (cueIds: string[]) => void;
  onCueChange?: (updatedCue: TimelineCue) => void;
  onCueDelete?: (cueId: string) => void;
  onCueDuplicate?: (cueId: string) => void;
  onViewportChange?: (scrollX: number, scrollY: number, zoom: number) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
  onAssetDropOnCue?: (assetData: any, cueId: string) => void;
  onAssetDropToCreate?: (assetData: any, trackId: string, startTime: number) => void;
  onTrackEdit?: (track: TimelineTrack) => void;
  // Shared playback state
  playbackState?: {
    isPlaying: boolean;
    currentTimeSeconds: number;
    currentTime: string;
    togglePlay: () => void;
    reset: () => void;
    seekTo: (seconds: number) => void;
    jumpToNextCue: () => { id: string; time: string; duration: string } | null;
  };
}

// Default track lanes configuration
const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'audio', label: 'Audio', color: '#14B8A6' },
  { id: 'video', label: 'Video', color: '#22C55E' },
  { id: 'lighting', label: 'Lights', color: '#EAB308' },
  { id: 'stage', label: 'Stage', color: '#F97316' },
];

// Helper functions
const timeToSeconds = (timeString: string): number => {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

const secondsToTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatTimeShort = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TimelineView: React.FC<TimelineViewProps> = ({
  className,
  cues = [],
  tracks = DEFAULT_TRACKS,
  selectedCueId,
  selectedCueIds = [],
  showCountdown,
  animatingCues = [],
  onCueSelect,
  onCueMultiSelect,
  onCueChange,
  onCueDelete,
  onCueDuplicate,
  onViewportChange,
  scrollRef,
  onAssetDropOnCue,
  onAssetDropToCreate,
  onTrackEdit,
  playbackState,
}) => {
  const [dropTargetCueId, setDropTargetCueId] = useState<string | null>(null);
  const [dropTargetTrack, setDropTargetTrack] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1); // pixels per second
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [cuesWithAudio, setCuesWithAudio] = useState<Set<string>>(new Set());
  const [trackLabelWidth, setTrackLabelWidth] = useState(160);
  const [isResizingTrackWidth, setIsResizingTrackWidth] = useState(false);
  
  // Box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxSelectStart, setBoxSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [boxSelectCurrent, setBoxSelectCurrent] = useState<{ x: number; y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Use external playback state if provided
  const isPlaying = playbackState?.isPlaying ?? false;
  const currentTime = playbackState?.currentTimeSeconds ?? 0;
  
  // Combine refs if external scrollRef is provided
  const scrollContainerRef = scrollRef || containerRef;

  // Calculate timeline dimensions
  const pixelsPerSecond = 2 * zoom;
  const totalDuration = useMemo(() => {
    const defaultDuration = 7200; // 2 hours default
    if (cues.length === 0) return defaultDuration;
    const maxEnd = Math.max(...cues.map(c => timeToSeconds(c.time) + timeToSeconds(c.duration)));
    return Math.max(maxEnd + 300, defaultDuration); // Add 5 min buffer, minimum 2 hours
  }, [cues]);
  
  const timelineWidth = totalDuration * pixelsPerSecond;

  // Group cues by track
  const cuesByTrack = useMemo(() => {
    const grouped: Record<string, TimelineCue[]> = {};
    tracks.forEach(track => {
      grouped[track.id] = cues.filter(c => c.type === track.id);
    });
    return grouped;
  }, [cues, tracks]);

  // Fetch which cues have audio assets attached
  useEffect(() => {
    const fetchCuesWithAudio = async () => {
      const cueIds = cues.map(c => c.id);
      if (cueIds.length === 0) return;
      
      const { data } = await supabase
        .from('cue_assets')
        .select('cue_id, assets!inner(file_type)')
        .in('cue_id', cueIds);
      
      if (data) {
        const audioSet = new Set<string>();
        data.forEach((item: any) => {
          if (item.assets?.file_type === 'audio' || item.assets?.file_type === 'video') {
            audioSet.add(item.cue_id);
          }
        });
        setCuesWithAudio(audioSet);
      }
    };
    
    fetchCuesWithAudio();
  }, [cues]);

  // Auto-scroll to follow playhead
  useEffect(() => {
    if (isPlaying && containerRef.current) {
      const playheadX = currentTime * pixelsPerSecond;
      const containerWidth = containerRef.current.clientWidth - trackLabelWidth;
      const scrollPos = containerRef.current.scrollLeft;
      
      if (playheadX > scrollPos + containerWidth - 100 || playheadX < scrollPos) {
        containerRef.current.scrollLeft = playheadX - 100;
      }
    }
  }, [currentTime, pixelsPerSecond, isPlaying, trackLabelWidth]);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    const markers: { time: number; label: string; major: boolean }[] = [];
    const interval = zoom < 0.5 ? 60 : zoom < 1 ? 30 : zoom < 2 ? 15 : 5;
    
    for (let t = 0; t <= totalDuration; t += interval) {
      markers.push({
        time: t,
        label: formatTimeShort(t),
        major: t % 60 === 0,
      });
    }
    return markers;
  }, [totalDuration, zoom]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.25));
  
  const handleReset = () => {
    playbackState?.reset();
    if (containerRef.current) containerRef.current.scrollLeft = 0;
  };

  const handleNextCue = () => {
    const nextCue = playbackState?.jumpToNextCue();
    if (nextCue) {
      const cue = cues.find(c => c.id === nextCue.id);
      if (cue) onCueSelect?.(cue.id, cue);
    }
  };

  // Calculate time from mouse position relative to timeline
  const getTimeFromMouseEvent = (e: MouseEvent | React.MouseEvent): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    return Math.max(0, Math.min(time, totalDuration));
  };

  // Ruler click handler for playhead dragging (only in ruler area)
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const time = getTimeFromMouseEvent(e);
    playbackState?.seekTo(time);
    setIsDraggingPlayhead(true);
    document.body.style.userSelect = 'none';
  };

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    document.body.style.userSelect = 'none';
  };

  // Playhead dragging effect
  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromMouseEvent(e);
      playbackState?.seekTo(time);
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, pixelsPerSecond, totalDuration]);

  // Box selection handlers
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (panMode) return;
    // Check if clicking on a cue (don't start box selection)
    const target = e.target as HTMLElement;
    if (target.closest('[data-cue]')) return;
    if (target.closest('[data-ruler]')) return;
    
    // Start box selection
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (containerRef.current?.scrollTop || 0);
    
    setBoxSelectStart({ x, y });
    setBoxSelectCurrent({ x, y });
    setIsBoxSelecting(true);
    document.body.style.userSelect = 'none';
  };

  // Box selection effect
  useEffect(() => {
    if (!isBoxSelecting) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !containerRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft;
      const y = e.clientY - rect.top + containerRef.current.scrollTop;
      setBoxSelectCurrent({ x, y });
    };

    const handleMouseUp = () => {
      // Calculate which cues are in the selection box
      if (boxSelectStart && boxSelectCurrent && timelineRef.current) {
        const minX = Math.min(boxSelectStart.x, boxSelectCurrent.x);
        const maxX = Math.max(boxSelectStart.x, boxSelectCurrent.x);
        const minY = Math.min(boxSelectStart.y, boxSelectCurrent.y);
        const maxY = Math.max(boxSelectStart.y, boxSelectCurrent.y);
        
        // Check if this was just a click (not a drag) - deselect everything
        const dragDistance = Math.abs(boxSelectCurrent.x - boxSelectStart.x) + Math.abs(boxSelectCurrent.y - boxSelectStart.y);
        if (dragDistance < 5) {
          onCueSelect?.(null, null);
          onCueMultiSelect?.([]);
          setIsBoxSelecting(false);
          setBoxSelectStart(null);
          setBoxSelectCurrent(null);
          document.body.style.userSelect = '';
          return;
        }
        
        const selectedIds: string[] = [];
        const rulerHeight = 40; // Height of time ruler
        const trackHeight = 64; // Height of each track lane
        
        tracks.forEach((track, trackIndex) => {
          const trackY = rulerHeight + trackIndex * trackHeight;
          const trackBottom = trackY + trackHeight;
          
          // Check if selection box overlaps with this track
          if (maxY >= trackY && minY <= trackBottom) {
            const trackCues = cuesByTrack[track.id] || [];
            trackCues.forEach(cue => {
              const cueStartX = timeToSeconds(cue.time) * pixelsPerSecond;
              const cueWidth = Math.max(timeToSeconds(cue.duration) * pixelsPerSecond, 40);
              const cueEndX = cueStartX + cueWidth;
              
              // Check if cue overlaps with selection box
              if (maxX >= cueStartX && minX <= cueEndX) {
                selectedIds.push(cue.id);
              }
            });
          }
        });
        
        if (selectedIds.length > 0) {
          onCueMultiSelect?.(selectedIds);
        } else {
          onCueSelect?.(null, null);
          onCueMultiSelect?.([]);
        }
      }
      
      setIsBoxSelecting(false);
      setBoxSelectStart(null);
      setBoxSelectCurrent(null);
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isBoxSelecting, boxSelectStart, boxSelectCurrent, tracks, cuesByTrack, pixelsPerSecond, onCueMultiSelect, onCueSelect]);

  // Track width resize handlers
  const handleTrackWidthResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTrackWidth(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    if (!isResizingTrackWidth) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      setTrackLabelWidth(Math.max(100, Math.min(300, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizingTrackWidth(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTrackWidth]);

  const handleCueClick = (e: React.MouseEvent, cue: TimelineCue) => {
    e.stopPropagation();
    
    // Multi-select with Shift or Cmd/Ctrl
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      const currentSelection = selectedCueIds.includes(cue.id)
        ? selectedCueIds.filter(id => id !== cue.id)
        : [...selectedCueIds, cue.id];
      onCueMultiSelect?.(currentSelection);
    } else {
      onCueSelect?.(cue.id, cue);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    }
  };

  // Calculate box selection rectangle
  const boxSelectRect = useMemo(() => {
    if (!boxSelectStart || !boxSelectCurrent) return null;
    return {
      left: Math.min(boxSelectStart.x, boxSelectCurrent.x),
      top: Math.min(boxSelectStart.y, boxSelectCurrent.y),
      width: Math.abs(boxSelectCurrent.x - boxSelectStart.x),
      height: Math.abs(boxSelectCurrent.y - boxSelectStart.y),
    };
  }, [boxSelectStart, boxSelectCurrent]);

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Top Stats Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Current</div>
            <div className="font-mono text-xl font-bold text-primary">{secondsToTime(currentTime)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Total</div>
            <div className="font-mono text-lg text-foreground">{secondsToTime(totalDuration)}</div>
          </div>
        </div>

        {/* Center: Countdown */}
        {showCountdown && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="text-center">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                {showCountdown.isLive ? 'Status' : 'Countdown'}
              </div>
              <div className={cn(
                "font-mono text-xl font-bold",
                showCountdown.isLive ? "text-runway-error animate-pulse" : "text-runway-teal"
              )}>
                {showCountdown.isLive ? 'LIVE' : `T-${showCountdown.text}`}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Clock</div>
            <div className="font-mono text-lg text-foreground">
              {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-card/80">
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant={isPlaying ? "default" : "secondary"}
            className={cn("gap-1", isPlaying && "bg-runway-success hover:bg-runway-success/90")}
            onClick={() => playbackState?.togglePlay()}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={handleNextCue}>
                <SkipForward size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next Cue</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={handleReset}>
                <RotateCcw size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={handleZoomOut}>
                <ZoomOut size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={handleZoomIn}>
                <ZoomIn size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant={panMode ? "default" : "outline"}
                onClick={() => setPanMode(!panMode)}
              >
                <Hand size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pan Mode</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />

        <div className="text-xs text-muted-foreground">
          {selectedCueIds.length > 0 ? `${selectedCueIds.length} selected` : `${cues.length} cues`}
        </div>
      </div>

      {/* Timeline Grid */}
      <div 
        ref={(el) => {
          // Handle both internal and external refs
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (scrollRef && 'current' in scrollRef) {
            (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        className="flex-1 overflow-auto"
        onWheel={handleWheel}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          onViewportChange?.(target.scrollLeft, target.scrollTop, zoom);
        }}
        style={{ cursor: panMode ? 'grab' : 'default' }}
      >
        <div className="flex min-h-full">
          {/* Track Labels */}
          <div 
            className="flex-shrink-0 bg-card border-r border-border sticky left-0 z-20 relative"
            style={{ width: trackLabelWidth }}
          >
            {/* Time ruler header */}
            <div className="h-10 border-b border-border bg-muted/30 flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">Tracks</span>
            </div>
            
            {/* Track labels */}
            {tracks.map(track => (
              <div 
                key={track.id}
                className={cn(
                  "h-16 flex items-center px-3 border-b border-border group",
                  "hover:bg-muted/30 transition-colors"
                )}
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: track.color }}
                />
                <span className="text-sm font-medium flex-1 truncate">{track.label}</span>
                <span className="text-xs text-muted-foreground mr-1">
                  {cuesByTrack[track.id]?.length || 0}
                </span>
                {onTrackEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Settings2 size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onTrackEdit(track)}>
                        Edit Track
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
            
            {/* Resize handle */}
            <div 
              className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors group"
              onMouseDown={handleTrackWidthResizeStart}
            >
              <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={12} className="text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Timeline Area */}
          <div 
            ref={timelineRef}
            className="relative flex-1"
            style={{ minWidth: timelineWidth, cursor: isBoxSelecting ? 'crosshair' : 'default' }}
            onMouseDown={handleTimelineMouseDown}
          >
            {/* Time Ruler - Clickable for playhead */}
            <div 
              ref={rulerRef}
              data-ruler
              className="h-10 border-b border-border bg-muted/30 relative sticky top-0 z-10 cursor-ew-resize"
              onMouseDown={handleRulerMouseDown}
            >
              {timeMarkers.map(marker => (
                <div
                  key={marker.time}
                  className="absolute top-0 h-full flex flex-col justify-end pointer-events-none"
                  style={{ left: marker.time * pixelsPerSecond }}
                >
                  <span className={cn(
                    "text-[10px] px-1 transform -translate-x-1/2",
                    marker.major ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {marker.label}
                  </span>
                  <div className={cn(
                    "w-px",
                    marker.major ? "h-3 bg-foreground/40" : "h-2 bg-border"
                  )} />
                </div>
              ))}
            </div>

            {/* Track Lanes */}
            {tracks.map(track => (
              <div 
                key={track.id}
                className={cn(
                  "h-16 border-b border-border relative transition-colors",
                  dropTargetTrack === track.id && "bg-runway-teal/10 ring-1 ring-runway-teal ring-inset"
                )}
                style={{ 
                  backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent ${60 * pixelsPerSecond - 1}px, hsl(var(--border) / 0.3) ${60 * pixelsPerSecond - 1}px, hsl(var(--border) / 0.3) ${60 * pixelsPerSecond}px)` 
                }}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes('application/json')) {
                    e.preventDefault();
                    setDropTargetTrack(track.id);
                  }
                }}
                onDragLeave={() => setDropTargetTrack(null)}
                onDrop={(e) => {
                  const jsonData = e.dataTransfer.getData('application/json');
                  if (jsonData) {
                    try {
                      const assetData = JSON.parse(jsonData);
                      if (assetData.file_url && onAssetDropToCreate) {
                        e.preventDefault();
                        e.stopPropagation();
                        const time = getTimeFromMouseEvent(e);
                        onAssetDropToCreate(assetData, track.id, time);
                      }
                    } catch {}
                  }
                  setDropTargetTrack(null);
                }}
              >
                {/* Cue bars */}
                {cuesByTrack[track.id]?.map(cue => {
                  const startX = timeToSeconds(cue.time) * pixelsPerSecond;
                  const width = Math.max(timeToSeconds(cue.duration) * pixelsPerSecond, 40);
                  const animation = animatingCues.find(a => a.id === cue.id);
                  const hasAudio = cuesWithAudio.has(cue.id);
                  const isMultiSelected = selectedCueIds.includes(cue.id);
                  
                  // Get cue color - use cue.color if it's a hex color, otherwise use track color
                  const cueColor = cue.color && cue.color.startsWith('#') ? cue.color : track.color;
                  
                  return (
                    <Tooltip key={cue.id}>
                      <TooltipTrigger asChild>
                        <div
                          data-cue={cue.id}
                          className={cn(
                            "absolute top-2 h-12 rounded-md cursor-pointer transition-all duration-300",
                            "border-2 shadow-sm hover:shadow-md",
                            (selectedCueId === cue.id || isMultiSelected) && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                            dropTargetCueId === cue.id && "ring-2 ring-runway-teal ring-offset-1 scale-105",
                            animation?.type === 'add' && "animate-scale-in",
                            animation?.type === 'delete' && "animate-fade-out opacity-0 scale-95",
                            animation?.type === 'update' && "ring-2 ring-runway-teal ring-offset-1"
                          )}
                          style={{ 
                            left: startX, 
                            width,
                            backgroundColor: cueColor,
                            borderColor: cueColor,
                          }}
                          onClick={(e) => handleCueClick(e, cue)}
                          onDragOver={(e) => {
                            if (e.dataTransfer.types.includes('application/json')) {
                              e.preventDefault();
                              e.stopPropagation();
                              setDropTargetCueId(cue.id);
                              setDropTargetTrack(null);
                            }
                          }}
                          onDragLeave={() => setDropTargetCueId(null)}
                          onDrop={(e) => {
                            const jsonData = e.dataTransfer.getData('application/json');
                            if (jsonData) {
                              try {
                                const assetData = JSON.parse(jsonData);
                                if (assetData.file_url && onAssetDropOnCue) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onAssetDropOnCue(assetData, cue.id);
                                }
                              } catch {}
                            }
                            setDropTargetCueId(null);
                          }}
                        >
                          <div className="px-2 py-1 h-full flex flex-col justify-center overflow-hidden relative">
                            <span className="text-xs font-medium text-white truncate drop-shadow-sm">
                              {cue.name}
                            </span>
                            <span className="text-[10px] text-white/80 truncate">
                              {cue.duration}
                            </span>
                            {hasAudio && (
                              <div className="absolute top-1 right-1">
                                <Volume2 size={10} className="text-white/90 drop-shadow-sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <div className="space-y-1">
                          <p className="font-medium">{cue.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Start: {cue.time} • Duration: {cue.duration}
                          </p>
                          {cue.notes && (
                            <p className="text-xs text-muted-foreground truncate">{cue.notes}</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}

            {/* Box Selection Rectangle */}
            {isBoxSelecting && boxSelectRect && (
              <div 
                className="absolute border-2 border-primary bg-primary/20 pointer-events-none z-40"
                style={{
                  left: boxSelectRect.left,
                  top: boxSelectRect.top,
                  width: boxSelectRect.width,
                  height: boxSelectRect.height,
                }}
              />
            )}

            {/* Playhead */}
            <div 
              className={cn(
                "absolute top-0 bottom-0 w-0.5 bg-primary z-30 cursor-ew-resize",
                isDraggingPlayhead && "bg-primary/80"
              )}
              style={{ left: currentTime * pixelsPerSecond }}
              onMouseDown={handlePlayheadMouseDown}
            >
              <div 
                className={cn(
                  "absolute -top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45 cursor-ew-resize hover:scale-110 transition-transform",
                  isDraggingPlayhead && "scale-110"
                )} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
