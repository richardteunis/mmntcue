import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Sparkles, Loader2, Trash2, CheckSquare, Pencil, Layers } from 'lucide-react';
import { useCues, useAISuggestions } from '@/hooks/useCues';
import { Cue, ViewMode, CueSuggestion } from '@/types/cue';

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
  const sidebarRef = useRef<{ openCreateModal: () => void } | null>(null);
  const { toast } = useToast();
  
  // Use database hooks with active show
  const { cues, loading, animatingCues, addCue, updateCue, deleteCue, duplicateCue, reorderCues, bulkUpdateCues, bulkDeleteCues, getNextStartTime } = useCues(activeShowId);
  const { suggestions, loading: aiLoading, getSuggestions, setSuggestions } = useAISuggestions();

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

  // Handle adding a new track
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
  
  // Handle cue selection
  const handleCueSelect = (cueId: string | null, cue: TimelineCue | null) => {
    setSelectedCueId(cueId);
    setSelectedCue(cue);
  };
  
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
        <Sidebar activeShowId={activeShowId} onShowSelect={handleShowSelect} onQuickAddCue={handleQuickAddCue} />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar 
            showName={showName || 'Home'} 
            showInfo={showInfo}
            onShare={activeShowId ? () => setIsShareOpen(true) : undefined}
          />
          
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
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={75} minSize={50} id="timeline-panel">
                <div className="h-full flex flex-col">
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
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedCueIds.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          <CheckSquare size={14} className="inline mr-1" />
                          {selectedCueIds.length} selected
                        </span>
                      )}
                      <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                    </div>
                  </div>
                  
                  {viewMode === 'timeline' ? (
                    <TimelineView 
                      className="flex-1" 
                      onCueSelect={handleCueSelect}
                      selectedCueId={selectedCueId}
                      onCueChange={handleCueUpdate}
                      cues={timelineCues}
                      tracks={tracks}
                      showCountdown={showCountdown}
                      animatingCues={animatingCues}
                      onCueDelete={handleCueDelete}
                      onCueDuplicate={handleCueDuplicate}
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
                    />
                  )}
                </div>
              </ResizablePanel>
              
              {selectedCueId && (
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
          onClose={() => setIsAddTrackOpen(false)}
          onAdd={handleAddTrack}
          existingTracks={tracks}
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
            onClose={() => setIsShareOpen(false)}
            showId={activeShowId}
            showName={showName}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
