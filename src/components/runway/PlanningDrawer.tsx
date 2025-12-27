import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutGrid,
  Sparkles,
  FileText,
  GripVertical,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  X,
  Check,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// Segment types
export interface Segment {
  id: string;
  name: string;
  targetDuration: number; // in seconds
  actualDuration: number; // calculated from cues
  cueCount: number;
  status: 'empty' | 'balanced' | 'overloaded';
}

// Moment marker types
type MomentType = 'walk-in' | 'transition' | 'applause' | 'reveal' | 'reset' | 'blackout';

interface Moment {
  id: string;
  type: MomentType;
  label: string;
  notes?: string;
  timePosition: number; // in seconds on timeline
}

// Planning note types
type NoteScope = 'show' | 'segment' | 'cue';

interface PlanningNote {
  id: string;
  scope: NoteScope;
  scopeId?: string; // segment or cue id if scoped
  scopeName?: string;
  content: string;
  createdAt: Date;
}

interface PlanningDrawerProps {
  showId?: string | null;
  segments?: Segment[];
  moments?: Moment[];
  notes?: PlanningNote[];
  onSegmentClick?: (segmentId: string) => void;
  onSegmentReorder?: (segmentId: string, newIndex: number) => void;
  onSegmentCreate?: (name: string, targetDuration: number) => void;
  onSegmentUpdate?: (segmentId: string, name: string, targetDuration: number) => void;
  onSegmentDelete?: (segmentId: string) => void;
  onAddMoment?: (type: MomentType, label: string, notes?: string) => void;
  onRemoveMoment?: (momentId: string) => void;
  onAddNote?: (scope: NoteScope, scopeId: string | undefined, content: string) => void;
  onRemoveNote?: (noteId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

const MOMENT_TYPES: { type: MomentType; label: string; icon: string }[] = [
  { type: 'walk-in', label: 'Walk-in', icon: '🚶' },
  { type: 'transition', label: 'Transition', icon: '↔️' },
  { type: 'applause', label: 'Applause', icon: '👏' },
  { type: 'reveal', label: 'Reveal', icon: '✨' },
  { type: 'reset', label: 'Reset', icon: '🔄' },
  { type: 'blackout', label: 'Blackout', icon: '⬛' },
];

// Format duration in seconds to readable string
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Parse duration string (MM:SS or M:SS) to seconds
const parseDuration = (durationStr: string): number => {
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  return 0;
};

const PlanningDrawer: React.FC<PlanningDrawerProps> = ({
  showId,
  segments = [],
  moments = [],
  notes = [],
  onSegmentClick,
  onSegmentReorder,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentDelete,
  onAddMoment,
  onRemoveMoment,
  onAddNote,
  onRemoveNote,
  isExpanded = true,
  onToggleExpand,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'moments' | 'notes'>('structure');
  const [newMomentType, setNewMomentType] = useState<MomentType>('transition');
  const [newMomentLabel, setNewMomentLabel] = useState('');
  const [newMomentNotes, setNewMomentNotes] = useState('');
  const [newNoteScope, setNewNoteScope] = useState<NoteScope>('show');
  const [newNoteContent, setNewNoteContent] = useState('');
  
  // Segment editing state
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [newSegmentDuration, setNewSegmentDuration] = useState('15:00');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editSegmentName, setEditSegmentName] = useState('');
  const [editSegmentDuration, setEditSegmentDuration] = useState('');

  const handleAddMoment = useCallback(() => {
    if (!newMomentLabel.trim()) return;
    onAddMoment?.(newMomentType, newMomentLabel, newMomentNotes || undefined);
    setNewMomentLabel('');
    setNewMomentNotes('');
  }, [newMomentType, newMomentLabel, newMomentNotes, onAddMoment]);

  const handleAddNote = useCallback(() => {
    if (!newNoteContent.trim()) return;
    onAddNote?.(newNoteScope, undefined, newNoteContent);
    setNewNoteContent('');
  }, [newNoteScope, newNoteContent, onAddNote]);

  const handleCreateSegment = useCallback(() => {
    if (!newSegmentName.trim()) return;
    const durationSeconds = parseDuration(newSegmentDuration);
    onSegmentCreate?.(newSegmentName.trim(), durationSeconds || 900);
    setNewSegmentName('');
    setNewSegmentDuration('15:00');
    setIsAddingSegment(false);
  }, [newSegmentName, newSegmentDuration, onSegmentCreate]);

  const handleStartEdit = useCallback((segment: Segment) => {
    setEditingSegmentId(segment.id);
    setEditSegmentName(segment.name);
    setEditSegmentDuration(formatDuration(segment.targetDuration));
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingSegmentId || !editSegmentName.trim()) return;
    const durationSeconds = parseDuration(editSegmentDuration);
    onSegmentUpdate?.(editingSegmentId, editSegmentName.trim(), durationSeconds || 900);
    setEditingSegmentId(null);
    setEditSegmentName('');
    setEditSegmentDuration('');
  }, [editingSegmentId, editSegmentName, editSegmentDuration, onSegmentUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditingSegmentId(null);
    setEditSegmentName('');
    setEditSegmentDuration('');
  }, []);

  const handleMoveSegment = useCallback((segmentId: string, direction: 'up' | 'down') => {
    const currentIndex = segments.findIndex(s => s.id === segmentId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= segments.length) return;
    
    onSegmentReorder?.(segmentId, newIndex);
  }, [segments, onSegmentReorder]);

  const getStatusIcon = (status: Segment['status']) => {
    switch (status) {
      case 'empty':
        return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'balanced':
        return <CheckCircle2 className="h-3.5 w-3.5 text-runway-success" />;
      case 'overloaded':
        return <AlertCircle className="h-3.5 w-3.5 text-runway-warning" />;
    }
  };

  const getStatusColor = (status: Segment['status']) => {
    switch (status) {
      case 'empty':
        return 'border-muted-foreground/30 bg-muted/30';
      case 'balanced':
        return 'border-runway-success/30 bg-runway-success/10';
      case 'overloaded':
        return 'border-runway-warning/30 bg-runway-warning/10';
    }
  };

  if (!isExpanded) {
    return (
      <div className={cn(
        "border-t border-border bg-card",
        className
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="w-full h-10 rounded-none justify-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Planning Tools</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "border-t border-border bg-card flex flex-col",
      className
    )}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1">
          <TabsList className="h-8 bg-muted/50">
            <TabsTrigger value="structure" className="text-xs h-7 px-3 gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              Structure
              {segments.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                  {segments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="moments" className="text-xs h-7 px-3 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Moments
              {moments.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                  {moments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs h-7 px-3 gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Notes
              {notes.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                  {notes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="h-7 w-7 p-0 ml-2"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'structure' && (
          <ScrollArea className="h-48">
            <div className="p-4 space-y-2">
              {/* Add segment button/form */}
              {isAddingSegment ? (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-primary/50 bg-primary/5">
                  <Input
                    value={newSegmentName}
                    onChange={(e) => setNewSegmentName(e.target.value)}
                    placeholder="Segment name..."
                    className="h-7 text-xs flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSegment();
                      if (e.key === 'Escape') setIsAddingSegment(false);
                    }}
                  />
                  <Input
                    value={newSegmentDuration}
                    onChange={(e) => setNewSegmentDuration(e.target.value)}
                    placeholder="MM:SS"
                    className="h-7 text-xs w-20"
                  />
                  <Button
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCreateSegment}
                    disabled={!newSegmentName.trim()}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setIsAddingSegment(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 border-dashed"
                  onClick={() => setIsAddingSegment(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Segment
                </Button>
              )}

              {segments.length === 0 && !isAddingSegment ? (
                <div className="text-center py-6 text-muted-foreground">
                  <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No segments defined</p>
                  <p className="text-xs mt-1">Segments help organize your show into logical sections</p>
                </div>
              ) : (
                segments.map((segment, index) => (
                  <div
                    key={segment.id}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-colors group",
                      editingSegmentId === segment.id 
                        ? "border-primary bg-primary/5" 
                        : cn("cursor-pointer hover:bg-muted/50", getStatusColor(segment.status))
                    )}
                  >
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSegment(segment.id, 'up');
                        }}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        disabled={index === segments.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSegment(segment.id, 'down');
                        }}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {editingSegmentId === segment.id ? (
                      <>
                        <Input
                          value={editSegmentName}
                          onChange={(e) => setEditSegmentName(e.target.value)}
                          className="h-7 text-xs flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Input
                          value={editSegmentDuration}
                          onChange={(e) => setEditSegmentDuration(e.target.value)}
                          placeholder="MM:SS"
                          className="h-7 text-xs w-20"
                        />
                        <Button
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={handleSaveEdit}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div 
                          className="flex-1 min-w-0"
                          onClick={() => onSegmentClick?.(segment.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{segment.name}</span>
                            {getStatusIcon(segment.status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(segment.actualDuration)} / {formatDuration(segment.targetDuration)}
                            </span>
                            <span>{segment.cueCount} cues</span>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(segment);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit segment</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSegmentDelete?.(segment.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete segment</TooltipContent>
                          </Tooltip>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}

        {activeTab === 'moments' && (
          <ScrollArea className="h-48">
            <div className="p-4 space-y-4">
              {/* Add moment form */}
              <div className="flex items-start gap-2">
                <div className="flex flex-wrap gap-1">
                  {MOMENT_TYPES.map((m) => (
                    <Tooltip key={m.type}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={newMomentType === m.type ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setNewMomentType(m.type)}
                        >
                          {m.icon}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{m.label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <Input
                  value={newMomentLabel}
                  onChange={(e) => setNewMomentLabel(e.target.value)}
                  placeholder="Label..."
                  className="h-7 text-xs flex-1"
                />
                <Button
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleAddMoment}
                  disabled={!newMomentLabel.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Moment list */}
              {moments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No moments added yet</p>
                  <p className="text-xs mt-1">Moments are intent markers, not executable cues</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {moments.map((moment) => {
                    const momentType = MOMENT_TYPES.find(m => m.type === moment.type);
                    return (
                      <div
                        key={moment.id}
                        className="flex items-center gap-2 p-2 rounded bg-muted/30 group"
                      >
                        <span className="text-sm">{momentType?.icon}</span>
                        <span className="text-sm flex-1">{moment.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(moment.timePosition)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onRemoveMoment?.(moment.id)}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {activeTab === 'notes' && (
          <ScrollArea className="h-48">
            <div className="p-4 space-y-4">
              {/* Add note form */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={newNoteScope}
                    onChange={(e) => setNewNoteScope(e.target.value as NoteScope)}
                    className="h-7 px-2 text-xs rounded border border-input bg-background"
                  >
                    <option value="show">Entire Show</option>
                    <option value="segment">Segment</option>
                    <option value="cue">Cue</option>
                  </select>
                  <Button
                    size="sm"
                    className="h-7 px-2 ml-auto"
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                <Textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Add a planning note..."
                  className="text-xs min-h-[60px] resize-none"
                />
              </div>

              {/* Notes list */}
              {notes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No notes yet</p>
                  <p className="text-xs mt-1">Notes persist into rehearsal as reminders</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-2 rounded bg-muted/30 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] h-4">
                          {note.scope === 'show' ? 'Show' : note.scopeName || note.scope}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onRemoveNote?.(note.id)}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <p className="text-xs text-foreground">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default PlanningDrawer;
