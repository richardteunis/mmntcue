import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import ShowOperationsBar, { ShowMode } from './ShowOperationsBar';
import VOGCreatorPanel from './VOGCreatorPanel';
import AssetBinPanel from './AssetBinPanel';
import { Asset } from '@/types/asset';

type ExpandedPanel = 'none' | 'vog' | 'assets';

interface BottomControlSystemProps {
  showId?: string | null;
  selectedCueId?: string | null;
  selectedCueType?: string | null;
  mode?: ShowMode;
  onAssetDragStart?: (asset: Asset) => void;
  onAssetSelect?: (asset: Asset) => void;
  onAddMedia?: () => void;
  onAddCue?: (type: string, name: string) => Promise<void>;
  onExecuteImmediate?: (actionId: string) => void;
  onAddCustomAction?: () => void;
}

const BottomControlSystem: React.FC<BottomControlSystemProps> = ({
  showId,
  selectedCueId,
  selectedCueType,
  mode = 'planning',
  onAssetDragStart,
  onAssetSelect,
  onAddMedia,
  onAddCue,
  onExecuteImmediate,
  onAddCustomAction,
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
      {/* ZONE 1: Show Operations Bar - Always Visible */}
      <ShowOperationsBar
        showId={showId}
        mode={mode}
        onAddVOG={handleAddVOG}
        onAddBuffer={handleAddBuffer}
        onSendOpsAlert={handleSendOpsAlert}
        onAddCue={handleQuickAddCue}
        onExecuteImmediate={onExecuteImmediate}
        onAddCustomAction={onAddCustomAction}
        disabled={!showId}
      />

      {/* ZONE 2 & 3: Collapsible Panels */}
      <div className="relative">
        {/* ZONE 2: VOG Studio Panel */}
        <VOGCreatorPanel
          showId={showId}
          cueId={selectedCueType === 'vog' ? selectedCueId : null}
          isExpanded={expandedPanel === 'vog'}
          onToggleExpand={handleVOGExpand}
        />

        {/* ZONE 3: Asset Library Panel */}
        <AssetBinPanel
          showId={showId}
          isExpanded={expandedPanel === 'assets'}
          onToggleExpand={handleAssetsExpand}
          onAssetDragStart={onAssetDragStart}
          onAssetSelect={onAssetSelect}
          onAddMedia={onAddMedia}
        />
      </div>
    </div>
  );
};

export default BottomControlSystem;
