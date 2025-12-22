import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import QuickActionTray, { ShowMode } from './QuickActionTray';
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
      {/* Quick Action Tray - ALWAYS visible at top of bottom control area */}
      <QuickActionTray
        showId={showId}
        mode={mode}
        onAddVOG={handleAddVOG}
        onAddBuffer={handleAddBuffer}
        onSendOpsAlert={handleSendOpsAlert}
        onAddQuickCue={handleQuickAddCue}
        disabled={!showId}
      />

      {/* Secondary panels stack below the quick action tray */}
      <div className="relative">
        {/* VOG Creator Panel */}
        <VOGCreatorPanel
          showId={showId}
          cueId={selectedCueType === 'vog' ? selectedCueId : null}
          isExpanded={expandedPanel === 'vog'}
          onToggleExpand={handleVOGExpand}
        />

        {/* Asset Bin Panel */}
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
