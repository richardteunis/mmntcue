import React from 'react';
import { cn } from '@/lib/utils';
import { PresenceUser } from '@/hooks/useRealtimePresence';

interface CollaboratorCursorsProps {
  users: PresenceUser[];
  containerRef: React.RefObject<HTMLElement>;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({
  users,
  containerRef
}) => {
  // Only show users with cursor positions in the same area
  const usersWithCursors = users.filter(user => user.cursor);

  if (usersWithCursors.length === 0 || !containerRef.current) return null;

  return (
    <>
      {usersWithCursors.map((user) => (
        <div
          key={user.id}
          className="pointer-events-none fixed z-[100] transition-all duration-100 ease-out"
          style={{
            left: user.cursor!.x,
            top: user.cursor!.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor arrow */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className={cn("drop-shadow-md", user.color.replace('bg-', 'text-'))}
          >
            <path
              d="M5.65376 12.4561L5.65378 12.4561L12.0001 20.8001L12.0001 3.2001L5.65378 12.4561L5.65376 12.4561Z"
              fill="currentColor"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          
          {/* Name label */}
          <div
            className={cn(
              "absolute left-4 top-4 px-2 py-0.5 rounded-md text-[10px] font-medium text-white whitespace-nowrap shadow-lg",
              user.color
            )}
          >
            {user.name || getInitials(user.email)}
          </div>
        </div>
      ))}
    </>
  );
};

export default CollaboratorCursors;
