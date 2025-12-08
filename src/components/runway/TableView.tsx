import React, { useState, useMemo } from 'react';
import { Cue } from '@/types/cue';
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
  ArrowUpDown, 
  Pencil, 
  Trash2, 
  Copy, 
  ChevronUp,
  ChevronDown,
  Search,
  Plus,
  ChevronRight,
  Columns,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TableViewProps {
  cues: Cue[];
  selectedCueId: string | null;
  onCueSelect: (id: string | null, cue: Cue | null) => void;
  onCueUpdate: (cue: Cue) => void;
  onCueDelete: (id: string) => void;
  onCueDuplicate: (id: string) => void;
  onEditCue: (cue: Cue) => void;
  showCountdown?: { text: string; isLive: boolean } | null;
}

type SortField = 'name' | 'type' | 'track' | 'start_time' | 'duration';
type SortDirection = 'asc' | 'desc';

// Track columns that can be toggled
const TRACK_COLUMNS = [
  { id: 'audio', label: 'Audio', color: 'bg-runway-teal' },
  { id: 'video', label: 'Video', color: 'bg-runway-success' },
  { id: 'lighting', label: 'Lights', color: 'bg-runway-highlight' },
  { id: 'stage', label: 'Stage', color: 'bg-runway-warning' },
];

