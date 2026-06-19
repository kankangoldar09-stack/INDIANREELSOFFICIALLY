import { usePrivacyShutter } from '@/contexts/PrivacyShutterContext';
import { cn } from '@/lib/utils';

export function PrivacyOverlay() {
  const { isStrangerDetected } = usePrivacyShutter();

  if (!isStrangerDetected) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-3xl bg-background/95" />
      
      {/* Fake News Feed */}
      <div className="absolute inset-0 overflow-hidden p-4 pointer-events-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Fake Header */}
          <div className="flex items-center justify-between p-4 bg-card rounded-lg">
            <h1 className="text-2xl font-bold">INDIANREELS</h1>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            </div>
          </div>

          {/* Fake Posts */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded animate-pulse w-full" />
                <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-3 bg-muted rounded animate-pulse w-4/6" />
              </div>
              <div className="aspect-video bg-muted rounded animate-pulse" />
              <div className="flex gap-4 pt-2">
                <div className="h-8 bg-muted rounded animate-pulse w-16" />
                <div className="h-8 bg-muted rounded animate-pulse w-16" />
                <div className="h-8 bg-muted rounded animate-pulse w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warning Badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className={cn(
          "bg-destructive text-destructive-foreground px-4 py-2 rounded-full",
          "flex items-center gap-2 shadow-lg animate-pulse"
        )}>
          <span className="text-lg">⚠️</span>
          <span className="font-bold text-sm">Privacy Mode Active</span>
        </div>
      </div>
    </div>
  );
}
