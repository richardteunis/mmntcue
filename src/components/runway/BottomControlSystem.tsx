import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import ShowOperationsBar, { ShowMode } from './ShowOperationsBar';
import VOGCreatorPanel from './VOGCreatorPanel';
import AssetBinPanel from './AssetBinPanel';
import { Asset } from '@/types/asset';
import { ShowControlState } from '@/hooks/useShowState';
import { ChevronDown, ChevronRight, Mic2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ExpandedPanel = 'none' | 'vog' | 'assets';

interface BottomControlSystemProps {
  showId?: string | null;
  selectedCueId?: string | null;
  selectedCueType?: string | null;
  mode?: ShowMode;
  controlState?: ShowControlState;
  assetCount?: number;
  onAssetDragStart?: (asset: Asset) => void;
  onAssetSelect?: (asset: Asset) => void;
  onAddMedia?: () => void;
  onAddCue?: (type: string, name: string) => Promise<void>;
  onExecuteImmediate?: (actionId: string) => void;
  onAddCustomAction?: () => void;
  onStandby?: () => void;
  onHold?: () => void;
}

const BottomControlSystem: React.FC<BottomControlSystemProps> = ({
  showId,
  selectedCueId,
  selectedCueType,
  mode = 'planning',
  controlState = 'idle',
  assetCount = 0,
  onAssetDragStart,
  onAssetSelect,
  onAddMedia,
  onAddCue,
  onExecuteImmediate,
  onAddCustomAction,
  onStandby,
  onHold,
}) => {
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>('none');

  const handleVOGExpand = useCallback(() => {
    setExpandedPanel(prev => prev === 'vog' ? 'none' : 'vog');
  }, []);

  const handleAssetsExpand = useCallback(() => {
    setExpandedPanel(prev => prev === 'assets' ? 'none' : 'assets');
  }, []);

  const handleAddVOG = useCallback(() => {
    setExpandedPanel('vog');
  }, []);

  const handleAddBuffer = useCallback(async () => {
    if (onAddCue) {
      await onAddCue('ops_note', 'Buffer');
    }
  }, [onAddCue]);

  const handleSendOpsAlert = useCallback(async () => {
    if (onAddCue) {
      await onAddCue('ops_note', 'Ops Alert');
    }
  }, [onAddCue]);

  const handleQuickAddCue = useCallback(async (actionId: string, actionLabel: string) => {
    if (onAddCue) {
      await onAddCue('ops_note', actionLabel);
    }
  }, [onAddCue]);

  return (
    <div className={cn(
      "flex flex-col w-full",
      "bg-background"
    )}>
      {/* ZONE 1: Show Operations & Control - Always Visible, Two Rows */}
      <ShowOperationsBar
        showId={showId}
        mode={mode}
        controlState={controlState}
        onAddVOG={handleAddVOG}
        onAddBuffer={handleAddBuffer}
        onSendOpsAlert={handleSendOpsAlert}
        onAddCue={handleQuickAddCue}
        onExecuteImmediate={onExecuteImmediate}
        onAddCustomAction={onAddCustomAction}
        onStandby={onStandby}
        onHold={onHold}
        disabled={!showId}
      />

      {/* Visual Divider */}
      <div className="h-px bg-border" />

      {/* ZONE 2 & 3: Collapsible Panel Headers */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
        {/* VOG Creator Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleVOGExpand}
          className={cn(
            "h-8 px-3 text-xs font-medium",
            expandedPanel === 'vog' && "bg-primary/10 text-primary"
          )}
        >
          {expandedPanel === 'vog' ? (
            <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
          )}
          <Mic2 className="h-3.5 w-3.5 mr-1.5" />
          VOG Creator
        </Button>

        {/* Assets Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAssetsExpand}
          className={cn(
            "h-8 px-3 text-xs font-medium",
            expandedPanel === 'assets' && "bg-primary/10 text-primary"
          )}
        >
          {expandedPanel === 'assets' ? (
            <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
          )}
          <Image className="h-3.5 w-3.5 mr-1.5" />
          Assets {assetCount > 0 && `(${assetCount})`}
        </Button>
      </div>

      {/* Expanded Panels */}
      {expandedPanel === 'vog' && (
        <div className="border-t border-border">
          <VOGCreatorPanel
            showId={showId}
            cueId={selectedCueType === 'vog' ? selectedCueId : null}
            isExpanded={true}
            onToggleExpand={handleVOGExpand}
          />
        </div>
      )}

      {expandedPanel === 'assets' && (
        <div className="border-t border-border">
          <AssetBinPanel
            showId={showId}
            isExpanded={true}
            onToggleExpand={handleAssetsExpand}
            onAssetDragStart={onAssetDragStart}
            onAssetSelect={onAssetSelect}
            onAddMedia={onAddMedia}
          />
        </div>
      )}
    </div>
  );
};

export default BottomControlSystem;
