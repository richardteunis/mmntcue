import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIExtractedItem {
  title: string;
  start_time?: string;
  duration?: string;
  item_type?: 'cue' | 'segment' | 'break' | 'transition';
  speaker?: string;
  notes?: string;
  audio?: string;
  video?: string;
  lighting?: string;
}

export interface AIParseResult {
  items: AIExtractedItem[];
  metadata?: {
    show_name?: string;
    event_date?: string;
    venue?: string;
    total_items?: number;
  };
}

export function useAIROSImport(showId: string | null) {
  const { toast } = useToast();
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseResult, setParseResult] = useState<AIParseResult | null>(null);
  const [documentName, setDocumentName] = useState<string>('');

  // Read file content as text
  const readFileAsText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  // Parse document using AI
  const parseDocument = useCallback(async (file: File): Promise<AIParseResult | null> => {
    setIsParsing(true);
    setParseResult(null);
    setDocumentName(file.name);

    try {
      // Read file content
      const content = await readFileAsText(file);
      
      // Determine file type
      const fileType = file.name.split('.').pop()?.toLowerCase() || 'txt';

      // Call edge function
      const { data, error } = await supabase.functions.invoke('parse-ros-document', {
        body: {
          documentContent: content,
          fileName: file.name,
          fileType
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: 'Parsing failed',
          description: error.message || 'Failed to parse document',
          variant: 'destructive'
        });
        return null;
      }

      if (!data.success) {
        toast({
          title: 'Parsing failed',
          description: data.error || 'Failed to extract items from document',
          variant: 'destructive'
        });
        return null;
      }

      const result = data.data as AIParseResult;
      setParseResult(result);

      toast({
        title: 'Document parsed',
        description: `Found ${result.items?.length || 0} items`
      });

      return result;
    } catch (err) {
      console.error('Parse error:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to parse document',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsParsing(false);
    }
  }, [toast]);

  // Import parsed items to database
  const importItems = useCallback(async (items: AIExtractedItem[]): Promise<boolean> => {
    if (!showId || items.length === 0) return false;

    setIsImporting(true);

    try {
      // Create a new version
      const { data: version, error: versionError } = await supabase
        .from('ros_versions')
        .insert([{
          show_id: showId,
          summary: `AI-imported ${items.length} items from ${documentName}`,
          source_type: 'ai_import'
        }])
        .select()
        .single();

      if (versionError) throw versionError;

      // Transform items to ROS items
      const rosItems = items.map((item, index) => ({
        show_id: showId,
        order_index: index,
        title: item.title || 'Untitled',
        start_time: item.start_time || null,
        duration: item.duration || null,
        item_type: item.item_type || 'cue',
        speaker: item.speaker || null,
        notes: item.notes || null,
        audio: item.audio || null,
        video: item.video || null,
        lighting: item.lighting || null,
        status: 'pending',
        source_row_id: `ai_${index}`
      }));

      // Insert items
      const { error: itemsError } = await supabase
        .from('ros_items')
        .insert(rosItems);

      if (itemsError) throw itemsError;

      // Create snapshot
      const { error: snapshotError } = await supabase
        .from('ros_snapshots')
        .insert([{
          version_id: version.id,
          show_id: showId,
          snapshot_data: JSON.parse(JSON.stringify(rosItems))
        }]);

      if (snapshotError) throw snapshotError;

      toast({
        title: 'Import successful',
        description: `${items.length} items imported to Run of Show`
      });

      return true;
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsImporting(false);
    }
  }, [showId, documentName, toast]);

  // Reset state
  const reset = useCallback(() => {
    setParseResult(null);
    setDocumentName('');
  }, []);

  return {
    isParsing,
    isImporting,
    parseResult,
    documentName,
    parseDocument,
    importItems,
    reset
  };
}
