
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
  Share2,
  FolderPlus,
  BookOpen,
  ListVideo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

interface SidebarProps {
  className?: string;
}

interface Show {
  id: number;
  name: string;
  date: string;
  description?: string;
}

interface CueItem {
  id: number;
  name: string;
  duration?: string;
  type: 'video' | 'audio' | 'lighting' | 'stage';
}

const mockCues: CueItem[] = [
  { id: 1, name: "Opening Video", duration: "0:45", type: "video" },
  { id: 2, name: "Intro Music", duration: "1:30", type: "audio" },
  { id: 3, name: "Stage Lights Up", type: "lighting" },
  { id: 4, name: "MC Introduction", type: "stage" },
  { id: 5, name: "Product Demo", duration: "5:20", type: "video" },
  { id: 6, name: "Transition Music", duration: "0:20", type: "audio" },
  { id: 7, name: "Spotlight Center", type: "lighting" },
  { id: 8, name: "Guest Speaker Intro", type: "stage" },
];

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [shows, setShows] = useState<Show[]>([
    { id: 1, name: "Summer Festival 2025", date: "2025-07-15", description: "Annual summer music and arts festival" },
    { id: 2, name: "Conference Keynote", date: "2025-05-22", description: "Tech industry keynote presentation" },
    { id: 3, name: "Product Launch", date: "2025-06-10", description: "New product line launch event" },
  ]);
  const [activeShow, setActiveShow] = useState<number | null>(1);
  const [newShowName, setNewShowName] = useState('');
  const [newShowDescription, setNewShowDescription] = useState('');
  const [activeCueType, setActiveCueType] = useState<string | null>(null);
  const [showCueDrawer, setShowCueDrawer] = useState(false);
  const [selectedCue, setSelectedCue] = useState<CueItem | null>(null);
  const { toast } = useToast();
  
  const handleCreateShow = () => {
    if (!newShowName.trim()) return;
    
    const newShow: Show = {
      id: Date.now(),
      name: newShowName,
      date: new Date().toISOString().split('T')[0],
      description: newShowDescription || undefined
    };
    
    setShows([...shows, newShow]);
    setNewShowName('');
    setNewShowDescription('');
    setActiveShow(newShow.id);
    
    toast({
      title: "Show created",
      description: `${newShowName} has been created successfully`,
    });
  };
  
  const handleSelectShow = (showId: number) => {
    setActiveShow(showId);
    toast({
      title: "Show opened",
      description: `You are now viewing ${shows.find(show => show.id === showId)?.name}`,
    });
  };
  
  const handleShareShow = (showId: number) => {
    const showName = shows.find(show => show.id === showId)?.name;
    toast({
      title: "Show shared",
      description: `Collaboration link for "${showName}" copied to clipboard`,
    });
  };

  const handleSelectCueType = (type: string) => {
    setActiveCueType(type);
    setShowCueDrawer(true);
  };

  const handleSelectCue = (cue: CueItem) => {
    setSelectedCue(cue);
    toast({
      title: "Cue selected",
      description: `Added "${cue.name}" to the timeline`,
    });
    setShowCueDrawer(false);
  };
  
  const filteredCues = activeCueType ? mockCues.filter(cue => cue.type === activeCueType) : mockCues;
  
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
                <Input 
                  id="show-description" 
                  value={newShowDescription} 
                  onChange={(e) => setNewShowDescription(e.target.value)} 
                  placeholder="Enter show description" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateShow}>Create Show</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <ScrollArea className="flex-1 overflow-auto px-3 py-2">
        {!collapsed && (
          <>
            <nav className="space-y-1">
              <p className="text-xs uppercase text-sidebar-foreground/70 font-semibold px-3 pb-2">Shows</p>
              {shows.map(show => (
                <div key={show.id} className="group relative">
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent pr-8",
                      activeShow === show.id ? "bg-sidebar-accent text-white font-medium" : ""
                    )}
                    onClick={() => handleSelectShow(show.id)}
                  >
                    <BookOpen size={18} />
                    <span className="truncate">{show.name}</span>
                  </Button>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-sidebar-foreground hover:bg-sidebar-accent"
                      >
                        <Calendar size={16} />
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">{show.name}</h4>
                        <p className="text-xs">{show.description}</p>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span className="text-xs">{new Date(show.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => handleShareShow(show.id)}
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
              
              <Drawer open={showCueDrawer} onOpenChange={setShowCueDrawer}>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>
                      {activeCueType === 'video' && "Video Cues"}
                      {activeCueType === 'audio' && "Audio Cues"}
                      {activeCueType === 'lighting' && "Lighting Cues"}
                      {activeCueType === 'stage' && "Stage Cues"}
                    </DrawerTitle>
                    <DrawerDescription>
                      Select a cue to add to your timeline
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4">
                    <ScrollArea className="h-[50vh]">
                      <div className="space-y-2">
                        {filteredCues.map(cue => (
                          <div 
                            key={cue.id} 
                            className="p-3 rounded-md border border-border hover:bg-accent/50 cursor-pointer"
                            onClick={() => handleSelectCue(cue)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{cue.name}</h4>
                                {cue.duration && <p className="text-xs opacity-70">Duration: {cue.duration}</p>}
                              </div>
                              {cue.type === 'video' && <Video size={18} />}
                              {cue.type === 'audio' && <Music size={18} />}
                              {cue.type === 'lighting' && <Lightbulb size={18} />}
                              {cue.type === 'stage' && <Mic size={18} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </DrawerContent>
              </Drawer>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => handleSelectCueType('video')}
              >
                <Video size={18} />
                Video Cues
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => handleSelectCueType('audio')}
              >
                <Music size={18} />
                Audio Cues
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => handleSelectCueType('lighting')}
              >
                <Lightbulb size={18} />
                Lighting Cues
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => handleSelectCueType('stage')}
              >
                <Mic size={18} />
                Stage Cues
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
                  <DropdownMenuItem key={show.id} onClick={() => handleSelectShow(show.id)}>
                    {show.name}
                  </DropdownMenuItem>
                ))}
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
              onClick={() => handleSelectCueType('video')}
            >
              <Video size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => handleSelectCueType('audio')}
            >
              <Music size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => handleSelectCueType('lighting')}
            >
              <Lightbulb size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => handleSelectCueType('stage')}
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
