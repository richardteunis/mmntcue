import { useState, useCallback } from 'react';

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

  const addAnnotation = useCallback((
    pageNumber: number, 
    text: string, 
    note?: string,
    startOffset?: number,
    endOffset?: number
  ) => {
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
  }, [selectedColor]);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  const updateAnnotationNote = useCallback((id: string, note: string) => {
    setAnnotations(prev => prev.map(a => 
      a.id === id ? { ...a, note } : a
    ));
  }, []);

  const getAnnotationsForPage = useCallback((pageNumber: number) => {
    return annotations.filter(a => a.pageNumber === pageNumber);
  }, [annotations]);

  // Cue-page linking
  const linkCueToPage = useCallback((cueId: string, pageNumber: number, cueName?: string) => {
    setCuePageLinks(prev => {
      // Remove existing link for this cue
      const filtered = prev.filter(l => l.cueId !== cueId);
      return [...filtered, { cueId, pageNumber, cueName }];
    });
  }, []);

  const unlinkCue = useCallback((cueId: string) => {
    setCuePageLinks(prev => prev.filter(l => l.cueId !== cueId));
  }, []);

  const getPageForCue = useCallback((cueId: string): number | null => {
    const link = cuePageLinks.find(l => l.cueId === cueId);
    return link?.pageNumber ?? null;
  }, [cuePageLinks]);

  const getCueForPage = useCallback((pageNumber: number): CuePageLink | null => {
    return cuePageLinks.find(l => l.pageNumber === pageNumber) ?? null;
  }, [cuePageLinks]);

  const clearAllAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  const clearAllLinks = useCallback(() => {
    setCuePageLinks([]);
  }, []);

  return {
    annotations,
    cuePageLinks,
    selectedColor,
    isAnnotating,
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
