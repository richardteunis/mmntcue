import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Video, Music, Lightbulb, Sparkles, Clock, Loader2, Award, Church, Radio, PartyPopper, Theater, Building2, Heart, FileUp, Keyboard, Play, ArrowRight, Zap, Users, CalendarDays, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HomeViewProps {
  onCreateShow: () => void;
  recentShows?: { id: string; name: string; updatedAt: string }[];
  onSelectShow?: (showId: string, showName: string) => void;
}

const SHOW_TEMPLATES = [
  { id: 'concert', label: 'Concert', icon: Music, description: 'Live music with lighting & video', color: 'text-secondary' },
  { id: 'corporate', label: 'Corporate', icon: Building2, description: 'Conferences & presentations', color: 'text-blue-400' },
  { id: 'theater', label: 'Theater', icon: Theater, description: 'Stage productions & plays', color: 'text-purple-400' },
  { id: 'wedding', label: 'Wedding', icon: Heart, description: 'Ceremony & reception', color: 'text-pink-400' },
  { id: 'festival', label: 'Festival', icon: PartyPopper, description: 'Multi-stage outdoor events', color: 'text-emerald-400' },
  { id: 'awards', label: 'Awards', icon: Award, description: 'Award ceremonies & galas', color: 'text-amber-400' },
  { id: 'church', label: 'Church', icon: Church, description: 'Worship services', color: 'text-sky-400' },
  { id: 'broadcast', label: 'Broadcast', icon: Radio, description: 'Live streams & broadcasts', color: 'text-red-400' },
];

const QUICK_TIPS = [
  { icon: Keyboard, title: 'Keyboard shortcuts', description: 'Press Space to fire cues, Arrow keys to navigate' },
  { icon: Play, title: 'Rehearsal mode', description: 'Practice your show without affecting live settings' },
  { icon: Users, title: 'Real-time collaboration', description: 'Invite your team to edit shows together' },
  { icon: Layers, title: 'Multi-track timeline', description: 'Organize cues by audio, video, lighting & more' },
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
      const { data: { session } } = await supabase.auth.getSession();
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-show', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        body: { template: selectedTemplate, eventName: eventName || undefined, duration }
      });

      if (functionError) throw new Error(functionError.message);
      if (functionData.error) {
        toast({ title: 'Generation failed', description: functionData.error, variant: 'destructive' });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
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

      if (user) {
        await supabase.from('show_members').insert({
          show_id: newShow.id,
          user_id: user.id,
          role: 'owner',
          accepted_at: new Date().toISOString()
        });
      }

      if (functionData.cues && Array.isArray(functionData.cues)) {
        let currentTimeSeconds = 0;
        
        const cuesData = functionData.cues.map((cue: any, index: number) => {
          const durationParts = (cue.duration || '00:00:30').split(':').map(Number);
          let durationSeconds = 30;
          if (durationParts.length === 3) {
            durationSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
          } else if (durationParts.length === 2) {
            durationSeconds = durationParts[0] * 60 + durationParts[1];
          }

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
        if (cuesError) console.error('Error creating cues:', cuesError);
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
    <div className="flex-1 flex flex-col bg-background overflow-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
                <Zap className="h-3.5 w-3.5" />
                Professional show control
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Ready to call your next show?
              </h1>
              <p className="text-muted-foreground text-lg max-w-lg">
                Build cue sheets, coordinate your team, and execute flawless live productions.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                <Button size="lg" onClick={onCreateShow} className="gap-2 shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" />
                  New Show
                </Button>
                <Button size="lg" variant="outline" onClick={() => setIsAIDialogOpen(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Build with AI
                </Button>
              </div>
            </div>
            
            {/* Stats/Info cards */}
            <div className="hidden lg:grid grid-cols-2 gap-3 w-72">
              <div className="p-4 rounded-xl bg-card/80 backdrop-blur border border-border/50 shadow-sm">
                <Video className="h-5 w-5 text-emerald-400 mb-2" />
                <div className="text-2xl font-bold text-foreground">Video</div>
                <div className="text-xs text-muted-foreground">Cue playback</div>
              </div>
              <div className="p-4 rounded-xl bg-card/80 backdrop-blur border border-border/50 shadow-sm">
                <Music className="h-5 w-5 text-secondary mb-2" />
                <div className="text-2xl font-bold text-foreground">Audio</div>
                <div className="text-xs text-muted-foreground">Sound effects</div>
              </div>
              <div className="p-4 rounded-xl bg-card/80 backdrop-blur border border-border/50 shadow-sm">
                <Lightbulb className="h-5 w-5 text-amber-400 mb-2" />
                <div className="text-2xl font-bold text-foreground">Lights</div>
                <div className="text-xs text-muted-foreground">Lighting cues</div>
              </div>
              <div className="p-4 rounded-xl bg-card/80 backdrop-blur border border-border/50 shadow-sm">
                <Users className="h-5 w-5 text-primary mb-2" />
                <div className="text-2xl font-bold text-foreground">Team</div>
                <div className="text-xs text-muted-foreground">Collaborate live</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-8">
        
        {/* Recent Shows */}
        {recentShows.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Continue where you left off
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentShows.slice(0, 6).map((show) => (
                <button
                  key={show.id}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/10 hover:border-primary/30 transition-all duration-200 text-left w-full shadow-sm hover:shadow-md"
                  onClick={() => onSelectShow?.(show.id, show.name)}
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <img src="/mmnt_pink_icon.svg" alt="" className="h-7 w-7 logo-themed" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">{show.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(show.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Quick Start Options */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quick start</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className="group cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary bg-gradient-to-br from-primary/5 to-transparent hover:from-primary/10 transition-all duration-200" 
              onClick={onCreateShow}
            >
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-1 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Blank Show</CardTitle>
                <CardDescription className="text-sm">Start from scratch</CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="group cursor-pointer border border-border hover:border-accent/50 bg-gradient-to-br from-accent/5 to-transparent hover:from-accent/10 transition-all duration-200" 
              onClick={() => setIsAIDialogOpen(true)}
            >
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-1 group-hover:bg-accent/20 transition-colors">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <CardTitle className="text-base flex items-center gap-2">
                  AI Generator
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">Beta</span>
                </CardTitle>
                <CardDescription className="text-sm">Generate from templates</CardDescription>
              </CardHeader>
            </Card>

            <Card className="group cursor-pointer border border-border hover:border-secondary/50 bg-gradient-to-br from-secondary/5 to-transparent hover:from-secondary/10 transition-all duration-200 opacity-60 pointer-events-none">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-1">
                  <FileUp className="h-5 w-5 text-secondary" />
                </div>
                <CardTitle className="text-base flex items-center gap-2">
                  Import ROS
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">Soon</span>
                </CardTitle>
                <CardDescription className="text-sm">From spreadsheet or file</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Tips Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Pro tips</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_TIPS.map((tip, i) => (
              <div 
                key={i} 
                className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <tip.icon className="h-5 w-5 text-primary mb-2" />
                <h3 className="text-sm font-medium text-foreground mb-1">{tip.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
              </div>
            ))}
          </div>
        </section>
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
