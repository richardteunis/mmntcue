
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Users, 
  Settings, 
  Clock, 
  Video, 
  Music, 
  Lightbulb,
  Mic,
  Plus,
  Layers,
  ChevronRight,
  ChevronLeft,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SidebarProps {
  className?: string;
}

const mockShows = [
  { id: 1, name: "Summer Festival 2025", date: "2025-07-15" },
  { id: 2, name: "Conference Keynote", date: "2025-05-22" },
  { id: 3, name: "Product Launch", date: "2025-06-10" },
];

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [shows, setShows] = useState(mockShows);
  const [newShowName, setNewShowName] = useState('');
  const { toast } = useToast();
  
  const handleCreateShow = () => {
    if (!newShowName.trim()) return;
    
    const newShow = {
      id: Date.now(),
      name: newShowName,
      date: new Date().toISOString().split('T')[0]
    };
    
    setShows([...shows, newShow]);
    setNewShowName('');
    
    toast({
      title: "Show created",
      description: `${newShowName} has been created successfully`,
    });
  };
  
  const handleShareShow = () => {
    toast({
      title: "Show shared",
      description: "Collaboration link copied to clipboard",
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
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "bg-sidebar-accent text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:text-white",
                collapsed ? "w-full p-2 justify-center" : "w-full justify-start gap-2"
              )}
            >
              <Plus size={18} />
              {!collapsed && "New Show"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Show</DialogTitle>
              <DialogDescription>
                Enter a name for your new show and click create.
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
            </div>
            <DialogFooter>
              <Button onClick={handleCreateShow}>Create Show</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex-1 overflow-auto px-3 py-2">
        {!collapsed && (
          <>
            <nav className="space-y-1">
              <p className="text-xs uppercase text-sidebar-foreground/70 font-semibold px-3 pb-2">Shows</p>
              {shows.map(show => (
                <div key={show.id} className="group relative">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent pr-8"
                  >
                    <Calendar size={18} />
                    <span className="truncate">{show.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={handleShareShow}
                  >
                    <Share2 size={16} />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
                <Users size={18} />
                Shared With Me
              </Button>
              
              <p className="text-xs uppercase text-sidebar-foreground/70 font-semibold px-3 pb-2 pt-4">Cue Library</p>
              <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
                <Video size={18} />
                Video Cues
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
                <Music size={18} />
                Audio Cues
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
                <Lightbulb size={18} />
                Lighting Cues
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
                <Mic size={18} />
                Stage Cues
              </Button>
            </nav>
          </>
        )}
        
        {collapsed && (
          <div className="flex flex-col items-center space-y-4 mt-4">
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Calendar size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Users size={20} />
            </Button>
            <Separator className="bg-sidebar-border w-8" />
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Video size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Music size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Lightbulb size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Mic size={20} />
            </Button>
          </div>
        )}
      </div>
      
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
