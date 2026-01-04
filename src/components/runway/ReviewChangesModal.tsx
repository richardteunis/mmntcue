import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Edit, ArrowRight, Clock, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChangeOperation, ROSItem } from '@/types/ros';

interface ReviewChangesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: ChangeOperation[];
  onApply: (selectedChanges: ChangeOperation[]) => Promise<void>;
  onDismiss: () => void;
  isApplying?: boolean;
  source?: 'sync' | 'ai';
}

export default function ReviewChangesModal({
  open,
  onOpenChange,
  changes,
  onApply,
  onDismiss,
  isApplying = false,
  source = 'sync'
}: ReviewChangesModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(changes.map((_, i) => i))
  );

  const toggleChange = (index: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === changes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(changes.map((_, i) => i)));
    }
  };

  const handleApply = async () => {
    const selected = changes.filter((_, i) => selectedIds.has(i));
    await onApply(selected);
    onOpenChange(false);
  };

  const handleDismiss = () => {
    onDismiss();
    onOpenChange(false);
  };

  const getChangeIcon = (type: ChangeOperation['type']) => {
    switch (type) {
      case 'insert': return <Plus className="h-4 w-4 text-green-500" />;
      case 'delete': return <Minus className="h-4 w-4 text-red-500" />;
      case 'update': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'move': return <ArrowRight className="h-4 w-4 text-amber-500" />;
      case 'shift': return <Clock className="h-4 w-4 text-purple-500" />;
    }
  };

  const getChangeBadge = (type: ChangeOperation['type']) => {
    switch (type) {
      case 'insert': return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Added</Badge>;
      case 'delete': return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Removed</Badge>;
      case 'update': return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Modified</Badge>;
      case 'move': return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Moved</Badge>;
      case 'shift': return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Shifted</Badge>;
    }
  };

  const renderChangeDetails = (change: ChangeOperation) => {
    switch (change.type) {
      case 'insert':
        return (
          <div className="text-sm">
            <span className="font-medium">{change.item.title || 'New Item'}</span>
            {change.item.start_time && (
              <span className="text-muted-foreground ml-2">@ {change.item.start_time}</span>
            )}
          </div>
        );
      
      case 'delete':
        return (
          <div className="text-sm">
            <span className="font-medium line-through text-muted-foreground">
              {change.item.title}
            </span>
          </div>
        );
      
      case 'update':
        return (
          <div className="text-sm space-y-1">
            {Object.entries(change.changes).map(([field, value]) => (
              <div key={field} className="flex items-center gap-2">
                <span className="text-muted-foreground">{field}:</span>
                <span className="line-through text-muted-foreground text-xs">
                  {String(change.previous[field as keyof typeof change.previous] || '-')}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        );
      
      case 'move':
        return (
          <div className="text-sm flex items-center gap-2">
            <span>Position {change.from_index + 1}</span>
            <ArrowRight className="h-3 w-3" />
            <span>Position {change.to_index + 1}</span>
          </div>
        );
      
      case 'shift':
        return (
          <div className="text-sm">
            <span>{change.ids.length} items shifted</span>
            <span className="ml-2 font-medium">
              {change.direction === 'forward' ? '+' : '-'}{Math.floor(change.time_delta / 60)} min
            </span>
          </div>
        );
    }
  };

  const insertCount = changes.filter(c => c.type === 'insert').length;
  const deleteCount = changes.filter(c => c.type === 'delete').length;
  const updateCount = changes.filter(c => c.type === 'update').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Review Changes
            <Badge variant="secondary">{changes.length} changes</Badge>
          </DialogTitle>
          <DialogDescription>
            {source === 'sync' 
              ? 'The following changes were detected from the connected sheet.'
              : 'CuePilot has proposed the following changes to your show.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2 border-b">
          <div className="flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-green-500" />
            <span className="text-sm">{insertCount} added</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Minus className="h-4 w-4 text-red-500" />
            <span className="text-sm">{deleteCount} removed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Edit className="h-4 w-4 text-blue-500" />
            <span className="text-sm">{updateCount} modified</span>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            {selectedIds.size === changes.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 py-2">
            {changes.map((change, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  selectedIds.has(index) 
                    ? "bg-primary/5 border-primary/20" 
                    : "bg-muted/30 border-transparent"
                )}
              >
                <Checkbox
                  checked={selectedIds.has(index)}
                  onCheckedChange={() => toggleChange(index)}
                />
                <div className="flex-shrink-0">
                  {getChangeIcon(change.type)}
                </div>
                <div className="flex-1 min-w-0">
                  {renderChangeDetails(change)}
                </div>
                <div className="flex-shrink-0">
                  {getChangeBadge(change.type)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleDismiss}>
            <X className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
          <Button 
            onClick={handleApply}
            disabled={isApplying || selectedIds.size === 0}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Apply {selectedIds.size} Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
