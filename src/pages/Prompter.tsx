import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PrompterMessage {
  type: 'navigate' | 'zoom' | 'scroll' | 'init';
  page?: number;
  zoom?: number;
  scrollPosition?: number;
  pageImages?: string[];
  htmlContent?: string;
  textContent?: string;
  fileType?: 'pdf' | 'word' | 'text';
  fileName?: string;
}

const Prompter: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'word' | 'text' | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(150);
  const [isConnected, setIsConnected] = useState(false);

  // Listen for messages from parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as PrompterMessage;
      
      if (data.type === 'init') {
        if (data.pageImages) setPageImages(data.pageImages);
        if (data.htmlContent) setHtmlContent(data.htmlContent);
        if (data.textContent) setTextContent(data.textContent);
        if (data.fileType) setFileType(data.fileType);
        if (data.fileName) setFileName(data.fileName);
        setIsConnected(true);
      }
      
      if (data.type === 'navigate' && data.page) {
        setCurrentPage(data.page);
        scrollToPage(data.page);
      }
      
      if (data.type === 'zoom' && data.zoom) {
        setZoom(data.zoom);
      }
      
      if (data.type === 'scroll' && data.scrollPosition !== undefined) {
        window.scrollTo({ top: data.scrollPosition, behavior: 'smooth' });
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify opener we're ready
    if (window.opener) {
      window.opener.postMessage({ type: 'prompter-ready' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const scrollToPage = (pageNum: number) => {
    const pageElement = document.getElementById(`prompter-page-${pageNum}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        if (currentPage < pageImages.length) {
          const newPage = currentPage + 1;
          setCurrentPage(newPage);
          scrollToPage(newPage);
          // Notify parent
          window.opener?.postMessage({ type: 'page-change', page: newPage }, '*');
        }
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentPage > 1) {
          const newPage = currentPage - 1;
          setCurrentPage(newPage);
          scrollToPage(newPage);
          window.opener?.postMessage({ type: 'page-change', page: newPage }, '*');
        }
      }
      if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(prev + 25, 300));
      }
      if (e.key === '-') {
        setZoom(prev => Math.max(prev - 25, 50));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pageImages.length]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="animate-pulse text-2xl mb-4">Connecting to Script Panel...</div>
          <p className="text-muted-foreground">Open the Script panel in the main window to connect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-2 z-50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <span className="text-white/60 text-sm font-medium">PROMPTER</span>
          <span className="text-white/80 text-sm">{fileName}</span>
          <div className="flex items-center gap-4">
            {fileType === 'pdf' && (
              <span className="text-white/60 text-sm">
                Page {currentPage} of {pageImages.length}
              </span>
            )}
            <span className="text-white/60 text-sm">{zoom}%</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-16 pb-8">
        <div className="flex flex-col items-center gap-8 px-4">
          {/* PDF Pages */}
          {fileType === 'pdf' && pageImages.map((imgSrc, index) => (
            <div 
              key={index}
              id={`prompter-page-${index + 1}`}
              className="bg-white rounded-lg shadow-2xl overflow-hidden"
              style={{ width: `${zoom}%`, maxWidth: '95vw' }}
            >
              <img 
                src={imgSrc} 
                alt={`Page ${index + 1}`}
                className="w-full h-auto block"
                draggable={false}
              />
            </div>
          ))}

          {/* Word Document */}
          {fileType === 'word' && htmlContent && (
            <div 
              className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-4xl"
              style={{ fontSize: `${zoom}%` }}
            >
              <div 
                className="p-12 prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          )}

          {/* Text Content */}
          {fileType === 'text' && textContent && (
            <div 
              className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-4xl"
              style={{ fontSize: `${zoom}%` }}
            >
              <div className="p-12">
                <pre className="whitespace-pre-wrap font-sans text-xl leading-relaxed">
                  {textContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-4 py-2 rounded-full">
        <span className="text-white/50 text-xs">
          ↑↓ Navigate • +/- Zoom • Space Next Page
        </span>
      </div>
    </div>
  );
};

export default Prompter;
