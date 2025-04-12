
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Timeline, { TimelineCue } from './Timeline';
import CuePanel from './CuePanel';
import CollaborationIndicator from './CollaborationIndicator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Plus } from 'lucide-react';

// Define a proper type for users that includes position
type CollaborationUser = {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastActive: Date;
  area: 'timeline' | 'cue-panel' | 'library';
  position?: { x: number; y: number };
};

const mockUsers: CollaborationUser[] = [
  { 
    id: '1', 
    name: 'Alex', 
    initials: 'AL', 
    color: 'bg-blue-500',
    lastActive: new Date(),
    area: 'timeline',
  },
  { 
    id: '2', 
    name: 'Sam', 
    initials: 'SM', 
    color: 'bg-green-500',
    lastActive: new Date(),
    area: 'cue-panel',
  },
  { 
    id: '3',
    name: 'Taylor',
    initials: 'TL',
    color: 'bg-purple-500',
    lastActive: new Date(),
    area: 'timeline',
  }
];

const Dashboard: React.FC = () => {
  const [showName, setShowName] = useState('Summer Festival 2025');
  const [users, setUsers] = useState<CollaborationUser[]>(mockUsers);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Handle cue selection
  const handleCueSelect = (cueId: string | null) => {
    setSelectedCueId(cueId);
  };
  
  // Handle cue update
  const handleCueUpdate = (updatedCue: TimelineCue) => {
    // In a real app, this would update the cue in the timeline
    toast({
      title: "Cue updated",
      description: `${updatedCue.name} has been updated`,
    });
  };
  
  // Handle cue deletion
  const handleCueDelete = (cueId: string) => {
    // In a real app, this would remove the cue from the timeline
    setSelectedCueId(null);
    toast({
      title: "Cue deleted",
      description: `Cue has been removed from the timeline`,
      variant: "destructive",
    });
  };
  
  // Handle cue duplication
  const handleCueDuplicate = (cueId: string) => {
    // In a real app, this would duplicate the cue in the timeline
    toast({
      title: "Cue duplicated",
      description: `A copy of the cue has been created`,
    });
  };
  
  // Simulate user movement
  useEffect(() => {
    // Initial user join notification
    toast({
      title: "Users online",
      description: `${users.map(u => u.name).join(', ')} joined the project`,
    });
    
    const moveInterval = setInterval(() => {
      setUsers(prevUsers => {
        return prevUsers.map(user => {
          // Randomly update positions to simulate movement
          return {
            ...user,
            lastActive: new Date(),
            position: { 
              x: 100 + Math.random() * 800, 
              y: 100 + Math.random() * 300 
            }
          };
        });
      });
    }, 5000);
    
    // Simulate a new user joining after a delay
    const joinTimeout = setTimeout(() => {
      const newUser: CollaborationUser = { 
        id: '4', 
        name: 'Jordan', 
        initials: 'JD', 
        color: 'bg-amber-500',
        lastActive: new Date(),
        area: 'timeline',
        position: { x: 400, y: 200 }
      };
      
      setUsers(prev => [...prev, newUser]);
      
      toast({
        title: "User joined",
        description: `${newUser.name} joined the project`,
      });
    }, 12000);
    
    return () => {
      clearInterval(moveInterval);
      clearTimeout(joinTimeout);
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
              <ResizablePanel defaultSize={100} minSize={60}>
                <Timeline 
                  className="h-full" 
                  onCueSelect={handleCueSelect}
                />
              </ResizablePanel>
              
              {selectedCueId && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={40} minSize={20}>
                    <CuePanel 
                      selectedCueId={selectedCueId}
                      onCueUpdate={handleCueUpdate}
                      onCueDelete={handleCueDelete}
                      onCueDuplicate={handleCueDuplicate}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
            
            {/* Add cue hover card */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="absolute bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-3 shadow-lg cursor-pointer z-20">
                  <Plus size={24} />
                </div>
              </HoverCardTrigger>
              <HoverCardContent align="end" className="w-72">
                <div className="space-y-2">
                  <h4 className="font-medium">Create a new cue</h4>
                  <p className="text-sm text-muted-foreground">
                    Click the plus button, or hover over the timeline and click to add a cue at that position.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
            
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
