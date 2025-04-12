
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight, 
  PlusCircle,
  Zap,
  Wand2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  cues: TimelineCue[];
  expanded: boolean;
  muted?: boolean;
  solo?: boolean;
  locked?: boolean;
}

export interface TimelineCue {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'lighting' | 'stage';
  time: string;
  duration: string;
  position: number;
  width: number;
  notes?: string;
  effects?: string[];
  autoFollow?: boolean;
  color?: string;
  track?: string;
}

interface TrackListProps {
  tracks: TimelineTrack[];
  onToggleTrackExpand: (trackId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackSolo: (trackId: string) => void;
  onAddNewTrack: (type?: 'audio' | 'video' | 'lighting' | 'stage') => void;
  onCueDragStart: (e: React.DragEvent, cueId: string, trackId: string) => void;
  onCueDragEnd: (e: React.DragEvent) => void;
  onCueDropOnTrack: (e: React.DragEvent, trackId: string) => void;
  onTrackDrop: (e: React.DragEvent, trackId: string) => void;
  onCueClick: (cueId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  selectedCue: string | null;
}

const TrackList: React.FC<TrackListProps> = ({
  tracks,
  onToggleTrackExpand,
  onToggleTrackMute,
  onToggleTrackSolo,
  onAddNewTrack,
  onCueDragStart,
  onCueDragEnd,
  onCueDropOnTrack,
  onTrackDrop,
  onCueClick,
  onDragOver,
  selectedCue
}) => {
  return (
    <div className="w-56 border-r border-border overflow-y-auto">
      <div className="sticky top-0 z-10 bg-background backdrop-blur bg-opacity-80">
        <div className="flex justify-between items-center px-3 py-2 border-b border-border">
          <span className="font-semibold">Tracks</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <PlusCircle size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddNewTrack('audio')}>
                <div className="w-2 h-2 rounded-full bg-runway-teal mr-2" />
                Audio Track
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddNewTrack('video')}>
                <div className="w-2 h-2 rounded-full bg-runway-success mr-2" />
                Video Track
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddNewTrack('lighting')}>
                <div className="w-2 h-2 rounded-full bg-runway-highlight mr-2" />
                Lighting Track
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddNewTrack('stage')}>
                <div className="w-2 h-2 rounded-full bg-runway-warning mr-2" />
                Stage Track
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {tracks.map(track => (
        <div 
          key={track.id} 
          className="border-b border-border"
          id={track.id}
          onDragOver={onDragOver}
          onDrop={(e) => onCueDropOnTrack(e, track.id)}
        >
          <div 
            className={cn(
              "flex items-center px-3 py-2 hover:bg-muted cursor-pointer",
              track.expanded ? "bg-muted/50" : ""
            )}
          >
            <div 
              className="flex-1 flex items-center"
              onClick={() => onToggleTrackExpand(track.id)}
            >
              {track.expanded ? 
                <ChevronDown size={16} className="mr-2 text-muted-foreground" /> : 
                <ChevronRight size={16} className="mr-2 text-muted-foreground" />
              }
              <div
                className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  track.type === 'audio' && "bg-runway-teal",
                  track.type === 'video' && "bg-runway-success",
                  track.type === 'lighting' && "bg-runway-highlight",
                  track.type === 'stage' && "bg-runway-warning",
                )}
              />
              <span className={cn(
                "font-medium",
                track.muted && "text-muted-foreground line-through",
                track.locked && "text-muted-foreground"
              )}>
                {track.name}
              </span>
            </div>
            
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-6 w-6 p-0", track.muted && "text-destructive")}
                    onClick={() => onToggleTrackMute(track.id)}
                  >
                    <Zap size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{track.muted ? "Unmute" : "Mute"}</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-6 w-6 p-0", track.solo && "text-amber-400")}
                    onClick={() => onToggleTrackSolo(track.id)}
                  >
                    <Wand2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{track.solo ? "Unsolo" : "Solo"}</TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {track.expanded && (
            <div className="pl-8 pr-3 pb-2 space-y-1">
              {track.cues.map(cue => (
                <div
                  key={cue.id}
                  className={cn(
                    "rounded px-2 py-1 text-sm flex items-center cursor-pointer",
                    selectedCue === cue.id ? "bg-accent" : "hover:bg-muted",
                    cue.type === 'audio' && "text-runway-teal",
                    cue.type === 'video' && "text-runway-success",
                    cue.type === 'lighting' && "text-runway-highlight",
                    cue.type === 'stage' && "text-runway-warning"
                  )}
                  onClick={() => onCueClick(cue.id)}
                  draggable
                  onDragStart={(e) => onCueDragStart(e, cue.id, track.id)}
                  onDragEnd={onCueDragEnd}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    cue.type === 'audio' && "bg-runway-teal",
                    cue.type === 'video' && "bg-runway-success",
                    cue.type === 'lighting' && "bg-runway-highlight",
                    cue.type === 'stage' && "bg-runway-warning"
                  )} />
                  <span className="truncate">{cue.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{cue.time}</span>
                </div>
              ))}
              
              {track.cues.length === 0 && (
                <div className="text-xs text-muted-foreground py-2 text-center italic">
                  Drag cues here
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TrackList;
