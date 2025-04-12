
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Music, 
  Video, 
  Lightbulb, 
  Mic, 
  Trash2,
  Copy,
  Save,
  DragIcon
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface CuePanelProps {
  className?: string;
}

const CuePanel: React.FC<CuePanelProps> = ({ className }) => {
  const [cueType, setCueType] = useState('audio');
  const [cueName, setCueName] = useState('Intro Music');
  const [cueTime, setCueTime] = useState('00:00:00');
  const [cueDuration, setCueDuration] = useState('0:30');
  const { toast } = useToast();
  
  const handleSave = () => {
    toast({
      title: "Cue saved",
      description: `${cueName} has been updated`,
    });
  };
  
  const handleDelete = () => {
    toast({
      title: "Cue deleted",
      description: `${cueName} has been removed from the timeline`,
      variant: "destructive",
    });
  };
  
  const handleDuplicate = () => {
    toast({
      title: "Cue duplicated",
      description: `A copy of ${cueName} has been created`,
    });
  };
  
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('cueType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  return (
    <div className={cn("w-80 border-l border-border h-full overflow-auto", className)}>
      <div className="p-4">
        <h3 className="font-semibold text-lg">Cue Details</h3>
        <p className="text-sm text-muted-foreground">Edit the selected cue or create a new one</p>
      </div>
      
      <Separator />
      
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cue-name">Cue Name</Label>
          <Input 
            id="cue-name" 
            placeholder="Enter cue name" 
            value={cueName} 
            onChange={(e) => setCueName(e.target.value)} 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="cue-time">Start Time</Label>
            <div className="relative">
              <Clock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input 
                id="cue-time" 
                className="pl-9" 
                value={cueTime} 
                onChange={(e) => setCueTime(e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cue-duration">Duration</Label>
            <Input 
              id="cue-duration" 
              value={cueDuration} 
              onChange={(e) => setCueDuration(e.target.value)} 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Cue Type</Label>
          <div className="grid grid-cols-4 gap-2">
            <Button 
              variant={cueType === 'audio' ? 'default' : 'outline'} 
              className={cn("flex flex-col h-20 items-center justify-center gap-1", cueType === 'audio' ? 'bg-runway-teal' : '')}
              onClick={() => setCueType('audio')}
              draggable
              onDragStart={(e) => handleDragStart(e, 'audio')}
            >
              <Music size={18} />
              <span className="text-xs">Audio</span>
            </Button>
            <Button 
              variant={cueType === 'video' ? 'default' : 'outline'} 
              className={cn("flex flex-col h-20 items-center justify-center gap-1", cueType === 'video' ? 'bg-runway-success' : '')}
              onClick={() => setCueType('video')}
              draggable
              onDragStart={(e) => handleDragStart(e, 'video')}
            >
              <Video size={18} />
              <span className="text-xs">Video</span>
            </Button>
            <Button 
              variant={cueType === 'lighting' ? 'default' : 'outline'} 
              className={cn("flex flex-col h-20 items-center justify-center gap-1", cueType === 'lighting' ? 'bg-runway-highlight' : '')}
              onClick={() => setCueType('lighting')}
              draggable
              onDragStart={(e) => handleDragStart(e, 'lighting')}
            >
              <Lightbulb size={18} />
              <span className="text-xs">Lighting</span>
            </Button>
            <Button 
              variant={cueType === 'stage' ? 'default' : 'outline'} 
              className={cn("flex flex-col h-20 items-center justify-center gap-1", cueType === 'stage' ? 'bg-runway-warning' : '')}
              onClick={() => setCueType('stage')}
              draggable
              onDragStart={(e) => handleDragStart(e, 'stage')}
            >
              <Mic size={18} />
              <span className="text-xs">Stage</span>
            </Button>
          </div>
        </div>
        
        <div className="bg-muted/40 rounded-md p-3 border border-border">
          <div className="flex items-center text-sm mb-2">
            <DragIcon size={16} className="mr-2 text-muted-foreground" />
            <span>Drag a cue type to the timeline to add a new cue</span>
          </div>
        </div>
        
        <Tabs defaultValue="properties">
          <TabsList className="w-full">
            <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
            <TabsTrigger value="triggers" className="flex-1">Triggers</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="properties" className="space-y-4 pt-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-follow">Auto-Follow</Label>
                <Switch id="auto-follow" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cue-track">Track</Label>
                <Input id="cue-track" defaultValue="Audio Main" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cue-color">Color Label</Label>
                <div className="flex flex-wrap gap-2">
                  {['bg-runway-purple', 'bg-runway-teal', 'bg-runway-success', 'bg-runway-warning', 'bg-runway-error'].map((color) => (
                    <div 
                      key={color} 
                      className={cn("w-6 h-6 rounded-full cursor-pointer border-2", color, color === 'bg-runway-teal' ? 'border-white' : 'border-transparent')}
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="triggers" className="space-y-4 pt-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm">Trigger this cue:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">Manually</Badge>
                <Badge variant="outline">After previous</Badge>
                <Badge variant="outline">At specific time</Badge>
                <Badge variant="secondary" className="cursor-pointer">+ Add trigger</Badge>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="notes" className="pt-3">
            <textarea 
              className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Add notes about this cue..."
              defaultValue="Fade in gradually with the lights."
            />
          </TabsContent>
        </Tabs>
      </div>
      
      <Separator />
      
      <div className="p-4 grid grid-cols-3 gap-2">
        <Button variant="outline" onClick={handleDuplicate}>
          <Copy size={16} className="mr-2" />
          Duplicate
        </Button>
        <Button variant="default" onClick={handleSave}>
          <Save size={16} className="mr-2" />
          Save
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 size={16} className="mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
};

export default CuePanel;
