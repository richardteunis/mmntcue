import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Timeline, { TimelineCue } from './Timeline';
import CuePanel from './CuePanel';
import CollaborationIndicator from './CollaborationIndicator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

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

const Dashboard: React.FC = () => {
  const [showName, setShowName] = useState('Summer Festival 2025');
  const [users, setUsers] = useState<CollaborationUser[]>(mockUsers);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [selectedCue, setSelectedCue] = useState<TimelineCue | null>(null);
  const [copiedCue, setCopiedCue] = useState<TimelineCue | null>(null);
  const { toast } = useToast();
  
  // Handle cue selection
  const handleCueSelect = (cueId: string | null, cue: TimelineCue | null) => {
    setSelectedCueId(cueId);
    setSelectedCue(cue);
  };
  
  // Handle cue update
  const handleCueUpdate = (updatedCue: TimelineCue) => {
    // Updated cue gets passed back to Timeline component
    if (selectedCue) {
      setSelectedCue(updatedCue);
      toast({
        title: "Cue updated",
        description: `${updatedCue.name} has been updated`,
      });
    }
  };
  
  // Handle cue deletion
  const handleCueDelete = (cueId: string) => {
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
    toast({
      title: "Cue duplicated",
      description: `A copy of the cue has been created`,
    });
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global keyboard shortcuts (not dependent on selectedCue)
      if (e.key === "z" && e.ctrlKey) {
        // Handled by Timeline component
      }
      
      if (!selectedCue) return;
      
      // Shortcuts that require a selected cue
      if (e.key === "Delete" || e.key === "Backspace") {
        handleCueDelete(selectedCue.id);
      }
      
      if (e.key === "d" && e.ctrlKey) {
        e.preventDefault();
        handleCueDuplicate(selectedCue.id);
      }
      
      if (e.key === "c" && e.ctrlKey) {
        e.preventDefault();
        setCopiedCue({...selectedCue});
        toast({
          title: "Cue copied",
          description: `${selectedCue.name} copied to clipboard`,
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCue]);
  
  // Simulate smooth user movement with animation frames
  useEffect(() => {
    // Initial user join notification
    toast({
      title: "Users online",
      description: `${users.map(u => u.name).join(', ')} joined the project`,
    });
    
    // Function to generate new target positions
    const updateTargetPositions = () => {
      setUsers(prevUsers => {
        return prevUsers.map(user => {
          return {
            ...user,
            lastActive: new Date(),
            targetPosition: { 
              x: 100 + Math.random() * 800, 
              y: 100 + Math.random() * 300 
            }
          };
        });
      });
    };
    
    // Set initial target positions
    updateTargetPositions();
    
    // Update target positions periodically
    const targetUpdateInterval = setInterval(updateTargetPositions, 5000);
    
    // Animate user movements smoothly using requestAnimationFrame
    let animationFrameId: number;
    
    const animateUsers = () => {
      setUsers(prevUsers => {
        return prevUsers.map(user => {
          if (!user.position || !user.targetPosition) return user;
          
          // Calculate the next position with smooth interpolation
          const newX = user.position.x + (user.targetPosition.x - user.position.x) * 0.05;
          const newY = user.position.y + (user.targetPosition.y - user.position.y) * 0.05;
          
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
        targetPosition: { x: 400, y: 200 }
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
              <ResizablePanel defaultSize={75} minSize={50}>
                <Timeline 
                  className="h-full" 
                  onCueSelect={handleCueSelect}
                  selectedCueId={selectedCueId}
                  onCueChange={handleCueUpdate}
                  selectedCue={selectedCue}
                />
              </ResizablePanel>
              
              {selectedCueId && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20}>
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
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
