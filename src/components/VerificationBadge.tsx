import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';

interface VerificationBadgeProps {
  className?: string;
  size?: number;
}

// Cache for badge settings
let cachedBadgeUrl: string | null = null;
let cachedBadgeSize: number | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export function VerificationBadge({ className, size }: VerificationBadgeProps) {
  const [badgeUrl, setBadgeUrl] = useState<string>(
    cachedBadgeUrl || 'https://miaoda-conversation-file.s3cdn.medo.dev/user-a802e9kq6vpc/conv-af2z7g8d924g/20260508/file-bhczn854tpts.png'
  );
  const [badgeSize, setBadgeSize] = useState<number>(cachedBadgeSize || size || 16);

  useEffect(() => {
    const fetchBadgeSettings = async () => {
      const now = Date.now();
      
      // Use cache if available and fresh
      if (cachedBadgeUrl && cachedBadgeSize && (now - lastFetchTime) < CACHE_DURATION) {
        setBadgeUrl(cachedBadgeUrl);
        setBadgeSize(size || cachedBadgeSize);
        return;
      }

      try {
        const { data } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['verification_badge_url', 'verification_badge_size']);

        if (data) {
          const urlSetting = (data as any[]).find(s => s.setting_key === 'verification_badge_url');
          const sizeSetting = (data as any[]).find(s => s.setting_key === 'verification_badge_size');

          if (urlSetting) {
            cachedBadgeUrl = urlSetting.setting_value;
            setBadgeUrl(urlSetting.setting_value);
          }
          if (sizeSetting) {
            cachedBadgeSize = parseInt(sizeSetting.setting_value);
            setBadgeSize(size || parseInt(sizeSetting.setting_value));
          }

          lastFetchTime = now;
        }
      } catch (error) {
        console.error('Failed to fetch badge settings:', error);
      }
    };

    fetchBadgeSettings();
  }, [size]);

  return (
    <img 
      src={badgeUrl}
      alt="Verified" 
      className={cn("inline-block", className)} 
      width={badgeSize}
      height={badgeSize}
      style={{ 
        objectFit: 'contain',
        filter: 'drop-shadow(0 0 3px rgba(255, 165, 0, 0.5))'
      }}
    />
  );
}
