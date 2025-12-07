import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Timeline, { TimelineCue } from './Timeline';
import TableView from './TableView';
import CuePanel from './CuePanel';
import AddEditCuePanel from './AddEditCuePanel';
import AISuggestPanel from './AISuggestPanel';
import ViewToggle from './ViewToggle';
import CollaborationIndicator from './CollaborationIndicator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Sparkles, Loader2 } from 'lucide-react';
import { useCues, useAISuggestions } from '@/hooks/useCues';
import { Cue, ViewMode, CueSuggestion } from '@/types/cue';

// Define a proper type for users that includes position
type CollaborationUser = {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastActive: Date;
  area: 'timeline' | 'cue-panel' | 'library';
  position?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
};

const mockUsers: CollaborationUser[] = [
  { 
    id: '1', 
    name: 'Alex', 
    initials: 'AL', 
    color: 'bg-blue-500',
    lastActive: new Date(),
    area: 'timeline',
    position: { x: 100, y: 100 },
  },
  { 
    id: '2', 
    name: 'Sam', 
    initials: 'SM', 
    color: 'bg-green-500',
    lastActive: new Date(),
    area: 'cue-panel',
    position: { x: 500, y: 200 },
  },
];

// Available tracks for cues
const availableTracks = ['Audio Main', 'Video Wall', 'Stage Lighting', 'Stage Direction'];

// Convert database Cue to TimelineCue for Timeline component
const cueToTimelineCue = (cue: Cue): TimelineCue => ({
  id: cue.id,
  name: cue.name,
  type: cue.type,
  time: cue.start_time,
  duration: cue.duration,
  position: cue.position,
  width: cue.width,
  notes: cue.notes || '',
  effects: cue.effects,
  autoFollow: cue.auto_follow,
  color: cue.color,
  track: cue.track
});

// Convert TimelineCue to database Cue format
const timelineCueToCue = (timelineCue: TimelineCue, orderIndex: number): Omit<Cue, 'id' | 'show_id' | 'created_at' | 'updated_at'> => ({
  name: timelineCue.name,
  type: timelineCue.type,
  track: timelineCue.track || 'Audio Main',
  start_time: timelineCue.time,
  duration: timelineCue.duration,
  position: timelineCue.position,
  width: timelineCue.width,
  color: timelineCue.color || 'bg-runway-teal',
  notes: timelineCue.notes || null,
  effects: timelineCue.effects || [],
  auto_follow: timelineCue.autoFollow || false,
  order_index: orderIndex
});

