import React, { useState, useMemo, useCallback } from 'react';
import { Cue } from '@/types/cue';
import { Segment } from '@/hooks/useSegments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Pencil, 
  Trash2, 
  Copy, 
  Search,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TableViewProps {
  cues: Cue[];
  segments: Segment[];
  selectedCueId: string | null;
  onCueSelect: (id: string | null, cue: Cue | null) => void;
  onCueUpdate: (cue: Cue) => void;
  onCueDelete: (id: string) => void;
  onCueDuplicate: (id: string) => void;
  onEditCue: (cue: Cue) => void;
  onSegmentDurationUpdate?: (segmentId: string, newDuration: number) => void;
  showCountdown?: { text: string; isLive: boolean } | null;
  onAssetDropOnCue?: (assetData: any, cueId: string) => void;
  onAssetDropToCreate?: (assetData: any) => void;
  // Live timing data
  currentTimeSeconds?: number;
  isLive?: boolean;
}

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

// Format seconds to MM:SS or HH:MM:SS
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Format variance with +/- prefix
const formatVariance = (seconds: number): string => {
  const prefix = seconds > 0 ? '+' : seconds < 0 ? '' : '';
  return `${prefix}${formatDuration(Math.abs(seconds))}`;
};

// Parse duration input (supports MM:SS, HH:MM:SS, or just minutes)
const parseDurationInput = (input: string): number | null => {
  const trimmed = input.trim();
  
  // Try HH:MM:SS or MM:SS format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return null;
  }
  
  // Try just minutes
  const mins = parseFloat(trimmed);
  if (!isNaN(mins)) {
    return Math.round(mins * 60);
  }
  
  return null;
};

const TRACK_COLORS: Record<string, string> = {
  audio: 'bg-runway-teal',
  video: 'bg-runway-success',
  lighting: 'bg-runway-highlight',
  stage: 'bg-runway-warning',
};

// Display names for cue types
const CUE_TYPE_LABELS: Record<string, string> = {
  vog: 'VOG',
  audio: 'Audio',
  lights: 'Lights',
  video: 'Video',
  stage_action: 'Stage',
  segment_marker: 'Marker',
  lighting: 'Lights',
  stage: 'Stage',
};

// Helper to darken a hex color for header backgrounds
const darkenColor = (hex: string, amount: number = 0.6): string => {
  // Remove # if present
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Darken by multiplying
  const newR = Math.round(r * amount);
  const newG = Math.round(g * amount);
  const newB = Math.round(b * amount);
  
  return `rgb(${newR}, ${newG}, ${newB})`;
};

