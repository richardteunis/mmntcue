
import React, { useState, useEffect } from 'react';
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
  GripVertical,
  Wand2,
  Link,
  Settings,
  Layers,
  PanelRight,
  Info,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface CuePanelProps {
  className?: string;
}

interface CueSettings {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  time: string;
  duration: string;
  track: string;
  color: string;
  autoFollow: boolean;
  notes: string;
  effects: string[];
}

const defaultCueSettings: CueSettings = {
  id: 'cue-1',
  name: 'Intro Music',
  type: 'audio',
  time: '00:00:00',
  duration: '0:30',
  track: 'Audio Main',
  color: 'bg-runway-teal',
  autoFollow: false,
  notes: 'Fade in gradually with the lights.',
  effects: ['fade-in', 'crossfade']
};

const effectOptions = [
  { value: 'fade-in', label: 'Fade In' },
  { value: 'fade-out', label: 'Fade Out' },
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'cut', label: 'Cut' },
  { value: 'delay', label: 'Delay' },
  { value: 'loop', label: 'Loop' }
];

const CuePanel: React.FC<CuePanelProps> = ({ className }) => {
  const [cueSettings, setCueSettings] = useState<CueSettings>(defaultCueSettings);
  const [activeTab, setActiveTab] = useState('properties');
  const [isDragging, setIsDragging] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  
  // Update cue settings and mark as unsaved
  const updateCueSettings = (updates: Partial<CueSettings>) => {
    setCueSettings(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };
  
  // Save changes
  const handleSave = () => {
    // In a real app, this would update the cue in the timeline
    setHasUnsavedChanges(false);
    toast({
      title: "Cue saved",
      description: `${cueSettings.name} has been updated`,
    });
  };
  
  const handleDelete = () => {
    toast({
      title: "Cue deleted",
      description: `${cueSettings.name} has been removed from the timeline`,
      variant: "destructive",
    });
    
    // Reset to defaults to simulate deletion
    setCueSettings(defaultCueSettings);
    setHasUnsavedChanges(false);
  };
  
  const handleDuplicate = () => {
    const newCue = {
      ...cueSettings,
      id: `cue-${Date.now()}`,
      name: `${cueSettings.name} (copy)`
    };
    
    setCueSettings(newCue);
    setHasUnsavedChanges(true);
    
    toast({
      title: "Cue duplicated",
      description: `A copy of ${cueSettings.name} has been created`,
    });
  };
  
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('cueType', type);
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Prompt for unsaved changes if user tries to navigate away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
  
  // Add an effect to the cue
  const addEffect = (effect: string) => {
    if (!cueSettings.effects.includes(effect)) {
      updateCueSettings({
        effects: [...cueSettings.effects, effect]
      });
      
      toast({
        title: "Effect added",
        description: `${effect} effect has been added to the cue`,
      });
    }
  };
  
  // Remove an effect from the cue
  const removeEffect = (effect: string) => {
    updateCueSettings({
      effects: cueSettings.effects.filter(e => e !== effect)
    });
    
    toast({
      title: "Effect removed",
      description: `${effect} effect has been removed from the cue`,
    });
  };
  
  return (
    <div className={cn("w-full h-full border-l border-border overflow-hidden flex flex-col", className)}>
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div>
          <h3 className="font-semibold text-lg flex items-center">
            <Info size={16} className="mr-2 text-muted-foreground" />
            Cue Details
          </h3>
          <p className="text-sm text-muted-foreground">Edit the selected cue or create a new one</p>
        </div>
        
        {hasUnsavedChanges && (
          <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/50">
            <AlertTriangle size={12} />
            Unsaved Changes
          </Badge>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cue-name">Cue Name</Label>
            <Input 
              id="cue-name" 
              placeholder="Enter cue name" 
              value={cueSettings.name} 
              onChange={(e) => updateCueSettings({ name: e.target.value })} 
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
                  value={cueSettings.time} 
                  onChange={(e) => updateCueSettings({ time: e.target.value })} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cue-duration">Duration</Label>
              <Input 
                id="cue-duration" 
                value={cueSettings.duration} 
                onChange={(e) => updateCueSettings({ duration: e.target.value })} 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cue-track">Track</Label>
            <Select 
              value={cueSettings.track}
              onValueChange={(value) => updateCueSettings({ track: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Audio Main">Audio Main</SelectItem>
                <SelectItem value="Video Wall">Video Wall</SelectItem>
                <SelectItem value="Stage Lighting">Stage Lighting</SelectItem>
                <SelectItem value="Stage Direction">Stage Direction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Cue Type</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button 
                variant={cueSettings.type === 'audio' ? 'default' : 'outline'} 
                className={cn("flex flex-col h-20 items-center justify-center gap-1", cueSettings.type === 'audio' ? 'bg-runway-teal' : '')}
                onClick={() => updateCueSettings({ type: 'audio' })}
                draggable
                onDragStart={(e) => handleDragStart(e, 'audio')}
                onDragEnd={handleDragEnd}
              >
                <Music size={18} />
                <span className="text-xs">Audio</span>
              </Button>
              <Button 
                variant={cueSettings.type === 'video' ? 'default' : 'outline'} 
                className={cn("flex flex-col h-20 items-center justify-center gap-1", cueSettings.type === 'video' ? 'bg-runway-success' : '')}
                onClick={() => updateCueSettings({ type: 'video' })}
                draggable
                onDragStart={(e) => handleDragStart(e, 'video')}
                onDragEnd={handleDragEnd}
              >
                <Video size={18} />
                <span className="text-xs">Video</span>
              </Button>
              <Button 
                variant={cueSettings.type === 'lighting' ? 'default' : 'outline'} 
                className={cn("flex flex-col h-20 items-center justify-center gap-1", cueSettings.type === 'lighting' ? 'bg-runway-highlight' : '')}
                onClick={() => updateCueSettings({ type: 'lighting' })}
                draggable
                onDragStart={(e) => handleDragStart(e, 'lighting')}
                onDragEnd={handleDragEnd}
              >
                <Lightbulb size={18} />
                <span className="text-xs">Lighting</span>
              </Button>
              <Button 
                variant={cueSettings.type === 'stage' ? 'default' : 'outline'} 
                className={cn("flex flex-col h-20 items-center justify-center gap-1", cueSettings.type === 'stage' ? 'bg-runway-warning' : '')}
                onClick={() => updateCueSettings({ type: 'stage' })}
                draggable
                onDragStart={(e) => handleDragStart(e, 'stage')}
                onDragEnd={handleDragEnd}
              >
                <Mic size={18} />
                <span className="text-xs">Stage</span>
              </Button>
            </div>
          </div>
          
          <div className="bg-muted/40 rounded-md p-3 border border-border">
            <div className="flex items-center text-sm mb-2">
              <GripVertical size={16} className="mr-2 text-muted-foreground" />
              <span>Drag a cue type to the timeline to add a new cue</span>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="properties" className="flex-1">
                <Settings size={14} className="mr-2" />
                Properties
              </TabsTrigger>
              <TabsTrigger value="triggers" className="flex-1">
                <Wand2 size={14} className="mr-2" />
                Triggers
              </TabsTrigger>
              <TabsTrigger value="effects" className="flex-1">
                <Layers size={14} className="mr-2" />
                Effects
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">
                <FileText size={14} className="mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="properties" className="space-y-4 pt-3">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-follow">Auto-Follow</Label>
                  <Switch 
                    id="auto-follow" 
                    checked={cueSettings.autoFollow}
                    onCheckedChange={(checked) => updateCueSettings({ autoFollow: checked })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cue-color">Color Label</Label>
                  <div className="flex flex-wrap gap-2">
                    {['bg-runway-teal', 'bg-runway-success', 'bg-runway-highlight', 'bg-runway-warning', 'bg-runway-purple'].map((color) => (
                      <Tooltip key={color}>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "w-6 h-6 rounded-full cursor-pointer border-2", 
                              color, 
                              color === cueSettings.color ? 'border-white' : 'border-transparent'
                            )}
                            onClick={() => updateCueSettings({ color })}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{color.replace('bg-runway-', '')}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Linked Cues</Label>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Link this cue with others</span>
                      <Button size="sm" variant="ghost">
                        <Link size={14} className="mr-2" />
                        Link
                      </Button>
                    </div>
                    
                    <div className="mt-2 space-y-2">
                      <div className="text-xs text-muted-foreground">No linked cues yet</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="triggers" className="space-y-4 pt-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm">Trigger this cue:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="cursor-pointer">Manually</Badge>
                  <Badge variant="outline" className="cursor-pointer">After previous</Badge>
                  <Badge variant="outline" className="cursor-pointer">At specific time</Badge>
                  <Badge variant="secondary" className="cursor-pointer">+ Add trigger</Badge>
                </div>
              </div>
              
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm">Advanced triggers:</p>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On MIDI note</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On OSC message</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On DMX input</span>
                    <Switch />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="effects" className="pt-3 space-y-4">
              <div className="space-y-2">
                <Label>Applied Effects</Label>
                <div className="flex flex-wrap gap-2">
                  {cueSettings.effects.map(effect => (
                    <Badge key={effect} variant="secondary" className="gap-1">
                      {effect}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeEffect(effect)}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                  
                  {cueSettings.effects.length === 0 && (
                    <div className="text-sm text-muted-foreground">No effects applied</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Add Effect</Label>
                <Select onValueChange={addEffect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an effect" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectOptions.map(effect => (
                      <SelectItem key={effect.value} value={effect.value}>
                        {effect.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Effect Settings</Label>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-sm text-muted-foreground">
                    {cueSettings.effects.length === 0 
                      ? "Select an effect to configure its settings" 
                      : "Configure settings for selected effects"}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="notes" className="pt-3">
              <textarea 
                className="w-full min-h-[150px] rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Add notes about this cue..."
                value={cueSettings.notes}
                onChange={(e) => updateCueSettings({ notes: e.target.value })}
              />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
      
      <div className="p-4 grid grid-cols-3 gap-2 border-t border-border mt-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy size={16} className="mr-2" />
              Duplicate
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create a copy of this cue</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="default" 
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
            >
              <Save size={16} className="mr-2" />
              Save
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save changes to this cue</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove this cue from the timeline</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default CuePanel;
