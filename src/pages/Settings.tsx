import CalculatorVault from '@/components/settings/CalculatorVault';
import { useState, useEffect } from 'react';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { usePrivacyShutter } from '@/contexts/PrivacyShutterContext';
import { useProximity } from '@/contexts/ProximityContext';

import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  User, Shield, Lock, Bell, Eye, EyeOff, Globe, Database, HelpCircle, 
  Trash2, LogOut, Moon, Sun, Monitor, Languages, Smartphone, History,
  ChevronRight, BadgeCheck, Type, AlignLeft, LayoutDashboard,
  Share2, MessageSquare, Heart, Bookmark, UserMinus, Volume2, PlayCircle,
  SmartphoneIcon, Cloud, Search, Info, Flag, Scale, ShieldCheck, Video, Fingerprint,
  CheckCircle, XCircle, Palette, QrCode, Image as ImageIcon, MapPin,
  Sparkles, Bot, Zap, Cpu, Send, Download, Key, Music2, Gift, Code2, Copy, DollarSign, ArrowLeft
} from 'lucide-react';
import { VerificationBadge } from '@/components/VerificationBadge';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/contexts/SettingsContext';
import IndianSpinner from '@/components/ui/IndianSpinner';

interface SettingItem {
  id: number;
  icon: any;
  label: string;
  path?: string;
  action?: () => void;
  danger?: boolean;
  type?: 'language' | 'report' | 'fontSize' | 'videoQuality' | 'dataSaver' | 'autoplay' | 'uid' | 'verificationManager' | 'profileThemeManager' | 'hideViews' | 'theme' | 'themeColor' | 'vault' | 'changePassword' | 'qrCustomization' | 'privacy' | 'blocked' | 'muted' | 'restricted' | 'closeFriends' | 'readReceipts' | 'chatBackground' | 'privacyShutter' | 'proximitySync' | 'aiAutoPilot' | 'telegramConfig' | 'screenshotProtection' | 'autoDownloadMedia' | 'notificationSounds' | 'showOnlineStatus' | 'negativeButtonsHTML' | 'likesNotifications' | 'commentsNotifications' | 'followNotifications' | 'messagesNotifications' | 'reelsNotifications' | 'pushNotifications' | 'emailNotifications' | 'activityStatus';
  value?: string;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const languages = [
  "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati", "Urdu", "Kannada", "Odia",
  "Punjabi", "Malayalam", "Assamese", "Maithili", "Santal", "Kashmiri", "Nepali", "Konkani", "Sindhi",
  "Spanish", "French", "German", "Chinese", "Japanese", "Korean", "Russian", "Portuguese", "Italian",
  "Arabic", "Turkish", "Vietnamese", "Thai", "Indonesian", "Dutch", "Polish", "Swedish", "Greek",
  "Czech", "Danish", "Finnish", "Hungarian", "Norwegian", "Romanian", "Ukrainian", "Hebrew", "Malay",
  "Persian", "Pashto", "Amharic", "Burmese", "Khmer", "Lao", "Sinhala", "Kazakh", "Uzbek", "Azerbaijani"
];

const fontSizeOptions = [
  { label: 'Small', value: '14px' },
  { label: 'Default', value: '16px' },
  { label: 'Large', value: '18px' },
  { label: 'Extra Large', value: '20px' },
];

const videoQualityOptions = ['Auto', '480p', '720p', '1080p', '2K', '4K'];

export default function Settings() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { 
    fontSize, updateFontSize, 
    defaultVideoQuality, updateDefaultVideoQuality,
    dataSaverMode, updateDataSaverMode,
    autoplayLimit, updateAutoplayLimit,
    hideViewsPref, updateHideViewsPref,
    readReceiptsEnabled, updateReadReceiptsEnabled,
    aiAutoPilotEnabled, updateAIAutoPilotEnabled,
    isPrivate, updateIsPrivate,
    theme, updateTheme,
    themeColor, updateThemeColor,
    screenshotProtection, updateScreenshotProtection,
    autoDownloadMedia, updateAutoDownloadMedia,
    notificationSounds, updateNotificationSounds,
    showOnlineStatus, updateShowOnlineStatus,
    likesNotifications, updateLikesNotifications,
    commentsNotifications, updateCommentsNotifications,
    followNotifications, updateFollowNotifications,
    messagesNotifications, updateMessagesNotifications,
    reelsNotifications, updateReelsNotifications,
    pushNotifications, updatePushNotifications,
    emailNotifications, updateEmailNotifications,
    activityStatus, updateActivityStatus,
  } = useSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear cache? This will log you out.")) {
      signOut();
    }
  };

  const isSuperAdmin = profile?.username?.toLowerCase() === 'jeetyt09' || profile?.id === '61499879-283a-485e-a36e-b203424a86d0';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  const settingsGroups: SettingGroup[] = [
    {
      title: "Account & Security",
      items: [
        { id: 1, icon: User, label: "Edit Profile", path: "/settings/profile" },
        { id: 4, icon: Lock, label: "Change Password", type: 'changePassword' },
        { id: 5, icon: Shield, label: "Two-Factor Authentication" },
        { id: 6, icon: Share2, label: "Linked Accounts", path: "/studio" },
        { id: 62, icon: SmartphoneIcon, label: "Secret Vault (Calculator)", type: 'vault' as const },
        { id: 201, icon: Fingerprint, label: "Your Main Token ID", type: 'uid', value: profile?.main_token_id },
        { id: 200, icon: Sparkles, label: "AI App Builder", path: "/app-builder" },
        { id: 1006, icon: Music2, label: "J.K Music Player", path: "/music-player" },
        { id: 1007, icon: Gift, label: "Voucher Rewards", path: "/voucher-reward" },
        { id: 1008, icon: DollarSign, label: "Payment Gift", path: "/payment-gift" },
        { id: 53, icon: BadgeCheck, label: "Apply for Verification", path: "/settings/verification" },
        ...(isAdmin ? [
          { id: 998, icon: User, label: "Special Username Change", path: "/settings/profile" },
          { id: 999, icon: BadgeCheck, label: "Verification Manager (Admin)", type: 'verificationManager' as const },
          { id: 1000, icon: Palette, label: "Profile Theme Manager (Admin)", type: 'profileThemeManager' as const },
          { id: 1001, icon: LayoutDashboard, label: "Admin Dashboard", path: "/admin" },
          { id: 1004, icon: Key, label: "Token & API Management (Admin)", path: "/settings/tokens" },
          { id: 1003, icon: Send, label: "Storage Configuration (Admin)", type: 'telegramConfig' as const },
          { id: 1005, icon: Code2, label: "Negative Buttons HTML (Project)", type: 'negativeButtonsHTML' as const }
        ] : []),
        { id: 60, icon: Fingerprint, label: "User UID", type: 'uid', value: profile?.id },
        { id: 50, icon: LogOut, label: "Logout", action: signOut, danger: true },
        { id: 51, icon: Trash2, label: "Delete Account", action: async () => {
          if (window.confirm("⚠️ WARNING: This will permanently delete your account and ALL your data (posts, reels, messages, etc.). This action CANNOT be undone. Are you absolutely sure?")) {
            try {
              // Delete all user data from Supabase
              const userId = profile?.id;
              if (!userId) return;

              // Delete auth user via Edge Function (handles profile and all cascade deletes)
              const { error: authError } = await supabase.functions.invoke('delete-user', {
                body: { userIdToDelete: userId }
              });
              
              if (authError) {
                const errMsg = await authError?.context?.text();
                throw new Error(errMsg || authError.message);
              }
              
              toast.success('Account deleted successfully');
              signOut();
            } catch (error: any) {
              toast.error(`Failed to delete account: ${error.message}`);
            }
          }
        }, danger: true },
      ]
    },
    {
      title: "Privacy & Visibility",
      items: [
        { id: 3, icon: Eye, label: "Account Privacy", type: 'privacy', value: isPrivate ? 'Private' : 'Public' },
        { id: 150, icon: ShieldCheck, label: "Screenshot Protection", type: 'screenshotProtection', value: screenshotProtection ? 'Enabled' : 'Disabled' },
        { id: 55, icon: Video, label: "Privacy Shutter (Stranger Alert)", type: 'privacyShutter' },
        { id: 56, icon: MapPin, label: "Dosti ki Doori (Proximity Sync)", type: 'proximitySync' },
        { id: 7, icon: UserMinus, label: "Blocked Users", type: 'blocked' },
        { id: 8, icon: Volume2, label: "Muted Accounts", type: 'muted' },
        { id: 9, icon: ShieldCheck, label: "Restricted Accounts", type: 'restricted' },
        { id: 10, icon: Heart, label: "Close Friends List", type: 'closeFriends' },
        { id: 24, icon: EyeOff, label: "Activity Status", type: 'activityStatus', value: activityStatus ? 'Visible' : 'Hidden' },
        { id: 151, icon: Eye, label: "Show Online Status", type: 'showOnlineStatus', value: showOnlineStatus ? 'Visible' : 'Hidden' },
        { id: 25.5, icon: Bot, label: "AI Auto-Reply (Offline Bot)", type: 'aiAutoPilot', value: aiAutoPilotEnabled ? 'Enabled' : 'Disabled' },
        { id: 25, icon: MessageSquare, label: "Read Receipts", type: 'readReceipts', value: readReceiptsEnabled ? 'Enabled' : 'Disabled' },
        { id: 61, icon: EyeOff, label: "Hide View Counts", type: 'hideViews', value: hideViewsPref ? 'Enabled' : 'Disabled' },
      ]
    },
    {
      title: "Notifications",
      items: [
        { id: 152, icon: Volume2, label: "Notification Sounds", type: 'notificationSounds', value: notificationSounds ? 'On' : 'Off' },
        { id: 11, icon: Bell, label: "Likes Notifications", type: 'likesNotifications', value: likesNotifications ? 'On' : 'Off' },
        { id: 12, icon: Bell, label: "Comments Notifications", type: 'commentsNotifications', value: commentsNotifications ? 'On' : 'Off' },
        { id: 13, icon: Bell, label: "Follow Requests", type: 'followNotifications', value: followNotifications ? 'On' : 'Off' },
        { id: 14, icon: Bell, label: "Messages Notifications", type: 'messagesNotifications', value: messagesNotifications ? 'On' : 'Off' },
        { id: 15, icon: Bell, label: "Reels Notifications", type: 'reelsNotifications', value: reelsNotifications ? 'On' : 'Off' },
        { id: 16, icon: Smartphone, label: "Push Notifications", type: 'pushNotifications', value: pushNotifications ? 'On' : 'Off' },
        { id: 17, icon: Globe, label: "Email Notifications", type: 'emailNotifications', value: emailNotifications ? 'On' : 'Off' },
      ]
    },
    {
      title: "Appearance & Accessibility",
      items: [
        { id: 100, icon: theme === 'dark' ? Moon : Sun, label: `Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`, type: 'theme' },
        { id: 100.5, icon: Palette, label: "App Theme Color", type: 'themeColor', value: themeColor },
        { id: 101, icon: QrCode, label: "QR Code Customization", type: 'qrCustomization' },
        { id: 102, icon: ImageIcon, label: "Chat Background", type: 'chatBackground' },
        { id: 2, icon: Languages, label: "Language Selection", type: 'language' },
        { id: 34, icon: Type, label: "Font Size", type: 'fontSize', value: fontSizeOptions.find(o => o.value === fontSize)?.label || 'Default' },
        { id: 35, icon: AlignLeft, label: "High Contrast Mode" },
        { id: 36, icon: PlayCircle, label: "Reduce Motion" },
        { id: 37, icon: Monitor, label: "Screen Reader Support" },
      ]
    },
    {
      title: "Data & Storage",
      items: [
        { id: 26, icon: Database, label: "Data Saver Mode", type: 'dataSaver', value: dataSaverMode ? 'Enabled' : 'Disabled' },
        { id: 153, icon: Download, label: "Auto-Download Media", type: 'autoDownloadMedia', value: autoDownloadMedia ? 'Enabled' : 'Disabled' },
        { id: 27, icon: PlayCircle, label: "Video Autoplay Settings", type: 'autoplay', value: `${autoplayLimit} videos` },
        { id: 28, icon: Video, label: "Default Video Quality", type: 'videoQuality', value: defaultVideoQuality },
        { id: 29, icon: SmartphoneIcon, label: "Cellular Data Usage" },
        { id: 30, icon: Trash2, label: "Clear Cache", action: handleClearCache },
        { id: 31, icon: Search, label: "Clear Search History" },
        { id: 32, icon: Cloud, label: "Save Posts to Cloud" },
        { id: 33, icon: Cloud, label: "Save Reels to Cloud" },
        { id: 52, icon: History, label: "Watch History", path: "/settings/history" },
      ]
    },
    {
      title: "Support & Legal",
      items: [
        { id: 44, icon: Info, label: "Ad Preferences" },
        { id: 45, icon: HelpCircle, label: "Help Center" },
        { id: 46, icon: Flag, label: "Report a Problem", type: 'report' },
        ...(isAdmin ? [
          { id: 1002, icon: MessageSquare, label: "Feedback & Bugs (Admin)", path: "/settings/feedback" }
        ] : []),
        { id: 47, icon: Scale, label: "Privacy Policy" },
        { id: 48, icon: Scale, label: "Terms of Service" },
        { id: 49, icon: Info, label: "About INDIANREELS" },
      ]
    }
  ];

  // Filter settings based on search query
  const filteredSettingsGroups = settingsGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 border-b pb-6 px-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={profile?.profile_photo_url || ''} />
          <AvatarFallback>{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">{profile?.username}</h1>
          <p className="text-sm text-muted-foreground">{profile?.full_name}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-10">
        {filteredSettingsGroups.length > 0 ? (
          filteredSettingsGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4">{group.title}</h2>
            <div className="bg-card border dark:border-zinc-800 rounded-xl overflow-hidden divide-y dark:divide-zinc-800">
              {group.items.map((item) => {
                if (item.type === 'qrCustomization') return <QRCustomizationModal key={item.id} item={item} />;
                if (item.type === 'language') return <LanguageModal key={item.id} item={item} />;
                if (item.type === 'report') return <ReportModal key={item.id} item={item} />;
                if (item.type === 'fontSize') return <FontSizeModal key={item.id} item={item} fontSize={fontSize} updateFontSize={updateFontSize} />;
                if (item.type === 'videoQuality') return <VideoQualityModal key={item.id} item={item} quality={defaultVideoQuality} updateQuality={updateDefaultVideoQuality} />;
                if (item.type === 'dataSaver') return <DataSaverModal key={item.id} item={item} enabled={dataSaverMode} updateEnabled={updateDataSaverMode} />;
                if (item.type === 'autoplay') return <AutoplayModal key={item.id} item={item} limit={autoplayLimit} updateLimit={updateAutoplayLimit} />;
                if (item.type === 'uid') return <UIDModal key={item.id} item={item} value={item.value || ''} />;
                if (item.type === 'negativeButtonsHTML') return <NegativeButtonsHTMLModal key={item.id} item={item} />;
                if (item.type === 'changePassword') return <ChangePasswordModal key={item.id} item={item} />;
                if (item.type === 'hideViews') return <HideViewsModal key={item.id} item={item} enabled={hideViewsPref} updateEnabled={updateHideViewsPref} />;
                if (item.type === 'verificationManager') return <VerificationManagerModal key={item.id} item={item} />;
                if (item.type === 'profileThemeManager') return <ProfileThemeManagerModal key={item.id} item={item} />;
                if (item.type === 'telegramConfig') return <TelegramConfigModal key={item.id} item={item} />;
                if (item.type === 'theme') return <ThemeToggleModal key={item.id} item={item} theme={theme} updateTheme={updateTheme} />;
                if (item.type === 'themeColor') return <ThemeColorModal key={item.id} item={item} themeColor={themeColor} updateThemeColor={updateThemeColor} />;
                if (item.type === 'vault') return <VaultModal key={item.id} item={item} />;
                if (item.type === 'privacy') return <PrivacyModal key={item.id} item={item} enabled={isPrivate} updateEnabled={updateIsPrivate} />;
                if (item.type === 'aiAutoPilot') return <AIAutoPilotModal key={item.id} item={item} enabled={aiAutoPilotEnabled} updateEnabled={updateAIAutoPilotEnabled} />;
                if (item.type === 'readReceipts') return <ReadReceiptsModal key={item.id} item={item} enabled={readReceiptsEnabled} updateEnabled={updateReadReceiptsEnabled} />;
                if (item.type === 'screenshotProtection') return <ScreenshotProtectionModal key={item.id} item={item} enabled={screenshotProtection} updateEnabled={updateScreenshotProtection} />;
                if (item.type === 'autoDownloadMedia') return <AutoDownloadMediaModal key={item.id} item={item} enabled={autoDownloadMedia} updateEnabled={updateAutoDownloadMedia} />;
                if (item.type === 'notificationSounds') return <NotificationSoundsModal key={item.id} item={item} enabled={notificationSounds} updateEnabled={updateNotificationSounds} />;
                if (item.type === 'showOnlineStatus') return <ShowOnlineStatusModal key={item.id} item={item} enabled={showOnlineStatus} updateEnabled={updateShowOnlineStatus} />;
                if (item.type === 'activityStatus') return <ActivityStatusModal key={item.id} item={item} enabled={activityStatus} updateEnabled={updateActivityStatus} />;
                if (item.type === 'likesNotifications') return <NotifToggleModal key={item.id} item={item} enabled={likesNotifications} updateEnabled={updateLikesNotifications} icon="❤️" description="Get notified when someone likes your posts or reels." />;
                if (item.type === 'commentsNotifications') return <NotifToggleModal key={item.id} item={item} enabled={commentsNotifications} updateEnabled={updateCommentsNotifications} icon="💬" description="Get notified when someone comments on your content." />;
                if (item.type === 'followNotifications') return <NotifToggleModal key={item.id} item={item} enabled={followNotifications} updateEnabled={updateFollowNotifications} icon="👤" description="Get notified when someone follows you or sends a follow request." />;
                if (item.type === 'messagesNotifications') return <NotifToggleModal key={item.id} item={item} enabled={messagesNotifications} updateEnabled={updateMessagesNotifications} icon="✉️" description="Get notified when you receive new direct messages." />;
                if (item.type === 'reelsNotifications') return <NotifToggleModal key={item.id} item={item} enabled={reelsNotifications} updateEnabled={updateReelsNotifications} icon="🎬" description="Get notified about new reels from people you follow." />;
                if (item.type === 'pushNotifications') return <NotifToggleModal key={item.id} item={item} enabled={pushNotifications} updateEnabled={updatePushNotifications} icon="🔔" description="Receive push notifications on your device." />;
                if (item.type === 'emailNotifications') return <NotifToggleModal key={item.id} item={item} enabled={emailNotifications} updateEnabled={updateEmailNotifications} icon="📧" description="Receive notification digests via email." />;
                if (item.type === 'blocked') return <UserListModal key={item.id} item={item} type="blocked" />;
                if (item.type === 'muted') return <UserListModal key={item.id} item={item} type="muted" />;
                if (item.type === 'restricted') return <UserListModal key={item.id} item={item} type="restricted" />;
                if (item.type === 'closeFriends') return <UserListModal key={item.id} item={item} type="closeFriends" />;
                if (item.type === 'chatBackground') return <ChatBackgroundSettingModal key={item.id} item={item} />;
                if (item.type === 'privacyShutter') return <PrivacyShutterModal key={item.id} item={item} />;
                if (item.type === 'proximitySync') return <ProximitySyncModal key={item.id} item={item} />;
                
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors",
                      item.danger && "text-destructive"
                    )}
                    onClick={() => {
                      if (item.action) item.action();
                      else if (item.path) navigate(item.path);
                      else toast.info(`${item.label} setting coming soon!`);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No settings found</h3>
            <p className="text-sm text-muted-foreground">
              Try searching with different keywords
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FontSizeModal({ item, fontSize, updateFontSize }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">Font Size</h2>
          </div>

          {/* Content */}
          <div className="p-4 space-y-2">
            {fontSizeOptions.map((opt) => (
              <Button 
                key={opt.value} 
                variant={fontSize === opt.value ? 'secondary' : 'ghost'} 
                className="w-full justify-start font-medium text-base h-12" 
                onClick={() => {
                  updateFontSize(opt.value);
                  toast.success(`Font size updated to ${opt.label}`);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VideoQualityModal({ item, quality, updateQuality }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">Default Video Quality</h2>
          </div>

          {/* Content */}
          <div className="p-4 space-y-2">
            {videoQualityOptions.map((q) => (
              <Button 
                key={q} 
                variant={quality === q ? 'secondary' : 'ghost'} 
                className="w-full justify-start font-medium text-base h-12" 
                onClick={() => {
                  updateQuality(q);
                  toast.success(`Default quality set to ${q}`);
                  setIsOpen(false);
                }}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DataSaverModal({ item, enabled, updateEnabled }: any) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Data Saver Mode</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            When enabled, video quality will be reduced and autoplay will be restricted to save data.
          </p>
          <Button 
            className="w-full" 
            variant={enabled ? 'destructive' : 'default'}
            onClick={() => {
              updateEnabled(!enabled);
              toast.success(`Data Saver ${!enabled ? 'Enabled' : 'Disabled'}`);
            }}
          >
            {enabled ? 'Disable Data Saver' : 'Enable Data Saver'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AutoplayModal({ item, limit, updateLimit }: any) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Autoplay Settings</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Set how many videos should autoplay before stopping automatically.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[5, 10, 15, 20, 50, 100].map((l) => (
              <Button 
                key={l} 
                variant={limit === l ? 'secondary' : 'outline'}
                onClick={() => {
                  updateLimit(l);
                  toast.success(`Autoplay limit set to ${l} videos`);
                }}
              >
                {l} Videos
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UIDModal({ item, value }: any) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Your Unique ID (UID)</DialogTitle>
        </DialogHeader>
        <div className="p-6 bg-muted rounded-lg break-all font-mono text-center">
          {value}
        </div>
        <Button onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success("UID copied to clipboard!");
        }} className="w-full">
          Copy UID
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function NegativeButtonsHTMLModal({ item }: { item: SettingItem }) {
  const negativeButtonsHTML = `<!-- 1. Delete Button (Red Background with Icon) -->
<button class="inline-flex items-center justify-center h-8 w-8 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">
  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
</button>

<!-- 2. Delete Button with Text -->
<button class="inline-flex items-center justify-center px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition-colors">
  <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
  Delete Post
</button>

<!-- 3. Cancel Button -->
<button class="h-12 px-6 rounded-xl text-gray-700 bg-transparent hover:bg-gray-100 transition-colors font-medium">
  Cancel
</button>

<!-- 4. Close Button (X Icon) -->
<button class="h-8 w-8 rounded-full bg-transparent hover:bg-gray-100 transition-colors flex items-center justify-center">
  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>

<!-- 5. Back Button -->
<button class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-transparent hover:bg-gray-100 transition-colors">
  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
  </svg>
  Back
</button>

<!-- 6. Remove Button -->
<button class="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors font-medium">
  Remove
</button>

<!-- 7. Reject Call Button -->
<button class="rounded-full w-16 h-16 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg">
  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>

<!-- 8. Text-Only Delete Button -->
<button class="inline-flex items-center justify-center px-4 py-2 rounded-md bg-transparent text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors font-medium">
  Delete
</button>

<!-- 9. Full-Width Cancel Button -->
<button class="w-full h-12 rounded-xl border border-gray-300 bg-transparent hover:bg-gray-100 transition-colors font-medium">
  Cancel
</button>

<!-- 10. Delete Confirmation Dialog -->
<div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
    <h2 class="text-lg font-semibold mb-2">Are you sure?</h2>
    <p class="text-sm text-gray-600 mb-6">This action cannot be undone.</p>
    <div class="flex gap-3 justify-end">
      <button class="px-4 py-2 rounded-md border border-gray-300 bg-transparent hover:bg-gray-100 transition-colors font-medium">Cancel</button>
      <button class="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors font-medium">
        <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    </div>
  </div>
</div>`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Negative Buttons HTML Code
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
            {negativeButtonsHTML}
          </pre>
        </ScrollArea>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(negativeButtonsHTML);
              toast.success("HTML code copied to clipboard!");
            }} 
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy All HTML
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              const blob = new Blob([negativeButtonsHTML], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'negative-buttons.html';
              a.click();
              URL.revokeObjectURL(url);
              toast.success("HTML file downloaded!");
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HideViewsModal({ item, enabled, updateEnabled }: any) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hide View Counts</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            When enabled, you won't see view counts on Reels or Posts from other accounts.
          </p>
          <Button 
            className="w-full" 
            variant={enabled ? 'destructive' : 'default'}
            onClick={() => {
              updateEnabled(!enabled);
              toast.success(`Hide View Counts ${!enabled ? 'Enabled' : 'Disabled'}`);
            }}
          >
            {enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LanguageModal({ item }: { item: SettingItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">Select Language</h2>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-1">
              {languages.map((lang) => (
                <Button 
                  key={lang} 
                  variant="ghost" 
                  className="w-full justify-start font-medium text-base h-12" 
                  onClick={() => {
                    toast.success(`Language changed to ${lang}`);
                    setIsOpen(false);
                  }}
                >
                  {lang}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReportModal({ item }: { item: SettingItem }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setContent('');
      toast.success('Report submitted successfully. Thank you for your feedback!');
    }, 1000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Report a Problem</DialogTitle>
          <CardDescription>Tell us what happened or what's not working correctly.</CardDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Textarea 
            placeholder="Describe the issue..." 
            className="h-32 resize-none" 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
          />
          <Button className="w-full font-bold" disabled={loading || !content.trim()} onClick={handleSubmit}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const PROFILE_COLORS = [
  { name: 'Default', value: 'transparent' },
  { name: 'Instagram', value: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' },
  { name: 'Sunset Blaze', value: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 50%, #c44569 100%)' },
  { name: 'Ocean Dream', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Emerald Flow', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { name: 'Golden Hour', value: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)' },
  { name: 'Deep Ocean', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { name: 'Sunset Fire', value: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)' },
  { name: 'Cyber Punk', value: 'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)' },
  { name: 'Cotton Candy', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { name: 'Arctic Frost', value: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' },
  { name: 'Lush Garden', value: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)' },
  { name: 'Royal Night', value: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)' },
  { name: 'Fire Storm', value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
  { name: 'Aurora Sky', value: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
  { name: 'Lavender Dream', value: 'linear-gradient(135deg, #c471ed 0%, #f64f59 100%)' },
  { name: 'Rose Garden', value: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)' },
  { name: 'Sky Blue', value: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
  { name: 'Forest Mist', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { name: 'Electric Blue', value: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)' },
  { name: 'Passion Pink', value: 'linear-gradient(135deg, #f80759 0%, #bc4e9c 100%)' },
  { name: 'Mint Fresh', value: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)' },
  { name: 'Purple Haze', value: 'linear-gradient(135deg, #6a3093 0%, #a044ff 100%)' },
  { name: 'Peach Glow', value: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)' },
  { name: 'Neon Lights', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { name: 'Cosmic Purple', value: 'linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)' },
];

function ThemeToggleModal({ item, theme, updateTheme }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">Appearance Settings</h2>
              <p className="text-sm text-muted-foreground">Choose how INDIANREELS looks to you.</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-2">
            <Button 
              variant={theme === 'light' ? 'secondary' : 'ghost'} 
              className="w-full justify-start gap-3 h-14 text-base"
              onClick={() => {
                updateTheme('light');
                toast.success('Theme set to Light mode');
                setIsOpen(false);
              }}
            >
              <Sun className="w-5 h-5" /> Light Mode
            </Button>
            <Button 
              variant={theme === 'dark' ? 'secondary' : 'ghost'} 
              className="w-full justify-start gap-3 h-14 text-base"
              onClick={() => {
                updateTheme('dark');
                toast.success('Theme set to Dark mode');
                setIsOpen(false);
              }}
            >
              <Moon className="w-5 h-5" /> Dark Mode
            </Button>
            <Button 
              variant={theme === 'system' ? 'secondary' : 'ghost'} 
              className="w-full justify-start gap-3 h-14 text-base"
              onClick={() => {
                updateTheme('system');
                toast.success('Theme set to System preference');
                setIsOpen(false);
              }}
            >
              <Smartphone className="w-5 h-5" /> System Default
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ThemeColorModal({ item, themeColor, updateThemeColor }: any) {
  const [open, setOpen] = useState(false);
  const colors = [
    { name: 'Saffron (Default)', value: '#FF9933' },
    { name: 'Deep Pink', value: '#FE2C55' },
    { name: 'Cyan Blue', value: '#06b6d4' },
    { name: 'Vibrant Purple', value: '#8B5CF6' },
    { name: 'Emerald Green', value: '#10B981' },
    { name: 'Royal Blue', value: '#2563EB' },
    { name: 'Amber Glow', value: '#F59E0B' },
    { name: 'Crimson Red', value: '#DC2626' },
    { name: 'Midnight', value: '#1E1E1E' },
    { name: 'Clean White', value: '#FFFFFF' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Current: {colors.find(c => c.value === themeColor)?.name || 'Custom'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: themeColor }} />
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>App Theme Color</DialogTitle>
          <CardDescription>Select the primary accent color for the application.</CardDescription>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-3 py-6">
          {colors.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                updateThemeColor(c.value);
                toast.success(`Theme color set to ${c.name}`);
                setOpen(false);
              }}
              className={cn(
                "h-12 w-12 rounded-full border-2 transition-all hover:scale-110 relative",
                themeColor === c.value ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent"
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            >
              {themeColor === c.value && <div className="absolute inset-0 flex items-center justify-center text-white mix-blend-difference">✓</div>}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <label className="text-sm font-medium">Custom Color (HEX)</label>
          <div className="flex gap-2">
            <Input 
              value={themeColor} 
              onChange={(e) => updateThemeColor(e.target.value)} 
              placeholder="#FFFFFF" 
            />
            <div className="w-10 h-10 rounded border shrink-0" style={{ backgroundColor: themeColor }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QRCustomizationModal({ item }: any) {
  const { profile, refreshProfile } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState(profile?.qr_style || 'default');
  const [qrColor, setQrColor] = useState(profile?.qr_color || '#1a0101');
  const [qrBgColor, setQrBgColor] = useState(profile?.qr_bg_color || '#ffffff');
  const [saving, setSaving] = useState(false);

  const qrStyles = [
    { name: 'Classic', color: '#000000', bgColor: '#ffffff', id: 'classic' },
    { name: 'Indian Flag', color: '#ff9933', bgColor: '#ffffff', id: 'indian' },
    { name: 'Royal Blue', color: '#000080', bgColor: '#f0f8ff', id: 'royal' },
    { name: 'Neon Green', color: '#39ff14', bgColor: '#000000', id: 'neon' },
    { name: 'Sunset', color: '#ff4e50', bgColor: '#f9d423', id: 'sunset' },
    { name: 'Forest', color: '#228b22', bgColor: '#f0fff0', id: 'forest' },
    { name: 'Luxury Gold', color: '#d4af37', bgColor: '#1a1a1a', id: 'luxury' },
    { name: 'Midnight', color: '#ffffff', bgColor: '#000033', id: 'midnight' },
    { name: 'Soft Rose', color: '#ff69b4', bgColor: '#fff0f5', id: 'rose' },
    { name: 'Ocean', color: '#0077be', bgColor: '#e0ffff', id: 'ocean' },
  ];

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          qr_style: selectedStyle,
          qr_color: qrColor,
          qr_bg_color: qrBgColor
        })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('QR Code settings updated!');
    } catch (error: any) {
      toast.error('Failed to update QR settings');
    } finally {
      setSaving(false);
    }
  };

  const applyStyle = (style: any) => {
    setSelectedStyle(style.id);
    setQrColor(style.color);
    setQrBgColor(style.bgColor);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-background rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">QR Code Styles</DialogTitle>
          <CardDescription>Customize how your profile QR code looks</CardDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="p-4 bg-white rounded-2xl shadow-xl relative">
            <QRCodeDataUrl 
              text={`https://app-af2z7g8d924h.appmedo.com/profile/${profile?.username}`}
              width={160}
              color={qrColor}
              backgroundColor={qrBgColor}
              borderRadius="20px"
              errorCorrectionLevel="H"
              margin={3}
              roundedModules={true}
              moduleRadius={0.75}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black rounded-full p-0.5 shadow-xl flex items-center justify-center border-2 border-white/20">
              <img src="https://miaoda-conversation-file.s3cdn.medo.dev/user-a802e9kq6vpc/conv-af2z7g8d924g/20260412/file-aw71wfutmg3k.png" className="w-full h-full object-contain rounded-full" alt="Logo" />
            </div>
          </div>

          <ScrollArea className="h-64 w-full px-2">
            <div className="grid grid-cols-2 gap-3">
              {qrStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => applyStyle(style)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    selectedStyle === style.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  <div 
                    className="w-10 h-10 rounded-lg shadow-inner" 
                    style={{ background: style.color, border: `2px solid ${style.bgColor}` }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{style.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="w-full space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">QR Color</label>
                <div className="flex gap-2 items-center h-10 px-3 bg-card border rounded-xl overflow-hidden">
                  <input 
                    type="color" 
                    value={qrColor} 
                    onChange={(e) => setQrColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent"
                  />
                  <span className="text-xs font-mono">{qrColor}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Background</label>
                <div className="flex gap-2 items-center h-10 px-3 bg-card border rounded-xl overflow-hidden">
                  <input 
                    type="color" 
                    value={qrBgColor} 
                    onChange={(e) => setQrBgColor(e.target.value)}
                    className="w-6 h-6 border-none bg-transparent"
                  />
                  <span className="text-xs font-mono">{qrBgColor}</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-12 rounded-xl font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <IndianSpinner size="sm" className="mr-2" /> : 'Apply QR Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileThemeManagerModal({ item }: { item: SettingItem }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (val: string) => {
    setSearch(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data }: any = await (supabase as any)
        .from('profiles')
        .select('*')
        .ilike('username', `%${val}%`)
        .limit(5);
      setResults(data || []);
    } finally {
      setSearching(false);
    }
  };

  const handleUpdateTheme = async (color: string) => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ profile_color: color })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      setSelectedUser({ ...selectedUser, profile_color: color });
      toast.success(`Updated theme for @${selectedUser.username}`);
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && (setSearch(''), setResults([]), setSelectedUser(null))}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors border-t border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-primary">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-primary" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            Profile Theme Manager <Palette className="w-5 h-5" />
          </DialogTitle>
          <CardDescription>Assign custom gradient themes to any user profile.</CardDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search User</label>
            <Input 
              placeholder="Enter username..." 
              value={search} 
              onChange={(e) => handleSearch(e.target.value)} 
            />
            {searching && <p className="text-[10px] text-primary animate-pulse">Searching...</p>}
            
            {results.length > 0 && !selectedUser && (
              <div className="border rounded-lg divide-y bg-muted/20">
                {results.map((u) => (
                  <button 
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.profile_photo_url || ''} />
                      <AvatarFallback>{u.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-bold">@{u.username}</p>
                      <p className="text-[10px] text-muted-foreground">{u.full_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-primary/10">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedUser.profile_photo_url || ''} />
                  <AvatarFallback>{selectedUser.username[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">@{selectedUser.username}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] p-1"
                      onClick={() => setSelectedUser(null)}
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Current Theme: {selectedUser.profile_color === 'transparent' ? 'Default' : 'Custom'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select New Theme</label>
                <div className="grid grid-cols-4 gap-2 h-40 overflow-y-auto pr-2">
                  {PROFILE_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => handleUpdateTheme(color.value)}
                      disabled={loading}
                      className={cn(
                        "h-12 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 overflow-hidden",
                        selectedUser.profile_color === color.value ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2" : "border-transparent bg-muted/50"
                      )}
                    >
                      <div 
                        className="w-full h-full" 
                        style={{ background: color.value === 'transparent' ? '#ccc' : color.value }} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


// Music Import Modal (Admin Only)

function VerificationManagerModal({ item }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('verification_requests' as any)
        .select('*, profiles(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      toast.error(`Error loading requests: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, userId: string, approved: boolean) => {
    setProcessingId(id);
    try {
      const { error: requestError } = await (supabase as any)
        .from('verification_requests')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', id);

      if (requestError) throw requestError;

      if (approved) {
        const { error: profileError } = await (supabase as any)
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', userId);
        if (profileError) throw profileError;
      }

      toast.success(approved ? 'Verification approved!' : 'Verification rejected.');
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      toast.error(`Error processing request: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog onOpenChange={(open) => open && fetchRequests()}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors border-t border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-primary">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-primary" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            Verification Management <VerificationBadge size={25} />
          </DialogTitle>
          <CardDescription>Only visible to the super admin.</CardDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="flex justify-center p-12">
              <IndianSpinner size="lg" />
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg bg-accent/20">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={req.profiles?.profile_photo_url || ''} />
                      <AvatarFallback>{req.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold">@{req.profiles?.username}</p>
                      <p className="text-xs text-muted-foreground">{req.profiles?.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      disabled={!!processingId}
                      onClick={() => handleAction(req.id, req.user_id, false)}
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                      disabled={!!processingId}
                      onClick={() => handleAction(req.id, req.user_id, true)}
                    >
                      {processingId === req.id ? (
                        <IndianSpinner size="sm" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No pending verification requests.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


function VaultModal({ item }: { item: SettingItem }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-zinc-800">
        <DialogHeader className="p-4 border-b border-zinc-800 hidden">
          <DialogTitle>Calculator</DialogTitle>
        </DialogHeader>
        <div className="h-[600px]">
          <CalculatorVault />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordModal({ item }: any) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
    } catch (error: any) {
      toast.error(`Failed to change password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Current Password</label>
            <Input 
              type="password" 
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">New Password</label>
            <Input 
              type="password" 
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
            <Input 
              type="password" 
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button 
            className="w-full font-bold" 
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            onClick={handleChangePassword}
          >
            {loading ? <IndianSpinner size="sm" /> : 'Change Password'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrivacyModal({ item, enabled, updateEnabled }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(enabled);

  const handleToggle = async () => {
    const newValue = !isPrivate;
    setIsPrivate(newValue);
    await updateEnabled(newValue);
    toast.success(`Account set to ${newValue ? 'Private' : 'Public'}`, {
      icon: newValue ? '🔒' : '🌍',
      duration: 2000,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">Account privacy</h2>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Private Account Toggle */}
              <div className="flex items-center justify-between py-2">
                <span className="text-base font-medium">Private account</span>
                <Switch
                  checked={isPrivate}
                  onCheckedChange={handleToggle}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Public Account Explanation */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When your account is public, your profile and posts can be seen by anyone, on or off INDIANREELS, even if they don't have an INDIANREELS account.
                </p>
              </div>

              {/* Private Account Explanation */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When your account is private, only the followers that you approve can see what you share, including your photos or videos on hashtag and location pages, and your followers and following lists. Certain info on your profile, such as your profile picture and username, is visible to everyone on and off INDIANREELS.
                </p>
              </div>

              {/* Current Status Badge */}
              <div 
                className={cn(
                  "p-4 rounded-lg border-2 text-center",
                  isPrivate 
                    ? "bg-primary/10 border-primary/30" 
                    : "bg-secondary/50 border-border"
                )}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isPrivate ? (
                    <Lock className="w-5 h-5 text-primary" />
                  ) : (
                    <Globe className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="font-semibold text-base">
                    {isPrivate ? 'Private Account' : 'Public Account'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPrivate 
                    ? 'Only approved followers can see your content' 
                    : 'Anyone can see your profile and posts'}
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReadReceiptsModal({ item, enabled, updateEnabled }: any) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Read Receipts</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            When enabled, people in your messages can see when you've read their message.
          </p>
          <Button 
            className="w-full font-bold" 
            variant={enabled ? 'destructive' : 'default'}
            onClick={() => {
              updateEnabled(!enabled);
              toast.success(`Read Receipts ${!enabled ? 'Enabled' : 'Disabled'}`);
            }}
          >
            {enabled ? 'Disable Read Receipts' : 'Enable Read Receipts'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserListModal({ item, type }: { item: any, type: 'blocked' | 'muted' | 'restricted' | 'closeFriends' }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchUsers = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let tableName = '';
      let selectCol = '';
      let filterCol = '';
      
      switch(type) {
        case 'blocked':
          tableName = 'blocked_users';
          selectCol = 'blocked:blocked_id(*)';
          filterCol = 'blocker_id';
          break;
        case 'muted':
          tableName = 'muted_users';
          selectCol = 'muted:muted_id(*)';
          filterCol = 'muter_id';
          break;
        case 'restricted':
          tableName = 'restricted_users';
          selectCol = 'restricted:restricted_id(*)';
          filterCol = 'restrictor_id';
          break;
        case 'closeFriends':
          tableName = 'close_friends';
          selectCol = 'friend:friend_id(*)';
          filterCol = 'user_id';
          break;
      }

      const { data, error }: any = await supabase
        .from(tableName as any)
        .select(selectCol)
        .eq(filterCol, profile.id);

      if (error) throw error;
      
      const userList = (data || []).map((item: any) => {
        if (type === 'blocked') return item.blocked;
        if (type === 'muted') return item.muted;
        if (type === 'restricted') return item.restricted;
        if (type === 'closeFriends') return item.friend;
        return null;
      }).filter(Boolean);
      
      setUsers(userList);
    } catch (error: any) {
      console.error(`Error fetching ${type} users:`, error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (targetId: string) => {
    if (!profile) return;
    try {
      let tableName = '';
      let filterCol = '';
      let targetCol = '';

      switch(type) {
        case 'blocked':
          tableName = 'blocked_users';
          filterCol = 'blocker_id';
          targetCol = 'blocked_id';
          break;
        case 'muted':
          tableName = 'muted_users';
          filterCol = 'muter_id';
          targetCol = 'muted_id';
          break;
        case 'restricted':
          tableName = 'restricted_users';
          filterCol = 'restrictor_id';
          targetCol = 'restricted_id';
          break;
        case 'closeFriends':
          tableName = 'close_friends';
          filterCol = 'user_id';
          targetCol = 'friend_id';
          break;
      }

      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq(filterCol, profile.id)
        .eq(targetCol, targetId);

      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== targetId));
      toast.success('Updated successfully');
    } catch (error: any) {
      toast.error('Operation failed');
    }
  };

  return (
    <Dialog onOpenChange={(open) => open && fetchUsers()}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{item.label}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-96">
          <div className="p-4 space-y-4">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="space-y-2">
                      <div className="w-20 h-3 bg-muted rounded" />
                      <div className="w-24 h-2 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="w-20 h-8 bg-muted rounded" />
                </div>
              ))
            ) : users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.profile_photo_url || ''} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.full_name}</p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleRemove(user.id)}>
                    {type === 'blocked' ? 'Unblock' : type === 'muted' ? 'Unmute' : type === 'restricted' ? 'Unrestrict' : 'Remove'}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground italic">
                No users found.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ChatBackgroundSettingModal({ item }: { item: SettingItem }) {
  const { chatBackgroundUrl, updateChatBackgroundUrl, chatBackgroundStyle, updateChatBackgroundStyle } = useSettings();
  const [customUrl, setCustomUrl] = useState(chatBackgroundUrl || '');
  const [uploading, setUploading] = useState(false);

  const presets = [
    { name: 'Default', value: 'default', color: 'bg-zinc-100 dark:bg-zinc-900' },
    { name: 'Love Pink', value: 'love-pink-theme', color: 'bg-gradient-to-br from-pink-200 via-pink-300 to-rose-400' },
    { name: 'Warm Sunset', value: 'linear-gradient(135deg, #fceabb 0%, #f8b500 100%)', color: 'bg-gradient-to-br from-[#fceabb] to-[#f8b500]' },
    { name: 'Cool Sky', value: 'linear-gradient(135deg, #70e1f5 0%, #ffd194 100%)', color: 'bg-gradient-to-br from-[#70e1f5] to-[#ffd194]' },
    { name: 'Deep Ocean', value: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)', color: 'bg-gradient-to-br from-[#2b5876] to-[#4e4376]' },
    { name: 'Forest', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', color: 'bg-gradient-to-br from-[#134e5e] to-[#71b280]' },
    { name: 'Lavender', value: 'linear-gradient(135deg, #eecda3 0%, #ef629f 100%)', color: 'bg-gradient-to-br from-[#eecda3] to-[#ef629f]' },
    { name: 'Midnight', value: 'linear-gradient(135deg, #232526 0%, #414345 100%)', color: 'bg-gradient-to-br from-[#232526] to-[#414345]' },
    { name: 'Pure White', value: '#ffffff', color: 'bg-white border' },
    { name: 'Pure Black', value: '#000000', color: 'bg-black' },
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/chat_bg_${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media' as any)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media' as any)
        .getPublicUrl(filePath);

      await updateChatBackgroundUrl(publicUrl);
      await updateChatBackgroundStyle('image');
      toast.success('Chat background updated!');
    } catch (error: any) {
      toast.error('Failed to upload background');
    } finally {
      setUploading(false);
    }
  };

  const selectPreset = async (value: string) => {
    if (value === 'default') {
      await updateChatBackgroundUrl(null);
      await updateChatBackgroundStyle('default');
    } else {
      await updateChatBackgroundUrl(value);
      await updateChatBackgroundStyle('color');
    }
    toast.success('Background style updated!');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary">Chat Background</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Presets & Colors</h3>
              <div className="grid grid-cols-3 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => selectPreset(preset.value)}
                    className={cn(
                      "group relative aspect-square rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 border-2",
                      (chatBackgroundUrl === preset.value || (preset.value === 'default' && !chatBackgroundUrl)) ? "border-primary" : "border-transparent"
                    )}
                  >
                    <div className={cn("w-full h-full", preset.color)} />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white font-black uppercase">{preset.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Custom Image</h3>
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={() => document.getElementById('chat-bg-upload')?.click()}
                  disabled={uploading}
                  className="w-full h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-foreground border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-primary transition-all group"
                >
                  {uploading ? <IndianSpinner size="sm" /> : (
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-zinc-500 group-hover:text-primary" />
                      <span className="font-bold">Upload Custom Image</span>
                    </div>
                  )}
                </Button>
                <input 
                  id="chat-bg-upload"
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  onChange={handleFileChange}
                />
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Or enter URL</p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://example.com/image.jpg"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="rounded-xl border-2 focus-visible:ring-primary h-12"
                    />
                    <Button 
                      onClick={async () => {
                        await updateChatBackgroundUrl(customUrl);
                        await updateChatBackgroundStyle('image');
                        toast.success('Background URL updated!');
                      }}
                      className="rounded-xl h-12 px-6 font-black uppercase tracking-widest"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {chatBackgroundUrl && (
              <section className="pt-4 border-t">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Preview</h3>
                 <div className="aspect-[9/16] w-32 mx-auto rounded-3xl border-4 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl relative">
                    <div 
                      className="absolute inset-0 bg-cover bg-center" 
                      style={{ 
                        backgroundImage: chatBackgroundStyle === 'image' ? `url(${chatBackgroundUrl})` : chatBackgroundUrl.startsWith('linear-gradient') ? chatBackgroundUrl : 'none',
                        backgroundColor: chatBackgroundStyle === 'color' && !chatBackgroundUrl.startsWith('linear-gradient') ? chatBackgroundUrl : 'transparent'
                      }}
                    />
                    <div className="absolute bottom-2 left-2 right-2 h-4 bg-white/20 backdrop-blur-md rounded-full" />
                 </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function PrivacyShutterModal({ item }: any) {
  const { isEnabled, isStrangerDetected, isCameraActive, togglePrivacyShutter, registerUserFace, isUserFaceRegistered } = usePrivacyShutter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{isEnabled ? 'ON' : 'OFF'}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Privacy Shutter (Stranger Alert)</DialogTitle>
          <CardDescription>
            Front camera से AI background में scan करेगा कि कोई और भी screen देख रहा है या नहीं। अगर कोई अनजान चेहरा मिला, तो app तुरंत chats को blur कर देगा या Fake News Feed दिखाने लगेगा।
          </CardDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status Indicators */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-bold">{isEnabled ? '🟢 Active' : '⚫ Inactive'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Camera</p>
              <p className="text-sm font-bold">{isCameraActive ? '📹 Running' : '📴 Off'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Detection</p>
              <p className="text-sm font-bold">{isCameraActive ? '🔍 Scanning' : '⏸️ Paused'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Alert</p>
              <p className="text-sm font-bold">{isStrangerDetected ? '⚠️ Stranger!' : '✅ Safe'}</p>
            </div>
          </div>

          {/* Face Registration */}
          {!isUserFaceRegistered && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Fingerprint className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">Face Registration Required</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Privacy Shutter को enable करने से पहले अपना face register करें।
                  </p>
                </div>
              </div>
              <Button 
                onClick={async () => {
                  await registerUserFace();
                }}
                className="w-full font-bold"
                variant="outline"
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                Register My Face
              </Button>
            </div>
          )}

          {isUserFaceRegistered && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Face registered successfully!
              </p>
            </div>
          )}

          {/* Toggle Button */}
          <Button 
            onClick={async () => {
              await togglePrivacyShutter();
            }}
            disabled={!isUserFaceRegistered}
            className="w-full font-bold h-12"
            variant={isEnabled ? 'destructive' : 'default'}
          >
            {isEnabled ? (
              <>
                <XCircle className="w-5 h-5 mr-2" />
                Turn OFF Privacy Shutter
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Turn ON Privacy Shutter
              </>
            )}
          </Button>

          {/* Info */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">How it works</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Front camera background में continuously scan करता है</li>
              <li>Motion detection algorithm से unusual activity detect होती है</li>
              <li>Alert trigger होने पर app तुरंत Fake News Feed दिखाएगा</li>
              <li>Privacy mode में सारे chats और sensitive content blur हो जाएंगे</li>
              <li>Camera permission required (background में चलेगा)</li>
              <li>Note: यह एक simplified version है - future में advanced AI face detection add होगा</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Proximity Sync Modal Component
function ProximitySyncModal({ item }: any) {
  const { isEnabled, isSyncing, syncedFriend, myThemeColor, toggleProximity } = useProximity();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEnabled ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold">Active</span>
                ) : (
                  <span className="text-muted-foreground">Inactive</span>
                )}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dosti ki Doori (Proximity Sync)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <span className={cn(
                "text-sm font-bold",
                isEnabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              )}>
                {isEnabled ? "Active" : "Inactive"}
              </span>
            </div>

            {isEnabled && (
              <>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Location Tracking</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    Running
                  </span>
                </div>

                {isSyncing && syncedFriend && (
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-lg">
                    <span className="text-sm font-medium text-foreground">Synced with</span>
                    <span className="text-sm font-bold text-primary">
                      @{syncedFriend.username}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Theme Color Preview */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Your Theme Color</p>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div 
                className="w-12 h-12 rounded-full border-2 border-foreground/20"
                style={{ backgroundColor: myThemeColor }}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{myThemeColor}</p>
                <p className="text-xs text-muted-foreground">यह color sync के दौरान दिखेगा</p>
              </div>
            </div>
          </div>

          {/* Toggle Button */}
          <Button 
            onClick={async () => {
              await toggleProximity();
            }}
            className="w-full font-bold h-12"
            variant={isEnabled ? 'destructive' : 'default'}
          >
            {isEnabled ? (
              <>
                <XCircle className="w-5 h-5 mr-2" />
                Turn OFF Dosti ki Doori
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Turn ON Dosti ki Doori
              </>
            )}
          </Button>

          {/* Info */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">How it works</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>App आपकी location को continuously track करेगा</li>
              <li>Haversine Formula से दूसरे online users की distance calculate होगी</li>
              <li>जब कोई mutual follower 5 मीटर के अंदर आएगा, sync trigger होगा</li>
              <li>Dono phones पर vibration और glow effect दिखेगा</li>
              <li>आपके और friend के theme colors mix होकर gradient बनेगा</li>
              <li>Sync 30 seconds तक active रहेगा</li>
              <li>Privacy: सिर्फ mutual followers के साथ काम करता है</li>
              <li>Location permission required</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



// AI Auto-Pilot Modal Component
function AIAutoPilotModal({ item, enabled, updateEnabled }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await updateEnabled(!enabled);
      toast.success(enabled ? 'AI Auto-Reply disabled' : 'AI Auto-Reply enabled');
    } catch (error) {
      toast.error('Failed to update AI Auto-Reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-purple-500" />
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {enabled ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Enabled
                  </span>
                ) : (
                  <span className="text-muted-foreground">Disabled</span>
                )}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-500" />
            AI Auto-Reply (Offline Bot)
          </DialogTitle>
          <CardDescription>
            Bhai, jab aap offline honge ya busy honge, yeh AI aapka clone bankar friends ke messages ka auto-reply karega.
          </CardDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-bold">{enabled ? '🟢 Active' : '⚫ Inactive'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">AI Model</p>
              <p className="text-sm font-bold">🤖 Groq LLM</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Features</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300">Persona Learning</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    AI आपकी पिछली 20 messages से आपकी बात करने की style सीखेगा।
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Auto Reply</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    जब आप offline हों, तो AI automatically friends को reply करेगा।
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">Context Aware</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    AI आपकी और friend की पिछली conversation को समझकर reply करेगा।
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleToggle}
            disabled={loading}
            className="w-full font-bold h-12"
            variant={enabled ? 'destructive' : 'default'}
          >
            {loading ? (
              <IndianSpinner size="sm" className="mr-2" />
            ) : enabled ? (
              <>
                <XCircle className="w-5 h-5 mr-2" />
                Turn OFF AI Auto-Pilot
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Turn ON AI Auto-Pilot
              </>
            )}
          </Button>

          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">How it works</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>जब कोई friend आपको message करेगा, AI trigger होगा</li>
              <li>AI आपकी last 20 messages को analyze करके आपकी style सीखेगा</li>
              <li>आपकी और friend की पिछली conversation को context के रूप में use करेगा</li>
              <li>Groq LLM से natural reply generate होगा</li>
              <li>Reply automatically send हो जाएगा (AI tag के साथ)</li>
              <li>आप online होने पर normal chat कर सकते हैं</li>
              <li>Privacy: सिर्फ आपकी own messages AI को दिखेंगी</li>
              <li>Note: यह experimental feature है - future में improvements होंगे</li>
            </ul>
          </div>

          {enabled && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">⚠️ Khatarnak Feature Active!</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  AI अब आपकी तरफ से reply कर रहा है। सुनिश्चित करें कि आपके friends को पता हो।
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TelegramConfigModal({ item }: { item: SettingItem }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({
    botToken: '',
    chatId: '',
    sessionString: '',
    appId: '',
    apiHash: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Ensure we have a fresh session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired, please log in again');
      }

      const secrets = [];
      
      if (config.botToken) {
        secrets.push({ name: 'TELEGRAM_BOT_TOKEN', value: config.botToken });
      }
      if (config.chatId) {
        secrets.push({ name: 'TELEGRAM_CHAT_ID', value: config.chatId });
      }
      if (config.sessionString) {
        secrets.push({ name: 'TELEGRAM_SESSION_STRING', value: config.sessionString });
      }
      if (config.appId) {
        secrets.push({ name: 'TELEGRAM_API_ID', value: config.appId });
      }
      if (config.apiHash) {
        secrets.push({ name: 'TELEGRAM_API_HASH', value: config.apiHash });
      }

      if (secrets.length === 0) {
        toast.error('Please fill at least one field');
        return;
      }

      const { error } = await supabase.functions.invoke('update-telegram-secrets', {
        body: { secrets },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        const errorMsg = await error?.context?.text();
        console.error('Storage secrets error context:', errorMsg);
        try {
          const parsed = JSON.parse(errorMsg);
          throw new Error(parsed.details || parsed.error || errorMsg);
        } catch (e) {
          throw new Error(errorMsg || error.message);
        }
      }

      toast.success('✅ Storage configuration updated successfully!');
      setOpen(false);
      setConfig({
        botToken: '',
        chatId: '',
        sessionString: '',
        appId: '',
        apiHash: ''
      });
    } catch (error: any) {
      console.error('Error updating Telegram config:', error);
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure Storage secrets
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-500" />
            High-Speed Engine (2GB Support)
          </DialogTitle>
          <CardDescription>
            Bhai, yahan apni details dal kar 2GB upload enable karein.
          </CardDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Bot Token</label>
            <Input
              type="password"
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={config.botToken}
              onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Get from official provider
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Chat ID</label>
            <Input
              type="text"
              placeholder="@indianreels_storage or -1001234567890"
              value={config.chatId}
              onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Channel username or chat ID where videos will be stored
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Session String (Optional)</label>
            <Textarea
              placeholder="Session string for engine..."
              value={config.sessionString}
              onChange={(e) => setConfig({ ...config, sessionString: e.target.value })}
              className="font-mono text-xs min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              For advanced MTProto features (optional)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">App ID (Optional)</label>
            <Input
              type="text"
              placeholder="12345678"
              value={config.appId}
              onChange={(e) => setConfig({ ...config, appId: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              From my.telegram.org/apps
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">API Hash (Optional)</label>
            <Input
              type="password"
              placeholder="abcdef1234567890abcdef1234567890"
              value={config.apiHash}
              onChange={(e) => setConfig({ ...config, apiHash: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              From my.telegram.org/apps
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <IndianSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <strong>Note:</strong> Only fill the fields you want to update. Empty fields will keep their existing values in Supabase secrets.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Screenshot Protection Modal
function ScreenshotProtectionModal({ item, enabled, updateEnabled }: any) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary">Screenshot Protection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            When enabled, your profile and media will be protected from screenshots. The screen will turn black if someone tries to capture it.
          </p>
          <div className="flex items-center justify-between p-4 bg-accent/20 rounded-xl">
            <div>
              <p className="font-semibold">Enable Protection</p>
              <p className="text-xs text-muted-foreground">Prevent unauthorized screenshots</p>
            </div>
            <Switch checked={enabled} onCheckedChange={updateEnabled} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Auto Download Media Modal
function AutoDownloadMediaModal({ item, enabled, updateEnabled }: any) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary">Auto-Download Media</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Automatically download photos and videos when viewing them.
          </p>
          <div className="flex items-center justify-between p-4 bg-accent/20 rounded-xl">
            <div>
              <p className="font-semibold">Auto-Download</p>
              <p className="text-xs text-muted-foreground">Save media automatically</p>
            </div>
            <Switch checked={enabled} onCheckedChange={updateEnabled} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Activity Status Modal (full-screen Sheet)
function ActivityStatusModal({ item, enabled, updateEnabled }: any) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 bg-background">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">Activity Status</h2>
          </div>
          <div className="flex-1 p-6 space-y-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <span className="text-6xl">👁️</span>
              <p className="text-center text-muted-foreground text-sm max-w-xs">
                Control whether others can see when you were last active or if you're active right now.
              </p>
            </div>
            <div className="flex items-center justify-between p-5 bg-accent/20 rounded-2xl border border-border">
              <div>
                <p className="font-semibold text-base">Show Activity Status</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {enabled ? 'Others can see your last active time' : 'Activity status is hidden'}
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  updateEnabled(v);
                  toast.success(`Activity status ${v ? 'visible' : 'hidden'}`);
                }}
              />
            </div>
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-sm text-foreground">Note</p>
              <p>If you turn this off, you won't be able to see other people's activity status either.</p>
              <p>Changes are saved automatically.</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Generic Notification Toggle Modal (full-screen Sheet)
function NotifToggleModal({ item, enabled, updateEnabled, icon, description }: any) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 bg-background">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">{item.label}</h2>
          </div>
          <div className="flex-1 p-6 space-y-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <span className="text-6xl">{icon}</span>
              <p className="text-center text-muted-foreground text-sm max-w-xs">{description}</p>
            </div>
            <div className="flex items-center justify-between p-5 bg-accent/20 rounded-2xl border border-border">
              <div>
                <p className="font-semibold text-base">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{enabled ? 'Currently enabled' : 'Currently disabled'}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  updateEnabled(v);
                  toast.success(`${item.label} ${v ? 'enabled' : 'disabled'}`);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Changes are saved automatically.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Notification Sounds Modal (full-screen Sheet)
function NotificationSoundsModal({ item, enabled, updateEnabled }: any) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 bg-background">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">Notification Sounds</h2>
          </div>
          <div className="flex-1 p-6 space-y-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <span className="text-6xl">🔊</span>
              <p className="text-center text-muted-foreground text-sm max-w-xs">
                Play sounds when you receive notifications.
              </p>
            </div>
            <div className="flex items-center justify-between p-5 bg-accent/20 rounded-2xl border border-border">
              <div>
                <p className="font-semibold text-base">Sound Alerts</p>
                <p className="text-xs text-muted-foreground mt-0.5">{enabled ? 'Currently enabled' : 'Currently disabled'}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  updateEnabled(v);
                  toast.success(`Notification sounds ${v ? 'enabled' : 'disabled'}`);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">Changes are saved automatically.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Show Online Status Modal
function ShowOnlineStatusModal({ item, enabled, updateEnabled }: any) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.value}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 bg-background">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">Online Status</h2>
          </div>
          <div className="flex-1 p-6 space-y-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <span className="text-6xl">🟢</span>
              <p className="text-center text-muted-foreground text-sm max-w-xs">
                Let others see when you're online and active.
              </p>
            </div>
            <div className="flex items-center justify-between p-5 bg-accent/20 rounded-2xl border border-border">
              <div>
                <p className="font-semibold text-base">Show Online Status</p>
                <p className="text-xs text-muted-foreground mt-0.5">{enabled ? 'Visible to others' : 'Hidden from others'}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  updateEnabled(v);
                  toast.success(`Online status ${v ? 'visible' : 'hidden'}`);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">Changes are saved automatically.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

