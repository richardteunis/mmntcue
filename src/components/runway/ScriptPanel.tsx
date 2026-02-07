import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Upload,
  File,
  Loader2,
  X,
  Printer,
  ExternalLink,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface ScriptPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId?: string | null;
}

const ScriptPanel: React.FC<ScriptPanelProps> = ({
  open,
  onOpenChange,
}) => {
  const [zoom, setZoom] = useState(100);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'word' | 'text' | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [prompterWindow, setPrompterWindow] = useState<Window | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { toast } = useToast();

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 25, 200);
    setZoom(newZoom);
    prompterWindow?.postMessage({ type: 'zoom', zoom: newZoom + 50 }, '*');
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 25, 50);
    setZoom(newZoom);
    prompterWindow?.postMessage({ type: 'zoom', zoom: newZoom + 50 }, '*');
  };

  // Render PDF pages to images
  const renderPdfPages = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy) => {
    const images: string[] = [];
    const thumbs: string[] = [];
    const scale = 2;
    const thumbScale = 0.3;
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Full resolution
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        images.push(canvas.toDataURL('image/png'));
      }
      
      // Thumbnail
      const thumbViewport = page.getViewport({ scale: thumbScale });
      const thumbCanvas = document.createElement('canvas');
      const thumbContext = thumbCanvas.getContext('2d');
      if (thumbContext) {
        thumbCanvas.width = thumbViewport.width;
        thumbCanvas.height = thumbViewport.height;
        await page.render({ canvasContext: thumbContext, viewport: thumbViewport }).promise;
        thumbs.push(thumbCanvas.toDataURL('image/jpeg', 0.6));
      }
    }
    
    return { images, thumbs };
  }, []);

  // Load PDF
  const loadPdf = async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setFileType('pdf');
      setHtmlContent(null);
      setTextContent(null);
      
      const { images, thumbs } = await renderPdfPages(pdf);
      setPageImages(images);
      setThumbnails(thumbs);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast({
        title: 'Error loading PDF',
        description: 'Failed to load the document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert Word doc to HTML
  const convertWordDoc = async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      setHtmlContent(result.value);
      setPageImages([]);
      setThumbnails([]);
      setTotalPages(0);
      setFileType('word');
      setTextContent(null);
    } catch (error) {
      console.error('Error converting Word document:', error);
      toast({
        title: 'Error loading document',
        description: 'Failed to convert the Word document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load text file
  const loadTextFile = async (file: File) => {
    setIsLoading(true);
    try {
      const text = await file.text();
      setTextContent(text);
      setPageImages([]);
      setThumbnails([]);
      setTotalPages(0);
      setFileType('text');
      setHtmlContent(null);
    } catch (error) {
      console.error('Error loading text file:', error);
      toast({
        title: 'Error loading file',
        description: 'Failed to read the text file',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    const isPdf = file.type === 'application/pdf';
    const isWord = file.type === 'application/msword' || 
                   file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.name.endsWith('.doc') ||
                   file.name.endsWith('.docx');
    const isText = file.type === 'text/plain' || 
                   file.type === 'text/markdown' ||
                   file.name.endsWith('.txt') ||
                   file.name.endsWith('.md');

    if (!isPdf && !isWord && !isText) {
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

    setFileName(file.name);
    setFileSize(file.size);

    if (isPdf) {
      await loadPdf(file);
    } else if (isWord) {
      await convertWordDoc(file);
    } else {
      await loadTextFile(file);
    }

    toast({
      title: 'Document loaded',
      description: `${file.name} is ready to view`,
    });
  }, [toast, renderPdfPages]);

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
    setFileName(null);
    setFileSize(0);
    setPageImages([]);
    setThumbnails([]);
    setHtmlContent(null);
    setTextContent(null);
    setFileType(null);
    setCurrentPage(1);
    setTotalPages(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const scrollToPage = (pageNum: number) => {
    const pageElement = pageRefs.current[pageNum - 1];
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
      prompterWindow?.postMessage({ type: 'navigate', page: pageNum }, '*');
    }
  };

  const handlePageUp = () => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  };

  const handlePageDown = () => {
    if (currentPage < totalPages) {
      scrollToPage(currentPage + 1);
    }
  };

  // Print functionality
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Print blocked',
        description: 'Please allow popups to print',
        variant: 'destructive',
      });
      return;
    }

    let content = '';
    
    if (fileType === 'pdf') {
      content = pageImages.map((img, i) => 
        `<div style="page-break-after: always; text-align: center;">
          <img src="${img}" style="max-width: 100%; max-height: 100vh;" />
        </div>`
      ).join('');
    } else if (fileType === 'word' && htmlContent) {
      content = `<div style="padding: 40px;">${htmlContent}</div>`;
    } else if (fileType === 'text' && textContent) {
      content = `<pre style="padding: 40px; white-space: pre-wrap; font-family: sans-serif;">${textContent}</pre>`;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${fileName || 'Document'}</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 0.5in; }
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Open prompter window
  const openPrompter = () => {
    const width = 1200;
    const height = 800;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    const newWindow = window.open(
      '/prompter',
      'Prompter',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
    
    if (newWindow) {
      setPrompterWindow(newWindow);
      
      // Listen for ready message
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'prompter-ready') {
          // Send initial data
          newWindow.postMessage({
            type: 'init',
            pageImages,
            htmlContent,
            textContent,
            fileType,
            fileName,
          }, '*');
        }
        if (event.data.type === 'page-change') {
          setCurrentPage(event.data.page);
          scrollToPage(event.data.page);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Clean up on close
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          setPrompterWindow(null);
          window.removeEventListener('message', handleMessage);
          clearInterval(checkClosed);
        }
      }, 1000);
    } else {
      toast({
        title: 'Popup blocked',
        description: 'Please allow popups to open the prompter',
        variant: 'destructive',
      });
    }
  };

  // Track scroll position to update current page
  useEffect(() => {
    if (fileType !== 'pdf' || pageImages.length === 0) return;

    const handleScroll = () => {
      const container = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      
      for (let i = 0; i < pageRefs.current.length; i++) {
        const pageEl = pageRefs.current[i];
        if (pageEl) {
          const rect = pageEl.getBoundingClientRect();
          if (rect.top <= containerRect.top + 100 && rect.bottom > containerRect.top + 100) {
            if (currentPage !== i + 1) {
              setCurrentPage(i + 1);
            }
            break;
          }
        }
      }
    };

    const container = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [fileType, pageImages, currentPage]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PageDown' || (e.key === 'ArrowDown' && e.ctrlKey)) {
        e.preventDefault();
        handlePageDown();
      }
      if (e.key === 'PageUp' || (e.key === 'ArrowUp' && e.ctrlKey)) {
        e.preventDefault();
        handlePageUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentPage, totalPages]);

  const hasContent = fileName && (pageImages.length > 0 || htmlContent || textContent);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={cn(
          "p-0 flex flex-col border-l border-border",
          isFullscreen ? "w-full sm:max-w-full" : "w-[600px] sm:max-w-[600px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-base font-semibold">Script</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <span className="text-sm text-muted-foreground min-w-[48px] text-center font-mono">
              {zoom}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
            <div className="w-px h-4 bg-border mx-1" />
            {hasContent && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handlePrint}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Print</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-8 w-8 p-0", prompterWindow && "text-primary")}
                      onClick={openPrompter}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {prompterWindow ? 'Prompter Open' : 'Open Prompter'}
                  </TooltipContent>
                </Tooltip>
                <div className="w-px h-4 bg-border mx-1" />
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
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

        {/* Navigation Bar */}
        {hasContent && (
          <div className="flex items-center justify-center gap-4 px-4 py-2 border-b border-border bg-muted/50 shrink-0">
            {fileType === 'pdf' && thumbnails.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => setShowThumbnails(!showThumbnails)}
                  >
                    {showThumbnails ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'}</TooltipContent>
              </Tooltip>
            )}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-1.5"
                onClick={handlePageUp}
                disabled={fileType !== 'pdf' || currentPage <= 1}
              >
                <ChevronUp className="h-4 w-4" />
                Up
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-1.5"
                onClick={handlePageDown}
                disabled={fileType !== 'pdf' || currentPage >= totalPages}
              >
                <ChevronDown className="h-4 w-4" />
                Down
              </Button>
            </div>
            {fileType === 'pdf' && totalPages > 0 && (
              <>
                <div className="w-px h-4 bg-border" />
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
              </>
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
        <div className="flex-1 min-h-0 overflow-hidden bg-muted/30 flex">
          {/* Thumbnail Sidebar */}
          {hasContent && fileType === 'pdf' && showThumbnails && thumbnails.length > 0 && (
            <div className="w-24 border-r border-border bg-background shrink-0">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-2">
                  {thumbnails.map((thumb, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToPage(index + 1)}
                      className={cn(
                        "w-full rounded overflow-hidden border-2 transition-colors",
                        currentPage === index + 1 
                          ? "border-primary" 
                          : "border-transparent hover:border-primary/50"
                      )}
                    >
                      <img 
                        src={thumb} 
                        alt={`Page ${index + 1}`}
                        className="w-full h-auto"
                      />
                      <div className="text-xs text-muted-foreground py-1">
                        {index + 1}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {!fileName ? (
              /* Upload Area */
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
                        PDF, Word (.doc, .docx), TXT, MD
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
            ) : (
              /* Document Content */
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="p-4 flex flex-col items-center gap-4">
                  {/* PDF Pages */}
                  {fileType === 'pdf' && pageImages.map((imgSrc, index) => (
                    <div 
                      key={index}
                      ref={el => pageRefs.current[index] = el}
                      className="bg-card rounded-lg shadow-lg overflow-hidden"
                      style={{ width: `${zoom}%`, maxWidth: '100%' }}
                    >
                      <img 
                        src={imgSrc} 
                        alt={`Page ${index + 1}`}
                        className="w-full h-auto block"
                        draggable={false}
                      />
                    </div>
                  ))}

                  {/* Word Document Content */}
                  {fileType === 'word' && htmlContent && (
                    <div 
                      className="bg-card rounded-lg shadow-lg overflow-hidden w-full max-w-[800px]"
                      style={{ fontSize: `${zoom}%` }}
                    >
                      <div 
                        className="p-8 prose prose-sm max-w-none dark:prose-invert
                          prose-headings:font-bold
                          prose-p:leading-relaxed
                          prose-a:text-primary"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                      />
                    </div>
                  )}

                  {/* Text Content */}
                  {fileType === 'text' && textContent && (
                    <div 
                      className="bg-card rounded-lg shadow-lg overflow-hidden w-full max-w-[800px]"
                      style={{ fontSize: `${zoom}%` }}
                    >
                      <div className="p-8">
                        <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-card-foreground">
                          {textContent}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Footer */}
        {fileName && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {fileName}
              </span>
              {prompterWindow && (
                <span className="text-xs text-primary">• Prompter Active</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {(fileSize / 1024).toFixed(1)} KB
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ScriptPanel;
