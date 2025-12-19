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
  Clock
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
import { Checkbox } from '@/components/ui/checkbox';

interface AddEditCuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cue: TimelineCue, useAutoStartTime: boolean) => void;
  editingCue: TimelineCue | null;
  tracks: string[];
  defaultTrack?: string;
  nextStartTime?: string;
}

const DEFAULT_CUE: TimelineCue = {
  id: '',
  name: 'New Cue',
  track: 'Audio Main',
  time: '00:00:00',
  duration: '00:00:30',
  type: 'audio',
  color: '#14B8A6',
  autoFollow: false,
  notes: '',
  effects: [],
  position: 0,
  width: 100
};

const AddEditCuePanel: React.FC<AddEditCuePanelProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCue,
  tracks,
  defaultTrack = 'Audio Main',
  nextStartTime = '00:00:00'
}) => {
  const { toast } = useToast();
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [useAutoStartTime, setUseAutoStartTime] = useState(true);

  const form = useForm<TimelineCue>({
    defaultValues: {...DEFAULT_CUE, track: defaultTrack}
  });

  useEffect(() => {
    if (editingCue) {
      setFormMode('edit');
      setUseAutoStartTime(false);
      form.reset({...editingCue});
    } else {
      setFormMode('add');
      setUseAutoStartTime(true);
      const newCue = {
        ...DEFAULT_CUE,
        id: `cue-${Date.now()}`,
        track: defaultTrack,
        time: nextStartTime
      };
      form.reset(newCue);
    }
  }, [editingCue, defaultTrack, form, isOpen, nextStartTime]);

  // Update time field when useAutoStartTime changes
  useEffect(() => {
    if (formMode === 'add' && useAutoStartTime) {
      form.setValue('time', nextStartTime);
    }
  }, [useAutoStartTime, nextStartTime, formMode, form]);

  const handleEffectAdd = (effectName: string) => {
    const currentEffects = form.getValues('effects') || [];
    if (currentEffects.includes(effectName)) return;
    
    form.setValue('effects', [...currentEffects, effectName]);
  };
  
  const handleEffectRemove = (effectName: string) => {
    const currentEffects = form.getValues('effects') || [];
    form.setValue('effects', currentEffects.filter(e => e !== effectName));
  };

  const onSubmit = (data: TimelineCue) => {
    if (formMode === 'add' && !data.id) {
      data.id = `cue-${Date.now()}`;
    }
    
    onSave(data, formMode === 'add' && useAutoStartTime);
    
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
                          <option value="vog">VOG (Voice of God)</option>
                          <option value="ops_note">Ops Note</option>
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
                        <Input 
                          {...field} 
                          placeholder="00:00:00" 
                          disabled={formMode === 'add' && useAutoStartTime}
                        />
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
                        <Input {...field} placeholder="00:00:30" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {formMode === 'add' && (
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border bg-muted/50">
                  <Checkbox
                    id="auto-start"
                    checked={useAutoStartTime}
                    onCheckedChange={(checked) => setUseAutoStartTime(checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="auto-start" className="text-sm font-medium cursor-pointer">
                      Auto-calculate start time
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Start after previous cue ends ({nextStartTime})
                    </p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              
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
                          {[
                            '#14B8A6', // teal
                            '#22C55E', // green
                            '#EAB308', // yellow
                            '#F97316', // orange
                            '#3B82F6', // blue
                            '#8B5CF6', // purple
                            '#EC4899', // pink
                            '#FBBF24', // amber
                            '#EF4444', // red
                            '#6B7280', // gray
                            '#64748B', // slate
                            '#06B6D4', // cyan
                          ].map((color) => (
                            <div 
                              key={color}
                              className={cn(
                                "w-8 h-8 rounded-full cursor-pointer border-2 transition-all hover:scale-110", 
                                field.value === color ? "border-white ring-2 ring-foreground" : "border-transparent"
                              )}
                              style={{ backgroundColor: color }}
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
