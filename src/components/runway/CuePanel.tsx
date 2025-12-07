
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Scissors, Clock, Copy, ClipboardCopy, Edit, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineCue } from './Timeline';
import { useToast } from '@/hooks/use-toast';

interface CuePanelProps {
  selectedCueId: string | null;
  selectedCue: TimelineCue | null;
  onCueUpdate: (cue: TimelineCue) => void;
  onCueDelete: (cueId: string) => void;
  onCueDuplicate: (cueId: string) => void;
  onClose?: () => void;
}

const CuePanel: React.FC<CuePanelProps> = ({
  selectedCueId,
  selectedCue,
  onCueUpdate,
  onCueDelete,
  onCueDuplicate,
  onClose
}) => {
  const { toast } = useToast();
  
  if (!selectedCue || !selectedCueId) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center text-muted-foreground">
        <div>
          <p>No cue selected</p>
          <p className="text-sm mt-2">Select a cue on the timeline to view and edit its properties</p>
        </div>
      </div>
    );
  }
  
  const updateCueField = (field: keyof TimelineCue, value: any) => {
    if (!selectedCue) return;
    
    const updatedCue = {
      ...selectedCue,
      [field]: value
    };
    
    onCueUpdate(updatedCue);
  };
  
  const handleEffectAdd = (effectName: string) => {
    if (!selectedCue) return;
    
    const currentEffects = selectedCue.effects || [];
    if (currentEffects.includes(effectName)) return;
    
    updateCueField('effects', [...currentEffects, effectName]);
    
    toast({
      title: "Effect added",
      description: `Added ${effectName} effect to ${selectedCue.name}`
    });
  };
  
  const handleEffectRemove = (effectName: string) => {
    if (!selectedCue) return;
    
    const currentEffects = selectedCue.effects || [];
    updateCueField('effects', currentEffects.filter(e => e !== effectName));
    
    toast({
      title: "Effect removed",
      description: `Removed ${effectName} effect from ${selectedCue.name}`
    });
  };
  
  const handleDeleteCue = () => {
    if (!selectedCueId) return;
    
    toast({
      title: "Cue deleted",
      description: `${selectedCue.name} has been deleted`,
      variant: "destructive",
    });
    
    onCueDelete(selectedCueId);
  };
  
  const handleDuplicateCue = () => {
    if (!selectedCueId) return;
    
    toast({
      title: "Cue duplicated",
      description: `Copy of ${selectedCue.name} has been created`
    });
    
    onCueDuplicate(selectedCueId);
  };
  
  const handleCopyCue = () => {
    if (!selectedCueId) return;
    
    toast({
      title: "Cue copied",
      description: `${selectedCue.name} copied to clipboard`
    });
    
    // You can also use the Clipboard API if you want to copy to system clipboard
    const cueData = JSON.stringify(selectedCue);
    navigator.clipboard.writeText(cueData).catch(err => {
      console.error("Could not copy to clipboard:", err);
    });
  };

  const handleEditCue = () => {
    // Trigger the edit cue panel via a custom event
    document.dispatchEvent(new CustomEvent("timeline-edit-cue", { 
      detail: { cue: selectedCue } 
    }));
  };
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'audio':
        return 'bg-runway-teal text-white';
      case 'video':
        return 'bg-runway-success text-white';
      case 'lighting':
        return 'bg-runway-highlight text-white';
      case 'stage':
        return 'bg-runway-warning text-white';
      default:
        return 'bg-muted text-foreground';
    }
  };
  
  return (
    <div className="h-full overflow-y-auto border-l border-border">
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{selectedCue.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn("capitalize", getTypeColor(selectedCue.type))}>
                {selectedCue.type}
              </Badge>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock size={14} className="mr-1" />
                {selectedCue.time} <span className="mx-1">•</span> {selectedCue.duration}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={handleCopyCue}>
              <ClipboardCopy size={16} />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDuplicateCue}>
              <Copy size={16} />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleEditCue}>
              <Edit size={16} />
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDeleteCue}>
              <Trash2 size={16} />
            </Button>
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="cue-name">Name</Label>
            <Input 
              id="cue-name" 
              value={selectedCue.name} 
              onChange={(e) => updateCueField('name', e.target.value)} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cue-time">Start Time</Label>
              <Input 
                id="cue-time" 
                value={selectedCue.time} 
                onChange={(e) => updateCueField('time', e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="cue-duration">Duration</Label>
              <Input 
                id="cue-duration" 
                value={selectedCue.duration} 
                onChange={(e) => updateCueField('duration', e.target.value)} 
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-follow" 
              checked={selectedCue.autoFollow || false}
              onCheckedChange={(checked) => updateCueField('autoFollow', checked)}
            />
            <Label htmlFor="auto-follow">Auto-follow to next cue</Label>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="notes">
        <div className="px-4 border-b border-border">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="effects">Effects</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="notes" className="p-4">
          <Textarea 
            placeholder="Add notes for this cue..."
            className="min-h-[200px]" 
            value={selectedCue.notes || ''}
            onChange={(e) => updateCueField('notes', e.target.value)}
          />
        </TabsContent>
        
        <TabsContent value="effects" className="p-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {(selectedCue.effects || []).map((effect) => (
                <Badge 
                  key={effect} 
                  variant="secondary"
                  className="pl-2 pr-1 py-1 flex items-center gap-1"
                >
                  {effect}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => handleEffectRemove(effect)}
                  >
                    ×
                  </Button>
                </Badge>
              ))}
              {(selectedCue.effects || []).length === 0 && (
                <div className="text-sm text-muted-foreground">No effects added</div>
              )}
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">Add effects</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start"
                  onClick={() => handleEffectAdd('fade-in')}
                >
                  <PlusCircle size={14} className="mr-1" /> Fade In
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start"
                  onClick={() => handleEffectAdd('fade-out')}
                >
                  <PlusCircle size={14} className="mr-1" /> Fade Out
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start"
                  onClick={() => handleEffectAdd('crossfade')}
                >
                  <PlusCircle size={14} className="mr-1" /> Crossfade
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start"
                  onClick={() => handleEffectAdd('loop')}
                >
                  <PlusCircle size={14} className="mr-1" /> Loop
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start"
                  onClick={() => handleEffectAdd('delay')}
                >
                  <PlusCircle size={14} className="mr-1" /> Delay
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start"
                  onClick={() => handleEffectAdd('custom')}
                >
                  <PlusCircle size={14} className="mr-1" /> Custom
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="p-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="cue-color">Color</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {['bg-runway-teal', 'bg-runway-success', 'bg-runway-highlight', 'bg-runway-warning', 
                  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-orange-500', 
                  'bg-red-500', 'bg-gray-500', 'bg-slate-500'].map((color) => (
                  <div 
                    key={color}
                    className={cn(
                      "w-8 h-8 rounded-full cursor-pointer border-2", 
                      color,
                      selectedCue.color === color ? "border-white ring-2 ring-black" : "border-transparent"
                    )}
                    onClick={() => updateCueField('color', color)}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="cue-track">Track</Label>
              <Input 
                id="cue-track" 
                value={selectedCue.track || ''}
                onChange={(e) => updateCueField('track', e.target.value)}
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                To change tracks, drag and drop the cue to another track
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CuePanel;
