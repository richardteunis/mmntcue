
import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  Save,
  X,
  Trash2
} from "lucide-react";
import { TimelineTrack } from './Timeline';

interface TrackEditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (track: TimelineTrack) => void;
  editingTrack: TimelineTrack | null;
}

const trackColors = [
  { name: 'Teal', value: 'bg-runway-teal' },
  { name: 'Success', value: 'bg-runway-success' },
  { name: 'Highlight', value: 'bg-runway-highlight' },
  { name: 'Warning', value: 'bg-runway-warning' },
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Amber', value: 'bg-amber-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Red', value: 'bg-red-500' },
];

const TrackEditPanel: React.FC<TrackEditPanelProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTrack
}) => {
  const [trackName, setTrackName] = useState('');
  const [trackType, setTrackType] = useState<'audio' | 'video' | 'lighting' | 'stage'>('audio');
  const [trackColor, setTrackColor] = useState('bg-runway-teal');
  
  useEffect(() => {
    if (editingTrack) {
      setTrackName(editingTrack.name);
      setTrackType(editingTrack.type);
      setTrackColor(editingTrack.color || getDefaultColor(editingTrack.type));
    } else {
      setTrackName('New Track');
      setTrackType('audio');
      setTrackColor('bg-runway-teal');
    }
  }, [editingTrack, isOpen]);
  
  const getDefaultColor = (type: 'audio' | 'video' | 'lighting' | 'stage'): string => {
    switch (type) {
      case 'audio': return 'bg-runway-teal';
      case 'video': return 'bg-runway-success';
      case 'lighting': return 'bg-runway-highlight';
      case 'stage': return 'bg-runway-warning';
      default: return 'bg-runway-teal';
    }
  };
  
  const handleTypeChange = (value: 'audio' | 'video' | 'lighting' | 'stage') => {
    setTrackType(value);
    if (!trackColor || trackColor === getDefaultColor(trackType)) {
      setTrackColor(getDefaultColor(value));
    }
  };
  
  const handleSave = () => {
    const newTrack: TimelineTrack = {
      id: editingTrack?.id || `track-${Date.now()}`,
      name: trackName,
      type: trackType,
      cues: editingTrack?.cues || [],
      expanded: editingTrack?.expanded ?? true,
      muted: editingTrack?.muted ?? false,
      solo: editingTrack?.solo ?? false,
      locked: editingTrack?.locked ?? false,
      color: trackColor
    };
    
    onSave(newTrack);
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={isOpen => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>{editingTrack ? 'Edit Track' : 'Add New Track'}</SheetTitle>
          <SheetDescription>
            {editingTrack 
              ? 'Update the track properties below.' 
              : 'Create a new track for your timeline.'}
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 mt-6">
          <div>
            <Label htmlFor="track-name">Track Name</Label>
            <Input 
              id="track-name" 
              value={trackName} 
              onChange={e => setTrackName(e.target.value)} 
              className="mt-1"
              placeholder="Enter track name"
            />
          </div>
          
          <div>
            <Label htmlFor="track-type">Track Type</Label>
            <Select value={trackType} onValueChange={value => handleTypeChange(value as any)}>
              <SelectTrigger id="track-type" className="mt-1">
                <SelectValue placeholder="Select a track type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Track Color</Label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {trackColors.map(color => (
                <Tooltip key={color.value}>
                  <TooltipTrigger asChild>
                    <button
                      className={`h-8 w-8 rounded-full border-2 ${
                        trackColor === color.value 
                          ? 'border-white ring-2 ring-primary' 
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value.replace('bg-', '') }}
                      onClick={() => setTrackColor(color.value)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{color.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between pt-6">
            <Button onClick={onClose} variant="outline" className="gap-1">
              <X size={16} /> Cancel
            </Button>
            <Button onClick={handleSave} className="gap-1">
              <Save size={16} /> Save Track
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TrackEditPanel;
