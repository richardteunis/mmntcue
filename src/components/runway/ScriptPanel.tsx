import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  ChevronUp, 
  ChevronDown, 
  Maximize2, 
  X, 
  ZoomIn,
  ZoomOut,
  Search,
  Trash2
} from 'lucide-react';

interface ScriptPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId?: string | null;
}

const ScriptPanel: React.FC<ScriptPanelProps> = ({
  open,
  onOpenChange,
  showId,
}) => {
  const [zoom, setZoom] = useState(100);
  
  // Mock script content - in production this would come from uploaded docs
  const scriptContent = `
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
| 7:15 to 8:00 | Elvis Opening with Viva Las Vegas |
| | Sinatra/Elvis ping pong |
| 8:00 to 8:10 | Welcome Susan Fichner |
| 8:10 to 8:20 | First Game - Game Squad (House of Cards) |
| 8:20 to 8:35 | [Year in Review Video](#) |
| 8:35 to 9:00 | Opening Comments - **Tony Lamb (Founder & CEO)** |
| | [Nostalgia Video](#) Plays in the Middle of Tony Speaking |
| 9:00 to 9:05 | Introduction of Darrell Joyce - Tony |
| 9:05 to 9:50 | Darrell Joyce |
| 9:50 to 10:00 | Susan returns to stage to dismiss and give morning instructions |
`;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-[480px] sm:max-w-[480px] p-0 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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
              <ChevronUp className="h-3.5 w-3.5" />
              <span className="sr-only">Up</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleZoomIn}>
              <ChevronDown className="h-3.5 w-3.5" />
              <span className="sr-only">Down</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div 
            className="p-6 prose prose-sm dark:prose-invert max-w-none"
            style={{ fontSize: `${zoom}%` }}
          >
            {/* Render as formatted markdown-like content */}
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
                  <div className="flex gap-4">
                    <span className="text-muted-foreground w-32">Game Squad Needs:</span>
                    <span></span>
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
                        <td className="px-3 py-2 text-muted-foreground">7:15 to 8:00</td>
                        <td className="px-3 py-2">Elvis Opening with Viva Las Vegas</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground"></td>
                        <td className="px-3 py-2">Sinatra/Elvis ping pong</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">8:00 to 8:10</td>
                        <td className="px-3 py-2">Welcome Susan Fichner</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">8:10 to 8:20</td>
                        <td className="px-3 py-2">First Game - Game Squad (House of Cards)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">8:20 to 8:35</td>
                        <td className="px-3 py-2">
                          <a href="#" className="text-primary hover:underline">Year in Review Video</a>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">8:35 to 9:00</td>
                        <td className="px-3 py-2">
                          Opening Comments - <strong className="text-primary">Tony Lamb (Founder & CEO)</strong>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground"></td>
                        <td className="px-3 py-2">
                          <a href="#" className="text-primary hover:underline">Nostalgia Video</a> Plays in the Middle of Tony Speaking
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">9:00 to 9:05</td>
                        <td className="px-3 py-2">Introduction of Darrell Joyce - Tony</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">9:05 to 9:50</td>
                        <td className="px-3 py-2">Darrell Joyce</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground">9:50 to 10:00</td>
                        <td className="px-3 py-2">Susan returns to stage to dismiss and give morning instructions</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {showId ? 'Linked to current show' : 'No show selected'}
          </span>
          <Button variant="ghost" size="sm" className="text-xs h-7">
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ScriptPanel;
