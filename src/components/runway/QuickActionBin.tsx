import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Zap,
  Plus,
  Mic2,
  Lightbulb,
  Video,
  Music,
  Sparkles,
  Timer,
  Bell,
  Smartphone,
  Coffee,
  DoorOpen,
  AlertCircle,
  Hand,
  Volume2,
  Loader2,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuickActionBinProps {
  showId?: string | null;
  onAddCue?: (type: string, name: string) => Promise<void>;
  onAddMoment?: (type: string, label: string) => void;
  onOpenVOGEditor?: () => void;
  onAddBuffer?: () => void;
  onSendOpsAlert?: () => void;
  disabled?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  category: 'cue' | 'moment' | 'action';
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

const CUE_ACTIONS: QuickAction[] = [
  { id: 'video', label: 'Video Cue', icon: Video, category: 'cue' },
  { id: 'audio', label: 'Audio Cue', icon: Music, category: 'cue' },
  { id: 'lighting', label: 'Lighting Cue', icon: Lightbulb, category: 'cue' },
  { id: 'stage', label: 'Stage Cue', icon: Volume2, category: 'cue' },
];

const MOMENT_ACTIONS: QuickAction[] = [
  { id: 'transition', label: 'Transition', icon: Sparkles, category: 'moment' },
  { id: 'applause', label: 'Applause', icon: Hand, category: 'moment' },
  { id: 'walk-in', label: 'Walk-in', icon: DoorOpen, category: 'moment' },
];

const SPECIAL_ACTIONS: QuickAction[] = [
  { id: 'vog', label: 'Add VOG', icon: Mic2, category: 'action', variant: 'secondary' },
  { id: 'buffer', label: 'Buffer', icon: Timer, category: 'action', variant: 'outline' },
  { id: 'ops-alert', label: 'Ops Alert', icon: Bell, category: 'action', variant: 'outline' },
];

const QuickActionBin: React.FC<QuickActionBinProps> = ({
  showId,
  onAddCue,
  onAddMoment,
  onOpenVOGEditor,
  onAddBuffer,
  onSendOpsAlert,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [addedActions, setAddedActions] = useState<Set<string>>(new Set());

  const handleAction = useCallback(async (action: QuickAction) => {
    if (disabled || !showId) return;
    
    setLoadingAction(action.id);
    
    try {
      if (action.category === 'cue') {
        await onAddCue?.(action.id, action.label);
      } else if (action.category === 'moment') {
        onAddMoment?.(action.id, action.label);
      } else if (action.id === 'vog') {
        onOpenVOGEditor?.();
        setLoadingAction(null);
        return;
      } else if (action.id === 'buffer') {
        await onAddBuffer?.();
      } else if (action.id === 'ops-alert') {
        await onSendOpsAlert?.();
      }
      
      setAddedActions(prev => new Set([...prev, action.id]));
      toast({
        title: 'Added',
        description: `"${action.label}" added to rundown`,
      });
      
      setTimeout(() => {
        setAddedActions(prev => {
          const next = new Set(prev);
          next.delete(action.id);
          return next;
        });
      }, 2000);
    } catch (error) {
      toast({
        title: 'Failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(null);
    }
  }, [disabled, showId, onAddCue, onAddMoment, onOpenVOGEditor, onAddBuffer, onSendOpsAlert, toast]);

  const renderActionButton = (action: QuickAction) => {
    const Icon = action.icon;
    const isLoading = loadingAction === action.id;
    const isAdded = addedActions.has(action.id);
    
    return (
      <Button
        key={action.id}
        variant={action.variant || 'outline'}
        size="sm"
        disabled={disabled || !showId || isLoading}
        onClick={() => handleAction(action)}
        className={cn(
          "h-8 px-2.5 text-xs flex-shrink-0 gap-1.5",
          isAdded && "bg-runway-success/20 border-runway-success text-runway-success"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isAdded ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
        {isAdded ? 'Added!' : action.label}
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card/50 rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Quick Actions</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-3">
          {/* Cue Types */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
              Add Cue
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CUE_ACTIONS.map(renderActionButton)}
            </div>
          </div>

          {/* Moments */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
              Moments
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MOMENT_ACTIONS.map(renderActionButton)}
            </div>
          </div>

          {/* Special Actions */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
              Special
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SPECIAL_ACTIONS.map(renderActionButton)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActionBin;
