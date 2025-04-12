
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, 
  Save, 
  X, 
  Clock, 
  Palette
} from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { cn } from '@/lib/utils';
import { TimelineCue } from './Timeline';
import { useToast } from '@/hooks/use-toast';

interface AddEditCuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cue: TimelineCue) => void;
  editingCue: TimelineCue | null;
  tracks: string[];
  defaultTrack?: string;
}

const DEFAULT_CUE: TimelineCue = {
  id: '',
  name: 'New Cue',
  track: 'audio',
  time: '00:00:00',
  duration: '00:00:05',
  type: 'audio',
  color: 'bg-runway-teal',
  autoFollow: false,
  notes: '',
  effects: []
};

const AddEditCuePanel: React.FC<AddEditCuePanelProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCue,
  tracks,
  defaultTrack = 'audio'
}) => {
  const { toast } = useToast();
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [currentCue, setCurrentCue] = useState<TimelineCue>({...DEFAULT_CUE, track: defaultTrack});

  // Setup form
  const form = useForm<TimelineCue>({
    defaultValues: {...DEFAULT_CUE, track: defaultTrack}
  });

  // Set form mode and initialize currentCue based on editingCue
  useEffect(() => {
    if (editingCue) {
      setFormMode('edit');
      setCurrentCue({...editingCue});
      form.reset({...editingCue});
    } else {
      setFormMode('add');
      const newCue = {
        ...DEFAULT_CUE,
        id: `cue-${Date.now()}`,
        track: defaultTrack
      };
      setCurrentCue(newCue);
      form.reset(newCue);
    }
  }, [editingCue, defaultTrack, form, isOpen]);

  const handleEffectAdd = (effectName: string) => {
    const currentEffects = form.getValues('effects') || [];
    if (currentEffects.includes(effectName)) return;
    
    form.setValue('effects', [...currentEffects, effectName]);
  };
  
  const handleEffectRemove = (effectName: string) => {
    const currentEffects = form.getValues('effects') || [];
    form.setValue('effects', currentEffects.filter(e => e !== effectName));
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

  const onSubmit = (data: TimelineCue) => {
    // Generate a random ID if this is a new cue
    if (formMode === 'add' && !data.id) {
      data.id = `cue-${Date.now()}`;
    }
    
    onSave(data);
    
    toast({
      title: formMode === 'add' ? "Cue created" : "Cue updated",
      description: `${data.name} has been ${formMode === 'add' ? 'added to' : 'updated on'} the timeline`
    });
    
    onClose();
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{formMode === 'add' ? 'Add New Cue' : 'Edit Cue'}</SheetTitle>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter cue name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <select 
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="audio">Audio</option>
                          <option value="video">Video</option>
                          <option value="lighting">Lighting</option>
                          <option value="stage">Stage</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="00:00:00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="00:00:05" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="track"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Track</FormLabel>
                    <FormControl>
                      <select 
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {tracks.map((track) => (
                          <option key={track} value={track}>{track}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="autoFollow"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-follow</FormLabel>
                      <FormDescription>
                        Automatically continue to the next cue
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <Tabs defaultValue="notes">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="effects">Effects</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="notes" className="pt-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Add notes for this cue..."
                          className="min-h-[200px]" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="effects" className="pt-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(form.watch('effects') || []).map((effect) => (
                      <Badge 
                        key={effect} 
                        variant="secondary"
                        className="pl-2 pr-1 py-1 flex items-center gap-1"
                      >
                        {effect}
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEffectRemove(effect)}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                    {(form.watch('effects') || []).length === 0 && (
                      <div className="text-sm text-muted-foreground">No effects added</div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Add effects</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="justify-start"
                        onClick={() => handleEffectAdd('fade-in')}
                      >
                        <PlusCircle size={14} className="mr-1" /> Fade In
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="justify-start"
                        onClick={() => handleEffectAdd('fade-out')}
                      >
                        <PlusCircle size={14} className="mr-1" /> Fade Out
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="justify-start"
                        onClick={() => handleEffectAdd('crossfade')}
                      >
                        <PlusCircle size={14} className="mr-1" /> Crossfade
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="justify-start"
                        onClick={() => handleEffectAdd('loop')}
                      >
                        <PlusCircle size={14} className="mr-1" /> Loop
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="justify-start"
                        onClick={() => handleEffectAdd('delay')}
                      >
                        <PlusCircle size={14} className="mr-1" /> Delay
                      </Button>
                      <Button 
                        type="button"
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
              
              <TabsContent value="settings" className="pt-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <div className="grid grid-cols-6 gap-2 mt-2">
                          {['bg-runway-teal', 'bg-runway-success', 'bg-runway-highlight', 'bg-runway-warning', 
                            'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-orange-500', 
                            'bg-red-500', 'bg-gray-500', 'bg-slate-500'].map((color) => (
                            <div 
                              key={color}
                              className={cn(
                                "w-8 h-8 rounded-full cursor-pointer border-2", 
                                color,
                                field.value === color ? "border-white ring-2 ring-black" : "border-transparent"
                              )}
                              onClick={() => form.setValue('color', color)}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <SheetFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                <X size={18} className="mr-2" /> Cancel
              </Button>
              <Button type="submit">
                <Save size={18} className="mr-2" /> {formMode === 'add' ? 'Create Cue' : 'Update Cue'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

export default AddEditCuePanel;
