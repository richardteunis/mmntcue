import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface GoFeedbackProps {
  cueNumber?: number;
  cueName?: string;
  isVisible: boolean;
  onComplete?: () => void;
}

const GoFeedback: React.FC<GoFeedbackProps> = ({
  cueNumber,
  cueName,
  isVisible,
  onComplete,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!show) return null;

  return (
    <div className={cn(
      "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
      "bg-runway-success/90 backdrop-blur-sm rounded-xl px-8 py-6 shadow-2xl",
      "animate-scale-in"
    )}>
      <div className="flex items-center gap-4 text-white">
        <CheckCircle2 className="h-10 w-10" />
        <div>
          <div className="text-2xl font-bold">
            Cue #{cueNumber} fired
          </div>
          {cueName && (
            <div className="text-lg opacity-90">{cueName}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoFeedback;
