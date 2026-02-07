import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  ChevronUp, 
  ChevronDown, 
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Search,
  Trash2,
  Upload,
  File,
  Loader2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface ScriptPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId?: string | null;
}

interface UploadedDoc {
  name: string;
  type: string;
  file: File;
  size: number;
}

const ScriptPanel: React.FC<ScriptPanelProps> = ({
  open,
  onOpenChange,
  showId,
}) => {
  const [zoom, setZoom] = useState(100);
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDoc | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));

  // Render PDF page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const scale = zoom / 100;
      const viewport = page.getViewport({ scale: scale * 1.5 });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (error) {
      console.error('Error rendering PDF page:', error);
    }
  }, [pdfDoc, zoom]);

  // Load PDF when document changes
  useEffect(() => {
    if (!uploadedDoc || uploadedDoc.type !== 'application/pdf') return;

    const loadPdf = async () => {
      setIsLoading(true);
      try {
        const arrayBuffer = await uploadedDoc.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setTextContent(null);
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast({
          title: 'Error loading PDF',
          description: 'Failed to load the PDF document',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [uploadedDoc, toast]);

  // Render page when current page or zoom changes
  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [currentPage, zoom, pdfDoc, renderPage]);

  // Load text file content
  useEffect(() => {
    if (!uploadedDoc) return;
    
    const textTypes = ['text/plain', 'text/markdown'];
    const isTextFile = textTypes.includes(uploadedDoc.type) || 
                       uploadedDoc.name.endsWith('.md') || 
                       uploadedDoc.name.endsWith('.txt');
    
    if (isTextFile) {
      uploadedDoc.file.text().then(content => {
        setTextContent(content);
        setPdfDoc(null);
        setTotalPages(0);
      });
    }
  }, [uploadedDoc]);

  const handleFileUpload = useCallback(async (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    const isValid = validTypes.includes(file.type) || 
                    file.name.endsWith('.md') || 
                    file.name.endsWith('.txt');

    if (!isValid) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF, Word document, or text file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 50MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadedDoc({
      name: file.name,
      type: file.type,
      file: file,
      size: file.size,
    });

    toast({
      title: 'Document uploaded',
      description: `${file.name} has been loaded`,
    });
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClear = () => {
    setUploadedDoc(null);
    setPdfDoc(null);
    setTextContent(null);
    setCurrentPage(1);
    setTotalPages(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePageUp = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handlePageDown = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const isPdf = uploadedDoc?.type === 'application/pdf';
  const isWordDoc = uploadedDoc?.type === 'application/msword' || 
                    uploadedDoc?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={cn(
          "p-0 flex flex-col border-l border-border",
          isFullscreen ? "w-full sm:max-w-full" : "w-[560px] sm:max-w-[560px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-base font-semibold">Script</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[48px] text-center font-mono">
              {zoom}%
            </span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Bar - Only show when document is loaded */}
        {uploadedDoc && (
          <div className="flex items-center justify-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-1"
                onClick={handlePageUp}
                disabled={!isPdf || currentPage <= 1}
              >
                <ChevronUp className="h-4 w-4" />
                Up
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-1"
                onClick={handlePageDown}
                disabled={!isPdf || currentPage >= totalPages}
              >
                <ChevronDown className="h-4 w-4" />
                Down
              </Button>
            </div>
            {isPdf && totalPages > 0 && (
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
            )}
            <div className="w-px h-4 bg-border" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-muted-foreground hover:text-destructive"
              onClick={handleClear}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden" ref={containerRef}>
          {!uploadedDoc ? (
            /* Upload Area - Show when no document */
            <div 
              className={cn(
                "h-full flex flex-col items-center justify-center p-8 transition-colors",
                isDragging ? "bg-primary/5" : "bg-background"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div 
                className={cn(
                  "w-full max-w-sm border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer",
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="p-4 rounded-full bg-muted">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-base font-medium">
                      <span className="text-primary">Click to upload</span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF, Word, TXT, MD (max 50MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            /* Loading State */
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Loading document...</p>
            </div>
          ) : isPdf ? (
            /* PDF Viewer */
            <ScrollArea className="h-full">
              <div className="flex justify-center p-4 bg-muted/20 min-h-full">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <canvas ref={canvasRef} className="block" />
                </div>
              </div>
            </ScrollArea>
          ) : textContent ? (
            /* Text/Markdown Viewer */
            <ScrollArea className="h-full">
              <div className="p-6 bg-muted/20 min-h-full">
                <div 
                  className="bg-white rounded-lg shadow-lg p-8 prose prose-sm dark:prose-invert max-w-none"
                  style={{ fontSize: `${zoom}%` }}
                >
                  <pre className="whitespace-pre-wrap font-sans text-foreground">{textContent}</pre>
                </div>
              </div>
            </ScrollArea>
          ) : isWordDoc ? (
            /* Word Doc Placeholder */
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-sm">
                <File className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">{uploadedDoc.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Word document preview requires conversion. 
                  For best results, please convert to PDF before uploading.
                </p>
                <p className="text-xs text-muted-foreground">
                  File Size: {(uploadedDoc.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer - Document info */}
        {uploadedDoc && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {uploadedDoc.name}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {(uploadedDoc.size / 1024).toFixed(1)} KB
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ScriptPanel;
