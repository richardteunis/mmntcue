import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import HomeView from './HomeView';
import TimelineView, { TimelineCue } from './TimelineView';
import TableView from './TableView';
import Timeline from './Timeline';
import CuePanel from './CuePanel';
import AddEditCuePanel from './AddEditCuePanel';
import AISuggestPanel from './AISuggestPanel';
import BulkEditModal from './BulkEditModal';
import ConfirmDialog from './ConfirmDialog';
import ShareModal from './ShareModal';
import ViewToggle from './ViewToggle';
import AddTrackModal, { Track } from './AddTrackModal';
import CollaboratorCursors from './CollaboratorCursors';
import ViewPresenceIndicator from './ViewPresenceIndicator';
import PlaybackSettingsModal from './PlaybackSettingsModal';
import BottomControlSystem from './BottomControlSystem';
import PlanningDrawer from './PlanningDrawer';
import PlanningStatusChip from './PlanningStatusChip';
import NextCuePanel from './NextCuePanel';
import GoButton from './GoButton';
import ShowTimingBar from './ShowTimingBar';
import LiveModeControlBar from './LiveModeControlBar';
import IssueBar from './IssueBar';
import GoFeedback from './GoFeedback';
import PanicSafetyButton from './PanicSafetyButton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Sparkles, Loader2, Trash2, CheckSquare, Pencil, Layers, Settings, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCues, useAISuggestions } from '@/hooks/useCues';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { useCueAssets } from '@/hooks/useAssets';
import { usePlaybackState } from '@/hooks/usePlaybackState';
import { useShowState } from '@/hooks/useShowState';
import { useAuthContext } from '@/contexts/AuthContext';
import { Cue, ViewMode, CueSuggestion, Show } from '@/types/cue';
import { Asset, PlaybackSettings, DEFAULT_PLAYBACK_SETTINGS } from '@/types/asset';
import ShowFormModal from './ShowFormModal';
import { ShowMode } from './ShowOperationsBar';
import { cn } from '@/lib/utils';

// Default tracks
const DEFAULT_TRACKS: Track[] = [
  { id: 'audio', label: 'Audio', color: '#14B8A6' },
  { id: 'video', label: 'Video', color: '#22C55E' },
  { id: 'lighting', label: 'Lights', color: '#EAB308' },
  { id: 'stage', label: 'Stage', color: '#F97316' },
];

// Convert database Cue to TimelineCue for Timeline component
const cueToTimelineCue = (cue: Cue): TimelineCue => ({
  id: cue.id,
  name: cue.name,
  type: cue.type,
  time: cue.start_time,
  duration: cue.duration,
  position: cue.position,
  width: cue.width,
  notes: cue.notes || '',
  effects: cue.effects,
  autoFollow: cue.auto_follow,
  color: cue.color,
  track: cue.track
});

// Convert TimelineCue to database Cue format
const timelineCueToCue = (timelineCue: TimelineCue, orderIndex: number): Omit<Cue, 'id' | 'show_id' | 'created_at' | 'updated_at'> => ({
  name: timelineCue.name,
  type: timelineCue.type,
  track: timelineCue.track || 'Audio Main',
  start_time: timelineCue.time,
  duration: timelineCue.duration,
  position: timelineCue.position,
  width: timelineCue.width,
  color: timelineCue.color || 'bg-runway-teal',
  notes: timelineCue.notes || null,
  effects: timelineCue.effects || [],
  auto_follow: timelineCue.autoFollow || false,
  order_index: orderIndex
});

