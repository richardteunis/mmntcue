import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  LayoutList, 
  Plus, 
  GripVertical, 
  Trash2, 
  Clock,
  Maximize2,
  Check
} from 'lucide-react';

export interface Segment {
  id: string;
  name: string;
  startTime?: number;
  endTime?: number;
  targetDuration: number;
  actualDuration?: number;
  cueCount?: number;
  status?: 'empty' | 'balanced' | 'overloaded';
  color?: string | null;
}

interface SegmentEditorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segments: Segment[];
  onSegmentClick?: (segmentId: string) => void;
  onSegmentReorder?: (segmentId: string, newIndex: number) => void;
  onSegmentCreate?: (name: string, targetDuration: number, color?: string) => void;
  onSegmentUpdate?: (segmentId: string, name: string, targetDuration: number, color?: string) => void;
  onSegmentColorChange?: (segmentId: string, color: string) => void;
  onSegmentDelete?: (segmentId: string) => void;
  disabled?: boolean;
}

const SEGMENT_COLORS = [
  '#14B8A6', // teal
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EF4444', // red
  '#22C55E', // green
  '#3B82F6', // blue
  '#EC4899', // pink
  '#F97316', // orange
];

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const SegmentEditorPanel: React.FC<SegmentEditorPanelProps> = ({
  open,
  onOpenChange,
  segments,
  onSegmentClick,
  onSegmentReorder,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentColorChange,
  onSegmentDelete,
  disabled = false,
}) => {
  const [newSegmentName, setNewSegmentName] = useState('');
  const [newSegmentDuration, setNewSegmentDuration] = useState('10:00');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  
  // Mouse-based drag and drop state
  const [dragging, setDragging] = useState<{ id: string; startY: number; startIndex: number } | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCreateSegment = useCallback(() => {
    if (!newSegmentName.trim()) return;
    const parts = newSegmentDuration.split(':').map(Number);
    const seconds = (parts[0] || 0) * 60 + (parts[1] || 0);
    onSegmentCreate?.(newSegmentName, seconds);
    setNewSegmentName('');
    setNewSegmentDuration('10:00');
  }, [newSegmentName, newSegmentDuration, onSegmentCreate]);

  const handleStartEdit = (segment: Segment) => {
    setEditingId(segment.id);
    setEditName(segment.name);
    setEditDuration(formatDuration(segment.targetDuration));
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const parts = editDuration.split(':').map(Number);
    const seconds = (parts[0] || 0) * 60 + (parts[1] || 0);
    onSegmentUpdate?.(editingId, editName, seconds);
    setEditingId(null);
  };

  // Mouse-based drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, segmentId: string, index: number) => {
    if (disabled || editingId) return;
    e.preventDefault();
    setDragging({ id: segmentId, startY: e.clientY, startIndex: index });
  }, [disabled, editingId]);

  // Effect to handle mouse move and mouse up
  useEffect(() => {
    if (!dragging) return;

    let rafId: number | null = null;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Use requestAnimationFrame for smoother updates
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        
        const items = containerRef.current.querySelectorAll('[data-segment-item]');
        let newDropIndex = segments.length;
        
        for (let i = 0; i < items.length; i++) {
          const rect = items[i].getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            newDropIndex = i;
            break;
          }
        }
        
        setDropIndex(newDropIndex);
      });
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      
      if (dropIndex !== null && dropIndex !== dragging.startIndex && dropIndex !== dragging.startIndex + 1) {
        const adjustedIndex = dropIndex > dragging.startIndex ? dropIndex - 1 : dropIndex;
        onSegmentReorder?.(dragging.id, adjustedIndex);
      }
      setDragging(null);
      setDropIndex(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dropIndex, segments.length, onSegmentReorder]);

  const totalDuration = segments.reduce((sum, s) => sum + s.targetDuration, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-[400px] sm:max-w-[400px] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-primary" />
              <SheetTitle className="text-base">Segments</SheetTitle>
              <span className="text-xs text-muted-foreground">({segments.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-2">
                Total: {formatDuration(totalDuration)}
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Add New Segment */}
        <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Segment name..."
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value)}
              className="h-8 text-sm flex-1"
              disabled={disabled}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSegment()}
            />
            <Input
              type="text"
              value={newSegmentDuration}
              onChange={(e) => setNewSegmentDuration(e.target.value)}
              className="h-8 text-sm w-20 text-center font-mono"
              placeholder="mm:ss"
              disabled={disabled}
            />
            <Button 
              size="sm" 
              className="h-8"
              onClick={handleCreateSegment}
              disabled={disabled || !newSegmentName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Segments List */}
        <ScrollArea className="flex-1">
          <div 
            ref={containerRef}
            className="p-2 space-y-1"
          >
            {segments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <LayoutList className="h-8 w-8 mb-3 opacity-50" />
                <p className="text-sm">No segments yet</p>
                <p className="text-xs">Add a segment to structure your show</p>
              </div>
            ) : (
              segments.map((segment, index) => (
                <div key={segment.id} data-segment-item>
                  {/* Drop indicator */}
                  {dropIndex === index && dragging?.id !== segment.id && (
                    <div className="h-1 bg-primary rounded-full mx-2 my-0.5" />
                  )}
                  <div
                    className={cn(
                      "group flex items-center gap-2 p-2 rounded-lg border border-border/50",
                      "hover:border-border hover:bg-muted/30 transition-colors",
                      editingId === segment.id && "ring-2 ring-primary/50",
                      dragging?.id === segment.id && "opacity-50 ring-2 ring-primary",
                      !disabled && editingId !== segment.id && "select-none"
                    )}
                  >
                    {/* Drag handle */}
                    <div 
                      className="cursor-grab active:cursor-grabbing text-muted-foreground group-hover:text-foreground"
                      onMouseDown={(e) => handleMouseDown(e, segment.id, index)}
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>

                  {/* Color indicator */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        className="w-3 h-8 rounded-sm flex-shrink-0 hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 transition-all"
                        style={{ backgroundColor: segment.color || '#6B7280' }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" side="right">
                      <div className="grid grid-cols-4 gap-1">
                        {SEGMENT_COLORS.map(color => (
                          <button
                            key={color}
                            className={cn(
                              "w-6 h-6 rounded-md transition-all hover:scale-110",
                              segment.color === color && "ring-2 ring-offset-1 ring-primary"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => onSegmentColorChange?.(segment.id, color)}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Content */}
                  {editingId === segment.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <Input
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        className="h-7 text-sm w-16 text-center font-mono"
                      />
                      <Button size="sm" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onSegmentClick?.(segment.id)}
                      onDoubleClick={() => handleStartEdit(segment)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{segment.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono">{formatDuration(segment.targetDuration)}</span>
                        </div>
                      </div>
                      {segment.cueCount !== undefined && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {segment.cueCount} cue{segment.cueCount !== 1 ? 's' : ''}
                          </span>
                          {segment.status && segment.status !== 'balanced' && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              segment.status === 'empty' && "bg-muted text-muted-foreground",
                              segment.status === 'overloaded' && "bg-destructive/20 text-destructive"
                            )}>
                              {segment.status}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {editingId !== segment.id && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => onSegmentDelete?.(segment.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {/* Drop indicator after last item */}
                {index === segments.length - 1 && dropIndex === segments.length && (
                  <div className="h-1 bg-primary rounded-full mx-2 my-0.5" />
                )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default SegmentEditorPanel;
