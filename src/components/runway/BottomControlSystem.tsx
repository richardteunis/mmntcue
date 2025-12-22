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
  onSendQuickAction?: (actionId: string, actionLabel: string) => Promise<void>;
}

const BottomControlSystem: React.FC<BottomControlSystemProps> = ({
  showId,
  selectedCueId,
  selectedCueType,
  mode = 'planning',
  onAssetDragStart,
  onAssetSelect,
  onAddMedia,
  onSendQuickAction,
}) => {
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>('none');

  // Auto-expand VOG panel when VOG cue is selected
  const handleVOGExpand = useCallback(() => {
    setExpandedPanel(prev => prev === 'vog' ? 'none' : 'vog');
  }, []);

  const handleAssetsExpand = useCallback(() => {
    setExpandedPanel(prev => prev === 'assets' ? 'none' : 'assets');
  }, []);

  const handleAddVOG = useCallback(() => {
    setExpandedPanel('vog');
  }, []);

  const handleAddBuffer = useCallback(() => {
    // TODO: Implement add buffer cue
  }, []);

  const handleSendOpsAlert = useCallback(() => {
    // TODO: Open ops alert modal
  }, []);

  return (
    <div className={cn(
      "flex flex-col w-full",
      "border-t border-border bg-background"
    )}>
      {/* Asset Bin Panel (top secondary) */}
      <AssetBinPanel
        showId={showId}
        isExpanded={expandedPanel === 'assets'}
        onToggleExpand={handleAssetsExpand}
        onAssetDragStart={onAssetDragStart}
        onAssetSelect={onAssetSelect}
        onAddMedia={onAddMedia}
      />

      {/* VOG Creator Panel (middle secondary) */}
      <VOGCreatorPanel
        showId={showId}
        cueId={selectedCueType === 'vog' ? selectedCueId : null}
        isExpanded={expandedPanel === 'vog'}
        onToggleExpand={handleVOGExpand}
      />

      {/* Quick Action Tray (always visible primary) */}
      <QuickActionTray
        showId={showId}
        mode={mode}
        onAddVOG={handleAddVOG}
        onAddBuffer={handleAddBuffer}
        onSendOpsAlert={handleSendOpsAlert}
        onSendQuickAction={onSendQuickAction}
        disabled={!showId}
      />
    </div>
  );
};

export default BottomControlSystem;
