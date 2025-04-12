
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Timeline from './Timeline';
import CuePanel from './CuePanel';
import CollaborationIndicator from './CollaborationIndicator';
import { TooltipProvider } from '@/components/ui/tooltip';

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
];

const Dashboard: React.FC = () => {
  const [showName, setShowName] = useState('Summer Festival 2025');
  
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
            <CollaborationIndicator
              user={mockUsers[0]}
              position={{ x: 320, y: 150 }}
            />
            
            <CollaborationIndicator
              user={mockUsers[1]}
              position={{ x: 850, y: 220 }}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
