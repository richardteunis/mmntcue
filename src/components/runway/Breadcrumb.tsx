import React from 'react';
import { ChevronRight, Home, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbProps {
  showName?: string;
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ showName, className }) => {
  return (
    <nav className={cn("flex items-center gap-1.5 text-sm", className)} aria-label="Breadcrumb">
      <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <Layers className="h-4 w-4 text-primary" />
        <span className="font-medium">MMNT</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Cue</span>
      {showName && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{showName}</span>
        </>
      )}
    </nav>
  );
};

export default Breadcrumb;
