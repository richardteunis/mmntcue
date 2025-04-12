
import React from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Filter,
  Clock,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TimelineControlsProps {
  isPlaying: boolean;
  currentTime: string;
  searchFilter: string;
  selectedCue: string | null;
  trackFilters: string[];
  onPlayPause: () => void;
  onNextCue: () => void;
  onReset: () => void;
  onSplitCue: () => void;
  onDeleteCue: (cueId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onToggleTrackFilter: (type: 'audio' | 'video' | 'lighting' | 'stage') => void;
  getFilterButtonClass: (type: 'audio' | 'video' | 'lighting' | 'stage') => string;
}

const TimelineControls: React.FC<TimelineControlsProps> = ({
  isPlaying,
  currentTime,
  searchFilter,
  selectedCue,
  trackFilters,
  onPlayPause,
  onNextCue,
  onReset,
  onSplitCue,
  onDeleteCue,
  onZoomIn,
  onZoomOut,
  onSearchChange,
  onClearSearch,
  onToggleTrackFilter,
  getFilterButtonClass
}) => {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-border">
      <div className="flex items-center gap-1">
        <Button 
          size="sm" 
          variant="secondary" 
          className="gap-1"
          onClick={onPlayPause}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1"
              onClick={onNextCue}
            >
              <SkipForward size={14} />
              Next Cue
            </Button>
          </TooltipTrigger>
          <TooltipContent>Jump to next cue (Shift+Right)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1"
              onClick={onReset}
            >
              <RotateCcw size={14} />
              Reset
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset timeline (Home)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={onSplitCue}
            >
              <Scissors size={14} />
              Split
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split selected cue at current time (S)</TooltipContent>
        </Tooltip>
        
        {selectedCue && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-destructive"
                onClick={() => onDeleteCue(selectedCue)}
              >
                <Trash2 size={14} />
                Delete
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete selected cue (Delete)</TooltipContent>
          </Tooltip>
        )}
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={onZoomOut}
            >
              <ZoomOut size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out (Ctrl+-)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={onZoomIn}
            >
              <ZoomIn size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in (Ctrl++)</TooltipContent>
        </Tooltip>
      </div>
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            placeholder="Search tracks and cues..."
            className="h-8 w-64 pl-8"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <Filter size={14} className="absolute left-2.5 top-2 text-muted-foreground" />
          {searchFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-6 w-6 p-0"
              onClick={onClearSearch}
            >
              <ChevronDown size={14} />
            </Button>
          )}
        </div>
        
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className={getFilterButtonClass('audio')}
            onClick={() => onToggleTrackFilter('audio')}
          >
            Audio
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={getFilterButtonClass('video')}
            onClick={() => onToggleTrackFilter('video')}
          >
            Video
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={getFilterButtonClass('lighting')}
            onClick={() => onToggleTrackFilter('lighting')}
          >
            Lighting
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={getFilterButtonClass('stage')}
            onClick={() => onToggleTrackFilter('stage')}
          >
            Stage
          </Button>
        </div>
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      <div className="flex items-center gap-1">
        <Clock size={16} className="text-muted-foreground" />
        <span className="text-sm font-mono">{currentTime}</span>
      </div>
    </div>
  );
};

export default TimelineControls;
