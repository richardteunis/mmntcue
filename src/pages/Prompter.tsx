import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, ChevronUp, ChevronDown, FlipHorizontal2 } from 'lucide-react';

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
  const [isMirrored, setIsMirrored] = useState(false);
  
  const scrollPositionRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
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

  // Auto-scroll animation using requestAnimationFrame
  const animate = useCallback((timestamp: number) => {
    if (lastTimestampRef.current === null) {
      lastTimestampRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;

    // Calculate scroll amount: speed (px/sec) * time (sec)
    const scrollDelta = (autoScrollSpeed * deltaTime) / 1000;
    scrollPositionRef.current += scrollDelta;
    
    window.scrollTo(0, scrollPositionRef.current);

    // Check if at bottom
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollPositionRef.current >= maxScroll) {
      setIsAutoScrolling(false);
      return;
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [autoScrollSpeed]);

  // Start/stop auto-scroll
  useEffect(() => {
    if (isAutoScrolling) {
      // Initialize scroll position
      scrollPositionRef.current = window.scrollY;
      lastTimestampRef.current = null;
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAutoScrolling, animate]);

  // Update animation when speed changes while scrolling
  useEffect(() => {
    if (isAutoScrolling && animationFrameRef.current !== null) {
      // Cancel current animation and restart with new speed
      cancelAnimationFrame(animationFrameRef.current);
      scrollPositionRef.current = window.scrollY;
      lastTimestampRef.current = null;
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [autoScrollSpeed, isAutoScrolling, animate]);

  const toggleAutoScroll = () => {
    setIsAutoScrolling(prev => !prev);
  };

  const adjustSpeed = (delta: number) => {
    setAutoScrollSpeed(prev => Math.max(10, Math.min(200, prev + delta)));
  };

  const toggleMirror = () => {
    setIsMirrored(prev => !prev);
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
      // M for mirror mode
      if (e.key === 'm' || e.key === 'M') {
        toggleMirror();
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
    <div 
      className="min-h-screen bg-black" 
      ref={contentRef}
      style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
    >
      {/* Header */}
      <div className={cn(
        "fixed top-0 left-0 right-0 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-2 z-50 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm font-medium tracking-wider">PROMPTER</span>
            {isMirrored && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">MIRROR</span>
            )}
          </div>
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
      <div 
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ transform: isMirrored ? 'translateX(50%) scaleX(-1)' : 'translateX(-50%)' }}
      >
        {/* Mirror toggle */}
        <button
          onClick={toggleMirror}
          className={cn(
            "p-3 rounded-full transition-colors",
            isMirrored 
              ? "bg-blue-500 hover:bg-blue-600" 
              : "bg-white/10 hover:bg-white/20"
          )}
          title="Mirror Mode (M)"
        >
          <FlipHorizontal2 className="h-5 w-5 text-white" />
        </button>

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
            P Auto • M Mirror • ↑↓ Nav • [/] Speed • H Hide
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
