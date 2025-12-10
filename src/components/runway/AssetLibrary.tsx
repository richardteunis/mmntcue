import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useAssets, useShowAssets } from '@/hooks/useAssets';
import { useAuthContext } from '@/contexts/AuthContext';
import { Asset, formatFileSize, formatDuration } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  Music, 
  Video, 
  Image, 
  FileText, 
  Trash2, 
  Plus, 
  Loader2,
  FolderOpen,
  Filter,
  Grid3X3,
  List,
  Play,
  Pause,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AssetLibraryProps {
  showId?: string | null;
  onAssetDragStart?: (asset: Asset) => void;
  onAssetSelect?: (asset: Asset) => void;
  collapsed?: boolean;
  isPanel?: boolean;
  defaultOpen?: boolean;
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
    case 'audio': return 'bg-runway-teal/80';
    case 'video': return 'bg-runway-success/80';
    case 'image': return 'bg-runway-highlight/80';
    case 'document': return 'bg-muted-foreground/80';
    default: return 'bg-muted-foreground/80';
  }
};

// Waveform visualization component
const WaveformPreview: React.FC<{ className?: string }> = ({ className }) => {
  // Generate random waveform bars
  const bars = Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.2);
  
  return (
    <div className={cn("flex items-end gap-px h-full", className)}>
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 bg-runway-teal/60 rounded-t-sm"
          style={{ height: `${height * 100}%` }}
        />
      ))}
    </div>
  );
};

