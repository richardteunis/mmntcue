import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  Folder
} from 'lucide-react';
import { useShowAssets } from '@/hooks/useAssets';
import { Asset, ShowAsset, formatFileSize, formatDuration } from '@/types/asset';

interface MediaBinProps {
  showId?: string | null;
  onAssetDragStart?: (asset: Asset) => void;
  onAssetSelect?: (asset: Asset) => void;
  onAddMedia?: () => void;
  disabled?: boolean;
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

const MediaBin: React.FC<MediaBinProps> = ({
  showId,
  onAssetDragStart,
  onAssetSelect,
  onAddMedia,
  disabled = false,
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
    <div className="flex flex-col h-full bg-card/50 rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Media Bin</span>
          {assets.length > 0 && (
            <span className="text-xs text-muted-foreground">({assets.length})</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onAddMedia}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/30">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-6 pl-6 text-xs bg-background/50"
          />
        </div>
        <div className="flex gap-0.5">
          {(['audio', 'video', 'image'] as const).map((type) => {
            const Icon = getAssetIcon(type);
            const isActive = filterType === type;
            return (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setFilterType(isActive ? null : type)}
                  >
                    <Icon className={cn("h-3 w-3", isActive && "text-primary")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
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
          <div className="flex items-center justify-center h-full py-8 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 text-muted-foreground">
            <Package className="h-6 w-6 mb-2 opacity-50" />
            <p className="text-xs">{searchQuery ? 'No matches' : 'No assets'}</p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={onAddMedia}>
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 p-2">
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
                        "aspect-square rounded-md overflow-hidden cursor-grab active:cursor-grabbing",
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
                          <Icon className="h-5 w-5" />
                        </div>
                      )}
                      
                      {/* Duration badge for audio/video */}
                      {asset.duration != null && (
                        <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-black/70 rounded text-[8px] font-mono text-white">
                          {formatDuration(asset.duration)}
                        </div>
                      )}
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[9px] text-white text-center px-1 line-clamp-2">
                          {asset.name}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[180px]">
                    <p className="font-medium text-xs">{asset.name}</p>
                    <p className="text-[10px] text-muted-foreground">
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
    </div>
  );
};

export default MediaBin;
