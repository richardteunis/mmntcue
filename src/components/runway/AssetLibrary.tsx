import React, { useRef, useState } from 'react';
import { useAssets, useShowAssets } from '@/hooks/useAssets';
import { useAuthContext } from '@/contexts/AuthContext';
import { Asset, formatFileSize, formatDuration } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Music, 
  Video, 
  Image, 
  FileText, 
  Trash2, 
  Plus, 
  Loader2,
  GripVertical,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

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
    case 'audio': return 'text-runway-teal';
    case 'video': return 'text-runway-success';
    case 'image': return 'text-runway-highlight';
    case 'document': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
};

const AssetItem: React.FC<{
  asset: Asset;
  onDragStart?: (asset: Asset) => void;
  onSelect?: (asset: Asset) => void;
  onDelete?: (assetId: string) => void;
  onAddToShow?: (assetId: string) => void;
  showAddToShow?: boolean;
}> = ({ asset, onDragStart, onSelect, onDelete, onAddToShow, showAddToShow }) => {
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
        <div
          draggable
          onDragStart={handleDragStart}
          onClick={() => onSelect?.(asset)}
          className="group flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-border/50"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          
          {asset.thumbnail_url ? (
            <img 
              src={asset.thumbnail_url} 
              alt={asset.name}
              className="w-8 h-8 rounded object-cover shrink-0"
            />
          ) : (
            <div className={cn("w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{asset.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(asset.file_size)}
              {asset.duration != null && ` • ${formatDuration(asset.duration)}`}
            </p>
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
  collapsed 
}) => {
  const { user } = useAuthContext();
  const { assets, loading: assetsLoading, uploadAsset, deleteAsset } = useAssets(user?.id);
  const { showAssets, loading: showAssetsLoading, addAssetToShow, removeAssetFromShow } = useShowAssets(showId);
  const [uploading, setUploading] = useState(false);
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload Assets
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
        <TabsList className="mx-3 mt-2">
          {showId && <TabsTrigger value="show" className="flex-1 text-xs">Show</TabsTrigger>}
          <TabsTrigger value="library" className="flex-1 text-xs">My Library</TabsTrigger>
        </TabsList>

        {showId && (
          <TabsContent value="show" className="flex-1 m-0 mt-2">
            <ScrollArea className="h-[300px] px-2">
              {showAssetsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : showAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No assets in this show yet.
                    <br />
                    Add from your library or drag onto cues.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {showAssets.map(sa => sa.asset && (
                    <AssetItem
                      key={sa.id}
                      asset={sa.asset}
                      onDragStart={onAssetDragStart}
                      onSelect={onAssetSelect}
                      onDelete={() => removeAssetFromShow(sa.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        )}

        <TabsContent value="library" className="flex-1 m-0 mt-2">
          <ScrollArea className="h-[300px] px-2">
            {assetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Your asset library is empty.
                  <br />
                  Upload audio, video, images, or documents.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {(showId ? libraryAssets : assets).map(asset => (
                  <AssetItem
                    key={asset.id}
                    asset={asset}
                    onDragStart={onAssetDragStart}
                    onSelect={onAssetSelect}
                    onDelete={deleteAsset}
                    onAddToShow={showId ? () => addAssetToShow(asset.id, user?.id) : undefined}
                    showAddToShow={!!showId}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssetLibrary;
