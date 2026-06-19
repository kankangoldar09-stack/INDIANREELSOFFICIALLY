import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/db/supabase';

interface SettingsContextType {
  globalBgColor: string;
  updateGlobalBgColor: (color: string) => Promise<void>;
  fontSize: string;
  updateFontSize: (size: string) => Promise<void>;
  defaultVideoQuality: string;
  updateDefaultVideoQuality: (quality: string) => Promise<void>;
  dataSaverMode: boolean;
  updateDataSaverMode: (enabled: boolean) => Promise<void>;
  autoplayLimit: number;
  updateAutoplayLimit: (limit: number) => Promise<void>;
  hideViewsPref: boolean;
  updateHideViewsPref: (enabled: boolean) => Promise<void>;
  readReceiptsEnabled: boolean;
  updateReadReceiptsEnabled: (enabled: boolean) => Promise<void>;
  isPrivate: boolean;
  updateIsPrivate: (enabled: boolean) => Promise<void>;
  aiAutoPilotEnabled: boolean;
  updateAIAutoPilotEnabled: (enabled: boolean) => Promise<void>;
  chatBackgroundUrl: string | null;
  updateChatBackgroundUrl: (url: string | null) => Promise<void>;
  chatBackgroundStyle: string | null;
  updateChatBackgroundStyle: (style: string | null) => Promise<void>;
  themeColor: string;
  updateThemeColor: (color: string) => Promise<void>;
  theme: 'light' | 'dark' | 'system';
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  screenshotProtection: boolean;
  updateScreenshotProtection: (enabled: boolean) => Promise<void>;
  autoDownloadMedia: boolean;
  updateAutoDownloadMedia: (enabled: boolean) => Promise<void>;
  notificationSounds: boolean;
  updateNotificationSounds: (enabled: boolean) => Promise<void>;
  showOnlineStatus: boolean;
  updateShowOnlineStatus: (enabled: boolean) => Promise<void>;
  likesNotifications: boolean;
  updateLikesNotifications: (enabled: boolean) => Promise<void>;
  commentsNotifications: boolean;
  updateCommentsNotifications: (enabled: boolean) => Promise<void>;
  followNotifications: boolean;
  updateFollowNotifications: (enabled: boolean) => Promise<void>;
  messagesNotifications: boolean;
  updateMessagesNotifications: (enabled: boolean) => Promise<void>;
  reelsNotifications: boolean;
  updateReelsNotifications: (enabled: boolean) => Promise<void>;
  pushNotifications: boolean;
  updatePushNotifications: (enabled: boolean) => Promise<void>;
  emailNotifications: boolean;
  updateEmailNotifications: (enabled: boolean) => Promise<void>;
  activityStatus: boolean;
  updateActivityStatus: (enabled: boolean) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const [globalBgColor, setGlobalBgColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(profile?.font_size || '16px');
  const [defaultVideoQuality, setDefaultVideoQuality] = useState(profile?.default_video_quality || 'Auto');
  const [dataSaverMode, setDataSaverMode] = useState(profile?.data_saver_mode || false);
  const [autoplayLimit, setAutoplayLimit] = useState(profile?.autoplay_limit || 10);
  const [hideViewsPref, setHideViewsPref] = useState(profile?.hide_views_pref || false);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(profile?.read_receipts_enabled ?? true);
  const [isPrivate, setIsPrivate] = useState(profile?.is_private || false);
  const [aiAutoPilotEnabled, setAIAutoPilotEnabled] = useState(profile?.ai_auto_pilot || false);
  const [chatBackgroundUrl, setChatBackgroundUrl] = useState<string | null>(profile?.chat_background_url || null);
  const [chatBackgroundStyle, setChatBackgroundStyle] = useState<string | null>(profile?.chat_background_style || 'default');
  const [themeColor, setThemeColor] = useState(profile?.theme_color || '#FF9933');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>((localStorage.getItem('theme') as any) || 'dark');
  const [screenshotProtection, setScreenshotProtection] = useState(profile?.screenshot_protection || false);
  const [autoDownloadMedia, setAutoDownloadMedia] = useState(profile?.auto_download_media || false);
  const [notificationSounds, setNotificationSounds] = useState(profile?.notification_sounds ?? true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(profile?.show_online_status ?? true);
  const [likesNotifications, setLikesNotifications] = useState(profile?.likes_notifications ?? true);
  const [commentsNotifications, setCommentsNotifications] = useState(profile?.comments_notifications ?? true);
  const [followNotifications, setFollowNotifications] = useState(profile?.follow_notifications ?? true);
  const [messagesNotifications, setMessagesNotifications] = useState(profile?.messages_notifications ?? true);
  const [reelsNotifications, setReelsNotifications] = useState(profile?.reels_notifications ?? true);
  const [pushNotifications, setPushNotifications] = useState(profile?.push_notifications ?? true);
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications ?? false);
  const [activityStatus, setActivityStatus] = useState(profile?.activity_status ?? true);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (themeColor) {
      const root = document.documentElement;
      
      // Helper function to convert hex to HSL for shadcn variables
      const hexToHsl = (hex: string) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
          r = parseInt(hex[1] + hex[1], 16);
          g = parseInt(hex[2] + hex[2], 16);
          b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
          r = parseInt(hex.substring(1, 3), 16);
          g = parseInt(hex.substring(3, 5), 16);
          b = parseInt(hex.substring(5, 7), 16);
        }
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;
        if (max === min) {
          h = s = 0; 
        } else {
          let d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };
      
      const hslValue = hexToHsl(themeColor);
      root.style.setProperty('--primary', hslValue);
      root.style.setProperty('--ring', hslValue);
    }
  }, [themeColor]);

  useEffect(() => {
    if (profile) {
      setFontSize(profile.font_size || '16px');
      setDefaultVideoQuality(profile.default_video_quality || 'Auto');
      setDataSaverMode(profile.data_saver_mode || false);
      setAutoplayLimit(profile.autoplay_limit || 10);
      setHideViewsPref(profile.hide_views_pref || false);
      setReadReceiptsEnabled(profile.read_receipts_enabled ?? true);
      setIsPrivate(profile.is_private || false);
      setAIAutoPilotEnabled(profile.ai_auto_pilot || false);
      setChatBackgroundUrl(profile.chat_background_url || null);
      setChatBackgroundStyle(profile.chat_background_style || 'default');
      setThemeColor(profile.theme_color || '#FF9933');
      setScreenshotProtection(profile.screenshot_protection || false);
      setAutoDownloadMedia(profile.auto_download_media || false);
      setNotificationSounds(profile.notification_sounds ?? true);
      setShowOnlineStatus(profile.show_online_status ?? true);
      setLikesNotifications(profile.likes_notifications ?? true);
      setCommentsNotifications(profile.comments_notifications ?? true);
      setFollowNotifications(profile.follow_notifications ?? true);
      setMessagesNotifications(profile.messages_notifications ?? true);
      setReelsNotifications(profile.reels_notifications ?? true);
      setPushNotifications(profile.push_notifications ?? true);
      setEmailNotifications(profile.email_notifications ?? false);
      setActivityStatus(profile.activity_status ?? true);
    }
  }, [profile]);

  // ── Load global bg colour from app_settings on mount (public read) ──
  useEffect(() => {
    (supabase as any)
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'global_bg_color')
      .maybeSingle()
      .then(({ data }: any) => {
        const color = data?.setting_value || '#000000';
        setGlobalBgColor(color);
        applyBgColor(color);
      });
  }, []);

  const applyBgColor = (hex: string) => {
    const root = document.documentElement;
    // Convert hex → HSL for shadcn --background token
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
        case gn: h = (bn - rn) / d + 2; break;
        case bn: h = (rn - gn) / d + 4; break;
      }
      h /= 6;
    }
    const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    root.style.setProperty('--background', hsl);
    // Keep foreground readable: if background is dark keep white text, else dark
    root.style.setProperty('--foreground', l < 0.5 ? '0 0% 100%' : '0 0% 0%');
  };

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize;
  }, [fontSize]);

  const updateGlobalBgColor = async (color: string) => {
    setGlobalBgColor(color);
    applyBgColor(color);
    await (supabase as any)
      .from('app_settings')
      .upsert({ setting_key: 'global_bg_color', setting_value: color }, { onConflict: 'setting_key' });
  };

  const updateFontSize = async (size: string) => {
    if (!profile) return;
    setFontSize(size);
    const { error } = await (supabase as any).from('profiles').update({ font_size: size }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateDefaultVideoQuality = async (quality: string) => {
    if (!profile) return;
    setDefaultVideoQuality(quality);
    const { error } = await (supabase as any).from('profiles').update({ default_video_quality: quality }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateDataSaverMode = async (enabled: boolean) => {
    if (!profile) return;
    setDataSaverMode(enabled);
    const { error } = await (supabase as any).from('profiles').update({ data_saver_mode: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateAutoplayLimit = async (limit: number) => {
    if (!profile) return;
    setAutoplayLimit(limit);
    const { error } = await (supabase as any).from('profiles').update({ autoplay_limit: limit }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateHideViewsPref = async (enabled: boolean) => {
    if (!profile) return;
    setHideViewsPref(enabled);
    const { error } = await (supabase as any).from('profiles').update({ hide_views_pref: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateReadReceiptsEnabled = async (enabled: boolean) => {
    if (!profile) return;
    setReadReceiptsEnabled(enabled);
    const { error } = await (supabase as any).from('profiles').update({ read_receipts_enabled: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateIsPrivate = async (enabled: boolean) => {
    if (!profile) return;
    setIsPrivate(enabled);
    const { error } = await (supabase as any).from('profiles').update({ is_private: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateAIAutoPilotEnabled = async (enabled: boolean) => {
    if (!profile) return;
    setAIAutoPilotEnabled(enabled);
    const { error } = await (supabase as any).from('profiles').update({ ai_auto_pilot: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateChatBackgroundUrl = async (url: string | null) => {
    if (!profile) return;
    setChatBackgroundUrl(url);
    const { error } = await (supabase as any).from('profiles').update({ chat_background_url: url }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateChatBackgroundStyle = async (style: string | null) => {
    if (!profile) return;
    setChatBackgroundStyle(style);
    const { error } = await (supabase as any).from('profiles').update({ chat_background_style: style }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateThemeColor = async (color: string) => {
    if (!profile) return;
    setThemeColor(color);
    const { error } = await (supabase as any).from('profiles').update({ theme_color: color }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateTheme = (t: 'light' | 'dark' | 'system') => {
    setTheme(t);
  };

  const updateScreenshotProtection = async (enabled: boolean) => {
    if (!profile) return;
    setScreenshotProtection(enabled);
    const { error } = await (supabase as any).from('profiles').update({ screenshot_protection: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateAutoDownloadMedia = async (enabled: boolean) => {
    if (!profile) return;
    setAutoDownloadMedia(enabled);
    const { error } = await (supabase as any).from('profiles').update({ auto_download_media: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateNotificationSounds = async (enabled: boolean) => {
    if (!profile) return;
    setNotificationSounds(enabled);
    const { error } = await (supabase as any).from('profiles').update({ notification_sounds: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateShowOnlineStatus = async (enabled: boolean) => {
    if (!profile) return;
    setShowOnlineStatus(enabled);
    const { error } = await (supabase as any).from('profiles').update({ show_online_status: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateLikesNotifications = async (enabled: boolean) => {
    if (!profile) return;
    setLikesNotifications(enabled);
    const { error } = await (supabase as any).from('profiles').update({ likes_notifications: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateCommentsNotifications = async (enabled: boolean) => {
    if (!profile) return;
    setCommentsNotifications(enabled);
    const { error } = await (supabase as any).from('profiles').update({ comments_notifications: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateFollowNotifications = async (enabled: boolean) => {
    if (!profile) return;
    setFollowNotifications(enabled);
    const { error } = await (supabase as any).from('profiles').update({ follow_notifications: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateMessagesNotifications = async (enabled: boolean) => {
    if (!profile) return;
    setMessagesNotifications(enabled);
    const { error } = await (supabase as any).from('profiles').update({ messages_notifications: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateReelsNotifications = async (enabled: boolean) => {
    if (!profile) return;
    setReelsNotifications(enabled);
    const { error } = await (supabase as any).from('profiles').update({ reels_notifications: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updatePushNotifications = async (enabled: boolean) => {
    if (!profile) return;
    setPushNotifications(enabled);
    const { error } = await (supabase as any).from('profiles').update({ push_notifications: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateEmailNotifications = async (enabled: boolean) => {
    if (!profile) return;
    setEmailNotifications(enabled);
    const { error } = await (supabase as any).from('profiles').update({ email_notifications: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  const updateActivityStatus = async (enabled: boolean) => {
    if (!profile) return;
    setActivityStatus(enabled);
    const { error } = await (supabase as any).from('profiles').update({ activity_status: enabled }).eq('id', profile.id);
    if (!error) refreshProfile();
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        globalBgColor,
        updateGlobalBgColor,
        fontSize, 
        updateFontSize, 
        defaultVideoQuality, 
        updateDefaultVideoQuality,
        dataSaverMode,
        updateDataSaverMode,
        autoplayLimit,
        updateAutoplayLimit,
        hideViewsPref,
        updateHideViewsPref,
        readReceiptsEnabled,
        updateReadReceiptsEnabled,
        isPrivate,
        updateIsPrivate,
        aiAutoPilotEnabled,
        updateAIAutoPilotEnabled,
        chatBackgroundUrl,
        updateChatBackgroundUrl,
        chatBackgroundStyle,
        updateChatBackgroundStyle,
        themeColor,
        updateThemeColor,
        theme,
        updateTheme,
        screenshotProtection,
        updateScreenshotProtection,
        autoDownloadMedia,
        updateAutoDownloadMedia,
        notificationSounds,
        updateNotificationSounds,
        showOnlineStatus,
        updateShowOnlineStatus,
        likesNotifications,
        updateLikesNotifications,
        commentsNotifications,
        updateCommentsNotifications,
        followNotifications,
        updateFollowNotifications,
        messagesNotifications,
        updateMessagesNotifications,
        reelsNotifications,
        updateReelsNotifications,
        pushNotifications,
        updatePushNotifications,
        emailNotifications,
        updateEmailNotifications,
        activityStatus,
        updateActivityStatus,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
