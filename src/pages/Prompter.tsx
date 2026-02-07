import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Play, Pause, Settings, ChevronUp, ChevronDown } from 'lucide-react';

interface PrompterMessage {
  type: 'navigate' | 'zoom' | 'scroll' | 'init' | 'cue-fired' | 'auto-scroll-settings';
  page?: number;
  zoom?: number;
  scrollPosition?: number;
  pageImages?: string[];
  htmlContent?: string;
  textContent?: string;
  fileType?: 'pdf' | 'word' | 'text';
  fileName?: string;
  cueId?: string;
  cuePageLinks?: { cueId: string; pageNumber: number }[];
  autoScrollSpeed?: number;
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
  const [cuePageLinks, setCuePageLinks] = useState<{ cueId: string; pageNumber: number }[]>([]);
  
  // Auto-scroll state
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(30); // pixels per second
  const [showControls, setShowControls] = useState(true);
  const autoScrollRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);

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
        if (data.cuePageLinks) setCuePageLinks(data.cuePageLinks);
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

      // Handle cue fired - auto-advance to linked page
      if (data.type === 'cue-fired' && data.cueId) {
        const link = cuePageLinks.find(l => l.cueId === data.cueId);
        if (link) {
          setCurrentPage(link.pageNumber);
          scrollToPage(link.pageNumber);
        }
      }

      if (data.type === 'auto-scroll-settings' && data.autoScrollSpeed !== undefined) {
        setAutoScrollSpeed(data.autoScrollSpeed);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify opener we're ready
    if (window.opener) {
      window.opener.postMessage({ type: 'prompter-ready' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [cuePageLinks]);

  const scrollToPage = (pageNum: number) => {
    const pageElement = document.getElementById(`prompter-page-${pageNum}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Auto-scroll animation loop
  const animateScroll = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Calculate scroll amount based on speed (pixels per second)
    const scrollAmount = (autoScrollSpeed * deltaTime) / 1000;
    
    window.scrollBy({
      top: scrollAmount,
      behavior: 'auto'
    });

    // Check if we've reached the bottom
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY >= maxScroll - 10) {
      setIsAutoScrolling(false);
      return;
    }

    if (isAutoScrolling) {
      autoScrollRef.current = requestAnimationFrame(animateScroll);
    }
  }, [autoScrollSpeed, isAutoScrolling]);

  // Start/stop auto-scroll
  useEffect(() => {
    if (isAutoScrolling) {
      lastTimeRef.current = 0;
      autoScrollRef.current = requestAnimationFrame(animateScroll);
    } else {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    }

    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
      }
    };
  }, [isAutoScrolling, animateScroll]);

  const toggleAutoScroll = () => {
    setIsAutoScrolling(prev => !prev);
  };

  const adjustSpeed = (delta: number) => {
    setAutoScrollSpeed(prev => Math.max(10, Math.min(200, prev + delta)));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space toggles auto-scroll when not in input
      if (e.key === ' ' && !isAutoScrolling) {
        e.preventDefault();
        if (fileType === 'pdf' && currentPage < pageImages.length) {
          const newPage = currentPage + 1;
          setCurrentPage(newPage);
          scrollToPage(newPage);
          window.opener?.postMessage({ type: 'page-change', page: newPage }, '*');
        }
      }
      
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (fileType === 'pdf' && currentPage < pageImages.length) {
          const newPage = currentPage + 1;
          setCurrentPage(newPage);
          scrollToPage(newPage);
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
      // P for play/pause auto-scroll
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        toggleAutoScroll();
      }
      // [ and ] for speed
      if (e.key === '[') {
        adjustSpeed(-10);
      }
      if (e.key === ']') {
        adjustSpeed(10);
      }
      // H to hide/show controls
      if (e.key === 'h' || e.key === 'H') {
        setShowControls(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pageImages.length, fileType, isAutoScrolling]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-pulse text-2xl mb-4">Connecting to Script Panel...</div>
          <p className="text-white/60">Open the Script panel in the main window to connect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black" ref={contentRef}>
      {/* Header */}
      <div className={cn(
        "fixed top-0 left-0 right-0 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-2 z-50 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <span className="text-white/60 text-sm font-medium tracking-wider">PROMPTER</span>
          <span className="text-white/80 text-sm truncate max-w-[200px]">{fileName}</span>
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
      <div className={cn("pb-24", showControls ? "pt-16" : "pt-4")}>
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

      {/* Auto-scroll Controls */}
      <div className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {/* Speed control */}
        <div className="bg-black/90 backdrop-blur px-3 py-2 rounded-full flex items-center gap-2">
          <button 
            onClick={() => adjustSpeed(-10)}
            className="text-white/60 hover:text-white p-1"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="text-white/80 text-sm min-w-[60px] text-center">
            {autoScrollSpeed} px/s
          </span>
          <button 
            onClick={() => adjustSpeed(10)}
            className="text-white/60 hover:text-white p-1"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        {/* Play/Pause */}
        <button
          onClick={toggleAutoScroll}
          className={cn(
            "p-4 rounded-full transition-colors",
            isAutoScrolling 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-green-500 hover:bg-green-600"
          )}
        >
          {isAutoScrolling ? (
            <Pause className="h-6 w-6 text-white" />
          ) : (
            <Play className="h-6 w-6 text-white" />
          )}
        </button>

        {/* Keyboard hints */}
        <div className="bg-black/90 backdrop-blur px-4 py-2 rounded-full">
          <span className="text-white/50 text-xs">
            P Auto • ↑↓ Nav • +/- Zoom • H Hide
          </span>
        </div>
      </div>

      {/* Auto-scroll indicator when controls hidden */}
      {!showControls && isAutoScrolling && (
        <div className="fixed top-4 right-4 w-3 h-3 rounded-full bg-green-500 animate-pulse" />
      )}
    </div>
  );
};

export default Prompter;
