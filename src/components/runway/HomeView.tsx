import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Folder, Video, Music, Lightbulb, Sparkles, Clock, Users, Loader2, Mic2, Award, Church, Radio, PartyPopper, Theater, Building2, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HomeViewProps {
  onCreateShow: () => void;
  recentShows?: { id: string; name: string; updatedAt: string }[];
  onSelectShow?: (showId: string, showName: string) => void;
}

const SHOW_TEMPLATES = [
  { id: 'concert', label: 'Concert', icon: Music, description: 'Live music with lighting & video', color: 'text-runway-teal' },
  { id: 'corporate', label: 'Corporate', icon: Building2, description: 'Conferences & presentations', color: 'text-blue-400' },
  { id: 'theater', label: 'Theater', icon: Theater, description: 'Stage productions & plays', color: 'text-purple-400' },
  { id: 'wedding', label: 'Wedding', icon: Heart, description: 'Ceremony & reception', color: 'text-pink-400' },
  { id: 'festival', label: 'Festival', icon: PartyPopper, description: 'Multi-stage outdoor events', color: 'text-runway-success' },
  { id: 'awards', label: 'Awards', icon: Award, description: 'Award ceremonies & galas', color: 'text-runway-highlight' },
  { id: 'church', label: 'Church', icon: Church, description: 'Worship services', color: 'text-amber-400' },
  { id: 'broadcast', label: 'Broadcast', icon: Radio, description: 'Live streams & broadcasts', color: 'text-red-400' },
];

const HomeView: React.FC<HomeViewProps> = ({ onCreateShow, recentShows = [], onSelectShow }) => {
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [duration, setDuration] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateShow = async () => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-show', {
        body: { template: selectedTemplate, eventName: eventName || undefined, duration }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (functionData.error) {
        toast({
          title: 'Generation failed',
          description: functionData.error,
          variant: 'destructive'
        });
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create the show in database
      const showInsertData = {
        name: functionData.showName || eventName || `${selectedTemplate} Show`,
        description: functionData.description,
        user_id: user?.id || null,
        show_template: selectedTemplate,
      };
      
      const { data: newShow, error: showError } = await supabase
        .from('shows')
        .insert(showInsertData as any)
        .select()
        .single();

      if (showError) throw showError;

      // Create owner membership
      if (user) {
        await supabase.from('show_members').insert({
          show_id: newShow.id,
          user_id: user.id,
          role: 'owner',
          accepted_at: new Date().toISOString()
        });
      }

      // Add the generated cues
      if (functionData.cues && Array.isArray(functionData.cues)) {
        let currentTimeSeconds = 0;
        
        const cuesData = functionData.cues.map((cue: any, index: number) => {
          // Parse duration to seconds for calculating start times
          const durationParts = (cue.duration || '00:00:30').split(':').map(Number);
          let durationSeconds = 30;
          if (durationParts.length === 3) {
            durationSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
          } else if (durationParts.length === 2) {
            durationSeconds = durationParts[0] * 60 + durationParts[1];
          }

          // Format start time
          const hours = Math.floor(currentTimeSeconds / 3600);
          const mins = Math.floor((currentTimeSeconds % 3600) / 60);
          const secs = Math.floor(currentTimeSeconds % 60);
          const startTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

          currentTimeSeconds += durationSeconds;

          const colorMap: Record<string, string> = {
            audio: '#14B8A6',
            video: '#22C55E',
            lighting: '#EAB308',
            stage: '#F97316',
          };

          return {
            show_id: newShow.id,
            name: cue.name,
            type: cue.type || 'audio',
            start_time: startTime,
            duration: cue.duration || '00:00:30',
            notes: cue.notes || null,
            color: colorMap[cue.type] || '#14B8A6',
            order_index: index,
            position: index * 100,
            width: 100,
          };
        });

        const { error: cuesError } = await supabase.from('cues').insert(cuesData);
        if (cuesError) {
          console.error('Error creating cues:', cuesError);
        }
      }

      toast({
        title: 'Show created!',
        description: `${functionData.showName || 'Your show'} is ready with ${functionData.cues?.length || 0} cues`,
      });

      setIsAIDialogOpen(false);
      setSelectedTemplate(null);
      setEventName('');
      onSelectShow?.(newShow.id, newShow.name);
    } catch (error) {
      console.error('Error generating show:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate show',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background overflow-auto">
      <div className="max-w-3xl w-full space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-3">
          <img 
            src="/mmnt_pink_wordmark.svg" 
            alt="mmnt. Cue" 
            className="h-10 mx-auto mb-4 logo-themed"
          />
          <h1 className="text-3xl font-bold text-foreground">Welcome to mmnt. Cue</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Professional show control for live events. Create a show to start building your cue sheet.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group" onClick={onCreateShow}>
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Create Blank Show</CardTitle>
              <CardDescription>Start from scratch and add your cues</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="border-accent/20 hover:border-accent/40 transition-colors cursor-pointer group bg-gradient-to-br from-accent/5 to-transparent" 
            onClick={() => setIsAIDialogOpen(true)}
          >
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-2 group-hover:bg-accent/20 transition-colors">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-lg flex items-center gap-2">
                Build with AI
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">New</span>
              </CardTitle>
              <CardDescription>Generate a show from templates using AI</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Shows */}
        {recentShows.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Shows
            </h2>
            <div className="grid gap-2">
              {recentShows.slice(0, 3).map((show) => (
                <button
                  key={show.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-left w-full"
                  onClick={() => onSelectShow?.(show.id, show.name)}
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <img src="/mmnt_pink_icon.svg" alt="" className="h-5 w-5 logo-themed" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{show.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(show.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="pt-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 text-center">What you can do</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Video, label: 'Video Cues', color: 'text-runway-success' },
              { icon: Music, label: 'Audio Cues', color: 'text-runway-teal' },
              { icon: Lightbulb, label: 'Lighting Cues', color: 'text-runway-highlight' },
              { icon: Users, label: 'Collaborate', color: 'text-primary' },
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30">
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
                <span className="text-xs text-muted-foreground">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Generation Dialog */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Build Show with AI
            </DialogTitle>
            <DialogDescription>
              Choose a template and AI will generate a complete cue sheet for your event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Template Selection */}
            <div className="space-y-3">
              <Label>Select Template</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SHOW_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                  >
                    <template.icon className={`h-6 w-6 ${template.color}`} />
                    <span className="text-xs font-medium">{template.label}</span>
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <p className="text-sm text-muted-foreground">
                  {SHOW_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                </p>
              )}
            </div>

            {/* Event Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name (optional)</Label>
                <Input
                  id="eventName"
                  placeholder="e.g., Summer Gala 2025"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={240}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIDialogOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateShow} 
              disabled={!selectedTemplate || isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Show
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomeView;
