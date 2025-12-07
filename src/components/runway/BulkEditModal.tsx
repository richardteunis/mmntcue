import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Save } from 'lucide-react';
import { Cue } from '@/types/cue';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onBulkUpdate: (updates: Partial<Cue>) => void;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  onBulkUpdate,
}) => {
  const [updateType, setUpdateType] = useState(false);
  const [updateTrack, setUpdateTrack] = useState(false);
  const [updateDuration, setUpdateDuration] = useState(false);
  const [updateColor, setUpdateColor] = useState(false);

  const [type, setType] = useState<string>('audio');
  const [track, setTrack] = useState<string>('Audio Main');
  const [duration, setDuration] = useState<string>('00:00:30');
  const [color, setColor] = useState<string>('bg-runway-teal');

  const handleSubmit = () => {
    const updates: Partial<Cue> = {};

    if (updateType) updates.type = type as Cue['type'];
    if (updateTrack) updates.track = track;
    if (updateDuration) updates.duration = duration;
    if (updateColor) updates.color = color;

    if (Object.keys(updates).length > 0) {
      onBulkUpdate(updates);
    }
    onClose();
  };

  const handleReset = () => {
    setUpdateType(false);
    setUpdateTrack(false);
    setUpdateDuration(false);
    setUpdateColor(false);
    setType('audio');
    setTrack('Audio Main');
    setDuration('00:00:30');
    setColor('bg-runway-teal');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Bulk Edit {selectedCount} Cue{selectedCount > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Select which properties to update for all selected cues. Only checked properties will be changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Type */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="update-type"
              checked={updateType}
              onCheckedChange={(checked) => setUpdateType(checked as boolean)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-type" className="cursor-pointer">
                Type
              </Label>
              <Select value={type} onValueChange={setType} disabled={!updateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="lighting">Lighting</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Track */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="update-track"
              checked={updateTrack}
              onCheckedChange={(checked) => setUpdateTrack(checked as boolean)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-track" className="cursor-pointer">
                Track
              </Label>
              <Select value={track} onValueChange={setTrack} disabled={!updateTrack}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Audio Main">Audio Main</SelectItem>
                  <SelectItem value="Video Wall">Video Wall</SelectItem>
                  <SelectItem value="Stage Lighting">Stage Lighting</SelectItem>
                  <SelectItem value="Stage Direction">Stage Direction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="update-duration"
              checked={updateDuration}
              onCheckedChange={(checked) => setUpdateDuration(checked as boolean)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-duration" className="cursor-pointer">
                Duration
              </Label>
              <Input
                id="duration-input"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="00:00:30"
                disabled={!updateDuration}
              />
            </div>
          </div>

          {/* Color */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="update-color"
              checked={updateColor}
              onCheckedChange={(checked) => setUpdateColor(checked as boolean)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-color" className="cursor-pointer">
                Color
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  'bg-runway-teal',
                  'bg-runway-success',
                  'bg-runway-highlight',
                  'bg-runway-warning',
                  'bg-blue-500',
                  'bg-purple-500',
                  'bg-pink-500',
                  'bg-red-500',
                ].map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={!updateColor}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${c} ${
                      color === c ? 'border-foreground ring-2 ring-primary' : 'border-transparent'
                    } ${!updateColor ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!updateType && !updateTrack && !updateDuration && !updateColor}
          >
            <Save className="h-4 w-4 mr-2" />
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditModal;
