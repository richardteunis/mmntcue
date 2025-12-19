import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bell, 
  AlertTriangle,
  Users,
  User,
  UserCog,
  Send,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpsNote, CREW_ROLES } from '@/types/vog';
import { useToast } from '@/hooks/use-toast';

interface OpsNoteEditorProps {
  showId: string;
  cueId?: string;
  note?: OpsNote | null;
  onSave: (data: Partial<OpsNote>) => Promise<void>;
  onSend?: (noteId: string) => Promise<void>;
}

const OpsNoteEditor: React.FC<OpsNoteEditorProps> = ({
  showId,
  cueId,
  note,
  onSave,
  onSend,
}) => {
  const { toast } = useToast();
  const [message, setMessage] = useState(note?.message || '');
  const [targetType, setTargetType] = useState<'all' | 'role' | 'user'>(note?.target_type || 'all');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(note?.target_roles || []);
  const [isCritical, setIsCritical] = useState(note?.is_critical || false);
  const [autoSend, setAutoSend] = useState(note?.auto_send || false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmCritical, setConfirmCritical] = useState(false);

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please enter a notification message.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        show_id: showId,
        cue_id: cueId,
        message,
        target_type: targetType,
        target_roles: targetType === 'role' ? selectedRoles : null,
        is_critical: isCritical,
        auto_send: autoSend,
      });
      toast({
        title: 'Ops note saved',
        description: 'The notification has been saved.',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save ops note',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!note?.id || !onSend) return;

    if (isCritical && !confirmCritical) {
      setConfirmCritical(true);
      return;
    }

    try {
      await onSend(note.id);
      toast({
        title: 'Notification sent',
        description: 'The ops note has been sent to the crew.',
      });
      setConfirmCritical(false);
    } catch (error) {
      toast({
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'Failed to send notification',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <Label className="font-semibold">Ops Note</Label>
        </div>
        {note?.sent_at && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Sent {new Date(note.sent_at).toLocaleTimeString()}
          </Badge>
        )}
      </div>

      {/* Message Input */}
      <div className="space-y-2">
        <Label htmlFor="ops-message">Message</Label>
        <Textarea
          id="ops-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter crew notification..."
          className="min-h-[80px]"
        />
      </div>

      {/* Target Selection */}
      <div className="space-y-2">
        <Label>Send to</Label>
        <Select value={targetType} onValueChange={(v) => setTargetType(v as typeof targetType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>All Crew</span>
              </div>
            </SelectItem>
            <SelectItem value="role">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                <span>By Role</span>
              </div>
            </SelectItem>
            <SelectItem value="user">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Specific Users</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Role Selection */}
      {targetType === 'role' && (
        <div className="space-y-2">
          <Label>Select Roles</Label>
          <div className="grid grid-cols-2 gap-2">
            {CREW_ROLES.map((role) => (
              <div
                key={role}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                  selectedRoles.includes(role) 
                    ? "bg-primary/10 border-primary" 
                    : "hover:bg-muted"
                )}
                onClick={() => handleRoleToggle(role)}
              >
                <Checkbox checked={selectedRoles.includes(role)} />
                <span className="text-sm">{role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="auto-send" className="cursor-pointer">Auto-send at cue time</Label>
              <p className="text-xs text-muted-foreground">Send automatically when this cue fires</p>
            </div>
          </div>
          <Switch
            id="auto-send"
            checked={autoSend}
            onCheckedChange={setAutoSend}
          />
        </div>

        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg border transition-colors",
          isCritical && "border-destructive bg-destructive/5"
        )}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4", isCritical ? "text-destructive" : "text-muted-foreground")} />
            <div>
              <Label htmlFor="critical" className="cursor-pointer">Critical Alert</Label>
              <p className="text-xs text-muted-foreground">Requires confirmation to send</p>
            </div>
          </div>
          <Switch
            id="critical"
            checked={isCritical}
            onCheckedChange={setIsCritical}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={isSaving || !message.trim()}
          className="flex-1"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        
        {note?.id && onSend && !note.sent_at && (
          <Button
            variant={confirmCritical ? 'destructive' : 'default'}
            onClick={handleSendNow}
            disabled={isSaving}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {confirmCritical ? 'Confirm Send' : 'Send Now'}
          </Button>
        )}
      </div>

      {confirmCritical && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <span>This is a critical alert. Click again to confirm sending to all recipients.</span>
          </div>
        </div>
      )}

      {/* Acknowledgement Status */}
      {note?.sent_at && note.acknowledged_by && note.acknowledged_by.length > 0 && (
        <div className="p-3 rounded-lg border bg-muted/50">
          <div className="text-sm font-medium mb-2">
            Acknowledged ({note.acknowledged_by.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {note.acknowledged_by.map((userId, idx) => (
              <Badge key={userId} variant="secondary" className="text-xs">
                User {idx + 1}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpsNoteEditor;
