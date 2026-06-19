import { useEffect, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export function useScreenshotProtection() {
  const { screenshotProtection } = useSettings();
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!screenshotProtection) return;

    let blockTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - potential screenshot attempt
        setIsBlocked(true);
        blockTimeout = setTimeout(() => {
          setIsBlocked(false);
        }, 2000);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect common screenshot key combinations
      const isScreenshotKey = 
        (e.key === 'PrintScreen') ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) || // Mac
        (e.ctrlKey && e.key === 'PrintScreen') || // Windows
        (e.metaKey && e.shiftKey && e.key === 's'); // Some systems

      if (isScreenshotKey) {
        e.preventDefault();
        setIsBlocked(true);
        blockTimeout = setTimeout(() => {
          setIsBlocked(false);
        }, 2000);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent right-click context menu
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      if (blockTimeout) clearTimeout(blockTimeout);
    };
  }, [screenshotProtection]);

  return { isBlocked, screenshotProtection };
}
