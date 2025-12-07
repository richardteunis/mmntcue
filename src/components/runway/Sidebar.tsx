
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
  Share2,
  FolderPlus,
  BookOpen,
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Show } from '@/types/cue';

interface SidebarProps {
  className?: string;
  activeShowId: string | null;
  onShowSelect: (showId: string, showName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, activeShowId, onShowSelect }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [newShowName, setNewShowName] = useState('');
  const [newShowDescription, setNewShowDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Edit show state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [editShowName, setEditShowName] = useState('');
  const [editShowDescription, setEditShowDescription] = useState('');
  
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
  
  const handleCreateShow = async () => {
    if (!newShowName.trim()) return;
    
    const { data, error } = await supabase
      .from('shows')
      .insert({
        name: newShowName,
        description: newShowDescription || null
      })
      .select()
      .single();
    
    if (error) {
      toast({
        title: "Error creating show",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    setShows(prev => [data, ...prev]);
    setNewShowName('');
    setNewShowDescription('');
    setDialogOpen(false);
    onShowSelect(data.id, data.name);
    
    toast({
      title: "Show created",
      description: `${newShowName} has been created successfully`,
    });
  };
  
  const handleEditShow = (show: Show) => {
    setEditingShow(show);
    setEditShowName(show.name);
    setEditShowDescription(show.description || '');
    setEditDialogOpen(true);
  };
  
  const handleSaveEdit = async () => {
    if (!editingShow || !editShowName.trim()) return;
    
    const { error } = await supabase
      .from('shows')
      .update({
        name: editShowName,
        description: editShowDescription || null
      })
      .eq('id', editingShow.id);
    
    if (error) {
      toast({
        title: "Error updating show",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    setShows(prev => prev.map(s => 
      s.id === editingShow.id 
        ? { ...s, name: editShowName, description: editShowDescription || null }
        : s
    ));
    
    // Update active show name if editing the active show
    if (activeShowId === editingShow.id) {
      onShowSelect(editingShow.id, editShowName);
    }
    
    setEditDialogOpen(false);
    setEditingShow(null);
    
    toast({
      title: "Show updated",
      description: `${editShowName} has been updated successfully`,
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
  
  const handleShareShow = (showId: string, showName: string) => {
    toast({
      title: "Show shared",
      description: `Collaboration link for "${showName}" copied to clipboard`,
    });
  };
  
  return (
    <div className={cn(
      "h-screen bg-sidebar flex flex-col transition-all duration-300", 
      collapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="p-4 flex items-center justify-between">
        <h1 className={cn(
          "font-bold text-white flex items-center gap-2",
          collapsed ? "text-xl" : "text-2xl"
        )}>
          <Layers className="text-runway-purple" />
          {!collapsed && "Runway"}
        </h1>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>
      
      <Separator className="bg-sidebar-border" />
      
      <div className="p-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "bg-sidebar-accent text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:text-white",
                collapsed ? "w-full p-2 justify-center" : "w-full justify-start gap-2"
              )}
            >
              <FolderPlus size={18} />
              {!collapsed && "New Show"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Show</DialogTitle>
              <DialogDescription>
                Enter details for your new show and click create.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="show-name">Show Name</Label>
                <Input 
                  id="show-name" 
                  value={newShowName} 
                  onChange={(e) => setNewShowName(e.target.value)} 
                  placeholder="Enter show name" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="show-description">Description (Optional)</Label>
                <Textarea 
                  id="show-description" 
                  value={newShowDescription} 
                  onChange={(e) => setNewShowDescription(e.target.value)} 
                  placeholder="Enter show description" 
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateShow}>Create Show</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Edit Show Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Show</DialogTitle>
            <DialogDescription>
              Update the details for this show.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-show-name">Show Name</Label>
              <Input 
                id="edit-show-name" 
                value={editShowName} 
                onChange={(e) => setEditShowName(e.target.value)} 
                placeholder="Enter show name" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-show-description">Description (Optional)</Label>
              <Textarea 
                id="edit-show-description" 
                value={editShowDescription} 
                onChange={(e) => setEditShowDescription(e.target.value)} 
                placeholder="Enter show description" 
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
      
      <ScrollArea className="flex-1 overflow-auto px-3 py-2">
        {!collapsed && (
          <>
            <nav className="space-y-1">
              <p className="text-xs uppercase text-sidebar-foreground/70 font-semibold px-3 pb-2">Shows</p>
              
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-sidebar-foreground" />
                </div>
              ) : shows.length === 0 ? (
                <p className="text-sm text-sidebar-foreground/50 px-3 py-2">No shows yet. Create one!</p>
              ) : (
                shows.map(show => (
                  <div key={show.id} className="group relative">
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent pr-20",
                        activeShowId === show.id ? "bg-sidebar-accent text-white font-medium" : ""
                      )}
                      onClick={() => handleSelectShow(show)}
                    >
                      <BookOpen size={18} />
                      <span className="truncate">{show.name}</span>
                    </Button>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditShow(show);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowToDelete(show);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              
              <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
                <Users size={18} />
                Shared With Me
              </Button>
              
              <p className="text-xs uppercase text-sidebar-foreground/70 font-semibold px-3 pb-2 pt-4">Quick Add</p>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Video size={18} />
                Video Cue
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Music size={18} />
                Audio Cue
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Lightbulb size={18} />
                Lighting Cue
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Mic size={18} />
                Stage Cue
              </Button>
            </nav>
          </>
        )}
        
        {collapsed && (
          <div className="flex flex-col items-center space-y-4 mt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                  <BookOpen size={20} />
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
                        handleEditShow(show);
                      }}
                    >
                      <Pencil size={12} />
                    </Button>
                  </DropdownMenuItem>
                ))}
                {shows.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                  <FolderPlus size={16} className="mr-2" />
                  New Show
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Users size={20} />
            </Button>
            
            <Separator className="bg-sidebar-border w-8" />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Video size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Music size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Lightbulb size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Mic size={20} />
            </Button>
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 mt-auto">
        <Button 
          variant="ghost" 
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "w-full p-2 justify-center" : "w-full justify-start gap-2"
          )}
        >
          <Settings size={18} />
          {!collapsed && "Settings"}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
