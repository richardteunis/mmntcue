import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  ROSSyncSource, 
  ROSItem, 
  ChangeOperation,
  ColumnMapping 
} from '@/types/ros';

// Extract Google Sheets ID from various URL formats
function extractGoogleSheetsId(url: string): string | null {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Default sync interval: 5 minutes
const DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000;

export function useROSSync(showId: string | null) {
  const { toast } = useToast();
  const [syncSources, setSyncSources] = useState<ROSSyncSource[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeOperation[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<{
    added: number;
    removed: number;
    modified: number;
  } | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(DEFAULT_SYNC_INTERVAL);
  const [lastAutoSync, setLastAutoSync] = useState<Date | null>(null);
  const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch sync sources for the show
  const fetchSyncSources = useCallback(async () => {
    if (!showId) return;

    const { data, error } = await supabase
      .from('ros_sync_sources')
      .select('*')
      .eq('show_id', showId);

    if (error) {
      console.error('Error fetching sync sources:', error);
      return;
    }

    setSyncSources(data as unknown as ROSSyncSource[]);
  }, [showId]);

  // Add a new sync source
  const addSyncSource = useCallback(async (
    sourceType: ROSSyncSource['source_type'],
    sourceUrl: string,
    sourceName?: string
  ): Promise<ROSSyncSource | null> => {
    if (!showId) return null;

    try {
      // Validate the URL based on type
      if (sourceType === 'google_sheet') {
        const sheetId = extractGoogleSheetsId(sourceUrl);
        if (!sheetId) {
          toast({
            title: 'Invalid URL',
            description: 'Could not parse Google Sheets URL. Make sure the sheet is publicly accessible.',
            variant: 'destructive'
          });
          return null;
        }
      }

      const { data, error } = await supabase
        .from('ros_sync_sources')
        .insert({
          show_id: showId,
          source_type: sourceType,
          source_url: sourceUrl,
          source_name: sourceName || `${sourceType} source`
        })
        .select()
        .single();

      if (error) throw error;

      const newSource = data as unknown as ROSSyncSource;
      setSyncSources(prev => [...prev, newSource]);

      toast({
        title: 'Sync source added',
        description: `Connected to ${sourceName || sourceType}`
      });

      return newSource;
    } catch (error) {
      console.error('Error adding sync source:', error);
      toast({
        title: 'Failed to add sync source',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return null;
    }
  }, [showId, toast]);

  // Remove a sync source
  const removeSyncSource = useCallback(async (sourceId: string) => {
    const { error } = await supabase
      .from('ros_sync_sources')
      .delete()
      .eq('id', sourceId);

    if (error) {
      toast({
        title: 'Failed to remove sync source',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    setSyncSources(prev => prev.filter(s => s.id !== sourceId));
    toast({ title: 'Sync source removed' });
    return true;
  }, [toast]);

  // Fetch data from a Google Sheet (public sheets only)
  const fetchGoogleSheetData = useCallback(async (sheetUrl: string): Promise<Record<string, string>[] | null> => {
    const sheetId = extractGoogleSheetsId(sheetUrl);
    if (!sheetId) return null;

    try {
      // Use the public CSV export URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error('Sheet is not publicly accessible. Please make it viewable by anyone with the link.');
      }

      const csvText = await response.text();
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) return [];

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }

      return rows;
    } catch (error) {
      console.error('Error fetching Google Sheet:', error);
      toast({
        title: 'Failed to fetch sheet',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  // Sync from a source and detect changes
  const syncFromSource = useCallback(async (source: ROSSyncSource): Promise<boolean> => {
    if (!showId) return false;

    setIsSyncing(true);
    try {
      let newData: Record<string, string>[] | null = null;

      if (source.source_type === 'google_sheet') {
        newData = await fetchGoogleSheetData(source.source_url);
      }

      if (!newData) {
        setIsSyncing(false);
        return false;
      }

      // Get current ROS items
      const { data: currentItems } = await supabase
        .from('ros_items')
        .select('*')
        .eq('show_id', showId)
        .order('order_index');

      const typedItems = (currentItems || []) as unknown as ROSItem[];

      // Compare and generate diff
      const changes = generateDiff(typedItems, newData, source.column_mapping);
      setPendingChanges(changes);

      // Count changes
      const added = changes.filter(c => c.type === 'insert').length;
      const removed = changes.filter(c => c.type === 'delete').length;
      const modified = changes.filter(c => c.type === 'update').length;

      setLastSyncResult({ added, removed, modified });

      // Update last synced time
      await supabase
        .from('ros_sync_sources')
        .update({ 
          last_synced_at: new Date().toISOString(),
          last_snapshot: JSON.parse(JSON.stringify(newData))
        })
        .eq('id', source.id);

      if (added === 0 && removed === 0 && modified === 0) {
        toast({ title: 'Already in sync', description: 'No changes detected' });
      } else {
        toast({
          title: 'Changes detected',
          description: `${added} added, ${removed} removed, ${modified} modified`
        });
      }

      return true;
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [showId, fetchGoogleSheetData, toast]);

  // Apply pending changes
  const applyChanges = useCallback(async (selectedChanges?: ChangeOperation[]): Promise<boolean> => {
    if (!showId) return false;

    const changesToApply = selectedChanges || pendingChanges;
    if (changesToApply.length === 0) return true;

    try {
      for (const change of changesToApply) {
        switch (change.type) {
          case 'insert':
            await supabase.from('ros_items').insert([{
              show_id: showId,
              title: change.item.title || 'Untitled',
              order_index: change.item.order_index || 0,
              item_type: change.item.item_type || 'cue',
              status: change.item.status || 'pending'
            }]);
            break;
          case 'update':
            await supabase.from('ros_items')
              .update(change.changes)
              .eq('id', change.id);
            break;
          case 'delete':
            await supabase.from('ros_items')
              .delete()
              .eq('id', change.id);
            break;
          case 'move':
            await supabase.from('ros_items')
              .update({ order_index: change.to_index })
              .eq('id', change.id);
            break;
        }
      }

      toast({
        title: 'Changes applied',
        description: `${changesToApply.length} changes synced successfully`
      });

      setPendingChanges([]);
      setLastSyncResult(null);
      return true;
    } catch (error) {
      console.error('Error applying changes:', error);
      toast({
        title: 'Failed to apply changes',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    }
  }, [showId, pendingChanges, toast]);

  // Clear pending changes
  const dismissChanges = useCallback(() => {
    setPendingChanges([]);
    setLastSyncResult(null);
  }, []);

  // Auto-sync all connected sources
  const autoSync = useCallback(async () => {
    if (syncSources.length === 0 || isSyncing) return;

    for (const source of syncSources) {
      if (source.sync_enabled) {
        await syncFromSource(source);
      }
    }
    setLastAutoSync(new Date());
  }, [syncSources, isSyncing, syncFromSource]);

  // Start auto-sync polling
  const startAutoSync = useCallback((interval?: number) => {
    if (autoSyncTimerRef.current) {
      clearInterval(autoSyncTimerRef.current);
    }

    const syncMs = interval || syncInterval;
    setSyncInterval(syncMs);
    setAutoSyncEnabled(true);

    // Run initial sync
    autoSync();

    // Set up interval
    autoSyncTimerRef.current = setInterval(() => {
      autoSync();
    }, syncMs);

    toast({
      title: 'Auto-sync enabled',
      description: `Syncing every ${Math.round(syncMs / 60000)} minutes`
    });
  }, [syncInterval, autoSync, toast]);

  // Stop auto-sync polling
  const stopAutoSync = useCallback(() => {
    if (autoSyncTimerRef.current) {
      clearInterval(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
    setAutoSyncEnabled(false);
    toast({ title: 'Auto-sync disabled' });
  }, [toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSyncTimerRef.current) {
        clearInterval(autoSyncTimerRef.current);
      }
    };
  }, []);

  // Watch for changes and notify
  useEffect(() => {
    if (lastSyncResult && (lastSyncResult.added > 0 || lastSyncResult.removed > 0 || lastSyncResult.modified > 0)) {
      toast({
        title: '📊 Sheet changes detected',
        description: `${lastSyncResult.added} added, ${lastSyncResult.removed} removed, ${lastSyncResult.modified} modified`,
        duration: 10000
      });
    }
  }, [lastSyncResult, toast]);

  return {
    syncSources,
    isSyncing,
    pendingChanges,
    lastSyncResult,
    autoSyncEnabled,
    syncInterval,
    lastAutoSync,
    fetchSyncSources,
    addSyncSource,
    removeSyncSource,
    syncFromSource,
    applyChanges,
    dismissChanges,
    startAutoSync,
    stopAutoSync,
    setSyncInterval
  };
}

// Generate diff between current items and new data
function generateDiff(
  currentItems: ROSItem[],
  newData: Record<string, string>[],
  mapping?: ColumnMapping | null
): ChangeOperation[] {
  const changes: ChangeOperation[] = [];
  const titleField = mapping?.title || 'title';

  // Create maps for comparison
  const currentMap = new Map(currentItems.map(item => [item.title.toLowerCase(), item]));
  const newTitles = new Set(newData.map(row => (row[titleField] || '').toLowerCase()));

  // Find removed items
  for (const item of currentItems) {
    if (!newTitles.has(item.title.toLowerCase())) {
      changes.push({ type: 'delete', id: item.id, item });
    }
  }

  // Find added and modified items
  newData.forEach((row, index) => {
    const title = row[titleField] || '';
    const existing = currentMap.get(title.toLowerCase());

    if (!existing) {
      // New item
      changes.push({
        type: 'insert',
        item: {
          title,
          order_index: index,
          item_type: 'cue',
          status: 'pending'
        },
        index
      });
    } else {
      // Check for modifications
      const modifications: Partial<ROSItem> = {};
      const previous: Partial<ROSItem> = {};
      let hasChanges = false;

      // Compare mapped fields
      if (mapping) {
        for (const [field, column] of Object.entries(mapping)) {
          if (column && row[column] !== undefined) {
            const newValue = row[column];
            const currentValue = (existing as unknown as Record<string, unknown>)[field];
            if (newValue !== currentValue) {
              (modifications as Record<string, unknown>)[field] = newValue;
              (previous as Record<string, unknown>)[field] = currentValue;
              hasChanges = true;
            }
          }
        }
      }

      if (hasChanges) {
        changes.push({
          type: 'update',
          id: existing.id,
          changes: modifications,
          previous
        });
      }
    }
  });

  return changes;
}
