import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bot, Send, Clock, Plus, ArrowRight, User, Loader2, Check, X, Sparkles, Trash2 } from 'lucide-react';
import { useCuePilot } from '@/hooks/useCuePilot';
import { cn } from '@/lib/utils';
import type { Cue } from '@/types/cue';
import ReviewChangesModal from './ReviewChangesModal';

interface CuePilotPanelProps {
  showId: string;
  cues: Cue[];
  canApplyChanges: boolean;
  onRefresh: () => void;
}

const QUICK_ACTIONS = [
  { icon: Clock, label: 'Shift time', prompt: 'Shift all cues by 5 minutes' },
  { icon: Plus, label: 'Insert cue', prompt: 'Add a new cue called "Welcome" at the beginning' },
  { icon: ArrowRight, label: 'Move item', prompt: 'Move the last cue to position 3' },
  { icon: User, label: 'Set speaker', prompt: 'Set the speaker for cue 1 to "John Smith"' }
];

export default function CuePilotPanel({ showId, cues, canApplyChanges, onRefresh }: CuePilotPanelProps) {
  const [input, setInput] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    pendingChangeRequest,
    sendMessage,
    cancelRequest,
    applyChanges,
    rejectChanges,
    clearHistory
  } = useCuePilot(showId, cues);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show review modal when changes are pending
  useEffect(() => {
    if (pendingChangeRequest && pendingChangeRequest.status === 'pending') {
      setShowReviewModal(true);
    }
  }, [pendingChangeRequest]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const handleApplyChanges = async () => {
    await applyChanges();
    setShowReviewModal(false);
    onRefresh();
  };

  const handleRejectChanges = async () => {
    await rejectChanges();
    setShowReviewModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-card border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold">CuePilot</span>
          <Badge variant="secondary" className="text-[10px]">AI</Badge>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearHistory}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <Sparkles className="h-10 w-10 text-primary/50 mb-4" />
            <h3 className="font-medium mb-2">CuePilot Ready</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Ask me to make changes to your show. I'll propose edits for your approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === 'user' && "justify-end"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.change_request_id && (
                    <Badge 
                      variant="secondary" 
                      className="mt-2 cursor-pointer hover:bg-primary/20"
                      onClick={() => setShowReviewModal(true)}
                    >
                      View Proposed Changes
                    </Badge>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Quick actions</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleQuickAction(action.prompt)}
              >
                <action.icon className="h-3 w-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Pending changes bar */}
      {pendingChangeRequest && pendingChangeRequest.status === 'pending' && (
        <div className="px-4 py-2 bg-primary/10 border-t border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {Array.isArray(pendingChangeRequest.diff_payload) 
                ? pendingChangeRequest.diff_payload.length 
                : 0} pending changes
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRejectChanges}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setShowReviewModal(true)}
                disabled={!canApplyChanges}
              >
                <Check className="h-4 w-4 mr-1" />
                Review
              </Button>
            </div>
          </div>
          {!canApplyChanges && (
            <p className="text-xs text-muted-foreground mt-1">
              Only producers and showcallers can apply changes
            </p>
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask CuePilot to edit your show..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Review Modal */}
      {pendingChangeRequest && (
        <ReviewChangesModal
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          changes={pendingChangeRequest.diff_payload || []}
          onApply={handleApplyChanges}
          onDismiss={handleRejectChanges}
          source="ai"
        />
      )}
    </div>
  );
}
