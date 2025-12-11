import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  Users,
  Palette,
  Settings,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Upload,
  Copy,
  Building2,
  Globe,
  Film,
  Music,
  Video,
  Lightbulb,
  Mic,
  Shield,
  Lock,
  Timer,
  Gauge,
  User,
  Loader2,
  X,
  ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Show, SHOW_TEMPLATES, TIMECODE_FORMATS, TIMEZONES } from '@/types/cue';
import { useShowIconUpload } from '@/hooks/useShowIconUpload';
import { WorkspaceWithRole } from '@/types/workspace';

interface ShowFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (show: Partial<Show>) => Promise<void>;
  onDuplicate?: (showId: string) => void;
  editingShow?: Show | null;
  isLoading?: boolean;
  activeWorkspace?: WorkspaceWithRole | null;
  workspaces?: WorkspaceWithRole[];
}

interface FormSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const FormSection: React.FC<FormSectionProps> = ({ title, icon, children, className }) => (
  <div className={cn("space-y-4", className)}>
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      {icon}
      <span>{title}</span>
    </div>
    <div className="space-y-4 pl-6">{children}</div>
  </div>
);

interface FormFieldProps {
  label: string;
  tooltip?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, tooltip, required, children, className }) => (
  <div className={cn("space-y-2", className)}>
    <div className="flex items-center gap-1.5">
      <Label className="text-sm text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px]">{tooltip}</TooltipContent>
        </Tooltip>
      )}
    </div>
    {children}
  </div>
);

