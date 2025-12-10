import React, { useRef, useState } from 'react';
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
  SkipForward
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AssetLibraryProps {
  showId?: string | null;
  onAssetDragStart?: (asset: Asset) => void;
  onAssetSelect?: (asset: Asset) => void;
  collapsed?: boolean;
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
              className="group relative aspect-video rounded-md overflow-hidden cursor-grab active:cursor-grabbing border border-border/50 hover:border-primary/50 transition-all hover:ring-2 hover:ring-primary/20"
            >
              {/* Thumbnail */}
              {asset.thumbnail_url ? (
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

const AssetLibrary: React.FC<AssetLibraryProps> = ({ 
  showId, 
  onAssetDragStart, 
  onAssetSelect,
  collapsed 
}) => {
  const { user } = useAuthContext();
  const { assets, loading: assetsLoading, uploadAsset, deleteAsset } = useAssets(user?.id);
  const { showAssets, loading: showAssetsLoading, addAssetToShow, removeAssetFromShow } = useShowAssets(showId);
  const [uploading, setUploading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const renderAssetGrid = (
    assetList: Asset[], 
    onDelete?: (id: string) => void, 
    onAddToShow?: (id: string) => void,
    showAddToShowOption?: boolean
  ) => (
    <div className="grid grid-cols-3 gap-1.5 p-2">
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

  return (
    <div className="flex flex-col h-full">
      {/* Upload button */}
      <div className="px-2 pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-8 text-xs"
        >
          {uploading ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Plus className="mr-2 h-3 w-3" />
          )}
          Add Media
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

      <Tabs defaultValue={showId ? "show" : "library"} className="flex-1 flex flex-col">
        <TabsList className="mx-2 h-7">
          {showId && <TabsTrigger value="show" className="flex-1 text-[10px] h-5">Show</TabsTrigger>}
          <TabsTrigger value="library" className="flex-1 text-[10px] h-5">Library</TabsTrigger>
        </TabsList>

        {showId && (
          <TabsContent value="show" className="flex-1 m-0 mt-2">
            <ScrollArea className="h-[280px]">
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
                    Add from library or drag to cues.
                  </p>
                </div>
              ) : (
                renderAssetGrid(
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

        <TabsContent value="library" className="flex-1 m-0 mt-2">
          <ScrollArea className="h-[280px]">
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
                  Upload media files to get started.
                </p>
              </div>
            ) : (
              renderAssetGrid(
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
      <div className="flex items-center justify-between px-2 py-1.5 border-t border-border/50">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fileInputRef.current?.click()}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-runway-success">
            <Pause className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Grid3X3 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <SkipForward className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1 flex-1 mx-2">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter"
            className="h-6 text-[10px] border-0 bg-transparent focus-visible:ring-0 px-1"
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
};

export default AssetLibrary;