import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import SegmentEditorBin, { Segment } from './SegmentEditorBin';
import MediaBin from './MediaBin';
import QuickActionBin from './QuickActionBin';
import VOGEditorLightbox from './VOGEditorLightbox';
import { Asset } from '@/types/asset';

interface BottomControlSystemProps {
  showId?: string | null;
  selectedCueId?: string | null;
  selectedCueName?: string | null;
  // Segment props
  segments?: Segment[];
  onSegmentClick?: (segmentId: string) => void;
  onSegmentReorder?: (segmentId: string, newIndex: number) => void;
  onSegmentCreate?: (name: string, targetDuration: number, color?: string) => void;
  onSegmentUpdate?: (segmentId: string, name: string, targetDuration: number, color?: string) => void;
  onSegmentColorChange?: (segmentId: string, color: string) => void;
  onSegmentDelete?: (segmentId: string) => void;
  // Asset props
  onAssetDragStart?: (asset: Asset) => void;
  onAssetSelect?: (asset: Asset) => void;
  onAddMedia?: () => void;
  // Quick action props
  onAddCue?: (type: string, name: string) => Promise<void>;
  onAddMoment?: (type: string, label: string) => void;
  onAddBuffer?: () => Promise<void>;
  onSendOpsAlert?: () => Promise<void>;
  // VOG props
  onVOGGenerated?: (audioUrl: string, fileName: string) => void;
  onVOGSave?: (script: string, voiceId: string, style: string) => void;
  // General
  disabled?: boolean;
}

const BottomControlSystem: React.FC<BottomControlSystemProps> = ({
  showId,
  selectedCueId,
  selectedCueName,
  // Segment props
  segments = [],
  onSegmentClick,
  onSegmentReorder,
  onSegmentCreate,
  onSegmentUpdate,
  onSegmentColorChange,
  onSegmentDelete,
  // Asset props
  onAssetDragStart,
  onAssetSelect,
  onAddMedia,
  // Quick action props
  onAddCue,
  onAddMoment,
  onAddBuffer,
  onSendOpsAlert,
  // VOG props
  onVOGGenerated,
  onVOGSave,
  // General
  disabled = false,
}) => {
  const [isVOGEditorOpen, setIsVOGEditorOpen] = useState(false);

  const handleOpenVOGEditor = useCallback(() => {
    setIsVOGEditorOpen(true);
  }, []);

  const handleAddBuffer = useCallback(async () => {
    if (onAddBuffer) {
      await onAddBuffer();
    }
  }, [onAddBuffer]);

  const handleSendOpsAlert = useCallback(async () => {
    if (onSendOpsAlert) {
      await onSendOpsAlert();
    }
  }, [onSendOpsAlert]);

  return (
    <>
      <div className={cn(
        "flex w-full h-[240px] gap-2 p-2 bg-background border-t border-border"
      )}>
        {/* Segment Editor Bin */}
        <div className="flex-1 min-w-0">
          <SegmentEditorBin
            segments={segments}
            onSegmentClick={onSegmentClick}
            onSegmentReorder={onSegmentReorder}
            onSegmentCreate={onSegmentCreate}
            onSegmentUpdate={onSegmentUpdate}
            onSegmentColorChange={onSegmentColorChange}
            onSegmentDelete={onSegmentDelete}
            disabled={disabled || !showId}
          />
        </div>

        {/* Media Bin */}
        <div className="flex-1 min-w-0">
          <MediaBin
            showId={showId}
            onAssetDragStart={onAssetDragStart}
            onAssetSelect={onAssetSelect}
            onAddMedia={onAddMedia}
            disabled={disabled || !showId}
          />
        </div>

        {/* Quick Action Bin */}
        <div className="flex-1 min-w-0">
          <QuickActionBin
            showId={showId}
            onAddCue={onAddCue}
            onAddMoment={onAddMoment}
            onOpenVOGEditor={handleOpenVOGEditor}
            onAddBuffer={handleAddBuffer}
            onSendOpsAlert={handleSendOpsAlert}
            disabled={disabled || !showId}
          />
        </div>
      </div>

      {/* VOG Editor Lightbox */}
      <VOGEditorLightbox
        open={isVOGEditorOpen}
        onOpenChange={setIsVOGEditorOpen}
        showId={showId}
        cueId={selectedCueId}
        cueName={selectedCueName || undefined}
        onGenerated={onVOGGenerated}
        onSave={onVOGSave}
      />
    </>
  );
};

export default BottomControlSystem;
