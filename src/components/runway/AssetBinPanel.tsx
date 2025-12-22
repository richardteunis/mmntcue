import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Package, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Music, 
  Video, 
  Image, 
  FileText,
  AlertTriangle,
  Plus,
  Upload
} from 'lucide-react';
import { useShowAssets } from '@/hooks/useAssets';
import { Asset, ShowAsset, formatFileSize, formatDuration } from '@/types/asset';

interface AssetBinPanelProps {
  showId?: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
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
    case 'audio': return 'text-runway-teal';
    case 'video': return 'text-runway-success';
    case 'image': return 'text-runway-highlight';
    case 'document': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
};

const AssetBinPanel: React.FC<AssetBinPanelProps> = ({
  showId,
  isExpanded,
  onToggleExpand,
  onAssetDragStart,
  onAssetSelect,
  onAddMedia,
}) => {
  const { showAssets, loading } = useShowAssets(showId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  // Extract actual assets from show assets (with nested asset property)
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

  // Check for missing media (assets that may have broken links)
  const missingMediaCount = useMemo(() => {
    return 0;
  }, []);

  // Get last added asset
  const lastAddedAsset = useMemo(() => {
    if (assets.length === 0) return null;
    return [...assets].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [assets]);

  const handleDragStart = useCallback((e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
    onAssetDragStart?.(asset);
  }, [onAssetDragStart]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className={cn(
        "w-full border-t border-border bg-card/80 backdrop-blur-sm transition-all",
        isExpanded && "border-primary/30"
      )}>
        {/* Collapsed/Header State */}
        <CollapsibleTrigger asChild>
          <button 
            className={cn(
              "w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            )}
          >
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Assets</span>
              <Badge variant="secondary" className="text-xs">
                {assets.length}
              </Badge>
              {missingMediaCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {missingMediaCount} missing
                </Badge>
              )}
              {lastAddedAsset && !isExpanded && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  Last: {lastAddedAsset.name}
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-3">
            {/* Search and Filter Row */}
            <div className="flex gap-2">
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
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setFilterType(isActive ? null : type)}
                        >
                          <Icon className={cn("h-3.5 w-3.5", isActive && getAssetColor(type))} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <span className="capitalize">{type}</span>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={onAddMedia}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>

            {/* Asset Grid */}
            <ScrollArea className="h-[140px]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Loading assets...
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                  <Package className="h-8 w-8 opacity-50" />
                  <span>{searchQuery ? 'No matching assets' : 'No assets in show'}</span>
                  <Button variant="outline" size="sm" onClick={onAddMedia}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Upload Asset
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
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
                                asset.file_type === 'audio' && "bg-runway-teal/20",
                                asset.file_type === 'video' && "bg-runway-success/20",
                                asset.file_type === 'image' && "bg-runway-highlight/20"
                              )}>
                                <Icon className={cn("h-5 w-5", getAssetColor(asset.file_type))} />
                              </div>
                            )}
                            
                            {/* Duration badge for audio/video */}
                            {asset.duration != null && (
                              <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-black/70 rounded text-[9px] font-mono text-white">
                                {formatDuration(asset.duration)}
                              </div>
                            )}
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white text-center px-1 line-clamp-2">
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default AssetBinPanel;
