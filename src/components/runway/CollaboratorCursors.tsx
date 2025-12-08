import React from 'react';
import { cn } from '@/lib/utils';
import { PresenceUser } from '@/hooks/useRealtimePresence';

interface CollaboratorCursorsProps {
  users: PresenceUser[];
  containerRef: React.RefObject<HTMLElement>;
  currentArea: 'timeline' | 'table' | 'cue-panel' | 'sidebar';
}

// Map Tailwind bg colors to actual hex values for SVG
const colorToHex: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-amber-500': '#f59e0b',
  'bg-yellow-500': '#eab308',
  'bg-lime-500': '#84cc16',
  'bg-green-500': '#22c55e',
  'bg-emerald-500': '#10b981',
  'bg-teal-500': '#14b8a6',
  'bg-cyan-500': '#06b6d4',
  'bg-sky-500': '#0ea5e9',
  'bg-blue-500': '#3b82f6',
  'bg-indigo-500': '#6366f1',
  'bg-violet-500': '#8b5cf6',
  'bg-purple-500': '#a855f7',
  'bg-fuchsia-500': '#d946ef',
  'bg-pink-500': '#ec4899',
  'bg-rose-500': '#f43f5e',
};

const getHexColor = (bgClass: string): string => {
  return colorToHex[bgClass] || '#3b82f6';
};

const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({
  users,
  containerRef,
  currentArea
}) => {
  // Only show users with cursor positions AND in the same area
  const usersWithCursors = users.filter(
    user => user.cursor && user.area === currentArea
  );

  if (usersWithCursors.length === 0 || !containerRef.current) return null;

  return (
    <>
      {usersWithCursors.map((user) => {
        const hexColor = getHexColor(user.color);
        const firstName = (user.name || user.email).split(' ')[0].split('@')[0];
        
        return (
          <div
            key={user.id}
            className="pointer-events-none fixed z-[100]"
            style={{
              left: user.cursor!.x,
              top: user.cursor!.y,
              // No transition - instant updates for real-time feel
            }}
          >
            {/* Figma-style cursor */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M4 4L4 16L8.5 11.5L12.5 11.5L4 4Z"
                fill={hexColor}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            
            {/* Figma-style name tag */}
            <div
              className="absolute left-3 top-4 flex items-center"
              style={{
                backgroundColor: hexColor,
              }}
            >
              <span
                className="px-1.5 py-0.5 text-[11px] font-medium text-white whitespace-nowrap rounded-sm"
                style={{
                  backgroundColor: hexColor,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              >
                {firstName}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default CollaboratorCursors;
