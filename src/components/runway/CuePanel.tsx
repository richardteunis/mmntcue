
import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimelineCue } from './Timeline';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronDown,
  FileEdit,
  Trash2,
  Copy,
  Clock,
  Timer,
  PlayCircle,
  Zap,
  MessageSquareText,
  RotateCw
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

interface CuePanelProps {
  selectedCueId: string | null;
  selectedCue: TimelineCue | null;
  onCueUpdate: (updatedCue: TimelineCue) => void;
  onCueDelete: (cueId: string) => void;
  onCueDuplicate: (cueId: string) => void;
  setIsInEditMode?: (isInEditMode: boolean) => void;
}

const formatTime = (time: string) => {
  if (!time) return '';
  return time;
};

const CuePanel: React.FC<CuePanelProps> = ({
  selectedCueId,
  selectedCue,
  onCueUpdate,
  onCueDelete,
  onCueDuplicate,
  setIsInEditMode
}) => {
  const [editedName, setEditedName] = useState('');
  const [editedTime, setEditedTime] = useState('');
  const [editedDuration, setEditedDuration] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (selectedCue) {
      setEditedName(selectedCue.name);
      setEditedTime(formatTime(selectedCue.time));
      setEditedDuration(formatTime(selectedCue.duration));
      setEditedNotes(selectedCue.notes || '');
    }
  }, [selectedCue]);
  
  useEffect(() => {
    if (setIsInEditMode) {
      setIsInEditMode(isEditing);
    }
  }, [isEditing, setIsInEditMode]);
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
    
    if (selectedCue) {
      onCueUpdate({
        ...selectedCue,
        name: e.target.value
      });
    }
  };
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTime(e.target.value);
    
    if (selectedCue) {
      onCueUpdate({
        ...selectedCue,
        time: e.target.value
      });
    }
  };
  
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedDuration(e.target.value);
    
    if (selectedCue) {
      onCueUpdate({
        ...selectedCue,
        duration: e.target.value
      });
    }
  };
  
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedNotes(e.target.value);
    
    if (selectedCue) {
      onCueUpdate({
        ...selectedCue,
        notes: e.target.value
      });
    }
  };
  
  const handleToggleAutoFollow = () => {
    if (selectedCue) {
      onCueUpdate({
        ...selectedCue,
        autoFollow: !selectedCue.autoFollow
      });
      
      toast({
        title: "Auto Follow Updated",
        description: `Auto follow ${!selectedCue.autoFollow ? 'enabled' : 'disabled'} for this cue`
      });
    }
  };
  
  const handleDeleteClick = () => {
    if (selectedCueId) {
      onCueDelete(selectedCueId);
    }
  };
  
  const handleDuplicateClick = () => {
    if (selectedCueId) {
      onCueDuplicate(selectedCueId);
    }
  };
  
  const handleFullEdit = () => {
    document.dispatchEvent(new CustomEvent("timeline-edit-cue", { 
      detail: { cue: selectedCue }
    }));
  };
  
  if (!selectedCue) return null;
  
  return (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="p-3 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${
              selectedCue.type === 'audio' ? 'bg-runway-teal' :
              selectedCue.type === 'video' ? 'bg-runway-success' :
              selectedCue.type === 'lighting' ? 'bg-runway-highlight' :
              'bg-runway-warning'
            }`}
          />
          <span className="font-semibold">Cue Details</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-0 h-7 w-7"
          onClick={() => onCueDelete(selectedCue.id)}
        >
          <ChevronDown size={16} />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-5">
          <div>
            <Label htmlFor="cue-name" className="text-muted-foreground text-xs block mb-1">
              CUE NAME
            </Label>
            <Input
              id="cue-name"
              className="font-medium"
              value={editedName}
              onChange={handleNameChange}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              placeholder="Enter cue name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cue-time" className="text-muted-foreground text-xs block mb-1">
                <Clock size={12} className="inline mr-1" /> TIME
              </Label>
              <Input
                id="cue-time"
                value={editedTime}
                onChange={handleTimeChange}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                placeholder="00:00:00"
              />
            </div>
            
            <div>
              <Label htmlFor="cue-duration" className="text-muted-foreground text-xs block mb-1">
                <Timer size={12} className="inline mr-1" /> DURATION
              </Label>
              <Input
                id="cue-duration"
                value={editedDuration}
                onChange={handleDurationChange}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                placeholder="00:00:00"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="cue-notes" className="text-muted-foreground text-xs block mb-1">
              <MessageSquareText size={12} className="inline mr-1" /> NOTES
            </Label>
            <textarea
              id="cue-notes"
              className="w-full p-2 rounded-md border border-border bg-background min-h-[100px] text-sm"
              value={editedNotes}
              onChange={handleNotesChange}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              placeholder="Add notes for this cue"
            />
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-muted-foreground text-xs block mb-1">
                <PlayCircle size={12} className="inline mr-1" /> PLAYBACK
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Button 
                  size="sm" 
                  variant={selectedCue.autoFollow ? "default" : "outline"}
                  onClick={handleToggleAutoFollow}
                  className="gap-1"
                >
                  <RotateCw size={14} />
                  Auto-Follow
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-muted-foreground text-xs block mb-1">
                <Zap size={12} className="inline mr-1" /> EFFECTS
              </Label>
              <div className="text-sm text-muted-foreground">
                {selectedCue.effects && selectedCue.effects.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedCue.effects.map((effect, index) => (
                      <span 
                        key={index}
                        className="px-2 py-0.5 bg-muted rounded-full text-xs"
                      >
                        {effect}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs">No effects added</span>
                )}
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-between">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleFullEdit}>
              <FileEdit size={14} /> Edit All
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 text-amber-500 hover:text-amber-600"
                onClick={handleDuplicateClick}
              >
                <Copy size={14} />
                Duplicate
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 text-destructive hover:text-destructive/90"
                onClick={handleDeleteClick}
              >
                <Trash2 size={14} />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CuePanel;
