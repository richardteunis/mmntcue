import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  ROSItem, 
  ROSVersion, 
  ColumnMapping, 
  CSVParseResult, 
  CSVError,
  ImportPreviewRow,
  ROSImportTemplate 
} from '@/types/ros';

// Parse CSV string to structured data
export function parseCSV(csvString: string): CSVParseResult {
  const lines = csvString.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [{ row: 0, message: 'Empty file' }] };
  }

  // Parse headers (first line)
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  const errors: CSVError[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Check for mismatched columns
    if (values.length !== headers.length) {
      errors.push({
        row: i,
        message: `Expected ${headers.length} columns, found ${values.length}`
      });
    }

    rows.push(row);
  }

  return { headers, rows, errors };
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

// Auto-detect column mappings based on header names
export function autoDetectMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  const patterns: Record<keyof ColumnMapping, RegExp[]> = {
    title: [/^title$/i, /^name$/i, /^cue$/i, /^item$/i, /^description$/i],
    start_time: [/^start/i, /^time$/i, /^begin/i, /^clock/i],
    duration: [/^duration/i, /^length$/i, /^run.*time/i],
    item_type: [/^type$/i, /^category$/i, /^kind$/i],
    speaker: [/^speaker/i, /^presenter/i, /^talent/i, /^who$/i],
    owner: [/^owner$/i, /^assigned/i, /^responsible/i],
    notes: [/^notes?$/i, /^comments?$/i, /^remarks?$/i],
    audio: [/^audio/i, /^sound/i, /^music/i],
    lighting: [/^light/i, /^lx$/i],
    video: [/^video/i, /^vx$/i, /^screen/i],
    slide_ref: [/^slide/i, /^ppt$/i, /^deck$/i],
    room: [/^room$/i, /^location$/i, /^venue$/i],
    status: [/^status$/i, /^state$/i],
    hard_time: [/^hard/i, /^fixed/i, /^lock/i]
  };

  for (const [field, regexes] of Object.entries(patterns)) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (regexes.some(r => r.test(lowerHeaders[i]))) {
        (mapping as Record<string, string>)[field] = headers[i];
        break;
      }
    }
  }

  return mapping;
}

// Validate a row against the mapping
export function validateRow(
  row: Record<string, string>, 
  mapping: ColumnMapping,
  rowIndex: number
): CSVError[] {
  const errors: CSVError[] = [];

  // Title is required
  const title = mapping.title ? row[mapping.title] : '';
  if (!title?.trim()) {
    errors.push({ row: rowIndex, column: 'title', message: 'Title is required' });
  }

  // Either start_time or duration should be provided (warning, not error)
  const hasStartTime = mapping.start_time && row[mapping.start_time]?.trim();
  const hasDuration = mapping.duration && row[mapping.duration]?.trim();
  
  if (!hasStartTime && !hasDuration) {
    errors.push({ row: rowIndex, message: 'Consider adding start_time or duration' });
  }

  return errors;
}

// Main hook for ROS import functionality
export function useROSImport(showId: string | null) {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ title: '' });
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [templates, setTemplates] = useState<ROSImportTemplate[]>([]);

  // Parse CSV file
  const parseFile = useCallback(async (file: File): Promise<CSVParseResult> => {
    const text = await file.text();
    const result = parseCSV(text);
    setParseResult(result);
    
    // Auto-detect mapping
    const autoMapping = autoDetectMapping(result.headers);
    if (autoMapping.title) {
      setMapping(autoMapping as ColumnMapping);
    }
    
    return result;
  }, []);

  // Update preview when mapping changes
  const updatePreview = useCallback(() => {
    if (!parseResult) return;

    const preview: ImportPreviewRow[] = parseResult.rows.map((row, index) => {
      const errors = validateRow(row, mapping, index + 1);
      return {
        data: row,
        rowIndex: index + 1,
        errors: errors,
        isValid: errors.filter(e => e.column === 'title').length === 0
      };
    });

    setPreviewRows(preview);
  }, [parseResult, mapping]);

  // Fetch saved templates
  const fetchTemplates = useCallback(async () => {
    if (!showId) return;

    const { data } = await supabase
      .from('ros_import_templates')
      .select('*')
      .or(`show_id.eq.${showId},workspace_id.is.null`)
      .order('created_at', { ascending: false });

    if (data) {
      setTemplates(data as unknown as ROSImportTemplate[]);
    }
  }, [showId]);

  // Save template
  const saveTemplate = useCallback(async (name: string): Promise<boolean> => {
    if (!showId) return false;

    const { error } = await supabase
      .from('ros_import_templates')
      .insert([{
        show_id: showId,
        name,
        column_mapping: JSON.parse(JSON.stringify(mapping))
      }]);

    if (error) {
      toast({ title: 'Error saving template', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Template saved', description: `"${name}" can be reused for future imports` });
    await fetchTemplates();
    return true;
  }, [showId, mapping, toast, fetchTemplates]);

  // Apply template
  const applyTemplate = useCallback((template: ROSImportTemplate) => {
    setMapping(template.column_mapping);
    toast({ title: 'Template applied', description: `Using "${template.name}" mapping` });
  }, [toast]);

  // Import rows to database
  const importRows = useCallback(async (): Promise<boolean> => {
    if (!showId || !parseResult || previewRows.length === 0) return false;

    setIsImporting(true);

    try {
      // Create a new version
      const { data: version, error: versionError } = await supabase
        .from('ros_versions')
        .insert([{
          show_id: showId,
          summary: `Imported ${previewRows.length} items from CSV`,
          source_type: 'csv'
        }])
        .select()
        .single();

      if (versionError) throw versionError;

      // Transform rows to ROS items
      const validRows = previewRows.filter(row => row.isValid);
      const items = validRows.map((row, index) => ({
        show_id: showId,
        order_index: index,
        title: mapping.title ? row.data[mapping.title] || 'Untitled' : 'Untitled',
        start_time: mapping.start_time ? row.data[mapping.start_time] : null,
        duration: mapping.duration ? row.data[mapping.duration] : null,
        item_type: 'cue' as const,
        speaker: mapping.speaker ? row.data[mapping.speaker] : null,
        owner: mapping.owner ? row.data[mapping.owner] : null,
        notes: mapping.notes ? row.data[mapping.notes] : null,
        audio: mapping.audio ? row.data[mapping.audio] : null,
        lighting: mapping.lighting ? row.data[mapping.lighting] : null,
        video: mapping.video ? row.data[mapping.video] : null,
        slide_ref: mapping.slide_ref ? row.data[mapping.slide_ref] : null,
        room: mapping.room ? row.data[mapping.room] : null,
        status: 'pending' as const,
        hard_time: mapping.hard_time ? row.data[mapping.hard_time]?.toLowerCase() === 'true' : false,
        source_row_id: `csv_${index}`
      }));

      // Insert items
      const { error: itemsError } = await supabase
        .from('ros_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Create snapshot
      const { error: snapshotError } = await supabase
        .from('ros_snapshots')
        .insert([{
          version_id: version.id,
          show_id: showId,
          snapshot_data: JSON.parse(JSON.stringify(items))
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
  }, [showId, parseResult, previewRows, mapping, toast]);

  // Reset state
  const reset = useCallback(() => {
    setParseResult(null);
    setMapping({ title: '' });
    setPreviewRows([]);
  }, []);

  return {
    // State
    isImporting,
    parseResult,
    mapping,
    previewRows,
    templates,
    
    // Actions
    parseFile,
    setMapping,
    updatePreview,
    fetchTemplates,
    saveTemplate,
    applyTemplate,
    importRows,
    reset
  };
}
