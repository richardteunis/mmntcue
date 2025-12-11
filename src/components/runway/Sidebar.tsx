
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
  Home,
  Star,
  Share2,
  EyeOff,
  Building2
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
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { useWorkspaces } from '@/hooks/useWorkspaces';

import { useAuthContext } from '@/contexts/AuthContext';

interface ShowMember {
  show_id: string;
  user_id: string | null;
  role: string;
  hidden: boolean;
}

interface ShowFavorite {
  show_id: string;
  user_id: string;
}

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
  const { user } = useAuthContext();
  const { activeWorkspaceId, activeWorkspace, workspaces } = useWorkspaces();
  const [collapsed, setCollapsed] = useState(false);
  const [shows, setShows] = useState<Show[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // Membership and favorites state
  const [memberships, setMemberships] = useState<ShowMember[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
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

  // Fetch shows, folders, memberships, and favorites from database
  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const [showsResult, foldersResult, membershipsResult, favoritesResult] = await Promise.all([
      supabase.from('shows').select('*').order('created_at', { ascending: false }),
      supabase.from('folders').select('*').order('order_index', { ascending: true }),
      supabase.from('show_members').select('show_id, user_id, role, hidden').eq('user_id', user.id),
      supabase.from('show_favorites').select('show_id').eq('user_id', user.id)
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
    
    if (!membershipsResult.error && membershipsResult.data) {
      setMemberships(membershipsResult.data as ShowMember[]);
    }
    
    if (!favoritesResult.error && favoritesResult.data) {
      setFavorites(new Set(favoritesResult.data.map(f => f.show_id)));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Real-time subscription for shows and favorites
  useEffect(() => {
    if (!user) return;
    
    const showsChannel = supabase
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
            // Only add if show doesn't exist and user_id matches (other user's shows not relevant)
            // Skip this - we already handle inserts locally to prevent duplicates
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
      
    const favoritesChannel = supabase
      .channel('sidebar-favorites')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'show_favorites',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFavorites(prev => new Set([...prev, (payload.new as ShowFavorite).show_id]));
          } else if (payload.eventType === 'DELETE') {
            setFavorites(prev => {
              const next = new Set(prev);
              next.delete((payload.old as ShowFavorite).show_id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(showsChannel);
      supabase.removeChannel(favoritesChannel);
    };
  }, [user]);

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
          user_id: user?.id || null,
          // Use workspace_id from form data, or fall back to active workspace
          workspace_id: cleanedData.workspace_id !== undefined ? cleanedData.workspace_id : (activeWorkspaceId || null)
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
    if (!showToDelete || !user) return;
    
    // Check if user is the owner
    const isOwner = showToDelete.user_id === user.id || showToDelete.user_id === null;
    
    if (isOwner) {
      // Owner can fully delete the show
      await supabase.from('cues').delete().eq('show_id', showToDelete.id);
      await supabase.from('show_members').delete().eq('show_id', showToDelete.id);
      await supabase.from('show_assets').delete().eq('show_id', showToDelete.id);
      await supabase.from('activity_log').delete().eq('show_id', showToDelete.id);
      await supabase.from('notifications').delete().eq('show_id', showToDelete.id);
      await supabase.from('show_favorites').delete().eq('show_id', showToDelete.id);
      
      const { error } = await supabase
        .from('shows')
        .delete()
        .eq('id', showToDelete.id);
      
      if (error) {
        console.error('Delete error:', error);
        toast({ title: "Error deleting show", description: error.message, variant: "destructive" });
        return;
      }
      
      setShows(prev => prev.filter(s => s.id !== showToDelete.id));
      toast({ title: "Show deleted" });
    } else {
      // Non-owner: hide the show in show_members
      const { error } = await supabase
        .from('show_members')
        .update({ hidden: true })
        .eq('show_id', showToDelete.id)
        .eq('user_id', user.id);
      
      if (error) {
        toast({ title: "Error hiding show", description: error.message, variant: "destructive" });
        return;
      }
      
      // Update local memberships
      setMemberships(prev => prev.map(m => 
        m.show_id === showToDelete.id ? { ...m, hidden: true } : m
      ));
      
      toast({ title: "Show hidden", description: "You can find it in 'Shared with me'" });
    }
    
    if (activeShowId === showToDelete.id) {
      onGoHome?.();
    }
    
    setDeleteDialogOpen(false);
    setShowToDelete(null);
  };
  
  // Toggle favorite status
  const handleToggleFavorite = async (showId: string) => {
    if (!user) return;
    
    const isFavorite = favorites.has(showId);
    
    if (isFavorite) {
      const { error } = await supabase
        .from('show_favorites')
        .delete()
        .eq('show_id', showId)
        .eq('user_id', user.id);
        
      if (!error) {
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(showId);
          return next;
        });
        toast({ title: "Removed from favorites" });
      }
    } else {
      const { error } = await supabase
        .from('show_favorites')
        .insert({ show_id: showId, user_id: user.id });
        
      if (!error) {
        setFavorites(prev => new Set([...prev, showId]));
        toast({ title: "Added to favorites" });
      }
    }
  };
  
  // Unhide a shared show
  const handleUnhideShow = async (showId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('show_members')
      .update({ hidden: false })
      .eq('show_id', showId)
      .eq('user_id', user.id);
      
    if (!error) {
      setMemberships(prev => prev.map(m => 
        m.show_id === showId ? { ...m, hidden: false } : m
      ));
      toast({ title: "Show restored" });
    }
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

  // Debug logging
  console.log('Sidebar Debug:', {
    activeWorkspaceId,
    totalShows: shows.length,
    showsWithWorkspace: shows.filter(s => s.workspace_id).map(s => ({ name: s.name, workspace_id: s.workspace_id })),
    personalShows: shows.filter(s => !s.workspace_id).map(s => s.name)
  });

  // Determine owned vs shared shows based on workspace context
  const ownedShows = shows.filter(s => {
    if (activeWorkspaceId) {
      // In workspace context: show all shows belonging to this workspace
      return s.workspace_id === activeWorkspaceId;
    }
    // In personal context: show only user's personal shows (no workspace)
    return (s.user_id === user?.id || s.user_id === null) && !s.workspace_id;
  });
  
  const sharedShows = shows.filter(s => {
    // Only show "shared with me" for personal shows in personal context
    if (activeWorkspaceId || s.workspace_id) return false;
    const membership = memberships.find(m => m.show_id === s.id);
    return s.user_id !== user?.id && s.user_id !== null && membership && !membership.hidden;
  });
  
  const hiddenSharedShows = shows.filter(s => {
    if (activeWorkspaceId || s.workspace_id) return false;
    const membership = memberships.find(m => m.show_id === s.id);
    return s.user_id !== user?.id && s.user_id !== null && membership && membership.hidden;
  });
  
  // Get shows not in any folder (owned shows only)
  const rootShows = ownedShows.filter(s => !s.folder_id);
  
  // Get shows in a specific folder with favorites first
  const getShowsInFolder = (folderId: string) => {
    const folderShows = ownedShows.filter(s => s.folder_id === folderId);
    return [...folderShows].sort((a, b) => {
      const aFav = favorites.has(a.id) ? 0 : 1;
      const bFav = favorites.has(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  };
  
  // Sort root shows with favorites first
  const sortedRootShows = [...rootShows].sort((a, b) => {
    const aFav = favorites.has(a.id) ? 0 : 1;
    const bFav = favorites.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  const quickAddItems = [
    { icon: <Video size={16} />, label: 'Video Cue', type: 'video', color: 'text-runway-success' },
    { icon: <Music size={16} />, label: 'Audio Cue', type: 'audio', color: 'text-runway-teal' },
    { icon: <Lightbulb size={16} />, label: 'Lighting Cue', type: 'lighting', color: 'text-runway-highlight' },
    { icon: <Mic size={16} />, label: 'Stage Cue', type: 'stage', color: 'text-runway-warning' },
  ];
  
  const renderShowItem = (show: Show, isShared = false, isHidden = false) => {
    const isFavorite = favorites.has(show.id);
    const isOwner = show.user_id === user?.id || show.user_id === null;
    
    return (
      <div 
        key={show.id} 
        className="group relative"
        draggable={!isShared}
        onDragStart={(e) => !isShared && handleDragStart(e, 'show', show.id)}
      >
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start gap-2 h-auto py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground pr-20 pl-2",
            activeShowId === show.id && "bg-sidebar-accent text-sidebar-foreground font-medium"
          )}
          onClick={() => handleSelectShow(show)}
        >
          {!isShared && (
            <GripVertical size={12} className="shrink-0 opacity-0 group-hover:opacity-50 cursor-grab" />
          )}
          {isShared && <Share2 size={12} className="shrink-0 text-muted-foreground" />}
          {isFavorite && <Star size={12} className="shrink-0 text-yellow-500 fill-yellow-500" />}
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
                {isShared && <p className="text-xs text-primary">Shared with you</p>}
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
          {/* Favorite button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 hover:bg-sidebar-accent",
              isFavorite ? "text-yellow-500" : "text-sidebar-foreground/50 hover:text-yellow-500"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(show.id);
            }}
          >
            <Star size={12} className={isFavorite ? "fill-current" : ""} />
          </Button>
          {isHidden ? (
            // Unhide button for hidden shared shows
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={(e) => {
                e.stopPropagation();
                handleUnhideShow(show.id);
              }}
            >
              <EyeOff size={12} />
            </Button>
          ) : (
            <>
              {isOwner && (
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
              )}
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
            </>
          )}
        </div>
      </div>
    );
  };
  
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
              folderShows.map(show => renderShowItem(show))
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
          <img 
            src="/mmnt_pink_icon.svg" 
            alt="" 
            className="h-8 w-8 logo-themed"
          />
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm">mmnt. Cue</span>
            <span className="text-[10px] text-sidebar-foreground/50">Show Control</span>
          </div>
        </div>
        {collapsed && (
          <img 
            src="/mmnt_pink_icon.svg" 
            alt="mmnt. Cue" 
            className="h-8 w-8 mx-auto logo-themed"
          />
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
      
      {/* Workspace Switcher */}
      <div className="px-2 py-2">
        <WorkspaceSwitcher collapsed={collapsed} />
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
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
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
              {showToDelete 
                ? (showToDelete.user_id === user?.id || showToDelete.user_id === null 
                    ? 'Delete Show' 
                    : 'Hide Show')
                : 'Delete Folder'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showToDelete 
                ? (showToDelete.user_id === user?.id || showToDelete.user_id === null
                    ? `Are you sure you want to delete "${showToDelete.name}"? This will also delete all cues in this show. This action cannot be undone.`
                    : `This show was shared with you. Hiding it will move it to the "Hidden" section in "Shared With Me". You can restore it later.`)
                : `Are you sure you want to delete the folder "${folderToDelete?.name}"? Shows inside will be moved to the root level. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={showToDelete ? handleDeleteShow : handleDeleteFolder} 
              className={cn(
                showToDelete && showToDelete.user_id !== user?.id && showToDelete.user_id !== null
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {showToDelete && showToDelete.user_id !== user?.id && showToDelete.user_id !== null 
                ? 'Hide' 
                : 'Delete'}
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
              badge={ownedShows.length}
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
                  {sortedRootShows.length === 0 && folders.length === 0 ? (
                    <p className="text-xs text-sidebar-foreground/40 px-3 py-2">No shows yet</p>
                  ) : (
                    sortedRootShows.map(show => renderShowItem(show))
                  )}
                </div>
              )}
            </SidebarSection>
            
            {/* Shared With Me Section */}
            {(sharedShows.length > 0 || hiddenSharedShows.length > 0) && (
              <SidebarSection 
                title="Shared With Me" 
                icon={<Share2 size={12} />}
                badge={sharedShows.length}
                defaultOpen={true}
              >
                <div className="space-y-0.5">
                  {sharedShows.map(show => renderShowItem(show, true, false))}
                </div>
                
                {hiddenSharedShows.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2 h-7 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground mt-1"
                      >
                        <EyeOff size={10} />
                        Hidden ({hiddenSharedShows.length})
                        <ChevronRight size={10} className="ml-auto" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-0.5 mt-1">
                      {hiddenSharedShows.map(show => renderShowItem(show, true, true))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </SidebarSection>
            )}

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