const Dashboard: React.FC = () => {
  const [showName] = useState('Summer Festival 2025');
  const [users, setUsers] = useState<CollaborationUser[]>(mockUsers);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [selectedCue, setSelectedCue] = useState<TimelineCue | null>(null);
  const [copiedCue, setCopiedCue] = useState<TimelineCue | null>(null);
  const [isAddEditPanelOpen, setIsAddEditPanelOpen] = useState(false);
  const [editingCue, setEditingCue] = useState<TimelineCue | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const { toast } = useToast();
  
  // Use database hooks
  const { cues, loading, addCue, updateCue, deleteCue, duplicateCue } = useCues();
  const { suggestions, loading: aiLoading, getSuggestions, setSuggestions } = useAISuggestions();

  // Convert database cues to timeline cues
  const timelineCues = cues.map(cueToTimelineCue);
  
  // Handle cue selection
  const handleCueSelect = (cueId: string | null, cue: TimelineCue | null) => {
    setSelectedCueId(cueId);
    setSelectedCue(cue);
  };
  
  // Handle cue update
  const handleCueUpdate = async (updatedCue: TimelineCue) => {
    const cueData = timelineCueToCue(updatedCue, cues.findIndex(c => c.id === updatedCue.id));
    await updateCue(updatedCue.id, cueData);
    
    if (selectedCue && selectedCue.id === updatedCue.id) {
      setSelectedCue(updatedCue);
    }
  };
  
  // Handle cue deletion
  const handleCueDelete = async (cueId: string) => {
    await deleteCue(cueId);
    setSelectedCueId(null);
    setSelectedCue(null);
  };
  
  // Handle cue duplication
  const handleCueDuplicate = async (cueId: string) => {
    await duplicateCue(cueId);
  };

  // Open add cue panel
  const handleAddCue = () => {
    setEditingCue(null);
    setIsAddEditPanelOpen(true);
  };

  // Open edit cue panel
  const handleEditCue = (cue?: TimelineCue) => {
    if (cue) {
      setEditingCue(cue);
      setIsAddEditPanelOpen(true);
    } else if (selectedCue) {
      setEditingCue(selectedCue);
      setIsAddEditPanelOpen(true);
    } else {
      toast({
        title: "No cue selected",
        description: "Please select a cue to edit",
        variant: "destructive",
      });
    }
  };

  // Handle save from add/edit panel
  const handleSaveCue = async (timelineCue: TimelineCue) => {
    const cueData = timelineCueToCue(timelineCue, cues.length);
    
    if (editingCue) {
      await updateCue(timelineCue.id, cueData);
      setSelectedCue(timelineCue);
    } else {
      await addCue(cueData);
    }
    setIsAddEditPanelOpen(false);
  };

  // Handle AI suggestion add
  const handleAddAISuggestion = async (suggestion: CueSuggestion) => {
    const newCue: Omit<Cue, 'id' | 'show_id' | 'created_at' | 'updated_at'> = {
      name: suggestion.name,
      type: suggestion.type,
      track: suggestion.type === 'audio' ? 'Audio Main' : 
             suggestion.type === 'video' ? 'Video Wall' :
             suggestion.type === 'lighting' ? 'Stage Lighting' : 'Stage Direction',
      start_time: '00:00:00',
      duration: suggestion.duration,
      position: cues.length * 100,
      width: 100,
      color: suggestion.type === 'audio' ? 'bg-runway-teal' :
             suggestion.type === 'video' ? 'bg-runway-success' :
             suggestion.type === 'lighting' ? 'bg-runway-highlight' : 'bg-runway-warning',
      notes: suggestion.notes,
      effects: [],
      auto_follow: false,
      order_index: cues.length
    };
    
    await addCue(newCue);
    setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
  };

  // Handle AI suggestions
  const handleGetAISuggestions = async (cueType?: string) => {
    await getSuggestions(showName, cues, cueType);
  };
  
  // Listen for custom events from the timeline and cue panel
  useEffect(() => {
    const handleEditCueEvent = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { cue } = e.detail;
        setEditingCue(cue);
        setIsAddEditPanelOpen(true);
      }
    };
    
    const handleDeleteCueEvent = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { cueId } = e.detail;
        handleCueDelete(cueId);
      }
    };
    
    const handleDuplicateCueEvent = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { cueId } = e.detail;
        handleCueDuplicate(cueId);
      }
    };
    
    document.addEventListener('timeline-edit-cue', handleEditCueEvent);
    document.addEventListener('timeline-delete-cue', handleDeleteCueEvent);
    document.addEventListener('timeline-duplicate-cue', handleDuplicateCueEvent);
    
    return () => {
      document.removeEventListener('timeline-edit-cue', handleEditCueEvent);
      document.removeEventListener('timeline-delete-cue', handleDeleteCueEvent);
      document.removeEventListener('timeline-duplicate-cue', handleDuplicateCueEvent);
    };
  }, []);
  
  // Handle keyboard shortcuts at the Dashboard level
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCue) return;
      
      if (e.key === "Delete" || e.key === "Backspace") {
        handleCueDelete(selectedCue.id);
      }
      
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCueDuplicate(selectedCue.id);
      }
      
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setCopiedCue({...selectedCue});
        toast({
          title: "Cue copied",
          description: `${selectedCue.name} copied to clipboard`,
        });
      }
      
      if (e.key === "v" && (e.ctrlKey || e.metaKey) && copiedCue) {
        e.preventDefault();
        const newCue = timelineCueToCue({
          ...copiedCue,
          id: `cue-${Date.now()}`,
          name: `${copiedCue.name} (Pasted)`,
          position: copiedCue.position + 20,
        }, cues.length);
        addCue(newCue);
      }

      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleAddCue();
      }

      if (e.key === "e" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleEditCue();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCue, copiedCue, cues.length]);
  
  // Simulate user movements
  useEffect(() => {
    const updateTargetPositions = () => {
      setUsers(prevUsers => {
        return prevUsers.map(user => {
          const currentPos = user.position || { x: 300, y: 150 };
          const maxMovement = 150;
          const deltaX = (Math.random() * maxMovement * 2) - maxMovement;
          const deltaY = (Math.random() * maxMovement * 2) - maxMovement;
          const newX = Math.max(50, Math.min(900, currentPos.x + deltaX));
          const newY = Math.max(50, Math.min(400, currentPos.y + deltaY));
          
          return {
            ...user,
            lastActive: new Date(),
            targetPosition: { x: newX, y: newY }
          };
        });
      });
    };
    
    updateTargetPositions();
    const targetUpdateInterval = setInterval(updateTargetPositions, 8000);
    
    let animationFrameId: number;
    
    const animateUsers = () => {
      setUsers(prevUsers => {
        return prevUsers.map(user => {
          if (!user.position || !user.targetPosition) return user;
          
          const newX = user.position.x + (user.targetPosition.x - user.position.x) * 0.03;
          const newY = user.position.y + (user.targetPosition.y - user.position.y) * 0.03;
          
          return {
            ...user,
            position: { x: newX, y: newY }
          };
        });
      });
      
      animationFrameId = requestAnimationFrame(animateUsers);
    };
    
    animationFrameId = requestAnimationFrame(animateUsers);
    
    return () => {
      clearInterval(targetUpdateInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar showName={showName} />
          
          <div className="flex flex-1 overflow-hidden relative">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={75} minSize={50} id="timeline-panel">
                <div className="h-full flex flex-col">
                  <div className="p-3 border-b border-border flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Button onClick={handleAddCue} size="sm">
                        <PlusCircle size={16} className="mr-1.5" /> Add Cue
                      </Button>
                      {selectedCue && (
                        <Button onClick={() => handleEditCue()} size="sm" variant="outline">
                          <Edit size={16} className="mr-1.5" /> Edit
                        </Button>
                      )}
                      <Button 
                        onClick={() => setIsAIPanelOpen(true)} 
                        size="sm" 
                        variant="outline"
                        className="bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20"
                      >
                        <Sparkles size={16} className="mr-1.5" /> AI Suggest
                      </Button>
                    </div>
                    <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                  </div>
                  
                  {viewMode === 'timeline' ? (
                    <Timeline 
                      className="flex-1" 
                      onCueSelect={handleCueSelect}
                      selectedCueId={selectedCueId}
                      onCueChange={handleCueUpdate}
                      selectedCue={selectedCue}
                      cues={timelineCues}
                    />
                  ) : (
                    <TableView
                      cues={cues}
                      selectedCueId={selectedCueId}
                      onCueSelect={(id, cue) => {
                        setSelectedCueId(id);
                        setSelectedCue(cue ? cueToTimelineCue(cue as unknown as Cue) : null);
                      }}
                      onCueUpdate={(cue) => {
                        updateCue(cue.id, cue);
                      }}
                      onCueDelete={handleCueDelete}
                      onCueDuplicate={handleCueDuplicate}
                      onEditCue={(cue) => handleEditCue(cueToTimelineCue(cue))}
                    />
                  )}
                </div>
              </ResizablePanel>
              
              {selectedCueId && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} id="cue-panel">
                    <CuePanel 
                      selectedCueId={selectedCueId}
                      selectedCue={selectedCue}
                      onCueUpdate={handleCueUpdate}
                      onCueDelete={handleCueDelete}
                      onCueDuplicate={handleCueDuplicate}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
            
            {/* Collaboration indicators */}
            {users.map(user => (
              <CollaborationIndicator
                key={user.id}
                user={user}
                position={user.position || { x: 200 + Math.random() * 600, y: 100 + Math.random() * 300 }}
              />
            ))}
          </div>
        </div>
        
        {/* Add/Edit Cue Panel */}
        <AddEditCuePanel 
          isOpen={isAddEditPanelOpen}
          onClose={() => setIsAddEditPanelOpen(false)}
          onSave={handleSaveCue}
          editingCue={editingCue}
          tracks={availableTracks}
        />

        {/* AI Suggest Panel */}
        <AISuggestPanel
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
          suggestions={suggestions}
          loading={aiLoading}
          onGetSuggestions={handleGetAISuggestions}
          onAddSuggestion={handleAddAISuggestion}
        />
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
