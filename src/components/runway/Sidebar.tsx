
import React from 'react';
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
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  return (
    <div className={cn("h-screen w-64 bg-sidebar flex flex-col", className)}>
      <div className="p-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers className="text-runway-purple" />
          Runway
        </h1>
      </div>
      
      <Separator className="bg-sidebar-border" />
      
      <div className="p-4">
        <Button variant="outline" className="w-full justify-start gap-2 bg-sidebar-accent text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:text-white">
          <Plus size={18} />
          New Show
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto px-3 py-2">
        <nav className="space-y-1">
          <p className="text-xs uppercase text-sidebar-foreground/70 font-semibold px-3 pb-2">Shows</p>
          <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
            <Calendar size={18} />
            My Shows
          </Button>
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
      </div>
      
      <div className="p-4 mt-auto">
        <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
          <Settings size={18} />
          Settings
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
