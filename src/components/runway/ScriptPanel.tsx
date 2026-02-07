import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  ChevronUp, 
  ChevronDown, 
  Maximize2, 
  ZoomIn,
  ZoomOut,
  Search,
  Trash2,
  Upload,
  File
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScriptPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId?: string | null;
}

interface UploadedDoc {
  name: string;
  type: string;
  content: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  const handleFileUpload = useCallback(async (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.md')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF, Word document, or text file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      let content = '';
      
      if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md')) {
        content = await file.text();
      } else {
        // For PDFs and Word docs, show placeholder - would need parsing library
        content = `[Document: ${file.name}]\n\nPDF and Word document preview requires additional processing.\n\nFile Size: ${(file.size / 1024).toFixed(1)} KB`;
      }

      setUploadedDoc({
        name: file.name,
        type: file.type,
        content,
        size: file.size,
      });

      toast({
        title: 'Document uploaded',
        description: `${file.name} has been loaded`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to read the document',
        variant: 'destructive',
      });
    }
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
  };

  // Mock script content for demo
  const defaultContent = `
# Konvention Schedule

---

## Thursday Evening

**7:15 to 10:00**

| Time | Description |
|------|-------------|
| Video Content: | Year In Review & Kona Nostalgia |
| Main Stage Needs: | Podium |
| Game Squad Needs: | |

### Sponsors of the Day:
- **Snack**: Sunny Sky & Samsara
- **Notebook**: Decal Impressions
- **Dinner**: Cornerstone Insurance & Veritiv

---

## Agenda

**Doors COULD open at 7:00**

| Time | Event |
|------|-------|
| 7:15 to 8:00 | Doors Open, Coffee and Kona Served |
| 8:00 to 8:10 | Welcome Susan Fichner |
| 8:10 to 8:20 | First Game - Game Squad (House of Cards) |
| 8:20 to 8:35 | Year in Review Video |
| 8:35 to 9:00 | Opening Comments - Tony Lamb (Founder & CEO) |
| 9:00 to 9:05 | Introduction of Darrell Joyce - Tony |
| 9:05 to 9:50 | Darrell Joyce |
| 9:50 to 10:00 | Susan returns to stage to dismiss |
`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-[480px] sm:max-w-[480px] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <SheetTitle className="text-base">Script</SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Search className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">{zoom}%</span>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleZoomOut}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleZoomIn}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Upload Area */}
        <div 
          className={cn(
            "mx-4 mt-3 border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-primary font-medium">Click to upload</span>
              <span className="text-muted-foreground"> or drag and drop</span>
            </div>
            <p className="text-xs text-muted-foreground">PDF, Word, TXT, MD (max 10MB)</p>
          </div>
        </div>

        {/* Document indicator */}
        {uploadedDoc && (
          <div className="mx-4 mt-2 flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <File className="h-4 w-4 text-primary" />
            <span className="text-sm flex-1 truncate">{uploadedDoc.name}</span>
            <span className="text-xs text-muted-foreground">
              {(uploadedDoc.size / 1024).toFixed(1)} KB
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleClear}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1 mt-3">
          <div 
            className="p-6 prose prose-sm dark:prose-invert max-w-none"
            style={{ fontSize: `${zoom}%` }}
          >
            {uploadedDoc ? (
              <pre className="whitespace-pre-wrap font-sans text-sm">{uploadedDoc.content}</pre>
            ) : (
              <div className="space-y-4">
                <h1 className="text-xl font-bold border-b pb-2">Konvention Schedule</h1>
                
                <section>
                  <h2 className="text-lg font-semibold">Thursday Evening</h2>
                  <p className="text-sm text-muted-foreground">7:15 to 10:00</p>
                  
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex gap-4">
                      <span className="text-muted-foreground w-32">Video Content:</span>
                      <span>Year In Review & Kona Nostalgia</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground w-32">Main Stage Needs:</span>
                      <span>Podium</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-medium">Sponsors of the Day:</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li><strong>Snack</strong>: Sunny Sky & Samsara</li>
                    <li><strong>Notebook</strong>: Decal Impressions</li>
                    <li><strong>Dinner</strong>: Cornerstone Insurance & Veritiv</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold">Agenda</h2>
                  <p className="text-sm font-medium text-runway-warning">Doors COULD open at 7:00</p>
                  
                  <div className="mt-3 border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b">
                          <td className="px-3 py-2 text-muted-foreground w-28">7:15 to 8:00</td>
                          <td className="px-3 py-2">Doors Open, Coffee and Kona Served</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-2 text-muted-foreground">8:00 to 8:10</td>
                          <td className="px-3 py-2">Welcome Susan Fichner</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-2 text-muted-foreground">8:10 to 8:20</td>
                          <td className="px-3 py-2">First Game - Game Squad</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-2 text-muted-foreground">8:20 to 8:35</td>
                          <td className="px-3 py-2">
                            <span className="text-primary">Year in Review Video</span>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-2 text-muted-foreground">8:35 to 9:00</td>
                          <td className="px-3 py-2">
                            Opening Comments - <strong className="text-primary">Tony Lamb</strong>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-2 text-muted-foreground">9:00 to 9:50</td>
                          <td className="px-3 py-2">Darrell Joyce</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-muted-foreground">9:50 to 10:00</td>
                          <td className="px-3 py-2">Susan returns to dismiss</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {uploadedDoc ? uploadedDoc.name : 'Sample script'}
          </span>
          {uploadedDoc && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleClear}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ScriptPanel;
