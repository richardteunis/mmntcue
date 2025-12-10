
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Users, 
  Settings, 
  Video, 
  Music, 
  Lightbulb,
  Mic,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Clapperboard,
  Loader2,
  Pencil,
  Trash2,
  Clock,
  ListVideo,
  Zap,
  
  MapPin,
  FolderPlus,
  FolderOpen,
  FolderClosed,
  GripVertical,
  MoreHorizontal,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Show, Folder as FolderType } from '@/types/cue';
import ShowFormModal from './ShowFormModal';

import { useAuthContext } from '@/contexts/AuthContext';

interface SidebarProps {
  className?: string;
  activeShowId: string | null;
  onShowSelect: (showId: string, showName: string) => void;
  onQuickAddCue?: (type: 'audio' | 'video' | 'lighting' | 'stage') => void;
  onGoHome?: () => void;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsed?: boolean;
  badge?: number;
}

const SidebarSection: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = true, collapsed, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (collapsed) {
    return <>{children}</>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between px-3 py-2 h-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-transparent"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs uppercase font-semibold tracking-wider">{title}</span>
            {badge !== undefined && badge > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{badge}</Badge>
            )}
          </div>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 transition-transform",
            !isOpen && "-rotate-90"
          )} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 mt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

// Helper component for show icon with fallback
const ShowIcon: React.FC<{ logoUrl?: string | null; size?: number; className?: string }> = ({ logoUrl, size = 14, className }) => {
  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt="" 
        className={cn("rounded-sm object-contain shrink-0", className)}
        style={{ width: size, height: size }}
        onError={(e) => {
          // Fallback to clapperboard icon on error
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }
  return <Clapperboard size={size} className={cn("shrink-0", className)} />;
};

const Sidebar: React.FC<SidebarProps> = ({ className, activeShowId, onShowSelect, onQuickAddCue, onGoHome }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [shows, setShows] = useState<Show[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ type: 'show' | 'folder'; id: string } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  
  // Show form modal state
  const [showFormOpen, setShowFormOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  
  // Folder modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [folderName, setFolderName] = useState('');
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showToDelete, setShowToDelete] = useState<Show | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  
  const { toast } = useToast();

  // Fetch shows and folders from database
  const fetchData = async () => {
    setLoading(true);
    
    const [showsResult, foldersResult] = await Promise.all([
      supabase.from('shows').select('*').order('created_at', { ascending: false }),
      supabase.from('folders').select('*').order('order_index', { ascending: true })
    ]);
    
    if (showsResult.error) {
      console.error('Error fetching shows:', showsResult.error);
      toast({
        title: "Error loading shows",
        description: showsResult.error.message,
        variant: "destructive",
      });
    } else {
      setShows(showsResult.data || []);
    }
    
    if (foldersResult.error) {
      console.error('Error fetching folders:', foldersResult.error);
    } else {
      setFolders(foldersResult.data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time subscription for shows
  useEffect(() => {
    const channel = supabase
      .channel('sidebar-shows')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shows'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setShows(prev => {
              // Check if already exists to prevent duplicates
              if (prev.some(s => s.id === (payload.new as Show).id)) {
                return prev;
              }
              return [payload.new as Show, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setShows(prev => prev.map(s => 
              s.id === (payload.new as Show).id ? payload.new as Show : s
            ));
          } else if (payload.eventType === 'DELETE') {
            setShows(prev => prev.filter(s => s.id !== (payload.old as Show).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Listen for external create show event (from HomeView)
  useEffect(() => {
    const handleOpenCreateShowModal = () => {
      setEditingShow(null);
      setShowFormOpen(true);
    };
    
    document.addEventListener('open-create-show-modal', handleOpenCreateShowModal);
    return () => {
      document.removeEventListener('open-create-show-modal', handleOpenCreateShowModal);
    };
  }, []);
  
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };
  
  const handleOpenCreateModal = () => {
    setEditingShow(null);
    setShowFormOpen(true);
  };
  
  const handleOpenEditModal = (show: Show) => {
    setEditingShow(show);
    setShowFormOpen(true);
  };
  
  const handleOpenFolderModal = (folder?: FolderType) => {
    setEditingFolder(folder || null);
    setFolderName(folder?.name || '');
    setFolderModalOpen(true);
  };
  
  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (editingFolder) {
      const { error } = await supabase
        .from('folders')
        .update({ name: folderName.trim() })
        .eq('id', editingFolder.id);
      
      if (error) {
        toast({ title: "Error updating folder", description: error.message, variant: "destructive" });
        return;
      }
      
      setFolders(prev => prev.map(f => f.id === editingFolder.id ? { ...f, name: folderName.trim() } : f));
      toast({ title: "Folder updated" });
    } else {
      const { data, error } = await supabase
        .from('folders')
        .insert({ 
          name: folderName.trim(), 
          order_index: folders.length,
          user_id: user?.id || null
        })
        .select()
        .single();
      
      if (error) {
        toast({ title: "Error creating folder", description: error.message, variant: "destructive" });
        return;
      }
      
      setFolders(prev => [...prev, data]);
      toast({ title: "Folder created" });
    }
    
    setFolderModalOpen(false);
    setFolderName('');
    setEditingFolder(null);
  };
  
  const handleSaveShow = async (showData: Partial<Show>) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (editingShow) {
      const { error } = await supabase
        .from('shows')
        .update(showData)
        .eq('id', editingShow.id);
      
      if (error) {
        toast({ title: "Error updating show", description: error.message, variant: "destructive" });
        throw error;
      }
      
      setShows(prev => prev.map(s => 
        s.id === editingShow.id ? { ...s, ...showData } as Show : s
      ));
      
      if (activeShowId === editingShow.id && showData.name) {
        onShowSelect(editingShow.id, showData.name);
      }
      
      toast({ title: "Show updated", description: `${showData.name} has been updated successfully` });
    } else {
      // Clean up empty time fields before inserting
      const cleanedData = { ...showData };
      if (cleanedData.call_time === '') cleanedData.call_time = null as any;
      if (cleanedData.doors_time === '') cleanedData.doors_time = null as any;
      if (cleanedData.show_time === '') cleanedData.show_time = null as any;
      if (cleanedData.event_start_date === '') cleanedData.event_start_date = null as any;
      if (cleanedData.event_end_date === '') cleanedData.event_end_date = null as any;
      
      const { data, error } = await supabase
        .from('shows')
        .insert({ 
          name: showData.name!, 
          ...cleanedData,
          user_id: user?.id || null 
        } as any)
        .select()
        .single();
      
      if (error) {
        toast({ title: "Error creating show", description: error.message, variant: "destructive" });
        throw error;
      }
      
      // Create owner membership for the current user
      if (user) {
        await supabase.from('show_members').insert({
          show_id: data.id,
          user_id: user.id,
          role: 'owner',
          accepted_at: new Date().toISOString()
        });
      }
      
      setShows(prev => [data, ...prev]);
      onShowSelect(data.id, data.name);
      
      toast({ title: "Show created", description: `${showData.name} has been created successfully` });
    }
  };
  
  const handleDuplicateShow = async (showId: string) => {
    const showToDuplicate = shows.find(s => s.id === showId);
    if (!showToDuplicate) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { id, created_at, updated_at, show_code, ...showFields } = showToDuplicate;
    
    const insertData = {
      name: `${showToDuplicate.name} (Copy)`,
      description: showToDuplicate.description,
      event_name: showToDuplicate.event_name,
      venue: showToDuplicate.venue,
      room_name: showToDuplicate.room_name,
      event_start_date: showToDuplicate.event_start_date,
      event_end_date: showToDuplicate.event_end_date,
      call_time: showToDuplicate.call_time,
      doors_time: showToDuplicate.doors_time,
      show_time: showToDuplicate.show_time,
      timezone: showToDuplicate.timezone,
      logo_url: showToDuplicate.logo_url,
      brand_color: showToDuplicate.brand_color,
      secondary_color: showToDuplicate.secondary_color,
      apply_branding: showToDuplicate.apply_branding,
      timecode_format: showToDuplicate.timecode_format,
      default_tracks: showToDuplicate.default_tracks,
      custom_tracks: showToDuplicate.custom_tracks as unknown,
      autosave_interval: showToDuplicate.autosave_interval,
      show_template: showToDuplicate.show_template,
      rehearsal_mode: showToDuplicate.rehearsal_mode,
      locked: showToDuplicate.locked,
      audio_latency_offset: showToDuplicate.audio_latency_offset,
      video_latency_offset: showToDuplicate.video_latency_offset,
      safety_mode: showToDuplicate.safety_mode,
      folder_id: showToDuplicate.folder_id,
      user_id: user?.id || null 
    };
    
    const { data, error } = await supabase
      .from('shows')
      .insert(insertData as any)
      .select()
      .single();
    
    if (error) {
      toast({ title: "Error duplicating show", description: error.message, variant: "destructive" });
      return;
    }
    
    // Create owner membership for the current user
    if (user) {
      await supabase.from('show_members').insert({
        show_id: data.id,
        user_id: user.id,
        role: 'owner',
        accepted_at: new Date().toISOString()
      });
    }
    
    setShows(prev => [data, ...prev]);
    setShowFormOpen(false);
    onShowSelect(data.id, data.name);
    
    toast({ title: "Show duplicated", description: `${data.name} has been created` });
  };
  
  const handleDeleteShow = async () => {
    if (!showToDelete) return;
    
    // First delete related records
    await supabase.from('cues').delete().eq('show_id', showToDelete.id);
    await supabase.from('show_members').delete().eq('show_id', showToDelete.id);
    await supabase.from('show_assets').delete().eq('show_id', showToDelete.id);
    await supabase.from('activity_log').delete().eq('show_id', showToDelete.id);
    await supabase.from('notifications').delete().eq('show_id', showToDelete.id);
    
    const { error, count } = await supabase
      .from('shows')
      .delete()
      .eq('id', showToDelete.id)
      .select();
    
    if (error) {
      console.error('Delete error:', error);
      toast({ title: "Error deleting show", description: error.message, variant: "destructive" });
      return;
    }
    
    // Local state update (realtime will also update)
    setShows(prev => prev.filter(s => s.id !== showToDelete.id));
    
    // Always go to home when deleting the active show
    if (activeShowId === showToDelete.id) {
      onGoHome?.();
    }
    
    setDeleteDialogOpen(false);
    setShowToDelete(null);
    
    toast({ title: "Show deleted" });
  };
  
  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    
    // Move shows out of folder before deleting
    await supabase.from('shows').update({ folder_id: null }).eq('folder_id', folderToDelete.id);
    
    const { error } = await supabase.from('folders').delete().eq('id', folderToDelete.id);
    
    if (error) {
      toast({ title: "Error deleting folder", description: error.message, variant: "destructive" });
      return;
    }
    
    setFolders(prev => prev.filter(f => f.id !== folderToDelete.id));
    setShows(prev => prev.map(s => s.folder_id === folderToDelete.id ? { ...s, folder_id: null } : s));
    
    setDeleteDialogOpen(false);
    setFolderToDelete(null);
    
    toast({ title: "Folder deleted" });
  };
  
  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'show' | 'folder', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderId);
  };
  
  const handleDragLeave = () => {
    setDragOverFolder(null);
  };
  
  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setDragOverFolder(null);
    
    if (!draggedItem) return;
    
    if (draggedItem.type === 'show') {
      const { error } = await supabase
        .from('shows')
        .update({ folder_id: targetFolderId })
        .eq('id', draggedItem.id);
      
      if (error) {
        toast({ title: "Error moving show", description: error.message, variant: "destructive" });
        return;
      }
      
      setShows(prev => prev.map(s => 
        s.id === draggedItem.id ? { ...s, folder_id: targetFolderId } : s
      ));
      
      if (targetFolderId) {
        setExpandedFolders(prev => new Set([...prev, targetFolderId]));
      }
      
      toast({ title: "Show moved" });
    }
    
    setDraggedItem(null);
  };
  
  const handleSelectShow = (show: Show) => {
    onShowSelect(show.id, show.name);
  };

  // Get shows not in any folder (sample show is now just a regular show in user's list)
  const rootShows = shows.filter(s => !s.folder_id);
  
  // Get shows in a specific folder
  const getShowsInFolder = (folderId: string) => shows.filter(s => s.folder_id === folderId);

  const quickAddItems = [
    { icon: <Video size={16} />, label: 'Video Cue', type: 'video', color: 'text-runway-success' },
    { icon: <Music size={16} />, label: 'Audio Cue', type: 'audio', color: 'text-runway-teal' },
    { icon: <Lightbulb size={16} />, label: 'Lighting Cue', type: 'lighting', color: 'text-runway-highlight' },
    { icon: <Mic size={16} />, label: 'Stage Cue', type: 'stage', color: 'text-runway-warning' },
  ];
  
  const renderShowItem = (show: Show) => (
    <div 
      key={show.id} 
      className="group relative"
      draggable
      onDragStart={(e) => handleDragStart(e, 'show', show.id)}
    >
      <Button 
        variant="ghost" 
        className={cn(
          "w-full justify-start gap-2 h-auto py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground pr-16 pl-2",
          activeShowId === show.id && "bg-sidebar-accent text-sidebar-foreground font-medium"
        )}
        onClick={() => handleSelectShow(show)}
      >
        <GripVertical size={12} className="shrink-0 opacity-0 group-hover:opacity-50 cursor-grab" />
        <ShowIcon logoUrl={show.logo_url} size={14} />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-start min-w-0">
              <span className="truncate w-full text-left">{show.name}</span>
              {show.venue && (
                <span className="text-[10px] text-sidebar-foreground/50 flex items-center gap-1 truncate w-full">
                  <MapPin size={8} />
                  {show.venue}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[250px]">
            <div className="space-y-1">
              <p className="font-medium">{show.name}</p>
              {show.event_name && <p className="text-xs">{show.event_name}</p>}
              {show.description && <p className="text-xs text-muted-foreground">{show.description}</p>}
              {show.venue && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={10} />
                  {show.venue}{show.room_name && `, ${show.room_name}`}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </Button>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditModal(show);
          }}
        >
          <Pencil size={12} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-sidebar-foreground/50 hover:text-destructive hover:bg-sidebar-accent"
          onClick={(e) => {
            e.stopPropagation();
            setShowToDelete(show);
            setFolderToDelete(null);
            setDeleteDialogOpen(true);
          }}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
  
  const renderFolderItem = (folder: FolderType) => {
    const folderShows = getShowsInFolder(folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isDragOver = dragOverFolder === folder.id;
    
    return (
      <div key={folder.id}>
        <div 
          className={cn(
            "group relative rounded-md transition-colors",
            isDragOver && "bg-primary/20 ring-1 ring-primary/50"
          )}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-2 h-auto py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground pr-16 pl-2"
            )}
            onClick={() => toggleFolder(folder.id)}
          >
            <ChevronRight size={12} className={cn(
              "shrink-0 transition-transform",
              isExpanded && "rotate-90"
            )} />
            {isExpanded ? (
              <FolderOpen size={14} className="shrink-0 text-primary" />
            ) : (
              <FolderClosed size={14} className="shrink-0 text-primary" />
            )}
            <span className="truncate">{folder.name}</span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] ml-auto mr-8">
              {folderShows.length}
            </Badge>
          </Button>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleOpenFolderModal(folder)}>
                  <Pencil size={12} className="mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setFolderToDelete(folder);
                    setShowToDelete(null);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 size={12} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {isExpanded && (
          <div className="ml-4 pl-2 border-l border-sidebar-border/50 space-y-0.5 mt-0.5">
            {folderShows.length === 0 ? (
              <p className="text-xs text-sidebar-foreground/40 px-3 py-1.5">Drop shows here</p>
            ) : (
              folderShows.map(renderShowItem)
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className={cn(
      "h-screen bg-sidebar flex flex-col transition-all duration-300 border-r border-sidebar-border", 
      collapsed ? "w-14" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-2 transition-opacity",
          collapsed && "opacity-0 w-0 overflow-hidden"
        )}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm">MMNT.Cue</span>
            <span className="text-[10px] text-sidebar-foreground/50">Show Control</span>
          </div>
        </div>
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
            <Layers className="h-4 w-4 text-white" />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon"
          className={cn(
            "h-7 w-7 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "absolute right-1.5"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>
      </div>
      
      <Separator className="bg-sidebar-border/50" />
      
      {/* Home & New Show Buttons */}
      <div className="p-2 space-y-1">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start gap-2 h-9 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            !activeShowId && "bg-sidebar-accent text-sidebar-foreground",
            collapsed && "justify-center p-0"
          )}
          onClick={() => onGoHome?.()}
        >
          <Home size={collapsed ? 16 : 14} />
          {!collapsed && <span>Home</span>}
        </Button>
        <Button 
          variant="outline" 
          className={cn(
            "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-all",
            collapsed ? "w-full h-9 p-0 justify-center" : "w-full justify-start gap-2 h-9"
          )}
          onClick={handleOpenCreateModal}
        >
          <Plus size={16} />
          {!collapsed && <span className="font-medium text-sm">New Show</span>}
        </Button>
        {!collapsed && (
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 h-8 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => handleOpenFolderModal()}
          >
            <FolderPlus size={14} />
            <span>New Folder</span>
          </Button>
        )}
      </div>
      
      {/* Show Form Modal */}
      <ShowFormModal
        isOpen={showFormOpen}
        onClose={() => {
          setShowFormOpen(false);
          setEditingShow(null);
        }}
        onSave={handleSaveShow}
        onDuplicate={handleDuplicateShow}
        editingShow={editingShow}
      />
      
      {/* Folder Modal */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Rename Folder' : 'Create Folder'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Q4 Events"
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFolder();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>
              {editingFolder ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {showToDelete ? 'Show' : 'Folder'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showToDelete 
                ? `Are you sure you want to delete "${showToDelete.name}"? This will also delete all cues in this show. This action cannot be undone.`
                : `Are you sure you want to delete the folder "${folderToDelete?.name}"? Shows inside will be moved to the root level. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={showToDelete ? handleDeleteShow : handleDeleteFolder} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <ScrollArea className="flex-1 px-2">
        {!collapsed ? (
          <div className="space-y-4 py-2">
            {/* Shows Section */}
            <SidebarSection 
              title="Shows" 
              icon={<ListVideo size={12} />}
              badge={shows.length}
            >
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground/50" />
                </div>
              ) : (
                <div 
                  className={cn(
                    "space-y-0.5 rounded-md transition-colors",
                    dragOverFolder === null && draggedItem?.type === 'show' && "bg-muted/20"
                  )}
                  onDragOver={(e) => handleDragOver(e, null)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, null)}
                >
                  {/* Folders */}
                  {folders.map(renderFolderItem)}
                  
                  {/* Root level shows */}
                  {rootShows.length === 0 && folders.length === 0 ? (
                    <p className="text-xs text-sidebar-foreground/40 px-3 py-2">No shows yet</p>
                  ) : (
                    rootShows.map(renderShowItem)
                  )}
                </div>
              )}
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 h-8 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground"
              >
                <Users size={14} />
                Shared With Me
              </Button>
            </SidebarSection>

            {/* Quick Add Section */}
            <SidebarSection 
              title="Quick Add" 
              icon={<Zap size={12} />}
            >
              {quickAddItems.map(item => (
                <Button 
                  key={item.type}
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start gap-2 h-8 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    item.color
                  )}
                  onClick={() => onQuickAddCue?.(item.type as 'audio' | 'video' | 'lighting' | 'stage')}
                  disabled={!activeShowId}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </SidebarSection>

            {/* Recent Section - shows recently updated shows */}
            <SidebarSection 
              title="Recent" 
              icon={<Clock size={12} />}
              defaultOpen={false}
            >
              {shows.slice(0, 5).map(show => (
                <Button 
                  key={`recent-${show.id}`}
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start gap-2 h-8 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    activeShowId === show.id && "bg-sidebar-accent text-sidebar-foreground"
                  )}
                  onClick={() => handleSelectShow(show)}
                >
                  <ShowIcon logoUrl={show.logo_url} size={14} />
                  <span className="truncate">{show.name}</span>
                </Button>
              ))}
              {shows.length === 0 && (
                <p className="text-xs text-sidebar-foreground/40 px-3 py-2">No recent shows</p>
              )}
            </SidebarSection>

          </div>
        ) : (
          <div className="space-y-1 py-2">
            {/* Collapsed view */}
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground/50" />
              </div>
            ) : (
              shows.slice(0, 5).map(show => (
                <Tooltip key={show.id}>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "w-full justify-center h-9 p-0 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        activeShowId === show.id && "bg-sidebar-accent text-sidebar-foreground"
                      )}
                      onClick={() => handleSelectShow(show)}
                    >
                      <ShowIcon logoUrl={show.logo_url} size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{show.name}</TooltipContent>
                </Tooltip>
              ))
            )}
            <Separator className="bg-sidebar-border/50 my-2" />
            {quickAddItems.map(item => (
              <Tooltip key={item.type}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-center h-9 p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      item.color
                    )}
                    onClick={() => onQuickAddCue?.(item.type as 'audio' | 'video' | 'lighting' | 'stage')}
                    disabled={!activeShowId}
                  >
                    {item.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Footer */}
      <Separator className="bg-sidebar-border/50" />
      <div className="p-2 space-y-1">
        {!collapsed ? (
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 h-9 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => navigate('/settings')}
          >
            <Settings size={14} />
            Settings
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-center h-9 p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={() => navigate('/settings')}
              >
                <Settings size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
