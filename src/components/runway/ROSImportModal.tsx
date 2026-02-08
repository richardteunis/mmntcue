import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Link2, AlertCircle, Check, Save, ChevronRight, Loader2, FileText, Sparkles } from 'lucide-react';
import { useROSImport } from '@/hooks/useROSImport';
import { useROSSync } from '@/hooks/useROSSync';
import { useAIROSImport } from '@/hooks/useAIROSImport';
import { cn } from '@/lib/utils';
import type { ColumnMapping } from '@/types/ros';

interface ROSImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId: string;
  onImportComplete: () => void;
}

const TARGET_FIELDS: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
  { key: 'title', label: 'Title', required: true },
  { key: 'start_time', label: 'Start Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'item_type', label: 'Type' },
  { key: 'speaker', label: 'Speaker' },
  { key: 'owner', label: 'Owner' },
  { key: 'notes', label: 'Notes' },
  { key: 'audio', label: 'Audio' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'video', label: 'Video' },
  { key: 'slide_ref', label: 'Slide Ref' },
  { key: 'room', label: 'Room' },
  { key: 'status', label: 'Status' },
  { key: 'hard_time', label: 'Hard Time' }
];

export default function ROSImportModal({ open, onOpenChange, showId, onImportComplete }: ROSImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [activeTab, setActiveTab] = useState<'document' | 'csv' | 'sheet'>('document');
  const [templateName, setTemplateName] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');

  const {
    isImporting,
    parseResult,
    mapping,
    previewRows,
    templates,
    parseFile,
    setMapping,
    updatePreview,
    fetchTemplates,
    saveTemplate,
    applyTemplate,
    importRows,
    reset
  } = useROSImport(showId);

  const {
    syncSources,
    isSyncing,
    addSyncSource,
    fetchSyncSources
  } = useROSSync(showId);

  const {
    isParsing: isAIParsing,
    isImporting: isAIImporting,
    parseResult: aiParseResult,
    documentName,
    parseDocument,
    importItems: importAIItems,
    reset: resetAI
  } = useAIROSImport(showId);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      fetchSyncSources();
    }
  }, [open, fetchTemplates, fetchSyncSources]);

  useEffect(() => {
    if (parseResult && mapping.title) {
      updatePreview();
    }
  }, [parseResult, mapping, updatePreview]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await parseFile(file);
    setStep('mapping');
  }, [parseFile]);

  const handleDocumentSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await parseDocument(file);
  }, [parseDocument]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (activeTab === 'document') {
      await parseDocument(file);
    } else if (file.name.endsWith('.csv')) {
      await parseFile(file);
      setStep('mapping');
    }
  }, [activeTab, parseDocument, parseFile]);

  const handleMappingChange = useCallback((field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value || undefined }));
  }, [setMapping]);

  const handleConnectSheet = useCallback(async () => {
    if (!sheetUrl) return;
    await addSyncSource('google_sheet', sheetUrl, sheetName || 'Google Sheet');
    onOpenChange(false);
  }, [sheetUrl, sheetName, addSyncSource, onOpenChange]);

  const handleImport = useCallback(async () => {
    const success = await importRows();
    if (success) {
      onImportComplete();
      onOpenChange(false);
      reset();
      setStep('upload');
    }
  }, [importRows, onImportComplete, onOpenChange, reset]);

  const handleAIImport = useCallback(async () => {
    if (!aiParseResult?.items) return;
    const success = await importAIItems(aiParseResult.items);
    if (success) {
      onImportComplete();
      onOpenChange(false);
      resetAI();
    }
  }, [aiParseResult, importAIItems, onImportComplete, onOpenChange, resetAI]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    reset();
    resetAI();
    setStep('upload');
    setSheetUrl('');
    setSheetName('');
    setTemplateName('');
  }, [onOpenChange, reset, resetAI]);

  const validRowCount = previewRows.filter(r => r.isValid).length;
  const invalidRowCount = previewRows.length - validRowCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Run of Show
          </DialogTitle>
          <DialogDescription>
            Upload a document, CSV, or connect a Google Sheet to import your run of show.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && !aiParseResult && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'document' | 'csv' | 'sheet')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="document" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Import
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </TabsTrigger>
              <TabsTrigger value="sheet" className="gap-2">
                <Link2 className="h-4 w-4" />
                Sheet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="document" className="mt-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                  "hover:border-accent/50 hover:bg-accent/5",
                  isAIParsing && "pointer-events-none opacity-50"
                )}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {isAIParsing ? (
                  <>
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-accent animate-spin" />
                    <p className="text-lg font-medium mb-2">Analyzing document with AI...</p>
                    <p className="text-sm text-muted-foreground">Extracting cues, timing, and technical notes</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">Drop your document here</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Supports TXT, MD, or any text-based document
                    </p>
                    <Input
                      type="file"
                      accept=".txt,.md,.doc,.docx,.rtf"
                      onChange={handleDocumentSelect}
                      className="max-w-xs mx-auto"
                    />
                  </>
                )}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-accent">AI-Powered Extraction</p>
                    <p className="text-muted-foreground">
                      Upload any schedule, agenda, or production document. AI will automatically extract cues, timing, speakers, and technical notes.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="mt-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                  "hover:border-primary/50 hover:bg-primary/5"
                )}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="max-w-xs mx-auto"
                />
              </div>

              {templates.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm text-muted-foreground">Saved Templates</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {templates.map(template => (
                      <Badge
                        key={template.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20"
                        onClick={() => {
                          applyTemplate(template);
                          if (parseResult) setStep('mapping');
                        }}
                      >
                        {template.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sheet" className="mt-4 space-y-4">
              <div>
                <Label>Google Sheets URL</Label>
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure the sheet is publicly viewable (Anyone with link can view)
                </p>
              </div>

              <div>
                <Label>Display Name (optional)</Label>
                <Input
                  placeholder="Production ROS"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="mt-1"
                />
              </div>

              {syncSources.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="text-sm text-muted-foreground">Connected Sheets</Label>
                  <div className="space-y-2 mt-2">
                    {syncSources.map(source => (
                      <div key={source.id} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span>{source.source_name}</span>
                        <span className="text-muted-foreground">
                          {source.last_synced_at
                            ? `Last synced ${new Date(source.last_synced_at).toLocaleDateString()}`
                            : 'Never synced'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleConnectSheet}
                disabled={!sheetUrl || isSyncing}
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Sheet'
                )}
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {/* AI Parse Results Preview */}
        {aiParseResult && step === 'upload' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  AI extracted {aiParseResult.items.length} items from {documentName}
                </p>
                {aiParseResult.metadata?.show_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Detected show: {aiParseResult.metadata.show_name}
                    {aiParseResult.metadata.event_date && ` • ${aiParseResult.metadata.event_date}`}
                    {aiParseResult.metadata.venue && ` • ${aiParseResult.metadata.venue}`}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                AI Parsed
              </Badge>
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Speaker</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiParseResult.items.slice(0, 50).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="font-mono text-sm">{item.start_time || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{item.duration || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.item_type || 'cue'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.speaker || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {aiParseResult.items.length > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing first 50 of {aiParseResult.items.length} items
              </p>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="ghost" onClick={() => { resetAI(); }}>
                Back
              </Button>
              <Button 
                onClick={handleAIImport} 
                disabled={isAIImporting || aiParseResult.items.length === 0}
                className="gap-2"
              >
                {isAIImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {aiParseResult.items.length} Items
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && parseResult && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Found {parseResult.headers.length} columns, {parseResult.rows.length} rows
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-40"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveTemplate(templateName)}
                  disabled={!templateName}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Template
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 gap-4">
                {TARGET_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center gap-2">
                    <Label className={cn(
                      "w-28 text-right",
                      field.required && "after:content-['*'] after:text-destructive after:ml-0.5"
                    )}>
                      {field.label}
                    </Label>
                    <Select
                      value={mapping[field.key] || ''}
                      onValueChange={(v) => handleMappingChange(field.key, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Skip --</SelectItem>
                        {parseResult.headers.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={() => setStep('preview')} 
                disabled={!mapping.title}
              >
                Preview Import
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-500">
                  {validRowCount} valid
                </Badge>
                {invalidRowCount > 0 && (
                  <Badge variant="destructive">
                    {invalidRowCount} errors
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.slice(0, 50).map(row => (
                    <TableRow
                      key={row.rowIndex}
                      className={cn(!row.isValid && "bg-destructive/10")}
                    >
                      <TableCell className="font-mono text-xs">
                        {row.isValid ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {mapping.title ? row.data[mapping.title] : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {mapping.start_time ? row.data[mapping.start_time] : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {mapping.duration ? row.data[mapping.duration] : '-'}
                      </TableCell>
                      <TableCell>
                        {mapping.item_type ? row.data[mapping.item_type] : 'cue'}
                      </TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <span className="text-destructive text-xs">
                            {row.errors[0].message}
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Ready</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {previewRows.length > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing first 50 of {previewRows.length} rows
              </p>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="ghost" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || validRowCount === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {validRowCount} Items
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
