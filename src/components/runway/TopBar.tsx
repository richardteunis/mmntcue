
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Share2, Clock, Save, Settings, LogOut, Info, Users, Mail, Presentation, Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Breadcrumb from './Breadcrumb';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface TopBarProps {
  showName: string;
  onShowcallerMode?: () => void;
}

interface User {
  id: number;
  name: string;
  color: string;
  email?: string;
  role?: string;
  lastActive?: string;
  isTyping?: boolean;
}

const mockUsers: User[] = [
  { id: 1, name: 'Alex', color: 'bg-blue-500', email: 'alex@example.com', role: 'Editor', lastActive: '2 mins ago' },
  { id: 2, name: 'Sam', color: 'bg-green-500', email: 'sam@example.com', role: 'Producer', lastActive: 'Just now', isTyping: true },
  { id: 3, name: 'Taylor', color: 'bg-purple-500', email: 'taylor@example.com', role: 'Viewer', lastActive: '10 mins ago' },
];

const mockNotifications = [
  { id: 1, text: 'Sam shared a new cue', time: '2 mins ago', read: false },
  { id: 2, text: 'Alex made changes to the timeline', time: '15 mins ago', read: false },
  { id: 3, text: 'Taylor added a comment', time: '1 hour ago', read: true },
];

const TopBar: React.FC<TopBarProps> = ({ showName, onShowcallerMode }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const { toast } = useToast();

  // Update clock every second for more precision
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleShare = () => {
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
    <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
      {/* Left Section - Breadcrumb */}
      <div className="flex items-center gap-4">
        <Breadcrumb showName={showName} />
        
        {/* Save Status */}
        <Badge 
          variant="outline" 
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors",
            saveStatus === 'saved' && "text-runway-success border-runway-success/30",
            saveStatus === 'saving' && "text-runway-warning border-runway-warning/30",
            saveStatus === 'unsaved' && "text-muted-foreground border-muted"
          )}
        >
          {saveStatus === 'saved' && <Check size={12} />}
          {saveStatus === 'saving' && <Save size={12} className="animate-pulse" />}
          {saveStatus === 'saved' ? 'All changes saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
        </Badge>
      </div>
      
      {/* Center Section - Clock */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="font-mono text-sm px-3 py-1 cursor-default">
              <Clock size={14} className="mr-1.5 opacity-70" />
              {formatTime(currentTime)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</TooltipContent>
        </Tooltip>
      </div>
      
      {/* Right Section - Actions & Users */}
      <div className="flex items-center gap-3">
        {/* Showcaller Mode Button */}
        {onShowcallerMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={onShowcallerMode}
              >
                <Presentation size={14} />
                <span className="hidden md:inline">Showcaller</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open Showcaller Mode (Ctrl+Shift+S)</TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Collaborators */}
        <div className="flex items-center -space-x-2">
          {mockUsers.map((user) => (
            <HoverCard key={user.id} openDelay={200}>
              <HoverCardTrigger asChild>
                <div className="relative">
                  <Avatar 
                    className={cn(
                      "h-7 w-7 border-2 border-background cursor-pointer transition-transform hover:scale-110 hover:z-10",
                      user.color
                    )}
                  >
                    <AvatarFallback className="text-[10px] font-medium">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {user.isTyping && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-runway-success border-2 border-background flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    </span>
                  )}
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-56" align="end">
                <div className="flex gap-3">
                  <Avatar className={cn("h-10 w-10", user.color)}>
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{user.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{user.role}</Badge>
                      <span className="text-[10px] text-muted-foreground">{user.lastActive}</span>
                    </div>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 ml-2 text-xs">
                <Share2 size={12} className="mr-1" />
                Share
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="flex flex-col space-y-3">
                <h3 className="font-medium text-sm">Share this project</h3>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={window.location.href} 
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                  />
                  <Button size="sm" className="h-8" onClick={handleShare}>Copy</Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Members</h4>
                  <div className="flex flex-col gap-2">
                    {mockUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className={cn("h-6 w-6", user.color)}>
                            <AvatarFallback className="text-[10px]">{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{user.role}</Badge>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs mt-2">
                    <Users size={12} className="mr-1.5" />
                    Invite More
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Notifications & Profile */}
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 relative"
                onClick={() => setHasUnreadNotifications(false)}
              >
                <Bell size={16} />
                {hasUnreadNotifications && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Notifications</h3>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">Mark all read</Button>
                </div>
                <Separator />
                {mockNotifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={cn(
                      "py-2 px-2 rounded-md transition-colors",
                      !notification.read && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{notification.text}</p>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">ME</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-sm">
                <Info className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-sm">
                <Mail className="mr-2 h-4 w-4" />
                Messages
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-sm text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default TopBar;
