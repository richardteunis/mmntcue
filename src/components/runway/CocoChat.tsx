import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Clock, Plus, ArrowRight, User, Loader2, Check, X, Sparkles, Trash2, Minimize2 } from 'lucide-react';
import { useCuePilot } from '@/hooks/useCuePilot';
import { cn } from '@/lib/utils';
import type { Cue } from '@/types/cue';
import ReviewChangesModal from './ReviewChangesModal';

interface CocoChatProps {
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

export default function CocoChat({ showId, cues, canApplyChanges, onRefresh }: CocoChatProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const pendingCount = pendingChangeRequest?.status === 'pending' && Array.isArray(pendingChangeRequest.diff_payload) 
    ? pendingChangeRequest.diff_payload.length 
    : 0;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Chat window */}
        {isOpen && (
          <div className="w-[380px] h-[500px] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">Co</span>
                </div>
                <div>
                  <span className="font-semibold text-sm">Coco</span>
                  <Badge variant="secondary" className="text-[9px] ml-1.5 px-1.5 py-0">AI</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearHistory}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-3">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Hey, I'm Coco!</h3>
                  <p className="text-xs text-muted-foreground max-w-[220px]">
                    Your show co-pilot. Tell me what you need and I'll propose changes for your approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-2",
                        message.role === 'user' && "justify-end"
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                          <span className="text-primary-foreground font-bold text-[9px]">Co</span>
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
                        <p className="whitespace-pre-wrap text-xs">{message.content}</p>
                        {message.change_request_id && (
                          <Badge 
                            variant="secondary" 
                            className="mt-2 cursor-pointer hover:bg-primary/20 text-[10px]"
                            onClick={() => setShowReviewModal(true)}
                          >
                            View Proposed Changes
                          </Badge>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-[9px]">Co</span>
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs text-muted-foreground">Thinking...</span>
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
                <p className="text-[10px] text-muted-foreground mb-2">Quick actions</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_ACTIONS.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-6 px-2"
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
              <div className="px-3 py-2 bg-primary/10 border-t border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{pendingCount} pending changes</span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={handleRejectChanges}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setShowReviewModal(true)}
                      disabled={!canApplyChanges}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
                {!canApplyChanges && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Only producers and showcallers can apply changes
                  </p>
                )}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask Coco to edit your show..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  size="icon"
                  className="h-9 w-9"
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
          </div>
        )}

        {/* Floating trigger button */}
        <Button
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all",
            "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            isOpen && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground">
                {pendingCount}
              </span>
            )}
          </div>
        </Button>
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
    </>
  );
}
