import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Package, 
  Search, 
  Music, 
  Video, 
  Image, 
  FileText,
  Plus,
  Upload,
  Maximize2
} from 'lucide-react';
import { useShowAssets } from '@/hooks/useAssets';
import { Asset, ShowAsset, formatFileSize, formatDuration } from '@/types/asset';

interface MediaBinPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId?: string | null;
  onAssetDragStart?: (asset: Asset) => void;
  onAssetSelect?: (asset: Asset) => void;
  onAddMedia?: () => void;
}

const getAssetIcon = (fileType: Asset['file_type']) => {
  switch (fileType) {
    case 'audio': return Music;
    case 'video': return Video;
    case 'image': return Image;
    case 'document': return FileText;
    default: return FileText;
  }
};

const getAssetColor = (fileType: Asset['file_type']) => {
  switch (fileType) {
    case 'audio': return 'text-runway-teal bg-runway-teal/20';
    case 'video': return 'text-runway-success bg-runway-success/20';
    case 'image': return 'text-runway-highlight bg-runway-highlight/20';
    case 'document': return 'text-muted-foreground bg-muted';
    default: return 'text-muted-foreground bg-muted';
  }
};

const MediaBinPanel: React.FC<MediaBinPanelProps> = ({
  open,
  onOpenChange,
  showId,
  onAssetDragStart,
  onAssetSelect,
  onAddMedia,
}) => {
  const { showAssets, loading } = useShowAssets(showId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  // Extract actual assets from show assets
  const assets = useMemo(() => {
    return showAssets
      .filter((sa): sa is ShowAsset & { asset: Asset } => !!sa.asset)
      .map(sa => sa.asset);
  }, [showAssets]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    let result = assets;
    
    if (searchQuery) {
      result = result.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterType) {
      result = result.filter(a => a.file_type === filterType);
    }
    
    return result;
  }, [assets, searchQuery, filterType]);

  const handleDragStart = useCallback((e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
    onAssetDragStart?.(asset);
  }, [onAssetDragStart]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-[400px] sm:max-w-[400px] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <SheetTitle className="text-base">Media Bin</SheetTitle>
              {assets.length > 0 && (
                <span className="text-xs text-muted-foreground">({assets.length})</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onAddMedia}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Search and Filters */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm bg-background/50"
            />
          </div>
          <div className="flex gap-1">
            {(['audio', 'video', 'image'] as const).map((type) => {
              const Icon = getAssetIcon(type);
              const isActive = filterType === type;
              return (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setFilterType(isActive ? null : type)}
                    >
                      <Icon className={cn("h-3.5 w-3.5", isActive && "text-primary")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span className="capitalize">{type}</span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Package className="h-8 w-8 mb-3 opacity-50" />
              <p className="text-sm">{searchQuery ? 'No matches found' : 'No assets yet'}</p>
              <Button variant="ghost" size="sm" className="mt-3 text-sm" onClick={onAddMedia}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Media
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-4">
              {filteredAssets.map((asset) => {
                const Icon = getAssetIcon(asset.file_type);
                return (
                  <Tooltip key={asset.id}>
                    <TooltipTrigger asChild>
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, asset)}
                        onClick={() => onAssetSelect?.(asset)}
                        className={cn(
                          "aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing",
                          "border border-border/50 hover:border-primary/50 transition-all",
                          "hover:ring-2 hover:ring-primary/20 group relative"
                        )}
                      >
                        {asset.thumbnail_url ? (
                          <img
                            src={asset.thumbnail_url}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={cn(
                            "w-full h-full flex items-center justify-center",
                            getAssetColor(asset.file_type)
                          )}>
                            <Icon className="h-6 w-6" />
                          </div>
                        )}
                        
                        {/* Duration badge for audio/video */}
                        {asset.duration != null && (
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-mono text-white">
                            {formatDuration(asset.duration)}
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <span className="text-[10px] text-white text-center line-clamp-2">
                            {asset.name}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="font-medium text-sm">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(asset.file_size)}
                        {asset.duration != null && ` • ${formatDuration(asset.duration)}`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default MediaBinPanel;
