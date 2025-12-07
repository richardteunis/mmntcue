import React, { useState } from 'react';
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
  GripVertical,
  ChevronUp,
  ChevronDown,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableViewProps {
  cues: Cue[];
  selectedCueId: string | null;
  onCueSelect: (id: string | null, cue: Cue | null) => void;
  onCueUpdate: (cue: Cue) => void;
  onCueDelete: (id: string) => void;
  onCueDuplicate: (id: string) => void;
  onEditCue: (cue: Cue) => void;
}

type SortField = 'name' | 'type' | 'track' | 'start_time' | 'duration' | 'order_index';
type SortDirection = 'asc' | 'desc';

const TableView: React.FC<TableViewProps> = ({
  cues,
  selectedCueId,
  onCueSelect,
  onCueUpdate,
  onCueDelete,
  onCueDuplicate,
  onEditCue
}) => {
  const [sortField, setSortField] = useState<SortField>('order_index');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

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
      case 'audio': return 'bg-runway-teal text-white';
      case 'video': return 'bg-runway-success text-white';
      case 'lighting': return 'bg-runway-highlight text-white';
      case 'stage': return 'bg-runway-warning text-white';
      default: return 'bg-muted';
    }
  };

  const filteredAndSortedCues = [...cues]
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
          comparison = a.start_time.localeCompare(b.start_time);
          break;
        case 'duration':
          comparison = a.duration.localeCompare(b.duration);
          break;
        case 'order_index':
          comparison = a.order_index - b.order_index;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleCellEdit = (cue: Cue, field: keyof Cue, value: string) => {
    onCueUpdate({ ...cue, [field]: value });
    setEditingCell(null);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4" /> 
      : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="p-4 border-b border-border flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="lighting">Lighting</SelectItem>
            <SelectItem value="stage">Stage</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedCues.length} cues
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[40px]">#</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Name <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors w-[120px]"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-2">
                  Type <SortIcon field="type" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('track')}
              >
                <div className="flex items-center gap-2">
                  Track <SortIcon field="track" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors w-[100px]"
                onClick={() => handleSort('start_time')}
              >
                <div className="flex items-center gap-2">
                  Start <SortIcon field="start_time" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors w-[100px]"
                onClick={() => handleSort('duration')}
              >
                <div className="flex items-center gap-2">
                  Duration <SortIcon field="duration" />
                </div>
              </TableHead>
              <TableHead className="w-[200px]">Notes</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCues.map((cue, index) => (
              <TableRow 
                key={cue.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedCueId === cue.id && "bg-primary/10"
                )}
                onClick={() => onCueSelect(cue.id, cue)}
              >
                <TableCell className="font-mono text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 opacity-50" />
                    {index + 1}
                  </div>
                </TableCell>
                <TableCell>
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
                      className="h-8"
                    />
                  ) : (
                    <div 
                      className="font-medium hover:text-primary cursor-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingCell({ id: cue.id, field: 'name' });
                      }}
                    >
                      {cue.name}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={cn("capitalize", getTypeColor(cue.type))}>
                    {cue.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{cue.track}</TableCell>
                <TableCell className="font-mono text-sm">{cue.start_time}</TableCell>
                <TableCell className="font-mono text-sm">{cue.duration}</TableCell>
                <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                  {cue.notes || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCue(cue);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCueDuplicate(cue.id);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCueDelete(cue.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredAndSortedCues.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No cues found. Add your first cue to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TableView;
