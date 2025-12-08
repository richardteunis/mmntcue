import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Copy,
  Trash2,
  PlusCircle,
  Zap,
  Filter,
  Undo2,
  ClipboardCopy,
  ClipboardPaste,
  Columns,
  GripVertical,
  Pencil,
  Flag,
  Square,
  CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

export interface TimelineProps {
  className?: string;
  onCueSelect?: (cueId: string | null, cue: TimelineCue | null) => void;
  selectedCueId?: string | null;
  onCueChange?: (updatedCue: TimelineCue) => void;
  selectedCue?: TimelineCue | null;
  cues?: TimelineCue[];
  onCueReorder?: (cueId: string, newIndex: number) => void;
  onCueDelete?: (cueId: string) => void;
  onCueDuplicate?: (cueId: string) => void;
  selectedCueIds?: string[];
  onSelectCue?: (cueId: string, isMultiSelect: boolean) => void;
  onBulkUpdate?: (updates: Partial<TimelineCue>) => void;
  onPasteCue?: (cue: TimelineCue) => void;
  onSelectAll?: (cueIds: string[]) => void;
  onClearSelection?: () => void;
  showCountdown?: { text: string; isLive: boolean } | null;
}

// Track columns configuration
const TRACK_COLUMNS = [
  { id: 'audio', label: 'Audio', color: 'bg-runway-teal', lightBg: 'bg-runway-teal/20' },
  { id: 'video', label: 'Video', color: 'bg-runway-success', lightBg: 'bg-runway-success/20' },
  { id: 'lighting', label: 'Lights', color: 'bg-runway-highlight', lightBg: 'bg-runway-highlight/20' },
  { id: 'stage', label: 'Stage', color: 'bg-runway-warning', lightBg: 'bg-runway-warning/20' },
];

// Helper to convert time string to seconds
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

// Format time for display (12-hour format)
const formatStartTime = (timeString: string): string => {
  const parts = timeString.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  
  const totalMinutes = hours * 60 + minutes;
  const displayHour = Math.floor((12 * 60 + totalMinutes) / 60) % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  const displaySeconds = seconds > 0 ? `:${seconds.toString().padStart(2, '0')}` : '';
  
  return `${displayHour}:${displayMinutes}${displaySeconds}pm`;
};

// Format duration for display
const formatDuration = (durationString: string): string => {
  const parts = durationString.split(':').map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else if (parts.length === 2) {
    return `${parts[0].toString().padStart(2, '0')}:${parts[1].toString().padStart(2, '0')}`;
  }
  return durationString;
};

