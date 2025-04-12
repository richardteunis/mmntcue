import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Timeline, { TimelineCue } from './Timeline';
import CuePanel from './CuePanel';
import AddEditCuePanel from './AddEditCuePanel';
import CollaborationIndicator from './CollaborationIndicator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit } from 'lucide-react';

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
  { 
    id: '3',
    name: 'Taylor',
    initials: 'TL',
    color: 'bg-purple-500',
    lastActive: new Date(),
    area: 'timeline',
    position: { x: 300, y: 150 },
  }
];

// Available tracks for cues
const availableTracks = ['audio', 'video', 'lighting', 'stage', 'effects'];

// Initial demo cues
const initialCues: TimelineCue[] = [
  {
    id: 'cue-1',
    name: 'Intro Music',
    track: 'audio',
    time: '00:00:00',
    duration: '00:01:30',
    type: 'audio',
    color: 'bg-runway-blue',
    autoFollow: false,
    notes: 'Opening theme',
    effects: [],
    position: 0,
    width: 90
  },
  {
    id: 'cue-2',
    name: 'Spotlight On',
    track: 'lighting',
    time: '00:01:00',
    duration: '00:03:00',
    type: 'lighting',
    color: 'bg-runway-amber',
    autoFollow: true,
    notes: 'Center stage',
    effects: [],
    position: 60,
    width: 180
  }
];

