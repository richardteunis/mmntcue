import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LayoutGrid,
  Plus,
  Clock,
  Trash2,
  Pencil,
  X,
  Check,
  GripVertical,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Predefined segment colors
const SEGMENT_COLORS = [
  '#14B8A6', // teal
  '#22C55E', // green
  '#EAB308', // yellow
  '#F97316', // orange
  '#EF4444', // red
  '#8B5CF6', // purple
  '#3B82F6', // blue
  '#EC4899', // pink
  '#6366F1', // indigo
  '#84CC16', // lime
];

export interface Segment {
  id: string;
  name: string;
  targetDuration: number;
  actualDuration: number;
  cueCount: number;
  status: 'empty' | 'balanced' | 'overloaded';
  color?: string | null;
}

interface SegmentEditorBinProps {
  segments?: Segment[];
  onSegmentClick?: (segmentId: string) => void;
  onSegmentReorder?: (segmentId: string, newIndex: number) => void;
  onSegmentCreate?: (name: string, targetDuration: number, color?: string) => void;
  onSegmentUpdate?: (segmentId: string, name: string, targetDuration: number, color?: string) => void;
  onSegmentColorChange?: (segmentId: string, color: string) => void;
  onSegmentDelete?: (segmentId: string) => void;
  disabled?: boolean;
}

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

const SegmentEditorBin: React.FC<SegmentEditorBinProps> = ({
  segments = [],
  onSegmentClick,
  onSegmentReorder,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentColorChange,
  onSegmentDelete,
  disabled = false,
}) => {
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [newSegmentDuration, setNewSegmentDuration] = useState('15:00');
  const [newSegmentColor, setNewSegmentColor] = useState(SEGMENT_COLORS[0]);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editSegmentName, setEditSegmentName] = useState('');
  const [editSegmentDuration, setEditSegmentDuration] = useState('');
  
  // Drag and drop state
  const [draggedSegmentId, setDraggedSegmentId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleCreateSegment = useCallback(() => {
    if (!newSegmentName.trim()) return;
    const durationSeconds = parseDuration(newSegmentDuration);
    onSegmentCreate?.(newSegmentName.trim(), durationSeconds || 900, newSegmentColor);
    setNewSegmentName('');
    setNewSegmentDuration('15:00');
    setIsAddingSegment(false);
  }, [newSegmentName, newSegmentDuration, newSegmentColor, onSegmentCreate]);

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

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, segmentId: string) => {
    if (disabled) return;
    setDraggedSegmentId(segmentId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', segmentId);
    // Add a slight delay to show the dragging state
    setTimeout(() => {
      const element = e.target as HTMLElement;
      element.style.opacity = '0.5';
    }, 0);
  }, [disabled]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const element = e.target as HTMLElement;
    element.style.opacity = '1';
    setDraggedSegmentId(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }, [dragOverIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedSegmentId) return;
    
    const sourceIndex = segments.findIndex(s => s.id === draggedSegmentId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      setDraggedSegmentId(null);
      setDragOverIndex(null);
      return;
    }
    
    onSegmentReorder?.(draggedSegmentId, targetIndex);
    setDraggedSegmentId(null);
    setDragOverIndex(null);
  }, [draggedSegmentId, segments, onSegmentReorder]);

  return (
    <div className="flex flex-col h-full bg-card/50 rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Segment Editor</span>
          {segments.length > 0 && (
            <span className="text-xs text-muted-foreground">({segments.length})</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setIsAddingSegment(true)}
          disabled={disabled || isAddingSegment}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 space-y-1.5">
          {/* Add segment form */}
          {isAddingSegment && (
            <div className="flex items-center gap-1.5 p-2 rounded-md border border-primary/50 bg-primary/5">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-4 h-8 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all flex-shrink-0"
                    style={{ backgroundColor: newSegmentColor }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {SEGMENT_COLORS.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          "w-5 h-5 rounded cursor-pointer hover:scale-110 transition-transform border-2",
                          newSegmentColor === color ? "border-foreground" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewSegmentColor(color)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                placeholder="Name..."
                className="h-6 text-xs flex-1 min-w-0"
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
                className="h-6 text-xs w-14"
              />
              <Button
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleCreateSegment}
                disabled={!newSegmentName.trim()}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setIsAddingSegment(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Empty state */}
          {segments.length === 0 && !isAddingSegment && (
            <div className="text-center py-6 text-muted-foreground">
              <LayoutGrid className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No segments</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs h-7"
                onClick={() => setIsAddingSegment(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Segment
              </Button>
            </div>
          )}

          {/* Segment list */}
          {segments.map((segment, index) => (
            <div key={segment.id}>
              {/* Drop indicator before this segment */}
              {dragOverIndex === index && draggedSegmentId !== segment.id && (
                <div className="h-0.5 bg-primary rounded-full mx-1 my-0.5" />
              )}
              <div
                draggable={!disabled && editingSegmentId !== segment.id}
                onDragStart={(e) => handleDragStart(e, segment.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "flex items-center gap-1.5 p-1.5 rounded-md border transition-colors group",
                  editingSegmentId === segment.id
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:bg-muted/50",
                  draggedSegmentId === segment.id && "opacity-50",
                  !disabled && editingSegmentId !== segment.id && "cursor-grab active:cursor-grabbing"
                )}
              >
                {/* Drag handle */}
                <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-50 group-hover:opacity-100" />
                
                {/* Color indicator with picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="w-2 h-8 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all flex-shrink-0"
                      style={{ backgroundColor: segment.color || '#6B7280' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="grid grid-cols-5 gap-1">
                      {SEGMENT_COLORS.map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-5 h-5 rounded cursor-pointer hover:scale-110 transition-transform border-2",
                            segment.color === color ? "border-foreground" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => onSegmentColorChange?.(segment.id, color)}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

              {editingSegmentId === segment.id ? (
                <>
                  <Input
                    value={editSegmentName}
                    onChange={(e) => setEditSegmentName(e.target.value)}
                    className="h-6 text-xs flex-1 min-w-0"
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
                    className="h-6 text-xs w-14"
                  />
                  <Button size="sm" className="h-6 w-6 p-0" onClick={handleSaveEdit}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancelEdit}>
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <div 
                    className="flex-1 min-w-0"
                    onClick={() => onSegmentClick?.(segment.id)}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium truncate">{segment.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{formatDuration(segment.targetDuration)}</span>
                      <span className="opacity-50">•</span>
                      <span>{segment.cueCount} cues</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(segment);
                      }}
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSegmentDelete?.(segment.id);
                      }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </>
              )}
              </div>
              {/* Drop indicator after last segment */}
              {index === segments.length - 1 && dragOverIndex === segments.length && (
                <div className="h-0.5 bg-primary rounded-full mx-1 my-0.5" />
              )}
            </div>
          ))}
          
          {/* Drop zone for dropping at the end */}
          {segments.length > 0 && (
            <div
              className="h-4 rounded"
              onDragOver={(e) => handleDragOver(e, segments.length)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, segments.length)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SegmentEditorBin;
