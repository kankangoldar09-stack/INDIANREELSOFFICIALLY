import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    // If it's iOS and not already in standalone mode, show instructions
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isIOSDevice && !isStandalone) {
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
      if (!isDismissed) {
        setIsVisible(true);
      }
    }

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsVisible(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      toast.info('To install on iOS: Tap the share button below and "Add to Home Screen"');
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in slide-in-from-bottom-full duration-500">
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-zinc-700 shadow-lg">
          <img 
            src="https://miaoda-site-img.s3cdn.medo.dev/images/KLing_11217502-2c1a-4201-82ab-a0b60f6f3453.jpg" 
            alt="INDIANREELS Icon" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm truncate">Install INDIANREELS</h3>
          <p className="text-zinc-400 text-xs line-clamp-1">
            {isIOS ? 'Tap Share and "Add to Home Screen"' : 'Install our app for a better experience'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={handleInstall}
            className="bg-[#FE2C55] hover:bg-[#E62A4D] text-white font-bold px-4 rounded-full h-9"
          >
            {isIOS ? (
              <Share className="w-4 h-4 mr-1.5" />
            ) : (
              <Download className="w-4 h-4 mr-1.5" />
            )}
            {isIOS ? 'Guide' : 'Install'}
          </Button>
          
          <button 
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