const TableView: React.FC<TableViewProps> = ({
  cues,
  segments,
  selectedCueId,
  onCueSelect,
  onCueUpdate,
  onCueDelete,
  onCueDuplicate,
  onEditCue,
  onSegmentDurationUpdate,
  showCountdown,
  onAssetDropOnCue,
  onAssetDropToCreate,
  currentTimeSeconds = 0,
  isLive = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDuration, setEditingDuration] = useState<string | null>(null);
  const [durationInput, setDurationInput] = useState('');
  const [collapsedSegments, setCollapsedSegments] = useState<Set<string>>(new Set());
  const [goMode, setGoMode] = useState(false);

  // Sort segments by order_index and calculate cumulative start times
  const segmentsWithTiming = useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.order_index - b.order_index);
    let currentStart = 0;
    
    return sorted.map(segment => {
      const startTime = currentStart;
      const endTime = startTime + segment.target_duration;
      currentStart = endTime;
      return { ...segment, startTime, endTime };
    });
  }, [segments]);

  // Group cues by segment based on time ranges
  const cuesBySegment = useMemo(() => {
    const groups = new Map<string, Cue[]>();
    const unassigned: Cue[] = [];
    
    // Initialize empty arrays for each segment
    segmentsWithTiming.forEach(seg => groups.set(seg.id, []));
    
    // Sort cues by start time
    const sortedCues = [...cues].sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));
    
    sortedCues.forEach(cue => {
      const cueStart = timeToSeconds(cue.start_time);
      
      // Find which segment this cue belongs to
      let assigned = false;
      for (const seg of segmentsWithTiming) {
        if (cueStart >= seg.startTime && cueStart < seg.endTime) {
          groups.get(seg.id)?.push(cue);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        unassigned.push(cue);
      }
    });
    
    return { groups, unassigned };
  }, [cues, segmentsWithTiming]);

  // Calculate actual duration for each segment (sum of cue durations)
  const segmentActualDurations = useMemo(() => {
    const durations = new Map<string, number>();
    
    cuesBySegment.groups.forEach((segmentCues, segmentId) => {
      const total = segmentCues.reduce((sum, cue) => sum + timeToSeconds(cue.duration), 0);
      durations.set(segmentId, total);
    });
    
    return durations;
  }, [cuesBySegment]);

  // Filter cues by search term
  const filterCues = useCallback((cueList: Cue[]) => {
    if (!searchTerm) return cueList;
    return cueList.filter(cue => 
      cue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cue.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Toggle segment collapse
  const toggleSegment = (segmentId: string) => {
    setCollapsedSegments(prev => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  };

  // Start editing segment duration
  const startEditingDuration = (segmentId: string, currentDuration: number) => {
    setEditingDuration(segmentId);
    setDurationInput(formatDuration(currentDuration));
  };

  // Save segment duration
  const saveDuration = (segmentId: string) => {
    const newDuration = parseDurationInput(durationInput);
    if (newDuration !== null && onSegmentDurationUpdate) {
      onSegmentDurationUpdate(segmentId, newDuration);
    }
    setEditingDuration(null);
    setDurationInput('');
  };

  // Calculate total show duration
  const totalTargetDuration = useMemo(() => {
    return segmentsWithTiming.reduce((sum, seg) => sum + seg.target_duration, 0);
  }, [segmentsWithTiming]);

  const totalActualDuration = useMemo(() => {
    let total = 0;
    segmentActualDurations.forEach(duration => {
      total += duration;
    });
    return total;
  }, [segmentActualDurations]);

  const totalVariance = totalActualDuration - totalTargetDuration;

  // Get status for a segment
  const getSegmentStatus = (segmentId: string) => {
    const target = segments.find(s => s.id === segmentId)?.target_duration || 0;
    const actual = segmentActualDurations.get(segmentId) || 0;
    const variance = actual - target;
    
    if (Math.abs(variance) < 30) return 'on-track';
    if (variance > 0) return 'over';
    return 'under';
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header Stats Bar */}
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Target Duration</div>
              <div className="font-mono text-lg font-semibold text-foreground">{formatDuration(totalTargetDuration)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Actual Duration</div>
              <div className="font-mono text-lg font-semibold text-foreground">{formatDuration(totalActualDuration)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Variance</div>
              <div className={cn(
                "font-mono text-lg font-semibold flex items-center gap-1",
                totalVariance > 60 && "text-runway-error",
                totalVariance < -60 && "text-runway-teal",
                Math.abs(totalVariance) <= 60 && "text-runway-success"
              )}>
                {totalVariance > 0 && <TrendingUp className="h-4 w-4" />}
                {totalVariance < 0 && <TrendingDown className="h-4 w-4" />}
                {totalVariance === 0 && <Minus className="h-4 w-4" />}
                {formatVariance(totalVariance)}
              </div>
            </div>
          </div>
          
          {showCountdown && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md",
              showCountdown.isLive ? "bg-runway-success/20" : "bg-muted/50"
            )}>
              <Clock className={cn("h-4 w-4", showCountdown.isLive ? "text-runway-success" : "text-primary")} />
              <span className={cn(
                "text-sm font-mono font-semibold",
                showCountdown.isLive && "text-runway-success"
              )}>
                {showCountdown.isLive ? "LIVE" : `T-${showCountdown.text}`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={goMode ? "default" : "outline"} 
                  size="sm" 
                  className={cn("h-8 gap-1.5", goMode && "bg-runway-success hover:bg-runway-success/90")}
                  onClick={() => setGoMode(!goMode)}
                >
                  <Timer className="h-3.5 w-3.5" />
                  GO Mode
                </Button>
              </TooltipTrigger>
              <TooltipContent>Simplified view for live show</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-3 bg-card">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 bg-background"
          />
        </div>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground">
          {cues.length} cue{cues.length !== 1 ? 's' : ''} • {segments.length} segment{segments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Segment-based Table */}
      <div className="flex-1 overflow-auto">
        {segmentsWithTiming.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No segments yet</p>
              <p className="text-sm mt-1">Create segments in the Segment Editor to organize your show</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {segmentsWithTiming.map((segment, segIndex) => {
              const segmentCues = filterCues(cuesBySegment.groups.get(segment.id) || []);
              const actualDuration = segmentActualDurations.get(segment.id) || 0;
              const variance = actualDuration - segment.target_duration;
              const status = getSegmentStatus(segment.id);
              const isCollapsed = collapsedSegments.has(segment.id);
              
              return (
                <Collapsible key={segment.id} open={!isCollapsed} onOpenChange={() => toggleSegment(segment.id)}>
                  {/* Segment Header Row */}
                  <div 
                    className="flex items-center gap-3 px-4 py-3 sticky top-0 z-20 border-b border-border"
                    style={{
                      backgroundColor: darkenColor(segment.color || '#6366f1', 0.35)
                    }}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    
                    {/* Segment color indicator */}
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: segment.color || '#6366f1' }}
                    />
                    
                    {/* Segment name and count */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{segment.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {segmentCues.length} cue{segmentCues.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Duration editing */}
                    <div className="flex items-center gap-4">
                      {/* Target Duration - Editable */}
                      <div className="text-center min-w-[100px]">
                        <div className="text-[9px] uppercase text-muted-foreground tracking-wider mb-0.5">Target</div>
                        {editingDuration === segment.id ? (
                          <Input
                            autoFocus
                            value={durationInput}
                            onChange={(e) => setDurationInput(e.target.value)}
                            onBlur={() => saveDuration(segment.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveDuration(segment.id);
                              if (e.key === 'Escape') setEditingDuration(null);
                            }}
                            className="h-7 w-20 text-center font-mono text-sm"
                            placeholder="MM:SS"
                          />
                        ) : (
                          <button
                            onClick={() => startEditingDuration(segment.id, segment.target_duration)}
                            className="font-mono text-sm font-medium hover:text-primary transition-colors cursor-text"
                          >
                            {formatDuration(segment.target_duration)}
                          </button>
                        )}
                      </div>
                      
                      {/* Actual Duration - Read only */}
                      <div className="text-center min-w-[80px]">
                        <div className="text-[9px] uppercase text-muted-foreground tracking-wider mb-0.5">Actual</div>
                        <div className="font-mono text-sm font-medium">{formatDuration(actualDuration)}</div>
                      </div>
                      
                      {/* Variance */}
                      <div className="text-center min-w-[80px]">
                        <div className="text-[9px] uppercase text-muted-foreground tracking-wider mb-0.5">Variance</div>
                        <div className={cn(
                          "font-mono text-sm font-medium flex items-center justify-center gap-1",
                          status === 'over' && "text-runway-error",
                          status === 'under' && "text-runway-teal",
                          status === 'on-track' && "text-runway-success"
                        )}>
                          {status === 'over' && <AlertTriangle className="h-3 w-3" />}
                          {status === 'on-track' && <CheckCircle2 className="h-3 w-3" />}
                          {formatVariance(variance)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Cues Table */}
                  <CollapsibleContent>
                    {segmentCues.length === 0 ? (
                      <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                        No cues in this segment
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-card">
                            <TableHead className="w-[50px] text-center text-xs bg-card">#</TableHead>
                            <TableHead className="text-xs bg-card">Cue Name</TableHead>
                            <TableHead className="w-[80px] text-xs bg-card">Duration</TableHead>
                            <TableHead className="w-[60px] text-xs bg-card">Type</TableHead>
                            {!goMode && <TableHead className="text-xs bg-card">Notes</TableHead>}
                            {!goMode && <TableHead className="w-[100px] text-right text-xs bg-card">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {segmentCues.map((cue, cueIndex) => (
                            <TableRow
                              key={cue.id}
                              className={cn(
                                "cursor-pointer transition-colors group",
                                selectedCueId === cue.id && "bg-primary/10 border-l-2 border-l-primary",
                                cueIndex % 2 === 1 && selectedCueId !== cue.id && "bg-muted/30"
                              )}
                              onClick={() => onCueSelect(cue.id, cue)}
                            >
                              <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                {segIndex + 1}.{cueIndex + 1}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className={cn("font-medium", goMode && "text-base")}>
                                  {cue.name}
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="font-mono text-xs">
                                  {formatDuration(timeToSeconds(cue.duration))}
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <span className="text-xs text-muted-foreground capitalize">
                                  {CUE_TYPE_LABELS[cue.cue_type || cue.type] || cue.type}
                                </span>
                              </TableCell>
                              {!goMode && (
                                <TableCell className="py-2">
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {cue.notes || '—'}
                                  </div>
                                </TableCell>
                              )}
                              {!goMode && (
                                <TableCell className="py-2">
                                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditCue(cue);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCueDuplicate(cue.id);
                                      }}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCueDelete(cue.id);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            
            {/* Unassigned cues */}
            {cuesBySegment.unassigned.length > 0 && (
              <div className="border-t border-border">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/50">
                  <AlertTriangle className="h-4 w-4 text-runway-warning" />
                  <span className="font-medium text-sm">Unassigned Cues</span>
                  <Badge variant="outline" className="text-[10px]">
                    {cuesBySegment.unassigned.length}
                  </Badge>
                </div>
                <Table>
                  <TableBody>
                    {filterCues(cuesBySegment.unassigned).map((cue, index) => (
                      <TableRow
                        key={cue.id}
                        className={cn(
                          "cursor-pointer transition-colors group",
                          selectedCueId === cue.id && "bg-primary/10",
                          index % 2 === 1 && selectedCueId !== cue.id && "bg-muted/30"
                        )}
                        onClick={() => onCueSelect(cue.id, cue)}
                      >
                        <TableCell className="w-[50px] text-center font-mono text-xs text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="font-medium">{cue.name}</div>
                        </TableCell>
                        <TableCell className="w-[80px] py-2">
                          <div className="font-mono text-xs">{formatDuration(timeToSeconds(cue.duration))}</div>
                        </TableCell>
                        <TableCell className="w-[60px] py-2">
                          <span className="text-xs text-muted-foreground capitalize">
                            {CUE_TYPE_LABELS[cue.cue_type || cue.type] || cue.type}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {cue.notes || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[100px] py-2">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditCue(cue);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-card flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Segments:</span>
          <span className="font-mono font-medium text-foreground">{segments.length}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Clock:</span>
          <span className="font-mono font-medium text-foreground">
            {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TableView;
