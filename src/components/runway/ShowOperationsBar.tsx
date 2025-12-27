import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Smartphone, 
  Coffee, 
  DoorOpen, 
  Mic2, 
  Timer, 
  Bell,
  Check,
  Loader2,
  Plus,
  Pause,
  Hand,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ShowControlState } from '@/hooks/useShowState';

export type ShowMode = 'planning' | 'rehearsal' | 'live';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
}

// ZONE 1: Show Operations - These ADD cues to timeline
const QUICK_ACTIONS: QuickAction[] = [
  { id: 'silence-phones', label: 'Silence Phones', icon: Smartphone },
  { id: 'bio-break', label: 'Bio Break', icon: Coffee },
  { id: '10-to-doors', label: '10 to Doors', icon: DoorOpen },
];

interface ShowOperationsBarProps {
  showId?: string | null;
  mode?: ShowMode;
  controlState?: ShowControlState;
  onAddCue?: (actionId: string, actionLabel: string) => Promise<void>;
  onExecuteImmediate?: (actionId: string) => void;
  onAddVOG?: () => void;
  onAddBuffer?: () => void;
  onSendOpsAlert?: () => void;
  onAddCustomAction?: () => void;
  onStandby?: () => void;
  onHold?: () => void;
  disabled?: boolean;
}

const ShowOperationsBar: React.FC<ShowOperationsBarProps> = ({
  showId,
  mode = 'planning',
  controlState = 'idle',
  onAddCue,
  onExecuteImmediate,
  onAddVOG,
  onAddBuffer,
  onSendOpsAlert,
  onAddCustomAction,
  onStandby,
  onHold,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [addingAction, setAddingAction] = useState<string | null>(null);
  const [addedActions, setAddedActions] = useState<Set<string>>(new Set());

  const handleActionClick = useCallback(async (action: QuickAction) => {
    if (disabled || !showId) return;

    setAddingAction(action.id);

    try {
      if (onAddCue) {
        await onAddCue(action.id, action.label);
      }
      
      setAddedActions(prev => new Set([...prev, action.id]));
      toast({
        title: 'Cue Added',
        description: `"${action.label}" added to timeline at current position`,
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
        title: 'Failed to add cue',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setAddingAction(null);
    }
  }, [disabled, showId, onAddCue, toast]);

  const handleRightClick = useCallback((e: React.MouseEvent, action: QuickAction) => {
    e.preventDefault();
    if (disabled || !showId || !onExecuteImmediate) return;
    
    onExecuteImmediate(action.id);
    toast({
      title: 'Action Sent',
      description: `"${action.label}" executed immediately`,
    });
  }, [disabled, showId, onExecuteImmediate, toast]);

  const getModeStyles = () => {
    switch (mode) {
      case 'live':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'rehearsal':
        return 'bg-runway-warning/10 border-runway-warning/30 text-runway-warning';
      default:
        return 'bg-primary/10 border-primary/30 text-primary';
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'live': return '🔴';
      case 'rehearsal': return '🎭';
      default: return '📋';
    }
  };
  
  return (
    <div className="w-full border-t border-border bg-card">
      {/* ROW 1: Show Operations - Add Cues */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Show Operations
          </span>
          <div className="flex-1 h-px bg-border/50" />
          <Badge 
            variant="outline" 
            className={cn("text-[10px] uppercase font-semibold px-2 py-0", getModeStyles())}
          >
            {getModeIcon()} {mode}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Actions - ADD cues to timeline */}
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isAdding = addingAction === action.id;
            const isAdded = addedActions.has(action.id);
            
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || !showId || isAdding}
                    onClick={() => handleActionClick(action)}
                    onContextMenu={(e) => handleRightClick(e, action)}
                    className={cn(
                      "transition-all h-9 px-3",
                      isAdded && "bg-runway-success/20 border-runway-success text-runway-success hover:bg-runway-success/30"
                    )}
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : isAdded ? (
                      <Check className="h-4 w-4 mr-1.5" />
                    ) : (
                      <Icon className="h-4 w-4 mr-1.5" />
                    )}
                    {isAdded ? 'Added ✓' : action.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Click to add cue • Right-click to execute immediately</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          
          {/* Add Custom Action */}
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !showId}
            onClick={onAddCustomAction}
            className="h-9 px-3 border-dashed"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Custom
          </Button>
        </div>
      </div>

      {/* ROW 2: Show Control - State Controls */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Show Control
          </span>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Standby Button - ONE instance only */}
          <Button
            variant={controlState === 'standby' ? 'default' : 'secondary'}
            size="sm"
            disabled={disabled || !showId || controlState === 'standby'}
            onClick={onStandby}
            className={cn(
              "h-9 px-4",
              controlState === 'standby' && "bg-runway-warning text-black hover:bg-runway-warning/90"
            )}
          >
            <Pause className="h-4 w-4 mr-1.5" />
            Standby
          </Button>
          
          {/* Hold Button - ONE instance only */}
          <Button
            variant={controlState === 'hold' ? 'default' : 'secondary'}
            size="sm"
            disabled={disabled || !showId || controlState === 'hold'}
            onClick={onHold}
            className={cn(
              "h-9 px-4",
              controlState === 'hold' && "bg-destructive hover:bg-destructive/90"
            )}
          >
            <Hand className="h-4 w-4 mr-1.5" />
            Hold
          </Button>
          
          {/* Separator */}
          <div className="h-6 w-px bg-border mx-1" />
          
          {/* VOG and Buffer Actions */}
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || !showId}
            onClick={onAddVOG}
            className="h-9 px-4"
          >
            <Mic2 className="h-4 w-4 mr-1.5" />
            Add VOG
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || !showId}
            onClick={onAddBuffer}
            className="h-9 px-4"
          >
            <Timer className="h-4 w-4 mr-1.5" />
            Buffer
          </Button>
          
          {/* Separator */}
          <div className="h-6 w-px bg-border mx-1" />
          
          {/* Ops Alert */}
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !showId}
            onClick={onSendOpsAlert}
            className="h-9 px-4 border-runway-warning/50 text-runway-warning hover:bg-runway-warning/10"
          >
            <Bell className="h-4 w-4 mr-1.5" />
            Ops Alert
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShowOperationsBar;
