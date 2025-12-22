import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type ShowMode = 'planning' | 'rehearsal' | 'live';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  isCritical?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'silence-phones', label: 'Silence Phones', icon: Smartphone },
  { id: 'bio-break', label: 'Bio Break', icon: Coffee },
  { id: '10-to-doors', label: '10 to Doors', icon: DoorOpen },
  { id: 'standby', label: 'Standby', icon: AlertCircle },
  { id: 'hold', label: 'Hold', icon: Hand, isCritical: true },
];

interface QuickActionTrayProps {
  showId?: string | null;
  mode?: ShowMode;
  onAddVOG?: () => void;
  onAddBuffer?: () => void;
  onSendOpsAlert?: () => void;
  onSendQuickAction?: (actionId: string, actionLabel: string) => Promise<void>;
  disabled?: boolean;
}

const QuickActionTray: React.FC<QuickActionTrayProps> = ({
  showId,
  mode = 'planning',
  onAddVOG,
  onAddBuffer,
  onSendOpsAlert,
  onSendQuickAction,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [sendingAction, setSendingAction] = useState<string | null>(null);
  const [sentActions, setSentActions] = useState<Set<string>>(new Set());
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

  const handleActionClick = useCallback(async (action: QuickAction) => {
    if (disabled || !showId) return;

    // Critical actions need confirmation
    if (action.isCritical && confirmingAction !== action.id) {
      setConfirmingAction(action.id);
      setTimeout(() => setConfirmingAction(null), 3000);
      return;
    }

    setSendingAction(action.id);
    setConfirmingAction(null);

    try {
      if (onSendQuickAction) {
        await onSendQuickAction(action.id, action.label);
      }
      
      setSentActions(prev => new Set([...prev, action.id]));
      toast({
        title: 'Sent',
        description: `"${action.label}" sent to crew`,
      });

      // Clear sent state after 3 seconds
      setTimeout(() => {
        setSentActions(prev => {
          const next = new Set(prev);
          next.delete(action.id);
          return next;
        });
      }, 3000);
    } catch (error) {
      toast({
        title: 'Failed to send',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSendingAction(null);
    }
  }, [disabled, showId, confirmingAction, onSendQuickAction, toast]);

  const isLiveMode = mode === 'live';
  
  return (
    <div 
      className={cn(
        "w-full border-t border-border bg-card/95 backdrop-blur-sm",
        "transition-all duration-200",
        isLiveMode ? "py-3 px-4" : "py-2 px-3"
      )}
    >
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {/* Quick Actions */}
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isSending = sendingAction === action.id;
          const isSent = sentActions.has(action.id);
          const isConfirming = confirmingAction === action.id;
          
          return (
            <Button
              key={action.id}
              variant={action.isCritical ? "destructive" : "outline"}
              size={isLiveMode ? "lg" : "sm"}
              disabled={disabled || !showId || isSending}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex-shrink-0 transition-all",
                isLiveMode && "h-12 px-5 text-base",
                isSent && "bg-runway-success/20 border-runway-success text-runway-success hover:bg-runway-success/30",
                isConfirming && action.isCritical && "animate-pulse bg-runway-warning hover:bg-runway-warning/90",
                !isLiveMode && "h-8 px-3 text-xs"
              )}
            >
              {isSending ? (
                <Loader2 className={cn("animate-spin", isLiveMode ? "h-5 w-5 mr-2" : "h-3.5 w-3.5 mr-1.5")} />
              ) : isSent ? (
                <Check className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-3.5 w-3.5 mr-1.5")} />
              ) : (
                <Icon className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-3.5 w-3.5 mr-1.5")} />
              )}
              {isConfirming ? 'Confirm' : isSent ? 'Sent ✓' : action.label}
            </Button>
          );
        })}
        
        {/* Separator */}
        <div className="h-6 w-px bg-border flex-shrink-0 mx-1" />
        
        {/* VOG and Buffer Actions */}
        <Button
          variant="secondary"
          size={isLiveMode ? "lg" : "sm"}
          disabled={disabled || !showId}
          onClick={onAddVOG}
          className={cn(
            "flex-shrink-0",
            isLiveMode && "h-12 px-5 text-base",
            !isLiveMode && "h-8 px-3 text-xs"
          )}
        >
          <Mic2 className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-3.5 w-3.5 mr-1.5")} />
          Add VOG
        </Button>
        
        <Button
          variant="secondary"
          size={isLiveMode ? "lg" : "sm"}
          disabled={disabled || !showId}
          onClick={onAddBuffer}
          className={cn(
            "flex-shrink-0",
            isLiveMode && "h-12 px-5 text-base",
            !isLiveMode && "h-8 px-3 text-xs"
          )}
        >
          <Timer className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-3.5 w-3.5 mr-1.5")} />
          Add Buffer
        </Button>
        
        {/* Separator */}
        <div className="h-6 w-px bg-border flex-shrink-0 mx-1" />
        
        {/* Ops Alert */}
        <Button
          variant="outline"
          size={isLiveMode ? "lg" : "sm"}
          disabled={disabled || !showId}
          onClick={onSendOpsAlert}
          className={cn(
            "flex-shrink-0 border-runway-warning/50 text-runway-warning hover:bg-runway-warning/10",
            isLiveMode && "h-12 px-5 text-base",
            !isLiveMode && "h-8 px-3 text-xs"
          )}
        >
          <Bell className={cn(isLiveMode ? "h-5 w-5 mr-2" : "h-3.5 w-3.5 mr-1.5")} />
          Ops Alert
        </Button>
        
        {/* Mode indicator */}
        <div className="flex-1" />
        <Badge 
          variant="outline" 
          className={cn(
            "flex-shrink-0 uppercase text-xs font-mono",
            mode === 'live' && "bg-red-500/20 text-red-400 border-red-500/50",
            mode === 'rehearsal' && "bg-runway-warning/20 text-runway-warning border-runway-warning/50",
            mode === 'planning' && "bg-muted text-muted-foreground"
          )}
        >
          {mode}
        </Badge>
      </div>
    </div>
  );
};

export default QuickActionTray;