const Dashboard: React.FC = () => {
  const { showId: urlShowId } = useParams<{ showId?: string }>();
  const [activeShowId, setActiveShowId] = useState<string | null>(urlShowId || null);
  const [showName, setShowName] = useState<string>('');
  const [showInfo, setShowInfo] = useState<{ client?: string; eventDate?: string; showTime?: string }>({});
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [selectedCue, setSelectedCue] = useState<TimelineCue | null>(null);
  const [selectedCueIds, setSelectedCueIds] = useState<string[]>([]);
  const [copiedCue, setCopiedCue] = useState<TimelineCue | null>(null);
  const [isAddEditPanelOpen, setIsAddEditPanelOpen] = useState(false);
  const [editingCue, setEditingCue] = useState<TimelineCue | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCreateShowOpen, setIsCreateShowOpen] = useState(false);
  const [isEditShowOpen, setIsEditShowOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [permissionUserId, setPermissionUserId] = useState<string | null>(null);
  const [isPlaybackSettingsOpen, setIsPlaybackSettingsOpen] = useState(false);
  const [pendingAssetForCue, setPendingAssetForCue] = useState<{ asset: Asset; cueId: string } | null>(null);
  const sidebarRef = useRef<{ openCreateModal: () => void } | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, profile } = useAuthContext();
  
  // Use database hooks with active show
  const { cues, loading, animatingCues, addCue, updateCue, deleteCue, duplicateCue, reorderCues, bulkUpdateCues, bulkDeleteCues, getNextStartTime } = useCues(activeShowId);
  const { suggestions, loading: aiLoading, getSuggestions, setSuggestions } = useAISuggestions();
  
  // Shared playback state for both timeline and table views
  const playbackCues = useMemo(() => cues.map(c => ({ id: c.id, time: c.start_time, duration: c.duration })), [cues]);
  const playback = usePlaybackState(playbackCues);
  
  // Show state management (cue status, GO button, timing)
  const showState = useShowState(cues, playback.currentTimeSeconds);
  
  // Show mode state
  const [showMode, setShowMode] = useState<ShowMode>('planning');
  
  // Sidebar collapse state - auto-collapse in live mode
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [prevSidebarState, setPrevSidebarState] = useState(false);
  
  // GO feedback state
  const [showGoFeedback, setShowGoFeedback] = useState(false);
  const [lastFiredCueInfo, setLastFiredCueInfo] = useState<{ number: number; name: string } | null>(null);
  
  // Issue logging state
  const [issues, setIssues] = useState<Array<{
    id: string;
    type: 'timing' | 'audio' | 'lighting' | 'video' | 'stage';
    cueId?: string;
    cueName?: string;
    note?: string;
    timestamp: Date;
  }>>([]);
  
  // Auto-collapse sidebar when entering live mode
  useEffect(() => {
    if (showMode === 'live' && !sidebarCollapsed) {
      setPrevSidebarState(sidebarCollapsed);
      setSidebarCollapsed(true);
    } else if (showMode !== 'live' && prevSidebarState !== sidebarCollapsed) {
      // Restore previous state when leaving live mode
      setSidebarCollapsed(prevSidebarState);
    }
  }, [showMode]);
  
  // Realtime presence
  const presenceUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: profile?.full_name || user.email?.split('@')[0] || 'Anonymous',
      email: user.email || '',
      avatar_url: profile?.avatar_url || undefined,
    };
  }, [user, profile]);
  
  const { activeUsers, isConnected, updateCursor, updateArea, updateSelectedCue, updateViewport } = useRealtimePresence(
    activeShowId,
    presenceUser
  );
  
  // Ref for timeline scroll container
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);

  // Load show from URL parameter
  useEffect(() => {
    if (urlShowId && !showName) {
      // Fetch show details from database
      const fetchShowDetails = async () => {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase
          .from('shows')
          .select('name, event_name, event_start_date, show_time, custom_tracks')
          .eq('id', urlShowId)
          .maybeSingle();
        
        if (data) {
          setShowName(data.name);
          setActiveShowId(urlShowId);
          setShowInfo({
            client: data.event_name || undefined,
            eventDate: data.event_start_date || undefined,
            showTime: data.show_time || undefined,
          });
          if (data.custom_tracks && Array.isArray(data.custom_tracks)) {
            setTracks(data.custom_tracks as unknown as Track[]);
          }
        }
      };
      fetchShowDetails();
    }
  }, [urlShowId, showName]);

  // Handle show selection from sidebar
  const handleShowSelect = async (showId: string, name: string) => {
    setActiveShowId(showId);
    setShowName(name);
    setSelectedCueId(null);
    setSelectedCue(null);
    setSelectedCueIds([]);
    
    // Fetch additional show info
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('shows')
      .select('event_name, event_start_date, show_time, custom_tracks')
      .eq('id', showId)
      .maybeSingle();
    
    if (data) {
      setShowInfo({
        client: data.event_name || undefined,
        eventDate: data.event_start_date || undefined,
        showTime: data.show_time || undefined,
      });
      if (data.custom_tracks && Array.isArray(data.custom_tracks)) {
        setTracks(data.custom_tracks as unknown as Track[]);
      } else {
        setTracks(DEFAULT_TRACKS);
      }
    } else {
      setShowInfo({});
      setTracks(DEFAULT_TRACKS);
    }
  };

  // Handle going to home view
  const handleGoHome = () => {
    setActiveShowId(null);
    setShowName('');
    setShowInfo({});
    setTracks(DEFAULT_TRACKS);
    setSelectedCueId(null);
    setSelectedCue(null);
    setSelectedCueIds([]);
    setFollowingUserId(null);
  };

  const handleAddTrack = async (track: Track) => {
    const newTracks = [...tracks, track];
    setTracks(newTracks);
    
    // Save to database
    if (activeShowId) {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('shows')
        .update({ custom_tracks: JSON.parse(JSON.stringify(newTracks)) })
        .eq('id', activeShowId);
    }
    
    toast({
      title: 'Track added',
      description: `${track.label} track has been added`,
    });
  };

  // Calculate countdown to show start (with seconds)
  const showCountdown = useMemo(() => {
    if (!showInfo?.eventDate || !showInfo?.showTime) return null;
    
    try {
      const [year, month, day] = showInfo.eventDate.split('-').map(Number);
      const [hours, minutes] = showInfo.showTime.split(':').map(Number);
      const showStart = new Date(year, month - 1, day, hours, minutes);
      const now = new Date();
      const diff = showStart.getTime() - now.getTime();
      
      if (diff <= 0) return { text: 'LIVE', isLive: true };
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        return { text: `${days}d ${hrs}h ${mins}m ${secs}s`, isLive: false };
      } else if (hrs > 0) {
        return { text: `${hrs}h ${mins}m ${secs}s`, isLive: false };
      } else {
        return { text: `${mins}m ${secs}s`, isLive: false };
      }
    } catch {
      return null;
    }
  }, [showInfo?.eventDate, showInfo?.showTime]);

  // Convert database cues to timeline cues (already sorted by start_time from hook)
  const timelineCues = cues.map(cueToTimelineCue);
  
  // Handle cue selection - also updates the show state to track current position
  const handleCueSelect = useCallback((cueId: string | null, cue: TimelineCue | null) => {
    setSelectedCueId(cueId);
    setSelectedCue(cue);
    updateSelectedCue(cueId);
    if (cueId) {
      updateArea('cue-panel');
      // Update show state to track this as the current cue position
      showState.jumpToCue(cueId);
    }
  }, [updateSelectedCue, updateArea, showState.jumpToCue]);
  
  // Handle cue update
  const handleCueUpdate = async (updatedCue: TimelineCue) => {
    const cueData = timelineCueToCue(updatedCue, cues.findIndex(c => c.id === updatedCue.id));
    await updateCue(updatedCue.id, cueData);
    
    if (selectedCue && selectedCue.id === updatedCue.id) {
      setSelectedCue(updatedCue);
    }
  };
  
  // Handle cue deletion
  const handleCueDelete = async (cueId: string) => {
    await deleteCue(cueId);
    setSelectedCueId(null);
    setSelectedCue(null);
    setSelectedCueIds(prev => prev.filter(id => id !== cueId));
  };
  
  // Handle cue duplication
  const handleCueDuplicate = async (cueId: string) => {
    await duplicateCue(cueId);
  };

  // Handle cue reorder
  const handleCueReorder = async (cueId: string, targetIndex: number) => {
    await reorderCues(cueId, targetIndex);
  };

  // Handle bulk delete with confirmation
  const handleBulkDeleteConfirm = () => {
    if (selectedCueIds.length === 0) return;
    setIsConfirmDeleteOpen(true);
  };

  const handleBulkDeleteExecute = async () => {
    if (selectedCueIds.length === 0) return;
    await bulkDeleteCues(selectedCueIds);
    setSelectedCueIds([]);
    setSelectedCueId(null);
    setSelectedCue(null);
    setIsConfirmDeleteOpen(false);
  };

  // Handle bulk update
  const handleBulkUpdate = async (updates: Partial<Cue>) => {
    if (selectedCueIds.length === 0) return;
    await bulkUpdateCues(selectedCueIds, updates);
    setSelectedCueIds([]);
    setIsBulkEditOpen(false);
  };

  // Handle multi-select toggle
  const handleSelectCue = (cueId: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      setSelectedCueIds(prev => 
        prev.includes(cueId) 
          ? prev.filter(id => id !== cueId) 
          : [...prev, cueId]
      );
    } else {
      setSelectedCueIds([cueId]);
    }
  };

  // Open add cue panel with auto-calculated start time
  const handleAddCue = () => {
    setEditingCue(null);
    setIsAddEditPanelOpen(true);
  };

  // Open edit cue panel
  const handleEditCue = (cue?: TimelineCue) => {
    if (cue) {
      setEditingCue(cue);
      setIsAddEditPanelOpen(true);
    } else if (selectedCue) {
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
  const handleSaveCue = async (timelineCue: TimelineCue, useAutoStartTime: boolean = false) => {
    const cueData = timelineCueToCue(timelineCue, cues.length);
    
    if (editingCue) {
      await updateCue(timelineCue.id, cueData);
      setSelectedCue(timelineCue);
    } else {
      await addCue(cueData, useAutoStartTime);
    }
    setIsAddEditPanelOpen(false);
  };

  // Handle AI suggestion add
  const handleAddAISuggestion = async (suggestion: CueSuggestion) => {
    const nextStartTime = getNextStartTime();
    
    const newCue: Omit<Cue, 'id' | 'show_id' | 'created_at' | 'updated_at'> = {
      name: suggestion.name,
      type: suggestion.type,
      track: suggestion.type === 'audio' ? 'Audio Main' : 
             suggestion.type === 'video' ? 'Video Wall' :
             suggestion.type === 'lighting' ? 'Stage Lighting' : 'Stage Direction',
      start_time: nextStartTime,
      duration: suggestion.duration,
      position: cues.length * 100,
      width: 100,
      color: suggestion.type === 'audio' ? 'bg-runway-teal' :
             suggestion.type === 'video' ? 'bg-runway-success' :
             suggestion.type === 'lighting' ? 'bg-runway-highlight' : 'bg-runway-warning',
      notes: suggestion.notes,
      effects: [],
      auto_follow: false,
      order_index: cues.length
    };
    
    await addCue(newCue, false);
    setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
  };

  // Handle AI suggestions
  const handleGetAISuggestions = async (cueType?: string) => {
    await getSuggestions(showName, cues, cueType);
  };

  // Handle edit show
  const handleEditShow = async () => {
    if (!activeShowId) return;
    
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('shows')
      .select('*')
      .eq('id', activeShowId)
      .maybeSingle();
    
    if (data) {
      setEditingShow(data as Show);
      setIsEditShowOpen(true);
    }
  };

  // Handle save show
  const handleSaveShow = async (showData: Partial<Show>) => {
    if (!activeShowId) return;
    
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase
      .from('shows')
      .update(showData)
      .eq('id', activeShowId);
    
    if (error) {
      toast({
        title: 'Error saving show',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }
    
    // Update local state
    if (showData.name) setShowName(showData.name);
    setShowInfo({
      client: showData.event_name || showInfo.client,
      eventDate: showData.event_start_date || showInfo.eventDate,
      showTime: showData.show_time || showInfo.showTime,
    });
    if (showData.custom_tracks && Array.isArray(showData.custom_tracks)) {
      setTracks(showData.custom_tracks as unknown as Track[]);
    }
    
    setIsEditShowOpen(false);
    setEditingShow(null);
    
    toast({
      title: 'Show updated',
      description: 'Your changes have been saved'
    });
  };

  // Handle quick add cue from sidebar
  const handleQuickAddCue = async (type: 'audio' | 'video' | 'lighting' | 'stage') => {
    if (!activeShowId) {
      toast({
        title: 'No show selected',
        description: 'Please select or create a show first',
        variant: 'destructive'
      });
      return;
    }

    const trackMap = {
      audio: 'Audio Main',
      video: 'Video Wall',
      lighting: 'Stage Lighting',
      stage: 'Stage Direction'
    };

    const colorMap = {
      audio: 'bg-runway-teal',
      video: 'bg-runway-success',
      lighting: 'bg-runway-highlight',
      stage: 'bg-runway-warning'
    };

    const nextStartTime = getNextStartTime();
    const newCue: Omit<Cue, 'id' | 'show_id' | 'created_at' | 'updated_at'> = {
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Cue`,
      type,
      track: trackMap[type],
      start_time: nextStartTime,
      duration: '00:00:30',
      position: cues.length * 100,
      width: 100,
      color: colorMap[type],
      notes: null,
      effects: [],
      auto_follow: false,
      order_index: cues.length
    };

    await addCue(newCue, false);
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
    document.addEventListener('timeline-delete-cue', handleDeleteCueEvent);
    document.addEventListener('timeline-duplicate-cue', handleDuplicateCueEvent);
    
    return () => {
      document.removeEventListener('timeline-edit-cue', handleEditCueEvent);
      document.removeEventListener('timeline-delete-cue', handleDeleteCueEvent);
      document.removeEventListener('timeline-duplicate-cue', handleDuplicateCueEvent);
    };
  }, []);
  
  // Handle keyboard shortcuts at the Dashboard level
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleAddCue();
        return;
      }
      
      if (!selectedCue) return;
      
      if (e.key === "Delete" || e.key === "Backspace") {
        handleCueDelete(selectedCue.id);
      }
      
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCueDuplicate(selectedCue.id);
      }
      
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setCopiedCue({...selectedCue});
        toast({
          title: "Cue copied",
          description: `${selectedCue.name} copied to clipboard`,
        });
      }
      
      if (e.key === "v" && (e.ctrlKey || e.metaKey) && copiedCue) {
        e.preventDefault();
        const nextTime = getNextStartTime();
        const newCue = timelineCueToCue({
          ...copiedCue,
          id: `cue-${Date.now()}`,
          name: `${copiedCue.name} (Pasted)`,
          time: nextTime,
          position: copiedCue.position + 20,
        }, cues.length);
        addCue(newCue, false);
      }

      if (e.key === "e" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleEditCue();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCue, copiedCue, cues.length, getNextStartTime]);
  
  // Track cursor movement for presence - high frequency broadcasts
  useEffect(() => {
    if (!activeShowId || !mainContentRef.current) return;
    
    let animationFrameId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Only send if position actually changed significantly
      if (Math.abs(e.clientX - lastX) > 2 || Math.abs(e.clientY - lastY) > 2) {
        lastX = e.clientX;
        lastY = e.clientY;
        
        // Use requestAnimationFrame for smooth 60fps updates
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
          updateCursor(lastX, lastY);
        });
      }
    };
    
    const container = mainContentRef.current;
    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [activeShowId, updateCursor]);
  
  // Update area when view mode changes
  useEffect(() => {
    updateArea(viewMode === 'timeline' ? 'timeline' : 'table');
  }, [viewMode, updateArea]);
  
  // Follow mode: sync view with followed user (Figma-style)
  const followedUser = useMemo(() => {
    if (!followingUserId) return null;
    return activeUsers.find(u => u.id === followingUserId) || null;
  }, [followingUserId, activeUsers]);
  
  // Stop following if user left
  useEffect(() => {
    if (followingUserId && !followedUser) {
      setFollowingUserId(null);
      toast({
        title: 'User left',
        description: 'The user you were following has left the session',
      });
    }
  }, [followingUserId, followedUser, toast]);
  
  // Sync view mode with followed user
  useEffect(() => {
    if (!followedUser) return;
    
    const targetView = followedUser.area === 'table' ? 'table' : 'timeline';
    if (viewMode !== targetView && (followedUser.area === 'timeline' || followedUser.area === 'table')) {
      setViewMode(targetView);
    }
  }, [followedUser?.area]);
  
  // Sync selected cue with followed user
  useEffect(() => {
    if (!followedUser?.selectedCueId) return;
    if (followedUser.selectedCueId === selectedCueId) return;
    
    const cue = timelineCues.find(c => c.id === followedUser.selectedCueId);
    if (cue) {
      setSelectedCueId(cue.id);
      setSelectedCue(cue);
    }
  }, [followedUser?.selectedCueId, timelineCues]);
  
  // Sync viewport/scroll position with followed user (Figma-style)
  useEffect(() => {
    if (!followedUser?.viewport || !timelineScrollRef.current) return;
    
    const { scrollX, scrollY } = followedUser.viewport;
    
    // Smoothly scroll to the followed user's position
    timelineScrollRef.current.scrollTo({
      left: scrollX,
      top: scrollY,
      behavior: 'smooth',
    });
  }, [followedUser?.viewport?.scrollX, followedUser?.viewport?.scrollY]);
  
  // Broadcast our viewport when scrolling (for others following us)
  const handleViewportScroll = useCallback((scrollX: number, scrollY: number, zoom?: number) => {
    if (!followingUserId) {
      // Only broadcast if we're not following someone (to avoid feedback loops)
      updateViewport({ scrollX, scrollY, zoom });
    }
  }, [followingUserId, updateViewport]);

  // Handle asset dropped onto a cue
  const handleAssetDropOnCue = useCallback((asset: Asset, cueId: string) => {
    setPendingAssetForCue({ asset, cueId });
    setIsPlaybackSettingsOpen(true);
  }, []);

  // Handle asset dropped to create a new cue
  const handleAssetDropToCreate = useCallback(async (asset: Asset, trackId: string, startTime: number) => {
    if (!activeShowId) return;

    const trackMap: Record<string, string> = {
      audio: 'Audio Main',
      video: 'Video Wall',
      lighting: 'Stage Lighting',
      stage: 'Stage Direction'
    };

    const colorMap: Record<string, string> = {
      audio: 'bg-runway-teal',
      video: 'bg-runway-success',
      lighting: 'bg-runway-highlight',
      stage: 'bg-runway-warning'
    };

    // Convert seconds to time string
    const hours = Math.floor(startTime / 3600);
    const minutes = Math.floor((startTime % 3600) / 60);
    const seconds = Math.floor(startTime % 60);
    const startTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Determine duration from asset if available
    const durationSeconds = asset.duration || 30;
    const durHours = Math.floor(durationSeconds / 3600);
    const durMinutes = Math.floor((durationSeconds % 3600) / 60);
    const durSecs = Math.floor(durationSeconds % 60);
    const durationStr = `${durHours.toString().padStart(2, '0')}:${durMinutes.toString().padStart(2, '0')}:${durSecs.toString().padStart(2, '0')}`;

    const newCue: Omit<Cue, 'id' | 'show_id' | 'created_at' | 'updated_at'> = {
      name: asset.name,
      type: trackId,
      track: trackMap[trackId] || trackId,
      start_time: startTimeStr,
      duration: durationStr,
      position: cues.length * 100,
      width: 100,
      color: colorMap[trackId] || 'bg-muted',
      notes: null,
      effects: [],
      auto_follow: false,
      order_index: cues.length
    };

    const createdCue = await addCue(newCue, false);
    
    // Also attach the asset to the cue
    if (createdCue) {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('cue_assets').insert({
        cue_id: createdCue.id,
        asset_id: asset.id,
        volume: 1.0,
        playback_speed: 1.0,
        loop_enabled: false,
        fade_in_duration: 0,
        fade_out_duration: 0,
        trim_start: 0,
        trim_end: null,
        start_offset: 0,
        order_index: 0,
      });
      toast({ title: 'Cue created from asset', description: asset.name });
    }
  }, [activeShowId, cues.length, addCue, toast]);

  // Handle saving playback settings after asset drop
  const handleSaveAssetToCue = useCallback(async (settings: PlaybackSettings) => {
    if (!pendingAssetForCue) return;
    
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.from('cue_assets').insert({
      cue_id: pendingAssetForCue.cueId,
      asset_id: pendingAssetForCue.asset.id,
      ...settings,
      order_index: 0,
    });

    if (error) {
      toast({ title: 'Error adding asset to cue', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Asset added to cue', description: pendingAssetForCue.asset.name });
    }

    setPendingAssetForCue(null);
  }, [pendingAssetForCue, toast]);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Collapsible Sidebar */}
        <div className={cn(
          "transition-all duration-300 ease-in-out relative",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-auto"
        )}>
          <Sidebar activeShowId={activeShowId} onShowSelect={handleShowSelect} onQuickAddCue={handleQuickAddCue} onGoHome={handleGoHome} />
        </div>
        
        {/* Sidebar toggle button - visible when collapsed in live mode */}
        {sidebarCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-50 h-16 w-6 rounded-l-none bg-card border border-l-0 border-border hover:bg-muted"
            onClick={() => setSidebarCollapsed(false)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        
        <div ref={mainContentRef} className="flex flex-col flex-1 overflow-hidden relative">
          {/* Collaborator cursors - only show users in same view */}
          {activeShowId && activeUsers.length > 0 && (
            <CollaboratorCursors 
              users={activeUsers} 
              containerRef={mainContentRef} 
              currentArea={viewMode === 'timeline' ? 'timeline' : 'table'}
            />
          )}
          {/* Following indicator banner */}
          {followedUser && (
            <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <div className="relative">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Eye className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background animate-pulse" />
                </div>
                <span className="text-muted-foreground">Following</span>
                <span className="font-medium text-foreground">{followedUser.name}</span>
                <span className="text-xs text-muted-foreground">
                  • {followedUser.area === 'timeline' ? 'Timeline' : followedUser.area === 'table' ? 'Table' : 'Editing'}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-xs gap-1.5 hover:bg-primary/20"
                onClick={() => setFollowingUserId(null)}
              >
                <EyeOff className="h-3 w-3" />
                Stop following
              </Button>
            </div>
          )}
          
          <TopBar 
            showName={showName || 'Home'} 
            showInfo={showInfo}
            onShare={activeShowId ? () => setIsShareOpen(true) : undefined}
            activeUsers={activeUsers}
            isConnected={isConnected}
            followingUserId={followingUserId}
            onFollowUser={setFollowingUserId}
            onManagePermissions={(userId) => {
              setPermissionUserId(userId);
              setIsShareOpen(true);
            }}
          />
          
          {/* Show Timing Bar - visible when a show is active */}
          {activeShowId && (
            <ShowTimingBar
              currentTimeSeconds={playback.currentTimeSeconds}
              totalDuration={cues.reduce((total, cue) => {
                const parts = cue.start_time.split(':').map(Number);
                const durParts = cue.duration.split(':').map(Number);
                const endTime = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0) + 
                               (durParts[0] || 0) * 3600 + (durParts[1] || 0) * 60 + (durParts[2] || 0);
                return Math.max(total, endTime);
              }, 0)}
              showTiming={showState.showTiming}
              controlState={showState.controlState}
              mode={showMode}
              isPlaying={playback.isPlaying}
              onPlayPause={playback.togglePlay}
              onReset={playback.reset}
              onModeChange={setShowMode}
            />
          )}
          
          {!activeShowId ? (
            <HomeView 
              onCreateShow={() => {
                // Dispatch event to open create show modal in sidebar
                document.dispatchEvent(new CustomEvent('open-create-show-modal'));
              }}
              onSelectShow={handleShowSelect}
            />
          ) : (
          <div className="flex flex-1 overflow-hidden relative">
            {/* Next Cue Panel - Only visible in rehearsal and live modes */}
            {(showMode === 'rehearsal' || showMode === 'live') && (
              <NextCuePanel
                nextCue={showState.nextCue}
                nextCueIndex={showState.nextCueIndex}
                upcomingCues={showState.upcomingCues}
                controlState={showState.controlState}
                showTiming={{ overUnder: showState.showTiming.overUnder, status: showState.showTiming.status }}
                getCueStatus={showState.getCueStatus}
                mode={showMode}
                lastFiredCue={showState.lastFiredCue}
                lastFiredAt={showState.lastFiredAt}
                className={
                  showMode === 'live' 
                    ? "w-96 flex-shrink-0" 
                    : "w-72 flex-shrink-0"
                }
                // Pass GO button handlers for live and rehearsal modes
                onGo={showState.goToNext}
                onStandby={showState.standby}
                onHold={showState.hold}
                onResume={showState.resume}
                onRevert={showMode === 'live' ? () => {
                  // Revert to last fired cue
                  if (showState.lastFiredCue) {
                    showState.jumpToCue(showState.lastFiredCue.id);
                  }
                } : undefined}
              />
            )}
            
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={showMode === 'planning' ? 100 : 75} minSize={50} id="timeline-panel">
                <div className="h-full flex flex-col">
                  {/* Toolbar - Only show in planning/rehearsal modes, hidden in live */}
                  {showMode !== 'live' && (
                    <div className="p-3 border-b border-border flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Button onClick={handleAddCue} size="sm">
                          <PlusCircle size={16} className="mr-1.5" /> Add Cue
                        </Button>
                        <Button 
                          onClick={() => setIsAddTrackOpen(true)} 
                          size="sm" 
                          variant="outline"
                        >
                          <Layers size={16} className="mr-1.5" /> Add Track
                        </Button>
                        {selectedCue && (
                          <Button onClick={() => handleEditCue()} size="sm" variant="outline">
                            <Edit size={16} className="mr-1.5" /> Edit
                          </Button>
                        )}
                        {selectedCueIds.length > 1 && (
                          <>
                            <Button 
                              onClick={() => setIsBulkEditOpen(true)} 
                              size="sm" 
                              variant="outline"
                            >
                              <Pencil size={16} className="mr-1.5" /> Edit ({selectedCueIds.length})
                            </Button>
                            <Button 
                              onClick={handleBulkDeleteConfirm} 
                              size="sm" 
                              variant="destructive"
                            >
                              <Trash2 size={16} className="mr-1.5" /> Delete ({selectedCueIds.length})
                            </Button>
                          </>
                        )}
                        <Button 
                          onClick={() => setIsAIPanelOpen(true)} 
                          size="sm" 
                          variant="outline"
                          className="bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20"
                        >
                          <Sparkles size={16} className="mr-1.5" /> AI Suggest
                        </Button>
                        <Button 
                          onClick={handleEditShow} 
                          size="sm" 
                          variant="outline"
                        >
                          <Settings size={16} className="mr-1.5" /> Edit Show
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Planning Status Chip - Planning mode only */}
                        {showMode === 'planning' && (
                          <PlanningStatusChip
                            totalDuration={cues.reduce((total, cue) => {
                              const parts = cue.start_time.split(':').map(Number);
                              const durParts = cue.duration.split(':').map(Number);
                              const endTime = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0) + 
                                             (durParts[0] || 0) * 3600 + (durParts[1] || 0) * 60 + (durParts[2] || 0);
                              return Math.max(total, endTime);
                            }, 0)}
                            cueCount={cues.length}
                          />
                        )}
                        {selectedCueIds.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            <CheckSquare size={14} className="inline mr-1" />
                            {selectedCueIds.length} selected
                          </span>
                        )}
                        {/* Show users in other views */}
                        {activeUsers.length > 0 && (
                          <ViewPresenceIndicator 
                            users={activeUsers} 
                            currentArea={viewMode === 'timeline' ? 'timeline' : 'table'}
                            followingUserId={followingUserId}
                            onFollowUser={setFollowingUserId}
                            onManagePermissions={(userId) => {
                              setPermissionUserId(userId);
                              setIsShareOpen(true);
                            }}
                          />
                        )}
                        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                      </div>
                    </div>
                  )}

                  {/* Live mode: minimal toolbar with just view toggle */}
                  {showMode === 'live' && (
                    <div className="p-2 border-b border-border/50 flex items-center justify-end gap-2 bg-muted/30">
                      <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                    </div>
                  )}
                  
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {viewMode === 'timeline' ? (
                      <TimelineView 
                        className="flex-1" 
                        onCueSelect={handleCueSelect}
                        onCueMultiSelect={setSelectedCueIds}
                        selectedCueId={selectedCueId}
                        selectedCueIds={selectedCueIds}
                        onCueChange={handleCueUpdate}
                        cues={timelineCues}
                        tracks={tracks}
                        showCountdown={showCountdown}
                        animatingCues={animatingCues}
                        onCueDelete={handleCueDelete}
                        onCueDuplicate={handleCueDuplicate}
                        onViewportChange={handleViewportScroll}
                        scrollRef={timelineScrollRef}
                        onAssetDropOnCue={handleAssetDropOnCue}
                        onAssetDropToCreate={handleAssetDropToCreate}
                        onTrackEdit={(track) => { setEditingTrack(track); setIsAddTrackOpen(true); }}
                        getCueStatus={showState.getCueStatus}
                        nextCueId={showState.nextCue?.id}
                        playbackState={playback}
                      />
                    ) : (
                      <Timeline 
                        className="flex-1" 
                        onCueSelect={handleCueSelect}
                        selectedCueId={selectedCueId}
                        onCueChange={handleCueUpdate}
                        selectedCue={selectedCue}
                        cues={timelineCues}
                        showCountdown={showCountdown}
                        animatingCues={animatingCues}
                        onCueDelete={handleCueDelete}
                        onCueDuplicate={handleCueDuplicate}
                        onCueReorder={handleCueReorder}
                        selectedCueIds={selectedCueIds}
                        onSelectCue={handleSelectCue}
                        onBulkUpdate={handleBulkUpdate}
                        onViewportChange={handleViewportScroll}
                        scrollRef={timelineScrollRef}
                        onAssetDropOnCue={handleAssetDropOnCue}
                        onAssetDropToCreate={(asset) => handleAssetDropToCreate(asset, 'audio', 0)}
                        getCueStatus={showState.getCueStatus}
                        nextCueId={showState.nextCue?.id}
                        playbackState={playback}
                      />
                    )}
                    
                    {/* Planning Drawer - Only in planning mode */}
                    {showMode === 'planning' && (
                      <PlanningDrawer
                        showId={activeShowId}
                        isExpanded={true}
                      />
                    )}
                    
                    {/* Bottom Control System - Only in rehearsal mode */}
                    {showMode === 'rehearsal' && (
                      <BottomControlSystem
                        showId={activeShowId}
                        selectedCueId={selectedCueId}
                        selectedCueType={selectedCue?.type}
                        mode={showMode}
                        controlState={showState.controlState}
                        onAssetDragStart={(asset) => {
                          // Handle asset drag for dropping on cues
                        }}
                        onAddCue={async (type, name) => {
                          const nextStartTime = getNextStartTime();
                          const newCue = {
                            name,
                            type,
                            track: 'Stage Direction',
                            start_time: nextStartTime,
                            duration: '00:00:30',
                            position: cues.length * 100,
                            width: 100,
                            color: type === 'ops_note' ? 'bg-runway-warning' : 'bg-runway-teal',
                            notes: null,
                            effects: [],
                            auto_follow: false,
                            order_index: cues.length
                          };
                          await addCue(newCue, false);
                        }}
                        onStandby={showState.standby}
                        onHold={showState.hold}
                      />
                    )}
                  </div>
                </div>
              </ResizablePanel>
              
              {/* Cue detail panel - only show in planning/rehearsal for editing */}
              {selectedCueId && showMode !== 'live' && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} id="cue-panel">
                    <CuePanel 
                      selectedCueId={selectedCueId}
                      selectedCue={selectedCue}
                      onCueUpdate={handleCueUpdate}
                      onCueDelete={handleCueDelete}
                      onCueDuplicate={handleCueDuplicate}
                      onClose={() => {
                        setSelectedCueId(null);
                        setSelectedCue(null);
                      }}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
            
            {/* GO Button moved into NextCuePanel for both rehearsal and live modes */}
          </div>
          )}
        </div>
        
        {/* Add/Edit Cue Panel */}
        <AddEditCuePanel 
          isOpen={isAddEditPanelOpen}
          onClose={() => setIsAddEditPanelOpen(false)}
          onSave={handleSaveCue}
          editingCue={editingCue}
          tracks={tracks.map(t => t.label)}
          nextStartTime={getNextStartTime()}
        />

        {/* Add Track Modal */}
        <AddTrackModal
          isOpen={isAddTrackOpen}
          onClose={() => { setIsAddTrackOpen(false); setEditingTrack(null); }}
          onAdd={handleAddTrack}
          onUpdate={(track) => setTracks(prev => prev.map(t => t.id === track.id ? track : t))}
          onDelete={(trackId) => setTracks(prev => prev.filter(t => t.id !== trackId))}
          existingTracks={tracks}
          editingTrack={editingTrack}
        />

        {/* AI Suggest Panel */}
        <AISuggestPanel
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
          suggestions={suggestions}
          loading={aiLoading}
          onGetSuggestions={handleGetAISuggestions}
          onAddSuggestion={handleAddAISuggestion}
        />

        {/* Bulk Edit Modal */}
        <BulkEditModal
          isOpen={isBulkEditOpen}
          onClose={() => setIsBulkEditOpen(false)}
          selectedCount={selectedCueIds.length}
          onBulkUpdate={handleBulkUpdate}
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={handleBulkDeleteExecute}
          title={`Delete ${selectedCueIds.length} Cue${selectedCueIds.length > 1 ? 's' : ''}?`}
          description="This action cannot be undone. All selected cues will be permanently removed from the timeline."
          confirmText="Delete"
          variant="destructive"
        />

        {/* Share Modal */}
        {activeShowId && (
          <ShareModal
            isOpen={isShareOpen}
            onClose={() => {
              setIsShareOpen(false);
              setPermissionUserId(null);
            }}
            showId={activeShowId}
            showName={showName}
            activeUsers={activeUsers.map(u => ({
              id: u.id,
              name: u.name,
              email: u.email,
              avatar_url: u.avatar_url,
            }))}
            highlightUserId={permissionUserId}
          />
        )}

        {/* Edit Show Modal */}
        <ShowFormModal
          isOpen={isEditShowOpen}
          onClose={() => {
            setIsEditShowOpen(false);
            setEditingShow(null);
          }}
          onSave={handleSaveShow}
          editingShow={editingShow}
        />

        {/* Playback Settings Modal */}
        <PlaybackSettingsModal
          isOpen={isPlaybackSettingsOpen}
          onClose={() => {
            setIsPlaybackSettingsOpen(false);
            setPendingAssetForCue(null);
          }}
          onSave={handleSaveAssetToCue}
          asset={pendingAssetForCue?.asset || null}
        />
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
