import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Asset, ShowAsset, CueAsset, PlaybackSettings, getFileTypeFromMime, DEFAULT_PLAYBACK_SETTINGS } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';

export const useAssets = (userId?: string) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAssets = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assets:', error);
      toast({ title: 'Error loading assets', description: error.message, variant: 'destructive' });
    } else {
      setAssets((data || []) as Asset[]);
    }
    setLoading(false);
  }, [userId, toast]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const uploadAsset = async (file: File): Promise<Asset | null> => {
    if (!userId) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(fileName);
    
    const fileType = getFileTypeFromMime(file.type);
    
    // Create asset record
    const assetData = {
      user_id: userId,
      name: file.name,
      file_path: fileName,
      file_url: urlData.publicUrl,
      file_type: fileType,
      mime_type: file.type,
      file_size: file.size,
      duration: null as number | null,
      thumbnail_url: null as string | null,
      metadata: {} as Record<string, unknown>,
    };

    const { data, error } = await supabase
      .from('assets')
      .insert({
        user_id: userId,
        name: file.name,
        file_path: fileName,
        file_url: urlData.publicUrl,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error saving asset', description: error.message, variant: 'destructive' });
      return null;
    }

    const newAsset = data as Asset;
    setAssets(prev => [newAsset, ...prev]);
    toast({ title: 'Asset uploaded', description: file.name });
    return newAsset;
  };

  const deleteAsset = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    // Delete from storage
    await supabase.storage.from('assets').remove([asset.file_path]);

    // Delete from database
    const { error } = await supabase.from('assets').delete().eq('id', assetId);

    if (error) {
      toast({ title: 'Error deleting asset', description: error.message, variant: 'destructive' });
      return;
    }

    setAssets(prev => prev.filter(a => a.id !== assetId));
    toast({ title: 'Asset deleted' });
  };

  return { assets, loading, uploadAsset, deleteAsset, refetch: fetchAssets };
};

export const useShowAssets = (showId?: string | null) => {
  const [showAssets, setShowAssets] = useState<ShowAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchShowAssets = useCallback(async () => {
    if (!showId) {
      setShowAssets([]);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from('show_assets')
      .select('*, asset:assets(*)')
      .eq('show_id', showId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching show assets:', error);
    } else {
      setShowAssets((data || []) as ShowAsset[]);
    }
    setLoading(false);
  }, [showId]);

  useEffect(() => {
    fetchShowAssets();
  }, [fetchShowAssets]);

  const addAssetToShow = async (assetId: string, addedBy?: string) => {
    if (!showId) return;

    const { data, error } = await supabase
      .from('show_assets')
      .insert({ show_id: showId, asset_id: assetId, added_by: addedBy })
      .select('*, asset:assets(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Asset already in show', variant: 'destructive' });
      } else {
        toast({ title: 'Error adding asset', description: error.message, variant: 'destructive' });
      }
      return;
    }

    setShowAssets(prev => [data as ShowAsset, ...prev]);
    toast({ title: 'Asset added to show' });
  };

  const removeAssetFromShow = async (showAssetId: string) => {
    const { error } = await supabase.from('show_assets').delete().eq('id', showAssetId);

    if (error) {
      toast({ title: 'Error removing asset', description: error.message, variant: 'destructive' });
      return;
    }

    setShowAssets(prev => prev.filter(sa => sa.id !== showAssetId));
    toast({ title: 'Asset removed from show' });
  };

  return { showAssets, loading, addAssetToShow, removeAssetFromShow, refetch: fetchShowAssets };
};

export const useCueAssets = (cueId?: string | null) => {
  const [cueAssets, setCueAssets] = useState<CueAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCueAssets = useCallback(async () => {
    if (!cueId) {
      setCueAssets([]);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from('cue_assets')
      .select('*, asset:assets(*)')
      .eq('cue_id', cueId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching cue assets:', error);
    } else {
      setCueAssets((data || []) as CueAsset[]);
    }
    setLoading(false);
  }, [cueId]);

  useEffect(() => {
    fetchCueAssets();
  }, [fetchCueAssets]);

  const addAssetToCue = async (assetId: string, settings: PlaybackSettings = DEFAULT_PLAYBACK_SETTINGS): Promise<CueAsset | null> => {
    if (!cueId) return null;

    const orderIndex = cueAssets.length;

    const { data, error } = await supabase
      .from('cue_assets')
      .insert({
        cue_id: cueId,
        asset_id: assetId,
        order_index: orderIndex,
        ...settings,
      })
      .select('*, asset:assets(*)')
      .single();

    if (error) {
      toast({ title: 'Error adding asset to cue', description: error.message, variant: 'destructive' });
      return null;
    }

    const newCueAsset = data as CueAsset;
    setCueAssets(prev => [...prev, newCueAsset]);
    return newCueAsset;
  };

  const updateCueAsset = async (cueAssetId: string, settings: Partial<PlaybackSettings>) => {
    const { error } = await supabase
      .from('cue_assets')
      .update(settings)
      .eq('id', cueAssetId);

    if (error) {
      toast({ title: 'Error updating playback settings', description: error.message, variant: 'destructive' });
      return;
    }

    setCueAssets(prev => prev.map(ca => 
      ca.id === cueAssetId ? { ...ca, ...settings } : ca
    ));
  };

  const removeCueAsset = async (cueAssetId: string) => {
    const { error } = await supabase.from('cue_assets').delete().eq('id', cueAssetId);

    if (error) {
      toast({ title: 'Error removing asset', description: error.message, variant: 'destructive' });
      return;
    }

    setCueAssets(prev => prev.filter(ca => ca.id !== cueAssetId));
  };

  return { cueAssets, loading, addAssetToCue, updateCueAsset, removeCueAsset, refetch: fetchCueAssets };
};
