import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Volume2, 
  Lightbulb, 
  Video, 
  Square, 
  MessageSquarePlus,
  X,
  AlertTriangle
} from 'lucide-react';

interface Issue {
  id: string;
  type: 'timing' | 'audio' | 'lighting' | 'video' | 'stage';
  cueId?: string;
  cueName?: string;
  note?: string;
  timestamp: Date;
}

interface IssueBarProps {
  currentCueId?: string;
  currentCueName?: string;
  lastFiredCueId?: string;
  lastFiredCueName?: string;
  onLogIssue?: (issue: Omit<Issue, 'id' | 'timestamp'>) => void;
  issues?: Issue[];
  className?: string;
}

const ISSUE_TYPES = [
  { id: 'timing', label: 'Timing', icon: Clock, color: 'text-runway-warning' },
  { id: 'audio', label: 'Audio', icon: Volume2, color: 'text-runway-teal' },
  { id: 'lighting', label: 'Lighting', icon: Lightbulb, color: 'text-runway-highlight' },
  { id: 'video', label: 'Video', icon: Video, color: 'text-runway-success' },
  { id: 'stage', label: 'Stage', icon: Square, color: 'text-runway-warning' },
] as const;

const IssueBar: React.FC<IssueBarProps> = ({
  currentCueId,
  currentCueName,
  lastFiredCueId,
  lastFiredCueName,
  onLogIssue,
  issues = [],
  className,
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleIssueClick = (typeId: string) => {
    setSelectedType(typeId);
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedType) return;
    
    onLogIssue?.({
      type: selectedType as Issue['type'],
      cueId: currentCueId || lastFiredCueId,
      cueName: currentCueName || lastFiredCueName,
      note: note.trim() || undefined,
    });
    
    setNote('');
    setSelectedType(null);
    setIsOpen(false);
  };

  const handleClose = () => {
    setNote('');
    setSelectedType(null);
    setIsOpen(false);
  };

  const issueCount = issues.length;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 bg-runway-warning/5 border border-runway-warning/20 rounded-lg",
      className
    )}>
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4 text-runway-warning" />
        <span className="text-[10px] uppercase font-semibold tracking-wide text-runway-warning">
          Log Issue
        </span>
        {issueCount > 0 && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-runway-warning/20 text-runway-warning">
            {issueCount}
          </Badge>
        )}
      </div>
      
      <div className="h-4 w-px bg-border mx-1" />
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-1">
          {ISSUE_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <PopoverTrigger asChild key={type.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-muted-foreground hover:text-foreground",
                    selectedType === type.id && type.color
                  )}
                  onClick={() => handleIssueClick(type.id)}
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">{type.label}</span>
                </Button>
              </PopoverTrigger>
            );
          })}
        </div>
        
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">
                Log {ISSUE_TYPES.find(t => t.id === selectedType)?.label} Issue
              </h4>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {(currentCueName || lastFiredCueName) && (
              <div className="text-xs text-muted-foreground">
                Attaching to: <span className="text-foreground font-medium">{currentCueName || lastFiredCueName}</span>
              </div>
            )}
            
            <Input
              placeholder="Add a note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              className="h-8 text-sm"
            />
            
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8" onClick={handleSubmit}>
                <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />
                Log Issue
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default IssueBar;
