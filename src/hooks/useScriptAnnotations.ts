import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Annotation {
  id: string;
  pageNumber: number;
  text: string;
  color: string;
  note?: string;
  startOffset?: number;
  endOffset?: number;
  createdAt: string;
}

export interface CuePageLink {
  cueId: string;
  pageNumber: number;
  cueName?: string;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
];

export const useScriptAnnotations = (showId?: string | null) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [cuePageLinks, setCuePageLinks] = useState<CuePageLink[]>([]);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load annotations from database
  useEffect(() => {
    if (!showId) {
      setAnnotations([]);
      setCuePageLinks([]);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load annotations
        const { data: annotationsData, error: annotationsError } = await supabase
          .from('script_annotations')
          .select('*')
          .eq('show_id', showId)
          .order('created_at', { ascending: true });

        if (annotationsError) throw annotationsError;

        if (annotationsData) {
          setAnnotations(annotationsData.map(a => ({
            id: a.id,
            pageNumber: a.page_number,
            text: a.text,
            color: a.color,
            note: a.note || undefined,
            startOffset: a.start_offset || undefined,
            endOffset: a.end_offset || undefined,
            createdAt: a.created_at,
          })));
        }

        // Load cue-page links
        const { data: linksData, error: linksError } = await supabase
          .from('script_cue_links')
          .select('*, cues(name)')
          .eq('show_id', showId);

        if (linksError) throw linksError;

        if (linksData) {
          setCuePageLinks(linksData.map(l => ({
            cueId: l.cue_id,
            pageNumber: l.page_number,
            cueName: (l.cues as any)?.name,
          })));
        }
      } catch (error) {
        console.error('Error loading script data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [showId]);

  const addAnnotation = useCallback(async (
    pageNumber: number, 
    text: string, 
    note?: string,
    startOffset?: number,
    endOffset?: number
  ) => {
    if (!showId) {
      // Local-only if no showId
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        pageNumber,
        text,
        color: selectedColor,
        note,
        startOffset,
        endOffset,
        createdAt: new Date().toISOString(),
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      return newAnnotation;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('script_annotations')
        .insert({
          show_id: showId,
          page_number: pageNumber,
          text,
          color: selectedColor,
          note,
          start_offset: startOffset,
          end_offset: endOffset,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newAnnotation: Annotation = {
        id: data.id,
        pageNumber: data.page_number,
        text: data.text,
        color: data.color,
        note: data.note || undefined,
        startOffset: data.start_offset || undefined,
        endOffset: data.end_offset || undefined,
        createdAt: data.created_at,
      };

      setAnnotations(prev => [...prev, newAnnotation]);
      return newAnnotation;
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast({
        title: 'Error saving highlight',
        description: 'The highlight was not saved',
        variant: 'destructive',
      });
      return null;
    }
  }, [selectedColor, showId, toast]);

  const removeAnnotation = useCallback(async (id: string) => {
    if (showId) {
      try {
        const { error } = await supabase
          .from('script_annotations')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting annotation:', error);
        toast({
          title: 'Error removing highlight',
          variant: 'destructive',
        });
        return;
      }
    }
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, [showId, toast]);

  const updateAnnotationNote = useCallback(async (id: string, note: string) => {
    if (showId) {
      try {
        const { error } = await supabase
          .from('script_annotations')
          .update({ note })
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating annotation:', error);
        return;
      }
    }
    setAnnotations(prev => prev.map(a => 
      a.id === id ? { ...a, note } : a
    ));
  }, [showId]);

  const getAnnotationsForPage = useCallback((pageNumber: number) => {
    return annotations.filter(a => a.pageNumber === pageNumber);
  }, [annotations]);

  // Cue-page linking
  const linkCueToPage = useCallback(async (cueId: string, pageNumber: number, cueName?: string) => {
    if (showId) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        // Use upsert to handle existing links
        const { error } = await supabase
          .from('script_cue_links')
          .upsert({
            show_id: showId,
            cue_id: cueId,
            page_number: pageNumber,
            created_by: userData.user?.id,
          }, {
            onConflict: 'show_id,cue_id',
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error linking cue:', error);
        toast({
          title: 'Error linking cue',
          variant: 'destructive',
        });
        return;
      }
    }
    
    setCuePageLinks(prev => {
      const filtered = prev.filter(l => l.cueId !== cueId);
      return [...filtered, { cueId, pageNumber, cueName }];
    });
  }, [showId, toast]);

  const unlinkCue = useCallback(async (cueId: string) => {
    if (showId) {
      try {
        const { error } = await supabase
          .from('script_cue_links')
          .delete()
          .eq('show_id', showId)
          .eq('cue_id', cueId);

        if (error) throw error;
      } catch (error) {
        console.error('Error unlinking cue:', error);
        toast({
          title: 'Error unlinking cue',
          variant: 'destructive',
        });
        return;
      }
    }
    setCuePageLinks(prev => prev.filter(l => l.cueId !== cueId));
  }, [showId, toast]);

  const getPageForCue = useCallback((cueId: string): number | null => {
    const link = cuePageLinks.find(l => l.cueId === cueId);
    return link?.pageNumber ?? null;
  }, [cuePageLinks]);

  const getCueForPage = useCallback((pageNumber: number): CuePageLink | null => {
    return cuePageLinks.find(l => l.pageNumber === pageNumber) ?? null;
  }, [cuePageLinks]);

  const clearAllAnnotations = useCallback(async () => {
    if (showId) {
      try {
        const { error } = await supabase
          .from('script_annotations')
          .delete()
          .eq('show_id', showId);

        if (error) throw error;
      } catch (error) {
        console.error('Error clearing annotations:', error);
        toast({
          title: 'Error clearing highlights',
          variant: 'destructive',
        });
        return;
      }
    }
    setAnnotations([]);
  }, [showId, toast]);

  const clearAllLinks = useCallback(async () => {
    if (showId) {
      try {
        const { error } = await supabase
          .from('script_cue_links')
          .delete()
          .eq('show_id', showId);

        if (error) throw error;
      } catch (error) {
        console.error('Error clearing links:', error);
        return;
      }
    }
    setCuePageLinks([]);
  }, [showId]);

  return {
    annotations,
    cuePageLinks,
    selectedColor,
    isAnnotating,
    isLoading,
    highlightColors: HIGHLIGHT_COLORS,
    setSelectedColor,
    setIsAnnotating,
    addAnnotation,
    removeAnnotation,
    updateAnnotationNote,
    getAnnotationsForPage,
    linkCueToPage,
    unlinkCue,
    getPageForCue,
    getCueForPage,
    clearAllAnnotations,
    clearAllLinks,
  };
};
