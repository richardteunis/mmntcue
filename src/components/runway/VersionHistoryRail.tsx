import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { History, ChevronRight, ChevronDown, RotateCcw, FileSpreadsheet, Bot, Users, Loader2 } from 'lucide-react';
import { useROSVersions } from '@/hooks/useROSVersions';
import { cn } from '@/lib/utils';
import type { ROSVersion } from '@/types/ros';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VersionHistoryRailProps {
  showId: string;
  className?: string;
}

const SOURCE_ICONS: Record<ROSVersion['source_type'], React.ReactNode> = {
  manual: <Users className="h-3 w-3" />,
  csv: <FileSpreadsheet className="h-3 w-3" />,
  google_sheet: <FileSpreadsheet className="h-3 w-3" />,
  excel: <FileSpreadsheet className="h-3 w-3" />,
  ai: <Bot className="h-3 w-3" />
};

export default function VersionHistoryRail({ showId, className }: VersionHistoryRailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const { versions, currentVersion, loading, rollbackToVersion } = useROSVersions(showId);

  const handleRollback = async () => {
    if (!confirmRollback) return;
    
    setIsRollingBack(true);
    await rollbackToVersion(confirmRollback);
    setIsRollingBack(false);
    setConfirmRollback(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (versions.length === 0) return null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-2 text-sm font-medium",
              className
            )}
          >
            <History className="h-4 w-4" />
            <span>Version History</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              v{currentVersion?.version_number || 1}
            </Badge>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ScrollArea className="h-64 border rounded-md mt-2 bg-background">
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md",
                      "hover:bg-muted/50 transition-colors",
                      index === 0 && "bg-primary/5 border border-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center justify-center w-6 h-6 rounded bg-muted">
                        {SOURCE_ICONS[version.source_type]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            v{version.version_number}
                          </span>
                          {index === 0 && (
                            <Badge variant="default" className="text-[10px] h-4">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {version.summary || 'No description'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(version.created_at)}
                      </span>
                      {index !== 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setConfirmRollback(version.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={!!confirmRollback} onOpenChange={() => setConfirmRollback(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback to this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the Run of Show to a previous state. A new version will be created to track this rollback.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRollback}
              disabled={isRollingBack}
            >
              {isRollingBack ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rolling back...
                </>
              ) : (
                'Confirm Rollback'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
