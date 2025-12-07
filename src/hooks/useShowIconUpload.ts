import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useShowIconUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadIcon = async (file: File, showId: string): Promise<string | null> => {
    // Validate file type
    const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an SVG, PNG, JPG, WebP, or GIF file');
      return null;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return null;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${showId}/icon.${fileExt}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('show-icons')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('show-icons')
        .getPublicUrl(fileName);

      // Add cache-busting parameter
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      
      toast.success('Show icon uploaded successfully');
      return urlWithCacheBust;
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('Failed to upload icon');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeIcon = async (showId: string): Promise<boolean> => {
    setUploading(true);
    try {
      // List files in the show's folder
      const { data: files, error: listError } = await supabase.storage
        .from('show-icons')
        .list(showId);

      if (listError) throw listError;

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${showId}/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from('show-icons')
          .remove(filePaths);

        if (deleteError) throw deleteError;
      }

      toast.success('Show icon removed');
      return true;
    } catch (error) {
      console.error('Error removing icon:', error);
      toast.error('Failed to remove icon');
      return false;
    } finally {
      setUploading(false);
    }
  };

  return { uploadIcon, removeIcon, uploading };
};
