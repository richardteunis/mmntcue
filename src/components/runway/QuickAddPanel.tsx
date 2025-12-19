import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Phone, 
  Coffee, 
  Clock, 
  Hand,
  Pause,
  Send,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationTemplate } from '@/types/vog';
import { useToast } from '@/hooks/use-toast';

interface QuickAddPanelProps {
  templates: NotificationTemplate[];
  onSendQuick: (templateId: string) => Promise<void>;
  onCustomNote: () => void;
  disabled?: boolean;
}

const QUICK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Silence Phones': Phone,
  'Bio Break': Coffee,
  '10 Minutes to Doors': Clock,
  'Stand By': Hand,
  'Hold': Pause,
};

const QuickAddPanel: React.FC<QuickAddPanelProps> = ({
  templates,
  onSendQuick,
  onCustomNote,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const handleQuickSend = async (template: NotificationTemplate) => {
    if (disabled) return;

    // Require confirmation for critical alerts
    if (template.is_critical && confirmId !== template.id) {
      setConfirmId(template.id);
      return;
    }

    setSendingId(template.id);
    setConfirmId(null);

    try {
      await onSendQuick(template.id);
      setSentIds(prev => new Set([...prev, template.id]));
      toast({
        title: 'Notification sent',
        description: `"${template.name}" sent to crew.`,
      });

      // Clear sent status after 3 seconds
      setTimeout(() => {
        setSentIds(prev => {
          const next = new Set(prev);
          next.delete(template.id);
          return next;
        });
      }, 3000);
    } catch (error) {
      toast({
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'Failed to send notification',
        variant: 'destructive',
      });
    } finally {
      setSendingId(null);
    }
  };

  const getButtonState = (template: NotificationTemplate) => {
    if (sendingId === template.id) return 'sending';
    if (sentIds.has(template.id)) return 'sent';
    if (confirmId === template.id) return 'confirm';
    return 'idle';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Quick Notifications</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((template) => {
          const Icon = QUICK_ICONS[template.name] || Bell;
          const state = getButtonState(template);

          return (
            <Card
              key={template.id}
              className={cn(
                "relative p-0 overflow-hidden transition-all",
                disabled && "opacity-50 cursor-not-allowed",
                template.is_critical && "border-destructive/50",
                state === 'confirm' && "ring-2 ring-destructive",
                state === 'sent' && "ring-2 ring-green-500"
              )}
            >
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-auto py-4 px-3 flex flex-col items-center gap-2 rounded-none",
                  template.is_critical && "hover:bg-destructive/10",
                  state === 'sent' && "bg-green-500/10"
                )}
                onClick={() => handleQuickSend(template)}
                disabled={disabled || sendingId !== null}
              >
                <div className={cn(
                  "p-3 rounded-full",
                  template.is_critical ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  {state === 'sending' ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : state === 'sent' ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <Icon className={cn(
                      "h-6 w-6",
                      template.is_critical ? "text-destructive" : "text-primary"
                    )} />
                  )}
                </div>

                <span className="font-medium text-sm text-center leading-tight">
                  {state === 'confirm' ? 'Tap to Confirm' : template.name}
                </span>

                {template.is_critical && state === 'idle' && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1">
                    Critical
                  </Badge>
                )}
              </Button>

              {state === 'confirm' && (
                <div className="absolute inset-0 bg-destructive/5 pointer-events-none flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-destructive/20" />
                </div>
              )}
            </Card>
          );
        })}

        {/* Custom Note Button */}
        <Card className="p-0 overflow-hidden border-dashed">
          <Button
            variant="ghost"
            className="w-full h-auto py-4 px-3 flex flex-col items-center gap-2 rounded-none"
            onClick={onCustomNote}
            disabled={disabled}
          >
            <div className="p-3 rounded-full bg-muted">
              <Send className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="font-medium text-sm text-muted-foreground">
              Custom Note
            </span>
          </Button>
        </Card>
      </div>

      {confirmId && (
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          Click again to confirm sending critical alert
        </p>
      )}
    </div>
  );
};

export default QuickAddPanel;