// Video scrub preview component
const VideoScrubPreview: React.FC<{ 
  asset: Asset; 
  className?: string;
  onHover?: boolean;
}> = ({ asset, className, onHover }) => {
  const [scrubPosition, setScrubPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !onHover) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    setScrubPosition(Math.max(0, Math.min(1, x)));
  };

  // Generate frame indicators
  const frameCount = 8;
  const frames = Array.from({ length: frameCount }, (_, i) => i / frameCount);

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full", className)}
      onMouseMove={handleMouseMove}
    >
      {/* Thumbnail or placeholder */}
      {asset.thumbnail_url ? (
        <img 
          src={asset.thumbnail_url} 
          alt={asset.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-runway-success/80 flex items-center justify-center">
          <Video className="h-8 w-8 text-white/80" />
        </div>
      )}
      
      {/* Scrub indicator */}
      {onHover && (
        <>
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 transition-all"
            style={{ left: `${scrubPosition * 100}%` }}
          />
          <div 
            className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-mono text-white"
          >
            {asset.duration ? formatDuration(asset.duration * scrubPosition) : '0:00'}
          </div>
        </>
      )}
      
      {/* Frame strip at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 flex">
        {frames.map((pos, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 border-r border-black/40",
              scrubPosition >= pos && scrubPosition < (i + 1) / frameCount 
                ? "bg-white/60" 
                : "bg-white/20"
            )}
          />
        ))}
      </div>
    </div>
  );
};

const AssetGridItem: React.FC<{
  asset: Asset;
  index: number;
  onDragStart?: (asset: Asset) => void;
  onSelect?: (asset: Asset) => void;
  onDelete?: (assetId: string) => void;
  onAddToShow?: (assetId: string) => void;
  showAddToShow?: boolean;
}> = ({ asset, index, onDragStart, onSelect, onDelete, onAddToShow, showAddToShow }) => {
  const Icon = getAssetIcon(asset.file_type);
  const colorClass = getAssetColor(asset.file_type);
  const [isHovering, setIsHovering] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(asset);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              draggable
              onDragStart={handleDragStart}
              onClick={() => onSelect?.(asset)}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="group relative aspect-video rounded-md overflow-hidden cursor-grab active:cursor-grabbing border border-border/50 hover:border-primary/50 transition-all hover:ring-2 hover:ring-primary/20"
            >
              {/* Content based on type */}
              {asset.file_type === 'audio' ? (
                <div className={cn("w-full h-full flex flex-col items-center justify-center p-2", colorClass)}>
                  <Music className="h-6 w-6 text-white/80 mb-1" />
                  <WaveformPreview className="w-full h-4" />
                </div>
              ) : asset.file_type === 'video' ? (
                <VideoScrubPreview asset={asset} onHover={isHovering} />
              ) : asset.thumbnail_url ? (
                <img 
                  src={asset.thumbnail_url} 
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={cn("w-full h-full flex items-center justify-center", colorClass)}>
                  <Icon className="h-8 w-8 text-white/80" />
                </div>
              )}
              
              {/* Duration badge */}
              {asset.duration != null && (
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] font-mono text-white">
                  {formatDuration(asset.duration)}
                </div>
              )}
              
              {/* Index number */}
              <div className="absolute top-1 left-1 text-[10px] font-medium text-white drop-shadow-md">
                {index + 1}
              </div>
              
              {/* Asset type indicator icons */}
              <div className="absolute top-1 right-1 flex gap-0.5">
                {asset.file_type === 'video' && (
                  <div className="p-0.5 bg-black/60 rounded">
                    <Video className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                {asset.file_type === 'audio' && (
                  <div className="p-0.5 bg-black/60 rounded">
                    <Music className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
              
              {/* Hover overlay with name */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                  <p className="text-[10px] font-medium text-white truncate">{asset.name}</p>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="font-medium">{asset.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(asset.file_size)}
              {asset.duration != null && ` • ${formatDuration(asset.duration)}`}
            </p>
          </TooltipContent>
        </Tooltip>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {showAddToShow && onAddToShow && (
          <ContextMenuItem onClick={() => onAddToShow(asset.id)}>
            <Plus className="mr-2 h-4 w-4" />
            Add to Show
          </ContextMenuItem>
        )}
        {onDelete && (
          <ContextMenuItem onClick={() => onDelete(asset.id)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

const AssetListItem: React.FC<{
  asset: Asset;
  index: number;
  onDragStart?: (asset: Asset) => void;
  onSelect?: (asset: Asset) => void;
  onDelete?: (assetId: string) => void;
  onAddToShow?: (assetId: string) => void;
  showAddToShow?: boolean;
}> = ({ asset, index, onDragStart, onSelect, onDelete, onAddToShow, showAddToShow }) => {
  const Icon = getAssetIcon(asset.file_type);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(asset);
  };

  const typeColors: Record<string, string> = {
    audio: 'text-runway-teal',
    video: 'text-runway-success',
    image: 'text-runway-highlight',
    document: 'text-muted-foreground',
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          draggable
          onDragStart={handleDragStart}
          onClick={() => onSelect?.(asset)}
          className="group flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-grab active:cursor-grabbing border-b border-border/30 transition-colors"
        >
          <span className="text-xs text-muted-foreground w-6 text-right">{index + 1}</span>
          
          <div className={cn("p-1.5 rounded", typeColors[asset.file_type] || 'text-muted-foreground')}>
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{asset.name}</p>
            <p className="text-xs text-muted-foreground">
              {asset.file_type} • {formatFileSize(asset.file_size)}
            </p>
          </div>
          
          {asset.duration != null && (
            <span className="text-xs font-mono text-muted-foreground">
              {formatDuration(asset.duration)}
            </span>
          )}
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {showAddToShow && onAddToShow && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToShow(asset.id);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(asset.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {showAddToShow && onAddToShow && (
          <ContextMenuItem onClick={() => onAddToShow(asset.id)}>
            <Plus className="mr-2 h-4 w-4" />
            Add to Show
          </ContextMenuItem>
        )}
        {onDelete && (
          <ContextMenuItem onClick={() => onDelete(asset.id)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

const AssetLibrary: React.FC<AssetLibraryProps> = ({ 
  showId, 
  onAssetDragStart, 
  onAssetSelect,
  collapsed,
  isPanel = false,
  defaultOpen = true
}) => {
  const { user } = useAuthContext();
  const { assets, loading: assetsLoading, uploadAsset, deleteAsset } = useAssets(user?.id);
  const { showAssets, loading: showAssetsLoading, addAssetToShow, removeAssetFromShow } = useShowAssets(showId);
  const [uploading, setUploading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPanelOpen, setIsPanelOpen] = useState(defaultOpen);
  const [panelHeight, setPanelHeight] = useState(280);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      await uploadAsset(file);
    }
    setUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers for file upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if dragging files (not assets)
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    // Filter for acceptable file types
    const acceptedFiles = Array.from(files).filter(file => {
      const type = file.type;
      return type.startsWith('audio/') || 
             type.startsWith('video/') || 
             type.startsWith('image/') ||
             type === 'application/pdf' ||
             type === 'application/msword' ||
             type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    });
    
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    for (const file of acceptedFiles) {
      await uploadAsset(file);
    }
    setUploading(false);
  }, [uploadAsset]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = { startY: e.clientY, startHeight: panelHeight };
  }, [panelHeight]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startY - e.clientY;
      const newHeight = Math.max(120, Math.min(500, resizeRef.current.startHeight + delta));
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (collapsed) {
    return (
      <div className="p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-9"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,video/*,image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  const showAssetIds = new Set(showAssets.map(sa => sa.asset_id));
  const libraryAssets = assets.filter(a => !showAssetIds.has(a.id));

  const filterAssets = (assetList: Asset[]) => {
    if (!filterText) return assetList;
    return assetList.filter(a => 
      a.name.toLowerCase().includes(filterText.toLowerCase())
    );
  };

  const renderAssets = (
    assetList: Asset[], 
    onDelete?: (id: string) => void, 
    onAddToShow?: (id: string) => void,
    showAddToShowOption?: boolean
  ) => {
    if (viewMode === 'grid') {
      return (
        <div className={cn(
          "grid gap-2 p-2",
          isPanel ? "grid-cols-6 lg:grid-cols-8 xl:grid-cols-10" : "grid-cols-3"
        )}>
          {assetList.map((asset, index) => (
            <AssetGridItem
              key={asset.id}
              asset={asset}
              index={index}
              onDragStart={onAssetDragStart}
              onSelect={onAssetSelect}
              onDelete={onDelete}
              onAddToShow={onAddToShow}
              showAddToShow={showAddToShowOption}
            />
          ))}
        </div>
      );
    }
    
    return (
      <div className="divide-y divide-border/30">
        {assetList.map((asset, index) => (
          <AssetListItem
            key={asset.id}
            asset={asset}
            index={index}
            onDragStart={onAssetDragStart}
            onSelect={onAssetSelect}
            onDelete={onDelete}
            onAddToShow={onAddToShow}
            showAddToShow={showAddToShowOption}
          />
        ))}
      </div>
    );
  };

  const content = (
    <div className={cn("flex flex-col", isPanel ? "h-full" : "h-full")}>
      <Tabs defaultValue={showId ? "show" : "library"} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
          <TabsList className="h-7">
            {showId && <TabsTrigger value="show" className="text-xs h-6 px-3">Show</TabsTrigger>}
            <TabsTrigger value="library" className="text-xs h-6 px-3">Library</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-7 text-xs"
            >
              {uploading ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3 w-3" />
              )}
              Add Media
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,video/*,image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {showId && (
          <TabsContent value="show" className="flex-1 m-0 overflow-hidden relative">
            <ScrollArea style={{ height: isPanel ? panelHeight - 100 : 280 }}>
              {showAssetsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : showAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No assets in this show.
                    <br />
                    Add from library or drag files here.
                  </p>
                </div>
              ) : (
                renderAssets(
                  filterAssets(showAssets.filter(sa => sa.asset).map(sa => sa.asset!)),
                  (id) => {
                    const showAsset = showAssets.find(sa => sa.asset_id === id);
                    if (showAsset) removeAssetFromShow(showAsset.id);
                  }
                )
              )}
            </ScrollArea>
          </TabsContent>
        )}

        <TabsContent value="library" className="flex-1 m-0 overflow-hidden relative">
          <ScrollArea style={{ height: isPanel ? panelHeight - 100 : 280 }}>
            {assetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Your library is empty.
                  <br />
                  Drop files here or click Add Media.
                </p>
              </div>
            ) : (
              renderAssets(
                filterAssets(showId ? libraryAssets : assets),
                deleteAsset,
                showId ? (id) => addAssetToShow(id, user?.id) : undefined,
                !!showId
              )
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/30">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fileInputRef.current?.click()}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-runway-success">
            <Pause className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <SkipForward className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1 flex-1 mx-3 max-w-xs">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter"
            className="h-6 text-xs border-0 bg-transparent focus-visible:ring-0 px-1"
          />
        </div>

        <div className="flex items-center gap-0.5">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-3 w-3" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setViewMode('list')}
          >
            <List className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Panel mode with collapsible header and drop zone
  if (isPanel) {
    return (
      <Collapsible 
        open={isPanelOpen} 
        onOpenChange={setIsPanelOpen} 
        className={cn(
          "border-t border-border bg-card relative",
          isDraggingOver && "ring-2 ring-primary ring-inset"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Resize handle */}
        {isPanelOpen && (
          <div 
            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary/50 transition-colors z-10"
            onMouseDown={handleResizeStart}
          />
        )}
        
        {/* Drop overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-primary/10 z-20 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Drop files to upload</span>
            </div>
          </div>
        )}
        
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Media Bin</span>
              <span className="text-xs text-muted-foreground">
                {assets.length} assets
              </span>
              {uploading && (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isPanelOpen && filterText && (
                <span className="text-xs text-muted-foreground">Filtered</span>
              )}
              {isPanelOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return content;
};

export default AssetLibrary;