const ShowFormModal: React.FC<ShowFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDuplicate,
  editingShow,
  isLoading = false,
  activeWorkspace,
  workspaces = []
}) => {
  const isEditMode = !!editingShow;
  
  // Form state
  const [formData, setFormData] = useState<Partial<Show>>({
    name: '',
    description: '',
    event_name: '',
    venue: '',
    room_name: '',
    event_start_date: '',
    event_end_date: '',
    call_time: '',
    doors_time: '',
    show_time: '',
    timezone: 'America/Los_Angeles',
    brand_color: '#6E59A5',
    secondary_color: '#38B2AC',
    apply_branding: true,
    timecode_format: '30fps',
    default_tracks: ['audio', 'video', 'lighting', 'stage'],
    autosave_interval: 30,
    show_template: 'general',
    rehearsal_mode: false,
    locked: false,
    audio_latency_offset: 0,
    video_latency_offset: 0,
    safety_mode: true,
    team_show_caller: '',
    team_technical_director: '',
    team_producer: '',
    team_stage_manager: '',
    team_lighting_lead: '',
    team_audio_lead: '',
    team_video_lead: '',
    workspace_id: activeWorkspace?.id || null,
  });
  
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const { uploadIcon, removeIcon, uploading: iconUploading } = useShowIconUpload();

  // Load editing show data
  useEffect(() => {
    if (editingShow) {
      setFormData({
        ...editingShow,
        event_start_date: editingShow.event_start_date || '',
        event_end_date: editingShow.event_end_date || '',
        call_time: editingShow.call_time || '',
        doors_time: editingShow.doors_time || '',
        show_time: editingShow.show_time || '',
      });
    } else {
      // Reset form for new show
      setFormData({
        name: '',
        description: '',
        event_name: '',
        venue: '',
        room_name: '',
        event_start_date: '',
        event_end_date: '',
        call_time: '',
        doors_time: '',
        show_time: '',
        timezone: 'America/Los_Angeles',
        brand_color: '#6E59A5',
        secondary_color: '#38B2AC',
        apply_branding: true,
        timecode_format: '30fps',
        default_tracks: ['audio', 'video', 'lighting', 'stage'],
        autosave_interval: 30,
        show_template: 'general',
        rehearsal_mode: false,
        locked: false,
        audio_latency_offset: 0,
        video_latency_offset: 0,
        safety_mode: true,
        team_show_caller: '',
        team_technical_director: '',
        team_producer: '',
        team_stage_manager: '',
        team_lighting_lead: '',
        team_audio_lead: '',
        team_video_lead: '',
        workspace_id: activeWorkspace?.id || null,
      });
    }
  }, [editingShow, isOpen, activeWorkspace]);

  const updateField = (field: keyof Show, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTrack = (track: string) => {
    const currentTracks = formData.default_tracks || [];
    if (currentTracks.includes(track)) {
      updateField('default_tracks', currentTracks.filter(t => t !== track));
    } else {
      updateField('default_tracks', [...currentTracks, track]);
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) return;
    
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const trackOptions = [
    { id: 'audio', label: 'Audio', icon: Music, color: 'text-runway-teal' },
    { id: 'video', label: 'Video', icon: Video, color: 'text-runway-success' },
    { id: 'lighting', label: 'Lighting', icon: Lightbulb, color: 'text-runway-highlight' },
    { id: 'stage', label: 'Stage', icon: Mic, color: 'text-runway-warning' },
  ];

  const teamRoles = [
    { field: 'team_show_caller' as keyof Show, label: 'Show Caller', icon: User },
    { field: 'team_technical_director' as keyof Show, label: 'Technical Director', icon: Settings },
    { field: 'team_producer' as keyof Show, label: 'Producer', icon: Film },
    { field: 'team_stage_manager' as keyof Show, label: 'Stage Manager', icon: Users },
    { field: 'team_lighting_lead' as keyof Show, label: 'Lighting Lead', icon: Lightbulb },
    { field: 'team_audio_lead' as keyof Show, label: 'Audio Lead', icon: Music },
    { field: 'team_video_lead' as keyof Show, label: 'Video Lead', icon: Video },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-card">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {isEditMode ? 'Edit Show' : 'Create New Show'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditMode 
              ? 'Update show details, team assignments, and settings.'
              : 'Set up your show with event details, branding, and team assignments.'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          <div className="px-6 py-6 space-y-8">
            
            {/* Ownership Section - only for new shows or when workspaces exist */}
            {!isEditMode && workspaces.length > 0 && (
              <>
                <FormSection title="Ownership" icon={<Building2 className="h-4 w-4 text-primary" />}>
                  <FormField label="Create in" tooltip="Choose whether this is a personal show or belongs to a workspace">
                    <Select
                      value={formData.workspace_id || 'personal'}
                      onValueChange={(value) => updateField('workspace_id', value === 'personal' ? null : value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Personal (My Shows)</span>
                          </div>
                        </SelectItem>
                        {workspaces.map(ws => (
                          <SelectItem key={ws.id} value={ws.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{ws.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </FormSection>
                <Separator />
              </>
            )}

            {/* Basic Info Section */}
            <FormSection title="Basic Information" icon={<FileText className="h-4 w-4 text-primary" />}>
              <FormField label="Show Name" required>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., 2026 Leadership Summit – General Session 1"
                  className="h-10"
                />
              </FormField>
              
              <FormField label="Description" tooltip="A brief description of this show for your team's reference">
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe the purpose, theme, or key elements of this show..."
                  rows={3}
                  className="resize-none"
                />
              </FormField>

              <FormField label="Show Template" tooltip="Pre-configured settings based on event type">
                <Select
                  value={formData.show_template || 'general'}
                  onValueChange={(value) => updateField('show_template', value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOW_TEMPLATES.map(template => (
                      <SelectItem key={template.value} value={template.value}>
                        <div className="flex flex-col">
                          <span>{template.label}</span>
                          <span className="text-xs text-muted-foreground">{template.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>

            <Separator />

            {/* Event Details Section */}
            <FormSection title="Event Details" icon={<Calendar className="h-4 w-4 text-primary" />}>
              <FormField label="Event / Conference Name">
                <Input
                  value={formData.event_name || ''}
                  onChange={(e) => updateField('event_name', e.target.value)}
                  placeholder="e.g., TechCon 2026"
                  className="h-10"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Venue">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.venue || ''}
                      onChange={(e) => updateField('venue', e.target.value)}
                      placeholder="e.g., Moscone West, San Francisco"
                      className="h-10 pl-9"
                    />
                  </div>
                </FormField>
                <FormField label="Room Name">
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.room_name || ''}
                      onChange={(e) => updateField('room_name', e.target.value)}
                      placeholder="e.g., Hall A"
                      className="h-10 pl-9"
                    />
                  </div>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Event Start Date">
                  <Input
                    type="date"
                    value={formData.event_start_date || ''}
                    onChange={(e) => updateField('event_start_date', e.target.value)}
                    className="h-10"
                  />
                </FormField>
                <FormField label="Event End Date">
                  <Input
                    type="date"
                    value={formData.event_end_date || ''}
                    onChange={(e) => updateField('event_end_date', e.target.value)}
                    className="h-10"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Call Time" tooltip="When crew should arrive">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={formData.call_time || ''}
                      onChange={(e) => updateField('call_time', e.target.value)}
                      className="h-10 pl-9"
                    />
                  </div>
                </FormField>
                <FormField label="Doors Time" tooltip="When audience is admitted">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={formData.doors_time || ''}
                      onChange={(e) => updateField('doors_time', e.target.value)}
                      className="h-10 pl-9"
                    />
                  </div>
                </FormField>
                <FormField label="Show Time" tooltip="When the show begins">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={formData.show_time || ''}
                      onChange={(e) => updateField('show_time', e.target.value)}
                      className="h-10 pl-9"
                    />
                  </div>
                </FormField>
              </div>

              <FormField label="Timezone">
                <Select
                  value={formData.timezone || 'America/Los_Angeles'}
                  onValueChange={(value) => updateField('timezone', value)}
                >
                  <SelectTrigger className="h-10">
                    <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>

            <Separator />

            {/* Team & Roles Section */}
            <FormSection title="Team & Roles" icon={<Users className="h-4 w-4 text-primary" />}>
              <p className="text-xs text-muted-foreground -mt-2 mb-2">
                Assign team members to key production roles for this show.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {teamRoles.map(({ field, label, icon: Icon }) => (
                  <FormField key={field} label={label}>
                    <div className="relative">
                      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={(formData[field] as string) || ''}
                        onChange={(e) => updateField(field, e.target.value)}
                        placeholder={`Enter ${label.toLowerCase()} name`}
                        className="h-10 pl-9"
                      />
                    </div>
                  </FormField>
                ))}
              </div>
            </FormSection>

            <Separator />

            {/* Branding Section */}
            <FormSection title="Branding" icon={<Palette className="h-4 w-4 text-primary" />}>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Brand Color (Primary)" tooltip="Main color used for UI accents">
                  <div className="flex gap-2">
                    <div 
                      className="w-10 h-10 rounded-md border border-border shrink-0"
                      style={{ backgroundColor: formData.brand_color || '#6E59A5' }}
                    />
                    <Input
                      type="color"
                      value={formData.brand_color || '#6E59A5'}
                      onChange={(e) => updateField('brand_color', e.target.value)}
                      className="h-10 w-full cursor-pointer"
                    />
                  </div>
                </FormField>
                <FormField label="Secondary Color" tooltip="Accent color for secondary elements">
                  <div className="flex gap-2">
                    <div 
                      className="w-10 h-10 rounded-md border border-border shrink-0"
                      style={{ backgroundColor: formData.secondary_color || '#38B2AC' }}
                    />
                    <Input
                      type="color"
                      value={formData.secondary_color || '#38B2AC'}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      className="h-10 w-full cursor-pointer"
                    />
                  </div>
                </FormField>
              </div>

              <FormField label="Show Icon / Logo" tooltip="Upload an SVG or image file to use as the show icon">
                <input
                  ref={iconInputRef}
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp,.gif,image/svg+xml,image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && editingShow?.id) {
                      const url = await uploadIcon(file, editingShow.id);
                      if (url) {
                        updateField('logo_url', url);
                      }
                    } else if (file && !editingShow) {
                      // For new shows, store the file temporarily and show preview
                      const previewUrl = URL.createObjectURL(file);
                      updateField('logo_url', previewUrl);
                      // Store the file for later upload
                      (window as any).__pendingShowIconFile = file;
                    }
                    e.target.value = '';
                  }}
                />
                {formData.logo_url ? (
                  <div className="flex items-center gap-4 p-3 border border-border rounded-lg bg-muted/30">
                    <div className="w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
                      <img 
                        src={formData.logo_url} 
                        alt="Show icon" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Show Icon</p>
                      <p className="text-xs text-muted-foreground">Click to change or remove</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => iconInputRef.current?.click()}
                        disabled={iconUploading}
                      >
                        {iconUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (editingShow?.id) {
                            const success = await removeIcon(editingShow.id);
                            if (success) {
                              updateField('logo_url', null);
                            }
                          } else {
                            updateField('logo_url', null);
                            (window as any).__pendingShowIconFile = null;
                          }
                        }}
                        disabled={iconUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => iconInputRef.current?.click()}
                  >
                    {iconUploading ? (
                      <Loader2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground animate-spin" />
                    ) : (
                      <ImageIcon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    )}
                    <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground/70">SVG, PNG, JPG, WebP, GIF up to 2MB</p>
                  </div>
                )}
              </FormField>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Apply Branding to Timeline</p>
                    <p className="text-xs text-muted-foreground">Use brand colors for tracks and cues</p>
                  </div>
                </div>
                <Switch
                  checked={formData.apply_branding ?? true}
                  onCheckedChange={(checked) => updateField('apply_branding', checked)}
                />
              </div>
            </FormSection>

            <Separator />

            {/* Show Settings Section */}
            <FormSection title="Show Settings" icon={<Settings className="h-4 w-4 text-primary" />}>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Timecode Format" tooltip="Frame rate for timecode display">
                  <Select
                    value={formData.timecode_format || '30fps'}
                    onValueChange={(value) => updateField('timecode_format', value)}
                  >
                    <SelectTrigger className="h-10">
                      <Film className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMECODE_FORMATS.map(fmt => (
                        <SelectItem key={fmt.value} value={fmt.value}>{fmt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Autosave Interval" tooltip="How often to save changes automatically">
                  <Select
                    value={String(formData.autosave_interval || 30)}
                    onValueChange={(value) => updateField('autosave_interval', parseInt(value))}
                  >
                    <SelectTrigger className="h-10">
                      <Timer className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Every 10 seconds</SelectItem>
                      <SelectItem value="30">Every 30 seconds</SelectItem>
                      <SelectItem value="60">Every minute</SelectItem>
                      <SelectItem value="300">Every 5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <FormField label="Default Track Types" tooltip="Tracks to include when creating new shows">
                <div className="flex flex-wrap gap-2">
                  {trackOptions.map(track => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => toggleTrack(track.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                        formData.default_tracks?.includes(track.id)
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <track.icon className={cn("h-4 w-4", track.color)} />
                      <span className="text-sm">{track.label}</span>
                    </button>
                  ))}
                </div>
              </FormField>
            </FormSection>

            <Separator />

            {/* Advanced Options */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 px-0 hover:bg-transparent">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Shield className="h-4 w-4 text-primary" />
                    Advanced Options
                  </div>
                  {advancedOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Rehearsal Mode</p>
                        <p className="text-xs text-muted-foreground">Separate annotations for practice</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.rehearsal_mode ?? false}
                      onCheckedChange={(checked) => updateField('rehearsal_mode', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Safety Mode</p>
                        <p className="text-xs text-muted-foreground">2-step GO confirmation</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.safety_mode ?? true}
                      onCheckedChange={(checked) => updateField('safety_mode', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Lock Show</p>
                        <p className="text-xs text-muted-foreground">Prevent edits (admin only)</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.locked ?? false}
                      onCheckedChange={(checked) => updateField('locked', checked)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pl-6">
                  <FormField label="Audio Latency Offset (ms)" tooltip="Compensate for audio delay">
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={formData.audio_latency_offset || 0}
                        onChange={(e) => updateField('audio_latency_offset', parseInt(e.target.value) || 0)}
                        className="h-10 pl-9"
                      />
                    </div>
                  </FormField>
                  <FormField label="Video Latency Offset (ms)" tooltip="Compensate for video delay">
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={formData.video_latency_offset || 0}
                        onChange={(e) => updateField('video_latency_offset', parseInt(e.target.value) || 0)}
                        className="h-10 pl-9"
                      />
                    </div>
                  </FormField>
                </div>
              </CollapsibleContent>
            </Collapsible>

          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border bg-card gap-2">
          {isEditMode && onDuplicate && editingShow && (
            <Button 
              variant="ghost" 
              onClick={() => onDuplicate(editingShow.id)}
              className="mr-auto"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Show
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.name?.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isEditMode ? 'Save Changes' : 'Create Show'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShowFormModal;
