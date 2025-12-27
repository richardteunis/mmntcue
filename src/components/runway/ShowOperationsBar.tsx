import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Smartphone, 
  Coffee, 
  DoorOpen, 
  AlertCircle, 
  Hand, 
  Mic2, 
  Timer, 
  Bell,
  Check,
  Loader2,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type ShowMode = 'planning' | 'rehearsal' | 'live';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  isCritical?: boolean;
  shortLabel?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'silence-phones', label: 'Silence Phones', shortLabel: 'Phones', icon: Smartphone },
  { id: 'bio-break', label: 'Bio Break', shortLabel: 'Bio', icon: Coffee },
  { id: '10-to-doors', label: '10 to Doors', shortLabel: 'Doors', icon: DoorOpen },
  { id: 'standby', label: 'Standby', icon: AlertCircle },
  { id: 'hold', label: 'Hold', icon: Hand, isCritical: true },
];

interface ShowOperationsBarProps {
  showId?: string | null;
  mode?: ShowMode;
  onAddCue?: (actionId: string, actionLabel: string) => Promise<void>;
  onExecuteImmediate?: (actionId: string) => void;
  onAddVOG?: () => void;
  onAddBuffer?: () => void;
  onSendOpsAlert?: () => void;
  onAddCustomAction?: () => void;
  disabled?: boolean;
}

const ShowOperationsBar: React.FC<ShowOperationsBarProps> = ({
  showId,
  mode = 'planning',
  onAddCue,
  onExecuteImmediate,
  onAddVOG,
  onAddBuffer,
  onSendOpsAlert,
  onAddCustomAction,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [addingAction, setAddingAction] = useState<string | null>(null);
  const [addedActions, setAddedActions] = useState<Set<string>>(new Set());
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

  const handleActionClick = useCallback(async (action: QuickAction) => {
    if (disabled || !showId) return;

    // Critical actions need confirmation
    if (action.isCritical && confirmingAction !== action.id) {
      setConfirmingAction(action.id);
      setTimeout(() => setConfirmingAction(null), 3000);
      return;
    }

    setAddingAction(action.id);
    setConfirmingAction(null);

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
  }, [disabled, showId, confirmingAction, onAddCue, toast]);

  const handleRightClick = useCallback((e: React.MouseEvent, action: QuickAction) => {
    e.preventDefault();
    if (disabled || !showId || !onExecuteImmediate) return;
    
    onExecuteImmediate(action.id);
    toast({
      title: 'Action Sent',
      description: `"${action.label}" executed immediately`,
    });
  }, [disabled, showId, onExecuteImmediate, toast]);

  const isLiveMode = mode === 'live';
  
  return (
    <div 
      className={cn(
        "w-full border-t-2 border-border bg-card",
        "transition-all duration-200",
        isLiveMode ? "py-4 px-4" : "py-3 px-4"
      )}
    >
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Show Operations
        </span>
        <div className="flex-1 h-px bg-border" />
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] uppercase font-mono px-2 py-0",
            mode === 'live' && "bg-red-500/20 text-red-400 border-red-500/50",
            mode === 'rehearsal' && "bg-runway-warning/20 text-runway-warning border-runway-warning/50",
            mode === 'planning' && "bg-muted text-muted-foreground"
          )}
        >
          {mode}
        </Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick Actions - add cues to rundown */}
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isAdding = addingAction === action.id;
          const isAdded = addedActions.has(action.id);
          const isConfirming = confirmingAction === action.id;
          
          return (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={action.isCritical ? "destructive" : "outline"}
                  size={isLiveMode ? "lg" : "default"}
                  disabled={disabled || !showId || isAdding}
                  onClick={() => handleActionClick(action)}
                  onContextMenu={(e) => handleRightClick(e, action)}
                  className={cn(
                    "transition-all",
                    isLiveMode && "h-14 px-6 text-base",
                    isAdded && "bg-runway-success/20 border-runway-success text-runway-success hover:bg-runway-success/30",
                    isConfirming && action.isCritical && "animate-pulse bg-runway-warning hover:bg-runway-warning/90"
                  )}
                >
                  {isAdding ? (
                    <Loader2 className={cn("animate-spin", isLiveMode ? "h-5 w-5 mr-2" : "h-4 w-4 mr-1.5")} />
                  ) : isAdded ? (
                    <Check className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-4 w-4 mr-1.5")} />
                  ) : (
                    <Icon className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-4 w-4 mr-1.5")} />
                  )}
                  {isConfirming ? 'Confirm' : isAdded ? 'Added ✓' : (isLiveMode ? action.label : action.shortLabel || action.label)}
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
          size={isLiveMode ? "lg" : "default"}
          disabled={disabled || !showId}
          onClick={onAddCustomAction}
          className={cn(
            "border-dashed",
            isLiveMode && "h-14 px-6 text-base"
          )}
        >
          <Plus className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-4 w-4 mr-1.5")} />
          Custom
        </Button>
        
        {/* Separator */}
        <div className="h-8 w-px bg-border flex-shrink-0 mx-2" />
        
        {/* VOG and Buffer Actions */}
        <Button
          variant="secondary"
          size={isLiveMode ? "lg" : "default"}
          disabled={disabled || !showId}
          onClick={onAddVOG}
          className={cn(
            isLiveMode && "h-14 px-6 text-base"
          )}
        >
          <Mic2 className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-4 w-4 mr-1.5")} />
          Add VOG
        </Button>
        
        <Button
          variant="secondary"
          size={isLiveMode ? "lg" : "default"}
          disabled={disabled || !showId}
          onClick={onAddBuffer}
          className={cn(
            isLiveMode && "h-14 px-6 text-base"
          )}
        >
          <Timer className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-4 w-4 mr-1.5")} />
          Buffer
        </Button>
        
        {/* Separator */}
        <div className="h-8 w-px bg-border flex-shrink-0 mx-2" />
        
        {/* Ops Alert */}
        <Button
          variant="outline"
          size={isLiveMode ? "lg" : "default"}
          disabled={disabled || !showId}
          onClick={onSendOpsAlert}
          className={cn(
            "border-runway-warning/50 text-runway-warning hover:bg-runway-warning/10",
            isLiveMode && "h-14 px-6 text-base"
          )}
        >
          <Bell className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-4 w-4 mr-1.5")} />
          Ops Alert
        </Button>
      </div>
    </div>
  );
};

export default ShowOperationsBar;
