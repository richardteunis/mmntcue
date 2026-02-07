import React from 'react';
import { Annotation } from '@/hooks/useScriptAnnotations';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ScriptHighlightOverlayProps {
  annotations: Annotation[];
  onRemove: (id: string) => void;
}

const ScriptHighlightOverlay: React.FC<ScriptHighlightOverlayProps> = ({
  annotations,
  onRemove,
}) => {
  if (annotations.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Highlights on this page ({annotations.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {annotations.map((annotation) => (
          <Tooltip key={annotation.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                  "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                style={{ backgroundColor: annotation.color }}
              >
                <span className="max-w-[150px] truncate text-foreground">
                  {annotation.text}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(annotation.id);
                  }}
                  className="text-foreground/60 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[300px]">
              <p className="text-sm">{annotation.text}</p>
              {annotation.note && (
                <p className="text-xs text-muted-foreground mt-1">{annotation.note}</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default ScriptHighlightOverlay;
