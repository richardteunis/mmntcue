
import React, { useState, useEffect } from 'react';
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
  FolderPlus,
  BookOpen,
  Loader2,
  Pencil,
  Trash2,
  Clock,
  FolderOpen,
  Zap,
  Package,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Show } from '@/types/cue';
import ShowFormModal from './ShowFormModal';

interface SidebarProps {
  className?: string;
  activeShowId: string | null;
  onShowSelect: (showId: string, showName: string) => void;
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

const Sidebar: React.FC<SidebarProps> = ({ className, activeShowId, onShowSelect }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Show form modal state
  const [showFormOpen, setShowFormOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showToDelete, setShowToDelete] = useState<Show | null>(null);
  
  const { toast } = useToast();

  // Fetch shows from database
  useEffect(() => {
    const fetchShows = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching shows:', error);
        toast({
          title: "Error loading shows",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setShows(data || []);
        // Auto-select first show if none selected
        if (data && data.length > 0 && !activeShowId) {
          onShowSelect(data[0].id, data[0].name);
        }
      }
      setLoading(false);
    };

    fetchShows();
  }, []);
  
  const handleOpenCreateModal = () => {
    setEditingShow(null);
    setShowFormOpen(true);
  };
  
  const handleOpenEditModal = (show: Show) => {
    setEditingShow(show);
    setShowFormOpen(true);
  };
  
  const handleSaveShow = async (showData: Partial<Show>) => {
    if (editingShow) {
      // Update existing show
      const { error } = await supabase
        .from('shows')
        .update(showData)
        .eq('id', editingShow.id);
      
      if (error) {
        toast({
          title: "Error updating show",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      setShows(prev => prev.map(s => 
        s.id === editingShow.id ? { ...s, ...showData } as Show : s
      ));
      
      // Update active show name if editing the active show
      if (activeShowId === editingShow.id && showData.name) {
        onShowSelect(editingShow.id, showData.name);
      }
      
      toast({
        title: "Show updated",
        description: `${showData.name} has been updated successfully`,
      });
    } else {
      // Create new show
      const { data, error } = await supabase
        .from('shows')
        .insert({ name: showData.name!, ...showData } as any)
        .select()
        .single();
      
      if (error) {
        toast({
          title: "Error creating show",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      setShows(prev => [data, ...prev]);
      onShowSelect(data.id, data.name);
      
      toast({
        title: "Show created",
        description: `${showData.name} has been created successfully`,
      });
    }
  };
  
  const handleDuplicateShow = async (showId: string) => {
    const showToDuplicate = shows.find(s => s.id === showId);
    if (!showToDuplicate) return;
    
    // Create a copy without id and timestamps
    const { id, created_at, updated_at, ...showFields } = showToDuplicate;
    
    const { data, error } = await supabase
      .from('shows')
      .insert({
        ...showFields,
        name: `${showToDuplicate.name} (Copy)`,
      })
      .select()
      .single();
    
    if (error) {
      toast({
        title: "Error duplicating show",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    setShows(prev => [data, ...prev]);
    setShowFormOpen(false);
    onShowSelect(data.id, data.name);
    
    toast({
      title: "Show duplicated",
      description: `${data.name} has been created`,
    });
  };
  
  const handleDeleteShow = async () => {
    if (!showToDelete) return;
    
    const { error } = await supabase
      .from('shows')
      .delete()
      .eq('id', showToDelete.id);
    
    if (error) {
      toast({
        title: "Error deleting show",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    const updatedShows = shows.filter(s => s.id !== showToDelete.id);
    setShows(updatedShows);
    
    // If deleted show was active, select another
    if (activeShowId === showToDelete.id && updatedShows.length > 0) {
      onShowSelect(updatedShows[0].id, updatedShows[0].name);
    } else if (updatedShows.length === 0) {
      onShowSelect('', '');
    }
    
    setDeleteDialogOpen(false);
    setShowToDelete(null);
    
    toast({
      title: "Show deleted",
      description: `Show has been deleted successfully`,
    });
  };
  
  const handleSelectShow = (show: Show) => {
    onShowSelect(show.id, show.name);
  };

  const quickAddItems = [
    { icon: <Video size={16} />, label: 'Video Cue', type: 'video', color: 'text-runway-success' },
    { icon: <Music size={16} />, label: 'Audio Cue', type: 'audio', color: 'text-runway-teal' },
    { icon: <Lightbulb size={16} />, label: 'Lighting Cue', type: 'lighting', color: 'text-runway-highlight' },
    { icon: <Mic size={16} />, label: 'Stage Cue', type: 'stage', color: 'text-runway-warning' },
  ];
  
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
      
      {/* New Show Button */}
      <div className="p-2">
        <Button 
          variant="outline" 
          className={cn(
            "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-all",
            collapsed ? "w-full h-9 p-0 justify-center" : "w-full justify-start gap-2 h-9"
          )}
          onClick={handleOpenCreateModal}
        >
          <FolderPlus size={16} />
          {!collapsed && <span className="font-medium text-sm">New Show</span>}
        </Button>
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Show</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{showToDelete?.name}"? This will also delete all cues in this show. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteShow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
              icon={<FolderOpen size={12} />}
              badge={shows.length}
            >
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground/50" />
                </div>
              ) : shows.length === 0 ? (
                <p className="text-xs text-sidebar-foreground/40 px-3 py-2">No shows yet</p>
              ) : (
                shows.map(show => (
                  <div key={show.id} className="group relative">
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "w-full justify-start gap-2 h-auto py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground pr-16",
                        activeShowId === show.id && "bg-sidebar-accent text-sidebar-foreground font-medium"
                      )}
                      onClick={() => handleSelectShow(show)}
                    >
                      <BookOpen size={14} className="shrink-0" />
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
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(show.created_at).toLocaleDateString()}
                            </p>
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
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))
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
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </SidebarSection>

            {/* Recent Section */}
            <SidebarSection 
              title="Recent" 
              icon={<Clock size={12} />}
              defaultOpen={false}
            >
              <p className="text-xs text-sidebar-foreground/40 px-3 py-2">No recent activity</p>
            </SidebarSection>

            {/* Assets Section */}
            <SidebarSection 
              title="Assets" 
              icon={<Package size={12} />}
              defaultOpen={false}
            >
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 h-8 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
              >
                <Music size={14} />
                Audio Files
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 h-8 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
              >
                <Video size={14} />
                Video Files
              </Button>
            </SidebarSection>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 py-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent">
                  <BookOpen size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {shows.map(show => (
                  <DropdownMenuItem key={show.id} onClick={() => handleSelectShow(show)}>
                    <span className="flex-1 truncate">{show.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(show);
                      }}
                    >
                      <Pencil size={12} />
                    </Button>
                  </DropdownMenuItem>
                ))}
                {shows.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={handleOpenCreateModal}>
                  <FolderPlus size={16} className="mr-2" />
                  New Show
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Separator className="bg-sidebar-border/50 w-8" />
            
            {quickAddItems.map(item => (
              <Tooltip key={item.type}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-9 w-9 text-sidebar-foreground/70 hover:bg-sidebar-accent", item.color)}
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
      
      <Separator className="bg-sidebar-border/50" />
      
      {/* Footer */}
      <div className="p-2">
        <Button 
          variant="ghost" 
          className={cn(
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed ? "w-full h-9 p-0 justify-center" : "w-full justify-start gap-2 h-9"
          )}
        >
          <Settings size={16} />
          {!collapsed && <span className="text-sm">Settings</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
