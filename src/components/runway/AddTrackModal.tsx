import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface Track {
  id: string;
  label: string;
  color: string;
}

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (track: Track) => void;
  onUpdate?: (track: Track) => void;
  onDelete?: (trackId: string) => void;
  existingTracks: Track[];
  editingTrack?: Track | null;
}

const PRESET_COLORS = [
  '#14B8A6', // teal
  '#22C55E', // green
  '#EAB308', // yellow
  '#F97316', // orange
  '#EF4444', // red
  '#EC4899', // pink
  '#8B5CF6', // purple
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#84CC16', // lime
];

const AddTrackModal: React.FC<AddTrackModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  existingTracks,
  editingTrack,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  const isEditMode = !!editingTrack;

  // Populate form when editing
  useEffect(() => {
    if (editingTrack) {
      setName(editingTrack.label);
      setColor(editingTrack.color);
    } else {
      setName('');
      setColor(PRESET_COLORS[0]);
    }
    setError('');
  }, [editingTrack, isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Track name is required');
      return;
    }

    if (isEditMode && editingTrack) {
      // When editing, keep the same ID
      onUpdate?.({ 
        id: editingTrack.id, 
        label: name.trim(), 
        color 
      });
    } else {
      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      if (existingTracks.some(t => t.id === id)) {
        setError('A track with this name already exists');
        return;
      }

      onAdd({ id, label: name.trim(), color });
    }
    
    setName('');
    setColor(PRESET_COLORS[0]);
    setError('');
    onClose();
  };

  const handleDelete = () => {
    if (editingTrack && onDelete) {
      onDelete(editingTrack.id);
      onClose();
    }
  };

  const handleClose = () => {
    setName('');
    setColor(PRESET_COLORS[0]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Track' : 'Add New Track'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="track-name">Track Name</Label>
            <Input
              id="track-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Pyro, SFX, Camera"
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label>Track Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    color === presetColor
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="custom-color" className="text-xs text-muted-foreground">
                Custom:
              </Label>
              <input
                id="custom-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <span className="text-xs text-muted-foreground font-mono">{color}</span>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div 
              className="h-12 rounded-md flex items-center px-3 border"
              style={{ backgroundColor: `${color}20`, borderColor: color }}
            >
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium">{name || 'Track Name'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {isEditMode && onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete Track
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {isEditMode ? 'Update Track' : 'Add Track'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTrackModal;
