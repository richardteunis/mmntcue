import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ROSVersion, ROSSnapshot, ROSItem } from '@/types/ros';

export function useROSVersions(showId: string | null) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<ROSVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ROSVersion | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch all versions for the show
  const fetchVersions = useCallback(async () => {
    if (!showId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ros_versions')
        .select('*')
        .eq('show_id', showId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      
      const typedVersions = (data || []) as unknown as ROSVersion[];
      setVersions(typedVersions);
      
      if (typedVersions.length > 0) {
        setCurrentVersion(typedVersions[0]);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  }, [showId]);

  // Get snapshot for a specific version
  const getSnapshot = useCallback(async (versionId: string): Promise<ROSItem[] | null> => {
    const { data, error } = await supabase
      .from('ros_snapshots')
      .select('snapshot_data')
      .eq('version_id', versionId)
      .single();

    if (error) {
      console.error('Error fetching snapshot:', error);
      return null;
    }

    return (data?.snapshot_data as unknown) as ROSItem[] | null;
  }, []);

  // Create a new version from current items
  const createVersion = useCallback(async (
    summary: string,
    sourceType: ROSVersion['source_type'] = 'manual'
  ): Promise<ROSVersion | null> => {
    if (!showId) return null;

    try {
      // Get current ROS items
      const { data: items, error: itemsError } = await supabase
        .from('ros_items')
        .select('*')
        .eq('show_id', showId)
        .order('order_index');

      if (itemsError) throw itemsError;

      // Calculate next version number
      const nextVersion = (versions[0]?.version_number || 0) + 1;

      // Create version
      const { data: version, error: versionError } = await supabase
        .from('ros_versions')
        .insert({
          show_id: showId,
          version_number: nextVersion,
          summary,
          source_type: sourceType
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // Create snapshot
      const { error: snapshotError } = await supabase
        .from('ros_snapshots')
        .insert({
          version_id: version.id,
          show_id: showId,
          snapshot_data: items
        });

      if (snapshotError) throw snapshotError;

      const typedVersion = version as unknown as ROSVersion;
      setVersions(prev => [typedVersion, ...prev]);
      setCurrentVersion(typedVersion);

      toast({
        title: 'Version saved',
        description: `Version ${nextVersion}: ${summary}`
      });

      return typedVersion;
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: 'Failed to save version',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return null;
    }
  }, [showId, versions, toast]);

  // Rollback to a specific version
  const rollbackToVersion = useCallback(async (versionId: string): Promise<boolean> => {
    if (!showId) return false;

    try {
      // Get the snapshot
      const snapshot = await getSnapshot(versionId);
      if (!snapshot) throw new Error('Snapshot not found');

      // Delete current items
      const { error: deleteError } = await supabase
        .from('ros_items')
        .delete()
        .eq('show_id', showId);

      if (deleteError) throw deleteError;

      // Restore items from snapshot
      const itemsToInsert = snapshot.map(item => ({
        ...item,
        id: undefined, // Generate new IDs
        show_id: showId
      }));

      const { error: insertError } = await supabase
        .from('ros_items')
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      // Create a new version marking the rollback
      const targetVersion = versions.find(v => v.id === versionId);
      await createVersion(
        `Rolled back to version ${targetVersion?.version_number || 'unknown'}`,
        'manual'
      );

      toast({
        title: 'Rollback complete',
        description: `Restored to version ${targetVersion?.version_number}`
      });

      return true;
    } catch (error) {
      console.error('Error rolling back:', error);
      toast({
        title: 'Rollback failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    }
  }, [showId, versions, getSnapshot, createVersion, toast]);

  // Compare two versions
  const compareVersions = useCallback(async (
    versionA: string,
    versionB: string
  ) => {
    const [snapshotA, snapshotB] = await Promise.all([
      getSnapshot(versionA),
      getSnapshot(versionB)
    ]);

    if (!snapshotA || !snapshotB) return null;

    // Simple diff: find added, removed, modified items
    const itemsA = new Map(snapshotA.map(item => [item.source_row_id || item.id, item]));
    const itemsB = new Map(snapshotB.map(item => [item.source_row_id || item.id, item]));

    const added: ROSItem[] = [];
    const removed: ROSItem[] = [];
    const modified: { before: ROSItem; after: ROSItem }[] = [];

    // Find added and modified
    for (const [key, item] of itemsB) {
      if (!itemsA.has(key)) {
        added.push(item);
      } else {
        const oldItem = itemsA.get(key)!;
        if (JSON.stringify(oldItem) !== JSON.stringify(item)) {
          modified.push({ before: oldItem, after: item });
        }
      }
    }

    // Find removed
    for (const [key, item] of itemsA) {
      if (!itemsB.has(key)) {
        removed.push(item);
      }
    }

    return { added, removed, modified };
  }, [getSnapshot]);

  // Initial fetch
  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return {
    versions,
    currentVersion,
    loading,
    fetchVersions,
    getSnapshot,
    createVersion,
    rollbackToVersion,
    compareVersions
  };
}
