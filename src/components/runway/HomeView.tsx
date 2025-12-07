import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Plus, Folder, Video, Music, Lightbulb, Sparkles, Clock, Users } from 'lucide-react';

interface HomeViewProps {
  onCreateShow: () => void;
  recentShows?: { id: string; name: string; updatedAt: string }[];
  onSelectShow?: (showId: string, showName: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onCreateShow, recentShows = [], onSelectShow }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-2xl w-full space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to MMNT.Cue</h1>
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
              <CardTitle className="text-lg">Create New Show</CardTitle>
              <CardDescription>Start with a blank show and add your cues</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 opacity-60">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-2">
                <Folder className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg text-muted-foreground">Import Show</CardTitle>
              <CardDescription>Import from another source (coming soon)</CardDescription>
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
                    <Layers className="h-4 w-4 text-primary" />
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
    </div>
  );
};

export default HomeView;