const Dashboard: React.FC = () => {
  const [showName, setShowName] = useState('Summer Festival 2025');
  const [users, setUsers] = useState<CollaborationUser[]>(mockUsers);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [selectedCue, setSelectedCue] = useState<TimelineCue | null>(null);
  const [copiedCue, setCopiedCue] = useState<TimelineCue | null>(null);
  const [isAddEditPanelOpen, setIsAddEditPanelOpen] = useState(false);
  const [editingCue, setEditingCue] = useState<TimelineCue | null>(null);
  const [cues, setCues] = useState<TimelineCue[]>(initialCues);
  const { toast } = useToast();
  
  // Handle cue selection
  const handleCueSelect = (cueId: string | null, cue: TimelineCue | null) => {
    setSelectedCueId(cueId);
    setSelectedCue(cue);
  };
  
  // Handle cue update
  const handleCueUpdate = (updatedCue: TimelineCue) => {
    // Update the cue in the cues array
    setCues(prevCues => 
      prevCues.map(cue => cue.id === updatedCue.id ? updatedCue : cue)
    );
    
    // Update selected cue if it's the one being updated
    if (selectedCue && selectedCue.id === updatedCue.id) {
      setSelectedCue(updatedCue);
    }
    
    toast({
      title: "Cue updated",
      description: `${updatedCue.name} has been updated`,
    });
  };
  
  // Handle cue deletion
  const handleCueDelete = (cueId: string) => {
    setCues(prevCues => prevCues.filter(cue => cue.id !== cueId));
    setSelectedCueId(null);
    setSelectedCue(null);
    toast({
      title: "Cue deleted",
      description: `Cue has been removed from the timeline`,
      variant: "destructive",
    });
  };
  
  // Handle cue duplication
  const handleCueDuplicate = (cueId: string) => {
    const cueToDuplicate = cues.find(cue => cue.id === cueId);
    
    if (cueToDuplicate) {
      const newCue: TimelineCue = {
        ...cueToDuplicate,
        id: `cue-${Date.now()}`,
        name: `${cueToDuplicate.name} (Copy)`,
        position: cueToDuplicate.position + 20, // Offset slightly from original
      };
      
      setCues(prevCues => [...prevCues, newCue]);
      
      toast({
        title: "Cue duplicated",
        description: `A copy of ${cueToDuplicate.name} has been created`,
      });
    }
  };

  // Open add cue panel
  const handleAddCue = () => {
    setEditingCue(null);
    setIsAddEditPanelOpen(true);
  };

  // Open edit cue panel
  const handleEditCue = () => {
    if (selectedCue) {
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
  const handleSaveCue = (cue: TimelineCue) => {
    // If we're editing an existing cue
    if (editingCue) {
      setCues(prevCues => 
        prevCues.map(existingCue => existingCue.id === cue.id ? cue : existingCue)
      );
      setSelectedCue(cue);
      setIsAddEditPanelOpen(false);
      toast({
        title: "Cue updated",
        description: `${cue.name} has been updated`,
      });
    } else {
      // If we're adding a new cue
      setCues(prevCues => [...prevCues, cue]);
      setIsAddEditPanelOpen(false);
      toast({
        title: "Cue added",
        description: `${cue.name} has been added to the timeline`,
      });
    }
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
    
    const handleAddCueEvent = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { cue } = e.detail;
        setCues(prevCues => [...prevCues, cue]);
      }
    };
    
    const handleUpdateCueEvent = (e: Event) => {
      if (e instanceof CustomEvent) {
        const { cue } = e.detail;
        setCues(prevCues => 
          prevCues.map(existingCue => existingCue.id === cue.id ? cue : existingCue)
        );
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
    document.addEventListener('timeline-add-cue', handleAddCueEvent);
    document.addEventListener('timeline-update-cue', handleUpdateCueEvent);
    document.addEventListener('timeline-delete-cue', handleDeleteCueEvent);
    document.addEventListener('timeline-duplicate-cue', handleDuplicateCueEvent);
    
    return () => {
      document.removeEventListener('timeline-edit-cue', handleEditCueEvent);
      document.removeEventListener('timeline-add-cue', handleAddCueEvent);
      document.removeEventListener('timeline-update-cue', handleUpdateCueEvent);
      document.removeEventListener('timeline-delete-cue', handleDeleteCueEvent);
      document.removeEventListener('timeline-duplicate-cue', handleDuplicateCueEvent);
    };
  }, []);
  
  // Handle keyboard shortcuts at the Dashboard level to ensure they work globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global keyboard shortcuts (not dependent on selectedCue)
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        console.log("Undo shortcut detected");
        // This will be passed to the Timeline component via event
        document.dispatchEvent(new CustomEvent("timeline-undo"));
      }
      
      if (!selectedCue) return;
      
      // Shortcuts that require a selected cue
      if (e.key === "Delete" || e.key === "Backspace") {
        console.log("Delete shortcut detected");
        handleCueDelete(selectedCue.id);
      }
      
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        console.log("Duplicate shortcut detected");
        handleCueDuplicate(selectedCue.id);
      }
      
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        console.log("Copy shortcut detected");
        setCopiedCue({...selectedCue});
        toast({
          title: "Cue copied",
          description: `${selectedCue.name} copied to clipboard`,
        });
      }
      
      if (e.key === "v" && (e.ctrlKey || e.metaKey) && copiedCue) {
        e.preventDefault();
        console.log("Paste shortcut detected");
        const newCue: TimelineCue = {
          ...copiedCue,
          id: `cue-${Date.now()}`,
          name: `${copiedCue.name} (Copy)`,
          position: copiedCue.position + 20, // Offset slightly from original
        };
        setCues(prevCues => [...prevCues, newCue]);
        toast({
          title: "Cue pasted",
          description: `${newCue.name} added to timeline`,
        });
      }

      // Add cue shortcut (n key)
      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        console.log("Add cue shortcut detected");
        handleAddCue();
      }

      // Edit cue shortcut (e key)
      if (e.key === "e" && (e.ctrlKey || e.metaKey) && selectedCue) {
        e.preventDefault();
        console.log("Edit cue shortcut detected");
        handleEditCue();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCue, copiedCue]);
  
  // Simulate user movements with more realistic, smoother paths
  useEffect(() => {
    // Initial user join notification
    toast({
      title: "Users online",
      description: `${users.map(u => u.name).join(', ')} joined the project`,
    });
    
    // Function to generate new target positions - more reasonable movements
    const updateTargetPositions = () => {
      setUsers(prevUsers => {
        return prevUsers.map(user => {
          // Get the current position
          const currentPos = user.position || { x: 300, y: 150 };
          
          // Create smaller, more realistic movements (max 150px in any direction)
          const maxMovement = 150;
          const deltaX = (Math.random() * maxMovement * 2) - maxMovement;
          const deltaY = (Math.random() * maxMovement * 2) - maxMovement;
          
          // Stay within reasonable bounds of the screen
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
    
    // Set initial target positions
    updateTargetPositions();
    
    // Update target positions periodically, but less frequently
    const targetUpdateInterval = setInterval(updateTargetPositions, 8000);
    
    // Animate user movements smoothly using requestAnimationFrame
    let animationFrameId: number;
    
    const animateUsers = () => {
      setUsers(prevUsers => {
        return prevUsers.map(user => {
          if (!user.position || !user.targetPosition) return user;
          
          // Calculate the next position with smooth interpolation
          // Slower movement for more stability
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
    
    // Start the animation
    animationFrameId = requestAnimationFrame(animateUsers);
    
    // Simulate a new user joining after a delay
    const joinTimeout = setTimeout(() => {
      const newUser: CollaborationUser = { 
        id: '4', 
        name: 'Jordan', 
        initials: 'JD', 
        color: 'bg-amber-500',
        lastActive: new Date(),
        area: 'timeline',
        position: { x: 400, y: 200 },
        targetPosition: { x: 450, y: 250 }
      };
      
      setUsers(prev => [...prev, newUser]);
      
      toast({
        title: "User joined",
        description: `${newUser.name} joined the project`,
      });
    }, 12000);
    
    return () => {
      clearInterval(targetUpdateInterval);
      clearTimeout(joinTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
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
                  <div className="p-2 border-b border-border flex items-center gap-2">
                    <Button onClick={handleAddCue} size="sm">
                      <PlusCircle size={16} className="mr-1.5" /> Add Cue
                    </Button>
                    {selectedCue && (
                      <Button onClick={handleEditCue} size="sm" variant="outline">
                        <Edit size={16} className="mr-1.5" /> Edit Cue
                      </Button>
                    )}
                  </div>
                  <Timeline 
                    className="flex-1" 
                    onCueSelect={handleCueSelect}
                    selectedCueId={selectedCueId}
                    onCueChange={handleCueUpdate}
                    selectedCue={selectedCue}
                    cues={cues}
                  />
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
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
