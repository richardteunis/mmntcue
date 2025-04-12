
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Timeline from './Timeline';
import CuePanel from './CuePanel';
import CollaborationIndicator from './CollaborationIndicator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

const mockUsers = [
  { 
    id: '1', 
    name: 'Alex', 
    initials: 'AL', 
    color: 'bg-blue-500',
    lastActive: new Date(),
    area: 'timeline' as const,
  },
  { 
    id: '2', 
    name: 'Sam', 
    initials: 'SM', 
    color: 'bg-green-500',
    lastActive: new Date(),
    area: 'cue-panel' as const,
  },
  { 
    id: '3',
    name: 'Taylor',
    initials: 'TL',
    color: 'bg-purple-500',
    lastActive: new Date(),
    area: 'timeline' as const,
  }
];

const Dashboard: React.FC = () => {
  const [showName, setShowName] = useState('Summer Festival 2025');
  const [users, setUsers] = useState(mockUsers);
  const { toast } = useToast();
  
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
      const newUser = { 
        id: '4', 
        name: 'Jordan', 
        initials: 'JD', 
        color: 'bg-amber-500',
        lastActive: new Date(),
        area: 'timeline' as const,
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
            <Timeline className="flex-1" />
            <CuePanel />
            
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
