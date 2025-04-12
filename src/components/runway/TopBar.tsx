
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Share2, Clock, Save, ChevronDown, Settings, LogOut, Info, Users, Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import { useToast } from '@/hooks/use-toast';

interface TopBarProps {
  showName: string;
}

interface User {
  id: number;
  name: string;
  color: string;
  email?: string;
  role?: string;
  lastActive?: string;
}

const mockUsers: User[] = [
  { id: 1, name: 'Alex', color: 'bg-blue-500', email: 'alex@example.com', role: 'Editor', lastActive: '2 mins ago' },
  { id: 2, name: 'Sam', color: 'bg-green-500', email: 'sam@example.com', role: 'Producer', lastActive: 'Just now' },
  { id: 3, name: 'Taylor', color: 'bg-purple-500', email: 'taylor@example.com', role: 'Viewer', lastActive: '10 mins ago' },
];

const mockNotifications = [
  { id: 1, text: 'Sam shared a new cue', time: '2 mins ago' },
  { id: 2, text: 'Alex made changes to the timeline', time: '15 mins ago' },
  { id: 3, text: 'Taylor added a comment', time: '1 hour ago' },
];

const TopBar: React.FC<TopBarProps> = ({ showName }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const { toast } = useToast();

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleShare = () => {
    // Simulate sharing the project
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        toast({
          title: "Link copied to clipboard",
          description: "You can now share this link with others",
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy link",
          description: "Please try again",
          variant: "destructive",
        });
      });
  };

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
            <HoverCard key={user.id}>
              <HoverCardTrigger asChild>
                <Avatar className={`h-8 w-8 border-2 border-background ${user.color} cursor-pointer hover:scale-110 transition-transform duration-200`}>
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </HoverCardTrigger>
              <HoverCardContent className="w-64">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Avatar className={`h-10 w-10 ${user.color}`}>
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{user.name}</h4>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Role:</span>
                      <span>{user.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last active:</span>
                      <span>{user.lastActive}</span>
                    </div>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 h-8 px-2">
                <Share2 size={16} className="mr-1" />
                Share
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="flex flex-col space-y-4">
                <h3 className="font-medium">Share this project</h3>
                <div className="flex flex-col space-y-2">
                  <div className="text-sm text-muted-foreground">
                    People with the link can view and edit this project
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={window.location.href} 
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    />
                    <Button size="sm" onClick={handleShare}>Copy</Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Project Members</h4>
                  <div className="flex flex-col gap-2">
                    {mockUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className={`h-7 w-7 ${user.color}`}>
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.name}</span>
                        </div>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <Users size={14} className="mr-1" />
                    Invite More
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <Separator orientation="vertical" className="h-8" />
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => toast({ title: "Current time", description: `${currentTime.toLocaleString()}` })}>
            <Clock size={18} />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-9 w-9 p-0 relative" 
                onClick={() => setHasUnreadNotifications(false)}>
                <Bell size={18} />
                {hasUnreadNotifications && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="flex flex-col space-y-2">
                <h3 className="font-medium">Notifications</h3>
                <Separator />
                {mockNotifications.length > 0 ? (
                  mockNotifications.map(notification => (
                    <div key={notification.id} className="py-2">
                      <div className="flex flex-col">
                        <p className="text-sm">{notification.text}</p>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                      <Separator className="mt-2" />
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-muted-foreground">
                    No new notifications
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full">
                  Mark all as read
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarFallback className="bg-runway-purple text-white">ME</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <Info className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Mail className="mr-2 h-4 w-4" />
                <span>Messages</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-500">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
