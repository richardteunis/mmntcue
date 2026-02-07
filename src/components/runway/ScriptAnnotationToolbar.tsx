import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Highlighter, 
  MessageSquarePlus, 
  Link2, 
  Trash2,
  X 
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Cue } from '@/types/cue';

interface ScriptAnnotationToolbarProps {
  isAnnotating: boolean;
  onToggleAnnotating: () => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  highlightColors: { name: string; value: string }[];
  currentPage: number;
  totalPages: number;
  cues?: Cue[];
  linkedCueId?: string | null;
  onLinkCue: (cueId: string) => void;
  onUnlinkCue: () => void;
  annotationCount: number;
  onClearAnnotations: () => void;
}

const ScriptAnnotationToolbar: React.FC<ScriptAnnotationToolbarProps> = ({
  isAnnotating,
  onToggleAnnotating,
  selectedColor,
  onColorChange,
  highlightColors,
  currentPage,
  totalPages,
  cues = [],
  linkedCueId,
  onLinkCue,
  onUnlinkCue,
  annotationCount,
  onClearAnnotations,
}) => {
  const linkedCue = cues.find(c => c.id === linkedCueId);

  return (
    <div className="flex items-center gap-1">
      {/* Highlight toggle */}
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 w-8 p-0 relative",
                  isAnnotating && "bg-primary/10 text-primary"
                )}
              >
                <Highlighter className="h-4 w-4" />
                <div 
                  className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-background"
                  style={{ backgroundColor: selectedColor }}
                />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Highlight Tool</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Highlight Color</p>
            <div className="flex gap-1">
              {highlightColors.map(color => (
                <button
                  key={color.value}
                  onClick={() => {
                    onColorChange(color.value);
                    if (!isAnnotating) onToggleAnnotating();
                  }}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                    selectedColor === color.value ? "border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <Button 
              variant={isAnnotating ? "default" : "outline"}
              size="sm" 
              className="w-full mt-2"
              onClick={onToggleAnnotating}
            >
              {isAnnotating ? 'Done Highlighting' : 'Start Highlighting'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Link to cue */}
      {totalPages > 0 && (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "h-8 w-8 p-0",
                    linkedCueId && "text-primary"
                  )}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Link Page to Cue</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Link Page {currentPage} to Cue
                </p>
                {linkedCueId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={onUnlinkCue}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {linkedCue && (
                <div className="text-xs p-2 rounded bg-primary/10 text-primary">
                  Currently linked to: {linkedCue.name}
                </div>
              )}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {cues.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    No cues available
                  </p>
                ) : (
                  cues.map(cue => (
                    <button
                      key={cue.id}
                      onClick={() => onLinkCue(cue.id)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors",
                        linkedCueId === cue.id && "bg-primary/10 text-primary"
                      )}
                    >
                      <span className="font-medium">{cue.name}</span>
                      {cue.display_name && (
                        <span className="text-muted-foreground ml-1">
                          ({cue.display_name})
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Clear annotations */}
      {annotationCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={onClearAnnotations}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear Annotations ({annotationCount})</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export default ScriptAnnotationToolbar;
