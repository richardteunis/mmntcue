import React from 'react';
import { CueSuggestion } from '@/types/cue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Plus, Clock, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AISuggestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: CueSuggestion[];
  loading: boolean;
  onGetSuggestions: (type?: string) => void;
  onAddSuggestion: (suggestion: CueSuggestion) => void;
}

const AISuggestPanel: React.FC<AISuggestPanelProps> = ({
  isOpen,
  onClose,
  suggestions,
  loading,
  onGetSuggestions,
  onAddSuggestion
}) => {
  const [selectedType, setSelectedType] = React.useState<string>('all');

  if (!isOpen) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'audio': return 'bg-runway-teal text-white';
      case 'video': return 'bg-runway-success text-white';
      case 'lighting': return 'bg-runway-highlight text-white';
      case 'stage': return 'bg-runway-warning text-white';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI Cue Suggestions</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Let AI suggest cues based on your show context
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => onGetSuggestions(selectedType === 'all' ? undefined : selectedType)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>

          {suggestions.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Generate Suggestions" to get AI-powered cue ideas</p>
            </div>
          )}

          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{suggestion.name}</h4>
                        <Badge className={cn("capitalize", getTypeColor(suggestion.type))}>
                          {suggestion.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.notes}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{suggestion.duration}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => onAddSuggestion(suggestion)}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AISuggestPanel;
