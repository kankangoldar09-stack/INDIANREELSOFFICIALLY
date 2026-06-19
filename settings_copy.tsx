import CalculatorVault from '@/components/settings/CalculatorVault';
import { useState } from 'react';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';

import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  User, Shield, Lock, Bell, Eye, EyeOff, Globe, Database, HelpCircle, 
  Trash2, LogOut, Moon, Sun, Monitor, Languages, Smartphone, History,
  ChevronRight, BadgeCheck, Type, AlignLeft,
  Share2, MessageSquare, Heart, Bookmark, UserMinus, Volume2, PlayCircle,
  SmartphoneIcon, Cloud, Search, Info, Flag, Scale, ShieldCheck, Video, Fingerprint,
  CheckCircle, XCircle, Loader2, Palette, QrCode
} from 'lucide-react';
import { VerificationBadge } from '@/components/VerificationBadge';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';

interface SettingItem {
  id: number;
  icon: any;
  label: string;
  path?: string;
  action?: () => void;
  danger?: boolean;
  type?: 'language' | 'report' | 'fontSize' | 'videoQuality' | 'dataSaver' | 'autoplay' | 'uid' | 'verificationManager' | 'profileThemeManager' | 'hideViews' | 'theme' | 'vault' | 'changePassword' | 'qrCustomization';
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
    theme, updateTheme
  } = useSettings();
  
  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear cache? This will log you out.")) {
      signOut();
    }
  };

  const isSuperAdmin = profile?.username === 'jeetyt09' || profile?.id === '61499879-283a-485e-a36e-b203424a86d0';

  const settingsGroups: SettingGroup[] = [
    {
      title: "Account & Security",
      items: [
        { id: 1, icon: User, label: "Edit Profile", path: "/settings/profile" },
        { id: 4, icon: Lock, label: "Change Password", type: 'changePassword' },
        { id: 5, icon: Shield, label: "Two-Factor Authentication" },
        { id: 6, icon: Share2, label: "Linked Accounts" },
        { id: 62, icon: SmartphoneIcon, label: "Secret Vault (Calculator)", type: 'vault' as const },
        { id: 53, icon: BadgeCheck, label: "Apply for Verification", path: "/settings/verification" },
        ...(isSuperAdmin ? [
          { id: 998, icon: User, label: "Special Username Change", path: "/settings/profile" },
          { id: 999, icon: BadgeCheck, label: "Verification Manager (Admin)", type: 'verificationManager' as const },
          { id: 1000, icon: Palette, label: "Profile Theme Manager (Admin)", type: 'profileThemeManager' as const }
        ] : []),
        { id: 60, icon: Fingerprint, label: "User UID", type: 'uid', value: profile?.id },
        { id: 50, icon: LogOut, label: "Logout", action: signOut, danger: true },
        { id: 51, icon: Trash2, label: "Delete Account", action: async () => {
          if (window.confirm("⚠️ WARNING: This will permanently delete your account and ALL your data (posts, reels, messages, etc.). This action CANNOT be undone. Are you absolutely sure?")) {
            try {
              // Delete all user data from Supabase
              const userId = profile?.id;
              if (!userId) return;

              // Delete user's posts
              await (supabase as any).from('posts').delete().eq('owner_id', userId);
              
              // Delete user's reels
              await (supabase as any).from('reels').delete().eq('owner_id', userId);
              
              // Delete user's stories
              await (supabase as any).from('stories').delete().eq('owner_id', userId);
              
              // Delete user's comments
              await (supabase as any).from('comments').delete().eq('user_id', userId);
              
              // Delete user's likes
              await (supabase as any).from('likes').delete().eq('user_id', userId);
              
              // Delete user's follows (both as follower and following)
              await (supabase as any).from('follows').delete().eq('follower_id', userId);
              await (supabase as any).from('follows').delete().eq('following_id', userId);
              
              // Delete user's messages (both sent and received)
              await (supabase as any).from('messages').delete().eq('sender_id', userId);
              await (supabase as any).from('messages').delete().eq('receiver_id', userId);
              
              // Delete user's notifications
              await (supabase as any).from('notifications').delete().eq('user_id', userId);
              
              // Delete user's saved items
              await (supabase as any).from('saved_items').delete().eq('user_id', userId);
              
              // Delete user's watch history
              await (supabase as any).from('watch_history').delete().eq('user_id', userId);
              
              // Delete user's username history
              await (supabase as any).from('username_history').delete().eq('user_id', userId);
              
              // Delete user's verification request
              await (supabase as any).from('verification_requests').delete().eq('user_id', userId);
              
              // Delete user profile
              await (supabase as any).from('profiles').delete().eq('id', userId);
              
              // Delete auth user (this will cascade delete everything)
              const { error: authError } = await supabase.auth.admin.deleteUser(userId);
              
              if (authError) {
                console.error('Auth deletion error:', authError);
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
        { id: 3, icon: Eye, label: "Account Privacy" },
        { id: 7, icon: UserMinus, label: "Blocked Users" },
        { id: 8, icon: Volume2, label: "Muted Accounts" },
        { id: 9, icon: ShieldCheck, label: "Restricted Accounts" },
        { id: 10, icon: Heart, label: "Close Friends List" },
        { id: 24, icon: EyeOff, label: "Activity Status" },
        { id: 25, icon: MessageSquare, label: "Read Receipts" },
        { id: 61, icon: EyeOff, label: "Hide View Counts", type: 'hideViews', value: hideViewsPref ? 'Enabled' : 'Disabled' },
      ]
    },
    {
      title: "Notifications",
      items: [
        { id: 11, icon: Bell, label: "Likes Notifications" },
        { id: 12, icon: Bell, label: "Comments Notifications" },
        { id: 13, icon: Bell, label: "Follow Requests" },
        { id: 14, icon: Bell, label: "Messages Notifications" },
        { id: 15, icon: Bell, label: "Reels Notifications" },
        { id: 16, icon: Smartphone, label: "Push Notification Toggle" },
        { id: 17, icon: Globe, label: "Email Notification Toggle" },
      ]
    },
    {
      title: "Appearance & Accessibility",
      items: [
        { id: 100, icon: theme === 'dark' ? Moon : Sun, label: `Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`, type: 'theme' },
        { id: 101, icon: QrCode, label: "QR Code Customization", type: 'qrCustomization' },
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
        { id: 47, icon: Scale, label: "Privacy Policy" },
        { id: 48, icon: Scale, label: "Terms of Service" },
        { id: 49, icon: Info, label: "About INDIANREELS" },
      ]
    }
  ];

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

      <div className="space-y-10">
        {settingsGroups.map((group, idx) => (
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
                if (item.type === 'changePassword') return <ChangePasswordModal key={item.id} item={item} />;
                if (item.type === 'hideViews') return <HideViewsModal key={item.id} item={item} enabled={hideViewsPref} updateEnabled={updateHideViewsPref} />;
                if (item.type === 'verificationManager') return <VerificationManagerModal key={item.id} item={item} />;
                if (item.type === 'profileThemeManager') return <ProfileThemeManagerModal key={item.id} item={item} />;
                if (item.type === 'theme') return <ThemeToggleModal key={item.id} item={item} theme={theme} updateTheme={updateTheme} />;
                if (item.type === 'vault') return <VaultModal key={item.id} item={item} />;
                
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
        ))}
      </div>
    </div>
  );
}

function FontSizeModal({ item, fontSize, updateFontSize }: any) {
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
          <DialogTitle>Font Size</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {fontSizeOptions.map((opt) => (
            <Button 
              key={opt.value} 
              variant={fontSize === opt.value ? 'secondary' : 'ghost'} 
              className="w-full justify-start font-medium" 
              onClick={() => {
                updateFontSize(opt.value);
                toast.success(`Font size updated to ${opt.label}`);
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VideoQualityModal({ item, quality, updateQuality }: any) {
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
          <DialogTitle>Default Video Quality</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {videoQualityOptions.map((q) => (
            <Button 
              key={q} 
              variant={quality === q ? 'secondary' : 'ghost'} 
              className="w-full justify-start font-medium" 
              onClick={() => {
                updateQuality(q);
                toast.success(`Default quality set to ${q}`);
              }}
            >
              {q}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
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
          <DialogTitle>Select Language</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-80 pr-4">
          <div className="space-y-1">
            {languages.map((lang) => (
              <Button key={lang} variant="ghost" className="w-full justify-start font-medium" onClick={() => toast.success(`Language changed to ${lang}`)}>
                {lang}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
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
  { name: 'Midnight', value: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)' },
  { name: 'Emerald', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { name: 'Golden', value: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)' },
  { name: 'Cyber', value: 'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)' },
  { name: 'Candy', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { name: 'Frost', value: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' },
  { name: 'Lush', value: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)' },
  { name: 'Royal', value: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)' },
  { name: 'Fire', value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
  { name: 'Aurora', value: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
  { name: 'Lavender', value: 'linear-gradient(135deg, #c471ed 0%, #f64f59 100%)' },
  { name: 'Rose', value: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)' },
  { name: 'Sky', value: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { name: 'Electric', value: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)' },
  { name: 'Passion', value: 'linear-gradient(135deg, #f80759 0%, #bc4e9c 100%)' },
];

function ThemeToggleModal({ item, theme, updateTheme }: any) {
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
          <DialogTitle>Appearance Settings</DialogTitle>
          <CardDescription>Choose how INDIANREELS looks to you.</CardDescription>
        </DialogHeader>
        <div className="space-y-2 pt-4">
          <Button 
            variant={theme === 'light' ? 'secondary' : 'ghost'} 
            className="w-full justify-start gap-3 h-12"
            onClick={() => {
              updateTheme('light');
              toast.success('Theme set to Light mode');
            }}
          >
            <Sun className="w-5 h-5" /> Light Mode
          </Button>
          <Button 
            variant={theme === 'dark' ? 'secondary' : 'ghost'} 
            className="w-full justify-start gap-3 h-12"
            onClick={() => {
              updateTheme('dark');
              toast.success('Theme set to Dark mode');
            }}
          >
            <Moon className="w-5 h-5" /> Dark Mode
          </Button>
          <Button 
            variant={theme === 'system' ? 'secondary' : 'ghost'} 
            className="w-full justify-start gap-3 h-12"
            onClick={() => {
              updateTheme('system');
              toast.success('Theme set to System preference');
            }}
          >
            <Smartphone className="w-5 h-5" /> System Default
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
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
      const { error } = await supabase
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
              text={`${window.location.origin}/profile/${profile?.username}`}
              width={160}
              color={qrColor}
              backgroundColor={qrBgColor}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black rounded-full p-0.5 shadow-xl flex items-center justify-center border-2 border-white/20">
              <img src="https://miaoda-conversation-file.s3cdn.medo.dev/user-a802e9kq6vpc/conv-af2z7g8d924h/20260412/file-aw71wfutmg3k.png" className="w-full h-full object-contain rounded-full" alt="Logo" />
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Apply QR Changes'}
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
            Verification Management <VerificationBadge size={20} />
          </DialogTitle>
          <CardDescription>Only visible to the super admin.</CardDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
                        <Loader2 className="w-4 h-4 animate-spin" />
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Change Password'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
