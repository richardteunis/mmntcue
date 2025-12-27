import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface PanicSafetyButtonProps {
  lastCompletedCueName?: string;
  onRevert?: () => void;
  disabled?: boolean;
  className?: string;
}

const PanicSafetyButton: React.FC<PanicSafetyButtonProps> = ({
  lastCompletedCueName,
  onRevert,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleRevert = () => {
    onRevert?.();
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || !lastCompletedCueName}
              className={cn(
                "h-8 px-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive",
                className
              )}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Revert
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Revert to last completed cue</p>
        </TooltipContent>
      </Tooltip>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Revert to Last Completed Cue?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will roll the timeline focus back to{' '}
            <span className="font-semibold text-foreground">
              {lastCompletedCueName || 'the previous cue'}
            </span>.
            <br /><br />
            Use this if you need to recover from an unexpected situation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleRevert}
            className="bg-destructive hover:bg-destructive/90"
          >
            Revert Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PanicSafetyButton;