// Helper to convert time string to seconds for sorting
const timeToSeconds = (timeString: string): number => {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

// Format time for display (show relative time from start)
const formatStartTime = (timeString: string): string => {
  const parts = timeString.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  
  // For show timing, use 12-hour format starting from noon
  const totalMinutes = hours * 60 + minutes;
  const displayHour = Math.floor((12 * 60 + totalMinutes) / 60) % 12 || 12;
  const displayMinutes = (minutes).toString().padStart(2, '0');
  const displaySeconds = seconds > 0 ? `:${seconds.toString().padStart(2, '0')}` : '';
  const ampm = totalMinutes >= 720 ? 'pm' : 'pm'; // Assuming afternoon show
  
  return `${displayHour}:${displayMinutes}${displaySeconds}${ampm}`;
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

const TableView: React.FC<TableViewProps> = ({
  cues,
  selectedCueId,
  onCueSelect,
  onCueUpdate,
  onCueDelete,
  onCueDuplicate,
  onEditCue,
  showCountdown
}) => {
  const [sortField, setSortField] = useState<SortField>('start_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['audio', 'video', 'lighting', 'stage']);
  const [goMode, setGoMode] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'audio': return 'bg-runway-teal/20 border-runway-teal/50';
      case 'video': return 'bg-runway-success/20 border-runway-success/50';
      case 'lighting': return 'bg-runway-highlight/20 border-runway-highlight/50';
      case 'stage': return 'bg-runway-warning/20 border-runway-warning/50';
      default: return 'bg-muted';
    }
  };

  const getTrackHeaderColor = (type: string) => {
    switch (type) {
      case 'audio': return 'bg-runway-teal/10';
      case 'video': return 'bg-runway-success/10';
      case 'lighting': return 'bg-runway-highlight/10';
      case 'stage': return 'bg-runway-warning/10';
      default: return '';
    }
  };

  const filteredAndSortedCues = useMemo(() => {
    return [...cues]
      .filter(cue => {
        const matchesType = filterType === 'all' || cue.type === filterType;
        const matchesSearch = cue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             cue.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
          case 'track':
            comparison = a.track.localeCompare(b.track);
            break;
          case 'start_time':
            comparison = timeToSeconds(a.start_time) - timeToSeconds(b.start_time);
            break;
          case 'duration':
            comparison = timeToSeconds(a.duration) - timeToSeconds(b.duration);
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [cues, filterType, searchTerm, sortField, sortDirection]);

  // Group cues by track type for display in columns
  const getCueForTrack = (cue: Cue, trackType: string): string | null => {
    if (cue.type === trackType || cue.track.toLowerCase().includes(trackType)) {
      return cue.notes || cue.name;
    }
    return null;
  };

  const handleCellEdit = (cue: Cue, field: keyof Cue, value: string) => {
    onCueUpdate({ ...cue, [field]: value });
    setEditingCell(null);
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(c => c !== columnId)
        : [...prev, columnId]
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3" /> 
      : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card/80 backdrop-blur">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 bg-background"
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="lighting">Lighting</SelectItem>
            <SelectItem value="stage">Stage</SelectItem>
          </SelectContent>
        </Select>

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

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={goMode ? "default" : "outline"} 
              size="sm" 
              className={cn("h-8 gap-1.5", goMode && "bg-runway-success hover:bg-runway-success/90")}
              onClick={() => setGoMode(!goMode)}
            >
              <Clock className="h-3.5 w-3.5" />
              GO Mode
            </Button>
          </TooltipTrigger>
          <TooltipContent>Simplified view for live show operation</TooltipContent>
        </Tooltip>

        {showCountdown && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded",
            showCountdown.isLive ? "bg-runway-success/20" : "bg-muted/50"
          )}>
            <Clock className={cn("h-3.5 w-3.5", showCountdown.isLive ? "text-runway-success" : "text-primary")} />
            <span className={cn(
              "text-xs font-mono font-medium",
              showCountdown.isLive && "text-runway-success"
            )}>
              {showCountdown.isLive ? "LIVE" : `T-${showCountdown.text}`}
            </span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {filteredAndSortedCues.length} cue{filteredAndSortedCues.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Run of Show Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-transparent border-b-2 border-border">
              <TableHead className="w-[40px] text-center font-semibold text-xs">#</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors min-w-[200px]"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  Items <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors w-[100px]"
                onClick={() => handleSort('start_time')}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <ChevronDown className="h-3 w-3" /> Start <SortIcon field="start_time" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors w-[80px]"
                onClick={() => handleSort('duration')}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  Duration <SortIcon field="duration" />
                </div>
              </TableHead>
              {!goMode && (
                <TableHead className="w-[120px]">
                  <div className="text-xs font-semibold">Notes</div>
                </TableHead>
              )}
              {visibleColumns.map(colId => {
                const col = TRACK_COLUMNS.find(c => c.id === colId);
                if (!col) return null;
                return (
                  <TableHead 
                    key={col.id} 
                    className={cn("w-[100px] text-center", getTrackHeaderColor(col.id))}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                      <ChevronDown className="h-3 w-3 opacity-50" />
                      {col.label}
                    </div>
                  </TableHead>
                );
              })}
              {!goMode && (
                <TableHead className="w-[80px] text-right">
                  <div className="text-xs font-semibold">Actions</div>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCues.map((cue, index) => (
              <TableRow 
                key={cue.id}
                className={cn(
                  "cursor-pointer transition-colors group",
                  selectedCueId === cue.id && "bg-primary/10 border-l-2 border-l-primary",
                  goMode && "h-14"
                )}
                onClick={() => onCueSelect(cue.id, cue)}
              >
                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="py-2">
                  {editingCell?.id === cue.id && editingCell?.field === 'name' ? (
                    <Input
                      autoFocus
                      defaultValue={cue.name}
                      onBlur={(e) => handleCellEdit(cue, 'name', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellEdit(cue, 'name', e.currentTarget.value);
                        }
                        if (e.key === 'Escape') {
                          setEditingCell(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-sm"
                    />
                  ) : (
                    <div 
                      className={cn(
                        "font-medium hover:text-primary cursor-text",
                        goMode && "text-base"
                      )}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingCell({ id: cue.id, field: 'name' });
                      }}
                    >
                      {cue.name}
                    </div>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  {editingCell?.id === cue.id && editingCell?.field === 'start_time' ? (
                    <Input
                      autoFocus
                      defaultValue={cue.start_time}
                      onBlur={(e) => handleCellEdit(cue, 'start_time', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellEdit(cue, 'start_time', e.currentTarget.value);
                        }
                        if (e.key === 'Escape') {
                          setEditingCell(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 font-mono text-xs"
                    />
                  ) : (
                    <div 
                      className={cn(
                        "font-mono text-xs hover:text-primary cursor-text",
                        goMode && "text-sm font-medium"
                      )}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingCell({ id: cue.id, field: 'start_time' });
                      }}
                    >
                      {formatStartTime(cue.start_time)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  {editingCell?.id === cue.id && editingCell?.field === 'duration' ? (
                    <Input
                      autoFocus
                      defaultValue={cue.duration}
                      onBlur={(e) => handleCellEdit(cue, 'duration', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellEdit(cue, 'duration', e.currentTarget.value);
                        }
                        if (e.key === 'Escape') {
                          setEditingCell(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 font-mono text-xs"
                    />
                  ) : (
                    <div 
                      className={cn(
                        "font-mono text-xs hover:text-primary cursor-text",
                        goMode && "text-sm"
                      )}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingCell({ id: cue.id, field: 'duration' });
                      }}
                    >
                      {formatDuration(cue.duration)}
                    </div>
                  )}
                </TableCell>
                {!goMode && (
                  <TableCell className="py-2">
                    <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {cue.notes || '—'}
                    </div>
                  </TableCell>
                )}
                {visibleColumns.map(colId => {
                  const isActiveColumn = cue.type === colId;
                  return (
                    <TableCell 
                      key={colId} 
                      className={cn(
                        "py-2 text-center",
                        isActiveColumn && getTypeColor(colId)
                      )}
                    >
                      {isActiveColumn && (
                        <div className="text-xs truncate px-1">
                          {cue.notes || cue.name.slice(0, 15)}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
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
            {filteredAndSortedCues.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={5 + visibleColumns.length + (goMode ? 0 : 1)} 
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

      {/* Time Stats Footer */}
      <div className="px-4 py-2 border-t border-border bg-card/80 flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Over/Under:</span>
          <span className="font-mono font-medium text-foreground">00:00</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total Run Time:</span>
          <span className="font-mono font-medium text-foreground">
            {(() => {
              const totalSeconds = filteredAndSortedCues.reduce((acc, cue) => acc + timeToSeconds(cue.duration), 0);
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;
              return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            })()}
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Current Time:</span>
          <span className="font-mono font-medium text-foreground">
            {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TableView;
