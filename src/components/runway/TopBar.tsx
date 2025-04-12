
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Share2, Clock, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface TopBarProps {
  showName: string;
}

const mockUsers = [
  { id: 1, name: 'Alex', color: 'bg-blue-500' },
  { id: 2, name: 'Sam', color: 'bg-green-500' },
  { id: 3, name: 'Taylor', color: 'bg-purple-500' },
];

const TopBar: React.FC<TopBarProps> = ({ showName }) => {
  return (
    <div className="h-16 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h2 className="font-semibold text-lg">{showName}</h2>
        <div className="flex items-center">
          <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
            <Save size={14} />
            Saved
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center -space-x-2">
          {mockUsers.map((user) => (
            <Avatar key={user.id} className={`h-8 w-8 border-2 border-background ${user.color}`}>
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ))}
          <Button variant="outline" size="sm" className="ml-2 h-8 px-2">
            <Share2 size={16} className="mr-1" />
            Share
          </Button>
        </div>
        
        <Separator orientation="vertical" className="h-8" />
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
            <Bell size={18} />
          </Button>
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
            <Clock size={18} />
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-runway-purple text-white">ME</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