const Timeline: React.FC<TimelineProps> = ({ 
  className, 
  onCueSelect, 
  selectedCueId,
  onCueChange,
  selectedCue,
  cues = [],
  onCueReorder,
  onCueDelete,
  onCueDuplicate,
  selectedCueIds = [],
  onSelectCue,
  onBulkUpdate,
  onPasteCue,
  onSelectAll,
  onClearSelection,
  showCountdown
}) => {
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['audio', 'video', 'lighting', 'stage']);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [copiedCue, setCopiedCue] = useState<TimelineCue | null>(null);
  const [deletedCues, setDeletedCues] = useState<TimelineCue[]>([]);
  const [draggedCueId, setDraggedCueId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const timeInSecondsRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();
  
  // Sort cues by start time
  const sortedCues = useMemo(() => {
    return [...cues].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
  }, [cues]);
  
  // Filter cues based on search
  const filteredCues = useMemo(() => {
    if (!searchFilter) return sortedCues;
    return sortedCues.filter(cue => 
      cue.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cue.notes?.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [sortedCues, searchFilter]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, cueId: string) => {
    setDraggedCueId(cueId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cueId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedCueId(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const cueId = e.dataTransfer.getData('text/plain');
    
    if (cueId && onCueReorder) {
      onCueReorder(cueId, targetIndex);
    }
    
    handleDragEnd();
  };

  // Delete cue handler
  const handleDeleteCue = (cueId: string, cueName: string) => {
    if (onCueDelete) {
      onCueDelete(cueId);
      toast({ title: "Cue deleted", description: cueName, variant: "destructive" });
    } else {
      document.dispatchEvent(new CustomEvent("timeline-delete-cue", { detail: { cueId } }));
    }
  };

  // Duplicate cue handler
  const handleDuplicateCue = (cueId: string, cueName: string) => {
    if (onCueDuplicate) {
      onCueDuplicate(cueId);
      toast({ title: "Cue duplicated", description: `Copy of ${cueName} created` });
    } else {
      document.dispatchEvent(new CustomEvent("timeline-duplicate-cue", { detail: { cueId } }));
    }
  };
  
  // Playback logic
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
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleNextCue = () => {
    const currentSeconds = timeInSecondsRef.current;
    const nextCue = sortedCues.find(cue => timeToSeconds(cue.time) > currentSeconds);
    
    if (nextCue) {
      timeInSecondsRef.current = timeToSeconds(nextCue.time);
      setCurrentTime(nextCue.time);
      if (onCueSelect) onCueSelect(nextCue.id, nextCue);
      toast({ title: "Jumped to next cue", description: nextCue.name });
    }
  };
  
  const handleReset = () => {
    timeInSecondsRef.current = 0;
    setCurrentTime('00:00:00');
    setIsPlaying(false);
  };
  
  const handleCueClick = (cue: TimelineCue) => {
    if (onCueSelect) onCueSelect(cue.id, cue);
    timeInSecondsRef.current = timeToSeconds(cue.time);
    setCurrentTime(cue.time);
  };
  
  const handleCopyCue = () => {
    if (selectedCue) {
      setCopiedCue(selectedCue);
      toast({ title: "Cue copied", description: selectedCue.name });
    }
  };

  const handlePasteCue = () => {
    if (copiedCue && onPasteCue) {
      onPasteCue(copiedCue);
      toast({ title: "Cue pasted", description: `${copiedCue.name} pasted to timeline` });
    }
  };
  
  const handleCellEdit = (cue: TimelineCue, field: keyof TimelineCue, value: string) => {
    if (onCueChange) {
      onCueChange({ ...cue, [field]: value });
    }
    setEditingCell(null);
  };
  
  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(c => c !== columnId)
        : [...prev, columnId]
    );
  };
  
  const getTrackCellColor = (cueType: string, columnType: string) => {
    if (cueType !== columnType) return '';
    
    switch (columnType) {
      case 'audio': return 'bg-runway-teal/30 border-l-2 border-l-runway-teal';
      case 'video': return 'bg-runway-success/30 border-l-2 border-l-runway-success';
      case 'lighting': return 'bg-runway-highlight/30 border-l-2 border-l-runway-highlight';
      case 'stage': return 'bg-runway-warning/30 border-l-2 border-l-runway-warning';
      default: return '';
    }
  };

  // Calculate total runtime
  const totalRuntime = useMemo(() => {
    if (sortedCues.length === 0) return '00:00:00';
    const lastCue = sortedCues[sortedCues.length - 1];
    const endTime = timeToSeconds(lastCue.time) + timeToSeconds(lastCue.duration);
    return secondsToTime(endTime);
  }, [sortedCues]);

  // Find current cue based on playback time
  const currentCueIndex = useMemo(() => {
    const currentSeconds = timeToSeconds(currentTime);
    for (let i = sortedCues.length - 1; i >= 0; i--) {
      if (timeToSeconds(sortedCues[i].time) <= currentSeconds) {
        return i;
      }
    }
    return -1;
  }, [currentTime, sortedCues]);
  
  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Top Stats Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Over / Under</div>
            <div className="font-mono text-lg font-bold text-foreground">00:00</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Item Run Time</div>
            <div className="font-mono text-lg font-bold text-foreground">{totalRuntime}</div>
          </div>
        </div>
        
        {/* Center: Countdown */}
        {showCountdown && (
          <div className={cn(
            "flex items-center gap-2 px-4 py-1 rounded-full",
            showCountdown.isLive ? "bg-runway-success/20" : "bg-muted/50"
          )}>
            <Clock className={cn("h-4 w-4", showCountdown.isLive ? "text-runway-success" : "text-primary")} />
            <span className={cn(
              "font-mono text-lg font-bold",
              showCountdown.isLive ? "text-runway-success" : "text-foreground"
            )}>
              {showCountdown.isLive ? "LIVE" : `T-${showCountdown.text}`}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Current Time</div>
            <div className="font-mono text-2xl font-bold text-primary">{currentTime}</div>
          </div>
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
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" onClick={handleNextCue}>
                <SkipForward size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next Cue</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" onClick={handleReset}>
                <RotateCcw size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" onClick={handleCopyCue} disabled={!selectedCue}>
                <ClipboardCopy size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy Cue</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" disabled={!copiedCue} onClick={handlePasteCue}>
                <ClipboardPaste size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Paste Cue</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" disabled={deletedCues.length === 0}>
                <Undo2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
        </div>
        
        <div className="flex-1" />
        
        <div className="relative">
          <Filter size={14} className="absolute left-2.5 top-2 text-muted-foreground" />
          <Input
            placeholder="Search cues..."
            className="h-8 w-48 pl-8 bg-background"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Columns className="h-3.5 w-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {TRACK_COLUMNS.map(col => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visibleColumns.includes(col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", col.color)} />
                  {col.label}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setVisibleColumns(['audio', 'video', 'lighting', 'stage'])}>
              Show All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="text-xs text-muted-foreground">
          {filteredCues.length} items
        </div>
      </div>

      {/* Run of Show Grid */}
      <div className="flex-1 overflow-auto border-t border-border">
        <Table className="border-collapse">
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-transparent border-b-2 border-border bg-muted/50">
              <TableHead className="w-[40px] text-center font-semibold text-[10px] uppercase tracking-wider border-r border-border/50">
                <Checkbox 
                  checked={selectedCueIds.length > 0 && selectedCueIds.length === filteredCues.length}
                  onCheckedChange={(checked) => {
                    if (checked && onSelectCue) {
                      filteredCues.forEach(cue => onSelectCue(cue.id, true));
                    } else if (onSelectCue) {
                      // Deselect all by selecting with multi=false on empty
                      filteredCues.forEach(cue => {
                        if (selectedCueIds.includes(cue.id)) {
                          onSelectCue(cue.id, true);
                        }
                      });
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-[50px] text-center font-semibold text-[10px] uppercase tracking-wider border-r border-border/50">Cue</TableHead>
              <TableHead className="min-w-[250px] font-semibold text-[10px] uppercase tracking-wider border-r border-border/50">Items</TableHead>
              <TableHead className="w-[100px] font-semibold text-[10px] uppercase tracking-wider border-r border-border/50">
                <div className="flex items-center gap-1">
                  <ChevronDown className="h-3 w-3" /> Start
                </div>
              </TableHead>
              <TableHead className="w-[80px] font-semibold text-[10px] uppercase tracking-wider border-r border-border/50">Duration</TableHead>
              <TableHead className="w-[160px] font-semibold text-[10px] uppercase tracking-wider border-r border-border/50">Notes</TableHead>
              {visibleColumns.map(colId => {
                const col = TRACK_COLUMNS.find(c => c.id === colId);
                if (!col) return null;
                return (
                  <TableHead 
                    key={col.id} 
                    className={cn("w-[120px] text-center font-semibold text-[10px] uppercase tracking-wider border-r border-border/50", col.lightBg)}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <div className={cn("w-2 h-2 rounded-full", col.color)} />
                      {col.label}
                    </div>
                  </TableHead>
                );
              })}
              <TableHead className="w-[80px] font-semibold text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCues.map((cue, index) => {
              const isCurrentCue = index === currentCueIndex && isPlaying;
              const isSelected = selectedCueId === cue.id;
              const isMultiSelected = selectedCueIds.includes(cue.id);
              const isDragging = draggedCueId === cue.id;
              const isDragOver = dragOverIndex === index;
              
              return (
                <TableRow 
                  key={cue.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cue.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className={cn(
                    "cursor-pointer transition-all group border-b border-border hover:bg-muted/30",
                    (isSelected || isMultiSelected) && "bg-primary/10 border-l-2 border-l-primary",
                    isCurrentCue && "bg-runway-success/20 ring-1 ring-runway-success",
                    isDragging && "opacity-50",
                    isDragOver && "border-t-2 border-t-primary"
                  )}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                      if (onSelectCue) onSelectCue(cue.id, true);
                    } else {
                      handleCueClick(cue);
                      if (onSelectCue) onSelectCue(cue.id, false);
                    }
                  }}
                >
                  <TableCell className="text-center py-3 border-r border-border/50" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={isMultiSelected}
                      onCheckedChange={(checked) => {
                        if (onSelectCue) onSelectCue(cue.id, true);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground py-3 border-r border-border/50">
                    {index + 1}
                  </TableCell>
                  <TableCell className="py-3 border-r border-border/50">
                    <div className="flex items-center gap-2">
                      <GripVertical 
                        size={14} 
                        className="opacity-30 group-hover:opacity-70 cursor-grab active:cursor-grabbing text-muted-foreground" 
                      />
                      {isCurrentCue && (
                        <div className="w-2 h-2 rounded-full bg-runway-success animate-pulse" />
                      )}
                      {editingCell?.id === cue.id && editingCell?.field === 'name' ? (
                        <Input
                          autoFocus
                          defaultValue={cue.name}
                          onBlur={(e) => handleCellEdit(cue, 'name', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCellEdit(cue, 'name', e.currentTarget.value);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7"
                        />
                      ) : (
                        <span 
                          className="font-medium hover:text-primary cursor-text"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingCell({ id: cue.id, field: 'name' });
                          }}
                        >
                          {cue.name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 border-r border-border/50">
                    {editingCell?.id === cue.id && editingCell?.field === 'time' ? (
                      <Input
                        autoFocus
                        defaultValue={cue.time}
                        onBlur={(e) => handleCellEdit(cue, 'time', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCellEdit(cue, 'time', e.currentTarget.value);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 font-mono text-xs"
                      />
                    ) : (
                      <span 
                        className="font-mono text-xs hover:text-primary cursor-text flex items-center gap-1"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingCell({ id: cue.id, field: 'time' });
                        }}
                      >
                        <Flag size={10} className="text-muted-foreground" />
                        {formatStartTime(cue.time)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 border-r border-border/50">
                    {editingCell?.id === cue.id && editingCell?.field === 'duration' ? (
                      <Input
                        autoFocus
                        defaultValue={cue.duration}
                        onBlur={(e) => handleCellEdit(cue, 'duration', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCellEdit(cue, 'duration', e.currentTarget.value);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 font-mono text-xs"
                      />
                    ) : (
                      <span 
                        className="font-mono text-xs hover:text-primary cursor-text"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingCell({ id: cue.id, field: 'duration' });
                        }}
                      >
                        {formatDuration(cue.duration)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 border-r border-border/50">
                    <span className="text-xs text-muted-foreground truncate block max-w-[150px]">
                      {cue.notes || '—'}
                    </span>
                  </TableCell>
                  {visibleColumns.map(colId => {
                    const isActiveColumn = cue.type === colId;
                    return (
                      <TableCell 
                        key={colId} 
                        className={cn(
                          "py-3 text-center border-r border-border/50",
                          getTrackCellColor(cue.type, colId)
                        )}
                      >
                        {isActiveColumn && (
                          <div className="text-xs px-2 truncate font-medium">
                            {cue.notes || cue.name.slice(0, 20)}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateCue(cue.id, cue.name);
                            }}
                          >
                            <Copy size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicate</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCue(cue.id, cue.name);
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredCues.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={7 + visibleColumns.length} 
                  className="h-32 text-center text-muted-foreground"
                >
                  {cues.length === 0 
                    ? "No cues yet. Click 'Add Cue' to get started."
                    : "No cues match your search criteria."
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Playhead Progress Bar */}
      {sortedCues.length > 0 && (
        <div className="h-1 bg-muted relative">
          <div 
            className="absolute h-full bg-runway-success transition-all"
            style={{ 
              width: `${Math.min(100, (timeToSeconds(currentTime) / timeToSeconds(totalRuntime)) * 100)}%` 
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Timeline;
