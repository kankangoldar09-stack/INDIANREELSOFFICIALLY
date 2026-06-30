import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Profile, Post, Reel, VerificationRequest } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, ShieldAlert, BadgeCheck, FileText, BarChart3, Settings, Trash2, Ban, CheckCircle, XCircle, Film, Video as VideoIcon, Palette, PlayCircle, Send, Image as ImageIcon, Search, Plus, Flag } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { VerificationBadge } from '@/components/VerificationBadge';
import { Navigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

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

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ users: 0, posts: 0, reels: 0, verifications: 0, reports: 0, feedback: 0 });
  const [users, setUsers] = useState<Profile[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [musicHistory, setMusicHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [manualAudioUrl, setManualAudioUrl] = useState('');

  const [sendingToTg, setSendingToTg] = useState<string | null>(null);
  const [tgChannelId, setTgChannelId] = useState('@indianreels_official');
  const [tgBotToken, setTgBotToken] = useState('');
  const [rapidApiKey, setRapidApiKey] = useState('');
  const [rapidApiHost, setRapidApiHost] = useState('youtube-mp36.p.rapidapi.com');
  const [isUpdatingTg, setIsUpdatingTg] = useState(false);
  const [ytSearchQuery, setYtSearchQuery] = useState('');
  const [ytResults, setYtResults] = useState<any[]>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [isImportingMusic, setIsImportingMusic] = useState<string | null>(null);

  // Badge settings state
  const [badgeUrl, setBadgeUrl] = useState('');
  const [badgeSize, setBadgeSize] = useState(16);
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [isUploadingBadge, setIsUploadingBadge] = useState(false);


  const isSuperAdmin = profile?.username === 'jeetyt09' || profile?.id === '61499879-283a-485e-a36e-b203424a86d0' || profile?.username === 'INDIANREELS_OFFICIALLY' || profile?.id === '20bdb204-fe88-42c0-9787-728275517d07';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  const fetchTgConfig = async () => {
    const { data } = await supabase.from('telegram_config').select('key, value');
    if (data) {
      const channel = (data as any[]).find(c => c.key === 'channel_id');
      const token = (data as any[]).find(c => c.key === 'bot_token');
      const rapidKey = (data as any[]).find(c => c.key === 'rapidapi_key');
      const rapidHost = (data as any[]).find(c => c.key === 'rapidapi_host');
      if (channel) setTgChannelId(channel.value);
      if (token) setTgBotToken(token.value);
      if (rapidKey) setRapidApiKey(rapidKey.value);
      if (rapidHost) setRapidApiHost(rapidHost.value);
    }
  };

  const fetchBadgeSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['verification_badge_url', 'verification_badge_size']);
    
    if (data) {
      const urlSetting = (data as any[]).find(s => s.setting_key === 'verification_badge_url');
      const sizeSetting = (data as any[]).find(s => s.setting_key === 'verification_badge_size');
      if (urlSetting) setBadgeUrl(urlSetting.setting_value);
      if (sizeSetting) setBadgeSize(parseInt(sizeSetting.setting_value));
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
      fetchTgConfig();
      fetchBadgeSettings();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uCount, pCount, rCount, vCount, fCount] = await Promise.all([
        (supabase as any).from('profiles').select('*', { count: 'exact', head: true }),
        (supabase as any).from('posts').select('*', { count: 'exact', head: true }),
        (supabase as any).from('reels').select('*', { count: 'exact', head: true }),
        (supabase as any).from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        (supabase as any).from('feedback').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        users: uCount.count || 0,
        posts: pCount.count || 0,
        reels: rCount.count || 0,
        verifications: vCount.count || 0,
        reports: 0,
        feedback: fCount.count || 0,
      });

      const { data: userData }: any = await (supabase as any).from('profiles').select('*').limit(50);
      setUsers(userData || []);

      const { data: verifData }: any = await supabase
        .from('verification_requests' as any)
        .select('*, profiles(*)')
        .eq('status', 'pending');
      setVerifications(verifData || []);

      const { data: postData }: any = await (supabase as any).from('posts').select('*, profiles(*)').limit(50);
      setPosts(postData || []);

      const { data: reelData }: any = await (supabase as any).from('reels').select('*, profiles(*)').limit(50);
      setReels(reelData || []);

      const { data: feedbackData }: any = await (supabase as any)
        .from('feedback')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });
      setFeedback(feedbackData || []);

      const { data: musicData }: any = await supabase
        .from('video_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setMusicHistory(musicData || []);
    } catch (error: any) {
      toast.error(`Error loading admin data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReplyFeedback = async (feedbackId: string, reply: string) => {
    try {
      const { error } = await (supabase as any)
        .from('feedback')
        .update({ admin_reply: reply, status: 'resolved' })
        .eq('id', feedbackId);

      if (error) throw error;
      toast.success('Reply sent successfully');
      fetchAdminData();
    } catch (error: any) {
      toast.error('Failed to send reply');
    }
  };

  const handleIssueCopyrightStrike = async (userId: string, reason: string) => {
    try {
      const { data: userProfile } = await (supabase as any).from('profiles').select('copyright_strikes').eq('id', userId).single();
      const newStrikes = (userProfile?.copyright_strikes || 0) + 1;

      const { error: strikeError } = await (supabase as any)
        .from('copyright_strikes_log')
        .insert({
          user_id: userId,
          issued_by: profile?.id,
          reason
        });

      if (strikeError) throw strikeError;

      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ copyright_strikes: newStrikes })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast.success(`Copyright strike issued. Total strikes: ${newStrikes}`);
      if (newStrikes >= 2) {
        toast.error('User automatically banned due to 2 strikes');
      }
      fetchAdminData();
    } catch (error: any) {
      toast.error('Failed to issue strike');
    }
  };

  const handleApproveVerification = async (requestId: string, userId: string) => {
    try {
      await (supabase as any).from('verification_requests').update({ status: 'approved' } as any).eq('id', requestId);
      await (supabase as any).from('profiles').update({ is_verified: true } as any).eq('id', userId);
      toast.success('User verified successfully');
      fetchAdminData();
    } catch (error) {
      toast.error('Failed to approve verification');
    }
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`User ${!currentStatus ? 'verified' : 'unverified'} successfully`);
      fetchAdminData();
    } catch (error: any) {
      toast.error(`Failed to update verification: ${error.message}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await (supabase as any).from('posts').delete().eq('id', postId);
      toast.success('Post removed');
      fetchAdminData();
    } catch (error) {
      toast.error('Failed to remove post');
    }
  };

  const handleUpdateProfileColor = async (userId: string, color: string) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ profile_color: color })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Profile color updated');
      fetchAdminData();
    } catch (err: any) {
      toast.error(`Error updating color: ${err.message}`);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!window.confirm('Delete this reel?')) return;
    try {
      await (supabase as any).from('reels').delete().eq('id', reelId);
      toast.success('Reel removed');
      fetchAdminData();
    } catch (error) {
      toast.error('Failed to remove reel');
    }
  };

  // Ban a user and record device IP if selected
  const handleBanUser = async (userId: string, isDeviceBan: boolean, reason: string) => {
    try {
      setLoading(true);
      const { data: targetProfile } = await (supabase as any)
        .from('profiles')
        .select('ban_reason')
        .eq('id', userId)
        .single();

      let targetIp = 'unknown';
      if (targetProfile?.ban_reason && targetProfile.ban_reason.startsWith('IP:')) {
        targetIp = targetProfile.ban_reason.replace('IP:', '').trim();
      }

      const finalBanReason = isDeviceBan 
        ? `DEVICE_IP_BAN|${targetIp}|${reason}`
        : reason;

      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          is_banned: true,
          ban_reason: finalBanReason
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User successfully ${isDeviceBan ? 'Device Banned' : 'Banned'}`);
      fetchAdminData();
    } catch (err: any) {
      toast.error(`Failed to ban user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      setLoading(true);
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          is_banned: false,
          ban_reason: null
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('User unbanned successfully');
      fetchAdminData();
    } catch (err: any) {
      toast.error(`Failed to unban user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Send a direct message to a user
  const sendDirectMessage = async (receiverId: string, content: string) => {
    try {
      const { error } = await (supabase as any).from('messages').insert({
        sender_id: profile?.id,
        receiver_id: receiverId,
        content: content,
        media_type: null
      });
      if (error) throw error;
      toast.success('Direct reply message sent!');
    } catch (err: any) {
      toast.error(`Failed to send message: ${err.message}`);
    }
  };

  // Delete a reported video
  const handleDeleteReportedVideo = async (reelId: string, feedbackId: string) => {
    if (!window.confirm('Are you sure you want to delete this reported video?')) return;
    try {
      const { error } = await (supabase as any).from('reels').delete().eq('id', reelId);
      if (error) throw error;
      
      // Update report status
      await (supabase as any).from('feedback').update({ 
        status: 'resolved', 
        admin_reply: 'Reported video deleted by Admin.' 
      }).eq('id', feedbackId);

      toast.success('Reported video deleted successfully!');
      fetchAdminData();
    } catch (err: any) {
      toast.error(`Failed to delete video: ${err.message}`);
    }
  };

  // Device ban a blackmailer by their username
  const handleBanBlackmailer = async (username: string, reason: string, feedbackId: string) => {
    try {
      const { data: bProfile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!bProfile) {
        toast.error(`User @${username} not found.`);
        return;
      }

      await handleBanUser(bProfile.id, true, reason);
      
      // Mark report as resolved
      await (supabase as any).from('feedback').update({ 
        status: 'resolved', 
        admin_reply: `Action Taken: Blackmailer @${username} has been Device Banned.` 
      }).eq('id', feedbackId);

      toast.success(`Blackmailer @${username} has been device banned!`);
      fetchAdminData();
    } catch (err: any) {
      toast.error(`Failed to ban blackmailer: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete this user and ALL their data. This action CANNOT be undone. Are you sure?')) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userIdToDelete: userId }
      });

      if (error) {
        let errorMsg = error.message;
        try {
          const body = await error.context?.text();
          if (body) {
            const parsed = JSON.parse(body);
            errorMsg = parsed.error || parsed.message || body;
          }
        } catch (e) {
          console.error('Error parsing function error:', e);
        }
        throw new Error(errorMsg);
      }

      toast.success('User deleted successfully');
      fetchAdminData();
    } finally {
      setLoading(false);
    }
  };

  const handleSendToTelegram = async (content: any, type: 'reel' | 'post') => {
    setSendingToTg(content.id);
    try {
      const fileUrl = content.video_url || content.media_url;
      const caption = `<b>${type === 'reel' ? '🎬 New Reel' : '📸 New Post'} by @${content.profiles?.username}</b>\n\n${content.caption || ''}\n\nApp: INDIANREELS`;
      
      const { data, error } = await supabase.functions.invoke('telegram-bot-upload', {
        body: {
          fileUrl,
          fileName: `${type}_${content.id}.mp4`,
          mimeType: type === 'reel' ? 'video/mp4' : 'image/jpeg',
          caption
        }
      });

      if (error) {
        let errorMsg = error.message;
        try {
          const body = await error.context?.text();
          if (body) {
            const parsed = JSON.parse(body);
            errorMsg = parsed.error || parsed.message || body;
          }
        } catch (e) {
          console.error('Error parsing function error:', e);
        }
        throw new Error(errorMsg);
      }

      if (data?.success) {
        toast.success('Successfully sent to High-Speed Storage!');
      } else {
        throw new Error(data?.error || 'Failed to send');
      }
    } catch (error: any) {
      toast.error(`Storage Error: ${error.message}`);
    } finally {
      setSendingToTg(null);
    }
  };

  const handleUpdateTgConfig = async () => {
    if (!tgChannelId || !tgBotToken || !rapidApiKey || !rapidApiHost) {
      toast.error('Bhai, saari details bharna zaroori hai (Channel, Access Token, RapidAPI Key, RapidAPI Host)');
      return;
    }

    setIsUpdatingTg(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-telegram-secrets', {
        body: { 
          secrets: [
            { name: 'TELEGRAM_CHANNEL_ID', value: tgChannelId },
            { name: 'TELEGRAM_BOT_TOKEN', value: tgBotToken },
            { name: 'RAPIDAPI_KEY', value: rapidApiKey },
            { name: 'RAPIDAPI_HOST', value: rapidApiHost }
          ] 
        }
      });

      if (error) {
        let errorMsg = error.message;
        try {
          const body = await error.context?.text();
          if (body) {
            const parsed = JSON.parse(body);
            errorMsg = parsed.error || parsed.message || body;
          }
        } catch (e) {
          console.error('Error parsing function error:', e);
        }
        throw new Error(errorMsg);
      }

      toast.success('Storage channel updated successfully!');
    } catch (error: any) {
      toast.error(`Update Error: ${error.message}`);
    } finally {
      setIsUpdatingTg(false);
    }
  };

  const handleSearchYouTube = async () => {
    if (!ytSearchQuery) return;
    setIsSearchingYt(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-search', {
        body: { q: ytSearchQuery }
      });
      if (error) throw error;
      setYtResults(data.tracks || []);
    } catch (error: any) {
      toast.error(`YouTube Search Error: ${error.message}`);
    } finally {
      setIsSearchingYt(false);
    }
  };

  const handleImportMusic = async (videoUrl: string, trackId: string) => {
    setIsImportingMusic(trackId);
    try {
      const { data, error } = await supabase.functions.invoke('import-music', {
        body: { videoUrl, adminUserId: profile?.id }
      });
      if (error) {
        let errorMsg = error.message;
        try {
          const body = await error.context?.text();
          if (body) {
            const parsed = JSON.parse(body);
            errorMsg = parsed.error || parsed.message || body;
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }
      if (data?.success) {
        toast.success('Music imported successfully');
      } else {
        throw new Error(data?.error || 'Failed to import');
      }
    } catch (error: any) {
      toast.error(`Import Error: ${error.message}`);
    } finally {
      setIsImportingMusic(null);
    }
  };

  const handleBadgeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error('File size must be less than 1MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setBadgeFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBadgeUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadBadge = async () => {
    if (!badgeFile) {
      toast.error('Please select a badge image');
      return;
    }

    setIsUploadingBadge(true);
    try {
      const fileName = `verification-badge-${Date.now()}.${badgeFile.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, badgeFile, {
          contentType: badgeFile.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      await (supabase as any)
        .from('app_settings')
        .update({ setting_value: publicUrl })
        .eq('setting_key', 'verification_badge_url');

      setBadgeUrl(publicUrl);
      setBadgeFile(null);
      toast.success('Badge uploaded successfully');
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploadingBadge(false);
    }
  };

  const handleUpdateBadgeSize = async (newSize: number) => {
    try {
      await (supabase as any)
        .from('app_settings')
        .update({ setting_value: newSize.toString() })
        .eq('setting_key', 'verification_badge_size');

      setBadgeSize(newSize);
      toast.success('Badge size updated');
    } catch (error: any) {
      toast.error(`Failed to update size: ${error.message}`);
    }
  };


  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, content, and platform settings.</p>
        </div>
        <Button onClick={fetchAdminData} className="flex gap-2">
          <BarChart3 className="w-4 h-4" /> Refresh Stats
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.users} icon={Users} color="blue" />
        <StatCard title="Posts" value={stats.posts} icon={FileText} color="purple" />
        <StatCard title="Reels" value={stats.reels} icon={CustomVideoIcon} color="pink" />
        <StatCard title="Pending Verification" value={stats.verifications} icon={BadgeCheck} color="amber" />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto h-12 bg-muted p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="music">Music</TabsTrigger>
          <TabsTrigger value="telegram">Storage</TabsTrigger>
          {isAdmin && <TabsTrigger value="verification">Verifications</TabsTrigger>}
          {isAdmin && <TabsTrigger value="badge">Badge Settings</TabsTrigger>}
          <TabsTrigger value="feedback">Feedback ({stats.feedback})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="border-muted">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Visual stats and logs coming soon.</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              Analytics Charts Placeholder
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Strikes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={user.is_banned ? "opacity-50 bg-red-50/10" : ""}>
                      <TableCell className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.profile_photo_url || ''} />
                          <AvatarFallback>{user.username[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-1">
                            @{user.username}
                            {user.is_verified && <VerificationBadge size={25} />}
                            {user.is_banned && <Ban className="w-3 h-3 text-destructive" />}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{user.main_token_id?.substring(0, 8)}...</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          user.role === 'admin' ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                        )}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>{user.is_verified ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-bold",
                          user.copyright_strikes >= 2 ? "text-destructive" : user.copyright_strikes > 0 ? "text-amber-500" : "text-muted-foreground"
                        )}>
                          {user.copyright_strikes}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <ProfileColorDialog 
                          userId={user.id} 
                          currentColor={user.profile_color} 
                          onUpdate={(color) => handleUpdateProfileColor(user.id, color)} 
                        />
                        <Button 
                          onClick={() => handleToggleVerification(user.id, user.is_verified)} 
                          variant="ghost" 
                          size="icon" 
                          className={cn("h-8 w-8", user.is_verified ? "text-blue-500" : "text-muted-foreground")}
                        >
                          <BadgeCheck className="w-4 h-4" />
                        </Button>
                        {user.is_banned ? (
                          <Button 
                            onClick={() => handleUnbanUser(user.id)} 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-500"
                            title="Unban User"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <BanUserDialog 
                            user={user} 
                            onBan={(isDevice, reason) => handleBanUser(user.id, isDevice, reason)} 
                          />
                        )}
                        <CopyrightStrikeDialog 
                          user={user} 
                          onIssue={(reason) => handleIssueCopyrightStrike(user.id, reason)} 
                        />
                        <Button 
                          onClick={() => handleDeleteUser(user.id)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          disabled={user.id === profile?.id || user.id === '61499879-283a-485e-a36e-b203424a86d0'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post ID</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-mono text-[10px]">{post.id.slice(0, 8)}</TableCell>
                      <TableCell>@{post.profiles?.username}</TableCell>
                      <TableCell>Image Post</TableCell>
                      <TableCell>
                        <img src={post.media_url} className="w-10 h-10 rounded-sm object-cover" />
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-500" 
                          onClick={() => handleSendToTelegram(post, 'post')}
                          disabled={sendingToTg === post.id}
                        >
                          {sendingToTg === post.id ? <IndianSpinner size="sm" /> : <Send className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePost(post.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Also show reels for moderation */}
                  {reels.map((reel) => (
                    <TableRow key={reel.id}>
                      <TableCell className="font-mono text-[10px]">{reel.id.slice(0, 8)}</TableCell>
                      <TableCell>@{reel.profiles?.username}</TableCell>
                      <TableCell>Reel</TableCell>
                      <TableCell>
                        <div className="w-10 h-10 bg-zinc-800 rounded-sm flex items-center justify-center">
                          <Film className="w-4 h-4 text-zinc-400" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-500" 
                          onClick={() => handleSendToTelegram(reel, 'reel')}
                          disabled={sendingToTg === reel.id}
                        >
                          {sendingToTg === reel.id ? <IndianSpinner size="sm" /> : <Send className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteReel(reel.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="verification">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead className="text-right">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifications.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={req.profiles?.profile_photo_url || ''} />
                            <AvatarFallback>{req.profiles?.username[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">@{req.profiles?.username}</span>
                        </TableCell>
                        <TableCell>{req.profiles?.full_name}</TableCell>
                        <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => handleApproveVerification(req.id, req.user_id)}>
                            <CheckCircle className="w-5 h-5" />
                          </Button>
                          <Button onClick={() => {}} variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <XCircle className="w-5 h-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {verifications.length === 0 && (
                  <div className="py-10 text-center text-muted-foreground">No pending requests</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="music">
          <div className="grid gap-6">
            <Card className="border-muted shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  YouTube Music Integration
                </CardTitle>
                <CardDescription>Search and add music directly from YouTube to the app library.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search for songs or artists..." 
                    value={ytSearchQuery}
                    onChange={(e) => setYtSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchYouTube()}
                  />
                  <Button onClick={handleSearchYouTube} disabled={isSearchingYt}>
                    {isSearchingYt ? <IndianSpinner size="sm" /> : <Search className="w-4 h-4" />}
                    <span className="ml-2 hidden sm:inline">Search</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ytResults.map((track) => (
                    <Card key={track.id} className="overflow-hidden bg-muted/30 border-muted">
                      <div className="aspect-video relative group">
                        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <a href={track.audioUrl} target="_blank" rel="noreferrer" className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                             <PlayCircle className="w-8 h-8 text-white" />
                           </a>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-bold text-sm line-clamp-1">{track.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        <Button 
                          className="w-full mt-3 h-8 text-xs bg-[#fe2c55] hover:bg-[#ef2950] text-white"
                          onClick={() => handleImportMusic(track.audioUrl, track.id)}
                          disabled={isImportingMusic === track.id}
                        >
                          {isImportingMusic === track.id ? (
                            <>
                              <IndianSpinner size="sm" className="mr-2" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-2" />
                              Add to Library
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {ytResults.length === 0 && !isSearchingYt && (
                  <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                    Search for music to get started
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-muted shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-red-600" />
                  YouTube Video Link Import
                </CardTitle>
                <CardDescription>Paste a YouTube video or shorts link to automatically extract and add the song to the library.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <VideoIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Paste YouTube video link (e.g. https://youtube.com/watch?v=...)" 
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      disabled={isImporting || isImportingMusic !== null}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={async () => {
                      if (!importUrl) {
                        toast.error('Bhai, YouTube link toh dalo!');
                        return;
                      }

                      const isYouTube = importUrl.includes('youtube.com') || importUrl.includes('youtu.be');
                      if (!isYouTube) {
                        toast.error('Bhai, yeh YouTube link nahi lag raha. Check karo.');
                        return;
                      }

                      handleImportMusic(importUrl, 'manual-yt-input');
                      setImportUrl('');
                    }} 
                    disabled={isImporting || !importUrl || isImportingMusic !== null}
                    className="md:w-48 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isImportingMusic === 'manual-yt-input' ? (
                      <>
                        <IndianSpinner size="sm" className="mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Import from YouTube
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-muted shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Direct Audio URL (Manual)
                </CardTitle>
                <CardDescription>Add music using a direct link to an MP3 or audio file.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-bold mb-1">
                    ⚠️ Important: Clean Audio Only
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only real, high-quality audio files without effects.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <Input 
                    placeholder="Direct MP3/Audio URL..." 
                    value={manualAudioUrl}
                    onChange={(e) => setManualAudioUrl(e.target.value)}
                    disabled={isImporting}
                    className="flex-1"
                  />
                  <Button 
                    onClick={async () => {
                      if (!manualAudioUrl) {
                        toast.error('Please paste link');
                        return;
                      }
                      setIsImporting(true);
                      try {
                        let filename = 'Unknown Track';
                        try {
                          const urlParts = manualAudioUrl.split('/');
                          filename = urlParts[urlParts.length - 1].split('?')[0];
                          filename = filename.replace(/\.(mp3|mp4|m4a|wav|ogg|webm)$/i, '').replace(/[_-]/g, ' ');
                          filename = filename.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                        } catch (e) {}

                        const { error } = await (supabase as any)
                          .from('music_library')
                          .insert({
                            song_name: filename,
                            artist_name: 'INDIANREELS',
                            preview_url: manualAudioUrl.trim(),
                            image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
                            telegram_file_id: ''
                          });
                        
                        if (error) throw error;
                        toast.success(`Music added: ${filename}`);
                        setManualAudioUrl('');
                        fetchAdminData();
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to add music');
                      } finally {
                        setIsImporting(false);
                      }
                    }} 
                    disabled={isImporting || !manualAudioUrl}
                    className="md:w-40"
                  >
                    {isImporting ? <IndianSpinner size="sm" className="mr-2" /> : 'Add Audio'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-muted shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Music Import History</CardTitle>
                <CardDescription>Recent video links processed for music library.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Video URL</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Token ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {musicHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-[200px] truncate font-medium text-xs">
                          <a href={item.video_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            {item.video_url}
                          </a>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.telegram_channel_id}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                            item.status === 'completed' ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                          )}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] text-muted-foreground">{item.main_token_id?.substring(0, 8)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {musicHistory.length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <PlayCircle className="w-12 h-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium">No history found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="telegram">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-muted shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-500" /> Storage Configuration
                </CardTitle>
                <CardDescription>Bhai, yahan se Storage bot aur channel setup karein.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Storage Channel ID</p>
                  <p className="text-xs text-muted-foreground">Example: @indianreels_storage</p>
                  <Input 
                    placeholder="@indianreels_storage" 
                    value={tgChannelId}
                    onChange={(e) => setTgChannelId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Storage Bot Token</p>
                  <Input 
                    placeholder="123456:ABC-DEF..." 
                    value={tgBotToken}
                    onChange={(e) => setTgBotToken(e.target.value)}
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">RapidAPI Key (YouTube V31)</p>
                  <Input 
                    placeholder="RapidAPI Key for search..." 
                    value={rapidApiKey}
                    onChange={(e) => setRapidApiKey(e.target.value)}
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">RapidAPI Host</p>
                  <Input 
                    placeholder="youtube-mp36.p.rapidapi.com" 
                    value={rapidApiHost}
                    onChange={(e) => setRapidApiHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2 pt-2">
                  <Button 
                    variant="default" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleUpdateTgConfig}
                    disabled={isUpdatingTg}
                  >
                    {isUpdatingTg ? <IndianSpinner size="sm" /> : 'Save Storage Configuration'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-muted shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-green-500" /> Content Status
                </CardTitle>
                <CardDescription>Reels and Posts currently in the system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Film className="w-5 h-5 text-pink-500" />
                    <div>
                      <p className="text-sm font-bold">Total Reels</p>
                      <p className="text-xs text-muted-foreground">{stats.reels} items</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => (document.querySelector('[value="content"]') as any)?.click()}>View All</Button>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-bold">Total Posts</p>
                      <p className="text-xs text-muted-foreground">{stats.posts} items</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => (document.querySelector('[value="content"]') as any)?.click()}>View All</Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground mt-4 italic">
                  "One by one" sending is available in the <span className="font-bold">Content</span> tab.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Badge Settings Tab */}
        {isAdmin && (
          <TabsContent value="badge">
            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5" />
                  Verification Badge Settings
                </CardTitle>
                <CardDescription>
                  Customize the verification badge that appears next to verified users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Badge Preview */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Current Badge Preview</label>
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Username</span>
                      {badgeUrl && (
                        <img 
                          src={badgeUrl}
                          alt="Badge Preview"
                          width={badgeSize}
                          height={badgeSize}
                          style={{ objectFit: 'contain' }}
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Size: {badgeSize}px
                    </div>
                  </div>
                </div>

                {/* Upload New Badge */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Upload New Badge Image</label>
                  <div className="flex flex-col md:flex-row gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleBadgeFileSelect}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleUploadBadge}
                      disabled={!badgeFile || isUploadingBadge}
                      className="md:w-auto"
                    >
                      {isUploadingBadge ? (
                        <>
                          <IndianSpinner size="sm" className="mr-2" />
                          Uploading...
                        </>
                      ) : (
                        'Upload Badge'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: PNG with transparent background, max 1MB
                  </p>
                </div>

                {/* Badge Size Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Badge Size</label>
                    <span className="text-sm text-muted-foreground">{badgeSize}px</span>
                  </div>
                  <Slider
                    value={[badgeSize]}
                    onValueChange={(value) => setBadgeSize(value[0])}
                    onValueCommit={(value) => handleUpdateBadgeSize(value[0])}
                    min={12}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>12px (Small)</span>
                    <span>100px (Extra Large)</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Quick Size Presets</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateBadgeSize(14)}
                    >
                      Small (14px)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateBadgeSize(16)}
                    >
                      Default (16px)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateBadgeSize(20)}
                    >
                      Medium (20px)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateBadgeSize(24)}
                    >
                      Large (24px)
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    <strong>Note:</strong> Changes to the badge will be reflected across the entire application immediately. All verified users will display the new badge.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="feedback">
          <Card className="border-muted shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Flag className="w-5 h-5 text-rose-500" />
                  Grievances & Platform Reports
                </CardTitle>
                <CardDescription>Moderate privacy violations, blackmailing reports, and content issues.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback.map((item) => {
                    let isGrievance = false;
                    let reportData: any = null;
                    try {
                      if (item.message && (item.message.startsWith('{') || item.message.startsWith('['))) {
                        reportData = JSON.parse(item.message);
                        isGrievance = true;
                      }
                    } catch (e) {
                      isGrievance = false;
                    }

                    const isBlackmail = isGrievance && reportData?.type === 'blackmail';
                    const isVideoReport = isGrievance && reportData?.type === 'video_report';

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                            isBlackmail 
                              ? "bg-rose-500/10 text-rose-500" 
                              : isVideoReport 
                                ? "bg-amber-500/10 text-amber-500" 
                                : "bg-blue-500/10 text-blue-500"
                          )}>
                            {isBlackmail ? '💔 Blackmail' : isVideoReport ? '🎬 Video Report' : '💬 Feedback'}
                          </span>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={item.profiles?.profile_photo_url || ''} />
                            <AvatarFallback>{item.profiles?.username?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-sm">@{item.profiles?.username || 'Unknown'}</span>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{item.subject}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            item.status === 'resolved' ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          )}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <GrievanceReviewDialog 
                            report={item} 
                            reportData={reportData}
                            isBlackmail={isBlackmail}
                            isVideoReport={isVideoReport}
                            onBanBlackmailer={(username, reason) => handleBanBlackmailer(username, reason, item.id)}
                            onDeleteVideo={(reelId) => handleDeleteReportedVideo(reelId, item.id)}
                            onSendReply={(receiverId, text) => sendDirectMessage(receiverId, text)}
                            onResolve={(reply) => handleReplyFeedback(item.id, reply)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {feedback.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No feedback or grievances submitted yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function ProfileColorDialog({ userId, currentColor, onUpdate }: { userId: string, currentColor: string | null, onUpdate: (color: string) => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500">
          <Palette className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Theme</DialogTitle>
          <CardDescription>Select a custom gradient for this user's profile header.</CardDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {PROFILE_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => {
                onUpdate(color.value);
              }}
              className={cn(
                "h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105",
                currentColor === color.value ? "border-primary bg-primary/10 shadow-lg" : "border-transparent bg-muted/50"
              )}
            >
              <div 
                className="w-10 h-10 rounded-full border-2 border-white/20 shadow-inner" 
                style={{ background: color.value === 'transparent' ? '#ccc' : color.value }} 
              />
              <span className="text-[10px] font-bold truncate w-full px-1">{color.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    pink: "text-pink-600 bg-pink-50 dark:bg-pink-900/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
  };

  return (
    <Card className="border-muted shadow-sm">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-1", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomVideoIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 8-6 4 6 4V8Z" />
      <rect width="14" height="12" x="2" y="6" rx="2" />
    </svg>
  );
}

function CopyrightStrikeDialog({ user, onIssue }: { user: Profile, onIssue: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500"><Ban className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Issue Copyright Strike to @{user.username}</DialogTitle></DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">Warning: 2 strikes will automatically ban the account.</p>
          <Input placeholder="Reason for strike..." value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => { onIssue(reason); setReason(''); }} disabled={!reason.trim()}>Issue Strike</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackReplyDialog({ feedback, onReply }: { feedback: any, onReply: (reply: string) => void }) {
  const [reply, setReply] = useState('');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Reply</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reply to @{feedback.profiles?.username}</DialogTitle></DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-bold">Subject: {feedback.subject}</p>
            <p className="mt-1">{feedback.message}</p>
            {feedback.screenshot_url && (
              <a href={feedback.screenshot_url} target="_blank" rel="noreferrer" className="text-primary text-xs mt-2 block">View Screenshot</a>
            )}
          </div>
          <Input placeholder="Your reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => { onReply(reply); setReply(''); }} disabled={!reply.trim()}>Send Reply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BanUserDialog({ user, onBan }: { user: Profile, onBan: (isDeviceBan: boolean, reason: string) => void }) {
  const [reason, setReason] = useState('');
  const [isDeviceBan, setIsDeviceBan] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Ban User">
          <Ban className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ban @{user.username}</DialogTitle>
          <CardDescription>Select the ban type and enter a reason for this restriction.</CardDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div>
              <p className="text-sm font-bold text-foreground">Permanent Device & IP Ban</p>
              <p className="text-xs text-muted-foreground">Locks out their physical device and current IP address</p>
            </div>
            <input 
              type="checkbox" 
              checked={isDeviceBan} 
              onChange={(e) => setIsDeviceBan(e.target.checked)}
              className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ban Reason</label>
            <Input 
              placeholder="e.g., Severe blackmail violation, hate speech..." 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              className="rounded-xl"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={() => { setOpen(false); setReason(''); }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              onBan(isDeviceBan, reason);
              setOpen(false);
              setReason('');
            }} 
            disabled={!reason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            Apply Ban
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GrievanceReviewDialog({ 
  report, 
  reportData, 
  isBlackmail, 
  isVideoReport, 
  onBanBlackmailer, 
  onDeleteVideo, 
  onSendReply, 
  onResolve 
}: { 
  report: any, 
  reportData: any, 
  isBlackmail: boolean, 
  isVideoReport: boolean, 
  onBanBlackmailer: (username: string, reason: string) => void, 
  onDeleteVideo: (reelId: string) => void, 
  onSendReply: (receiverId: string, text: string) => void, 
  onResolve: (reply: string) => void 
}) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [officialResolution, setOfficialResolution] = useState('');
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const screenshots = report.screenshot_url ? report.screenshot_url.split(',') : [];
  const description = isBlackmail || isVideoReport ? reportData?.description : report.message;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Review Case</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-rose-500">
            <ShieldAlert className="w-5 h-5" />
            Grievance Case Review
          </DialogTitle>
          <CardDescription>
            Submitted on {new Date(report.created_at).toLocaleString()} | Status: {report.status}
          </CardDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section 1: Subject and Type */}
          <div className="p-3 bg-muted/40 border rounded-xl flex justify-between items-center">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Subject</p>
              <p className="text-base font-extrabold text-foreground">{report.subject}</p>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
              isBlackmail ? "bg-rose-500/10 text-rose-500" : isVideoReport ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
            )}>
              {isBlackmail ? '💔 Blackmail' : isVideoReport ? '🎬 Video Report' : '💬 Feedback'}
            </span>
          </div>

          {/* Section 2: Reporter Details */}
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2">Reporter Details</p>
            <div className="flex items-center justify-between p-3 bg-card border rounded-xl">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={report.profiles?.profile_photo_url || ''} />
                  <AvatarFallback>{report.profiles?.username?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground">@{report.profiles?.username || 'user'}</p>
                  <p className="text-xs text-muted-foreground">{report.profiles?.full_name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a 
                  href={`/profile/${report.profiles?.username}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-accent hover:bg-accent/80 text-foreground text-xs rounded-xl font-bold transition-all border"
                >
                  View Channel
                </a>
              </div>
            </div>
            {isBlackmail && reportData?.reporter_ip && (
              <p className="text-[10px] text-zinc-500 mt-1.5 font-mono px-1">Reporter IP: {reportData.reporter_ip}</p>
            )}
          </div>

          {/* Section 3: Grievance Target & Actions */}
          {isBlackmail && (
            <div className="p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl space-y-4">
              <div>
                <p className="text-[10px] text-rose-500 uppercase tracking-widest font-black">Accused / Blackmailer Username</p>
                <p className="text-lg font-black text-foreground mt-1">@{reportData?.blackmailer_username || 'Not specified'}</p>
              </div>
              {reportData?.blackmailer_username && (
                <div className="flex gap-2.5 pt-1">
                  <a 
                    href={`/profile/${reportData.blackmailer_username}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 text-center py-2 bg-zinc-900 border hover:bg-zinc-800 text-white text-xs rounded-xl font-bold transition-all"
                  >
                    View Blackmailer Channel
                  </a>
                  <Button 
                    onClick={() => {
                      const reason = window.prompt("Enter Device/IP ban reason for the blackmailer:", "Device Banned for Blackmail Violation");
                      if (reason) {
                        onBanBlackmailer(reportData.blackmailer_username, reason);
                      }
                    }}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl font-bold transition-all"
                  >
                    Ban & Block Device
                  </Button>
                </div>
              )}
            </div>
          )}

          {isVideoReport && reportData?.reported_video_id && (
            <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-4">
              <div>
                <p className="text-[10px] text-amber-500 uppercase tracking-widest font-black">Reported Video ID</p>
                <p className="text-sm font-mono text-zinc-400 mt-1 break-all">{reportData.reported_video_id}</p>
              </div>
              <div className="flex gap-2">
                <a 
                  href={`/reels?id=${reportData.reported_video_id}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 text-center py-2 bg-zinc-900 border hover:bg-zinc-800 text-white text-xs rounded-xl font-bold transition-all"
                >
                  Play Reported Video
                </a>
                <Button 
                  onClick={() => onDeleteVideo(reportData.reported_video_id)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl font-bold transition-all"
                >
                  Delete Reported Video
                </Button>
              </div>
            </div>
          )}

          {/* Section 4: Report Description */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Grievance Description</p>
            <div className="p-4 bg-muted/30 border rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
              {description || 'No description provided.'}
            </div>
          </div>

          {/* Section 5: Screenshot proof */}
          {screenshots.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Screenshot proof ({screenshots.length})</p>
              <div className="grid grid-cols-5 gap-2">
                {screenshots.map((url: string, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => setZoomUrl(url)}
                    className="aspect-square bg-muted border rounded-lg overflow-hidden cursor-pointer hover:opacity-85 transition-opacity animate-in fade-in"
                  >
                    <img src={url} alt="Proof" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: Direct Message Replies */}
          <div className="space-y-3 p-4 bg-muted/20 border rounded-xl">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Quick Reply via Chat</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Type message below and click who to send direct chat inbox message.</p>
            </div>
            <Textarea
              placeholder="Type message text here..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[80px] bg-card border rounded-xl text-sm"
            />
            <div className="flex gap-2.5">
              <Button
                onClick={() => {
                  onSendReply(report.user_id, replyText);
                  setReplyText('');
                }}
                disabled={!replyText.trim()}
                className="flex-1 bg-zinc-900 border hover:bg-zinc-800 text-white text-xs font-bold h-9 rounded-xl animate-in slide-in-from-bottom-1"
              >
                Send to Reporter
              </Button>
              {isBlackmail && reportData?.blackmailer_username && (
                <Button
                  onClick={async () => {
                    const { data: bProfile } = await (supabase as any)
                      .from('profiles')
                      .select('id')
                      .eq('username', reportData.blackmailer_username)
                      .maybeSingle();
                    if (bProfile) {
                      onSendReply(bProfile.id, replyText);
                      setReplyText('');
                    } else {
                      toast.error('Accused profile not found');
                    }
                  }}
                  disabled={!replyText.trim()}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 rounded-xl animate-in slide-in-from-bottom-1"
                >
                  Send to Blackmailer
                </Button>
              )}
            </div>
          </div>

          {/* Section 7: Resolution */}
          <div className="space-y-3 pt-2 border-t">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Official Resolution Details</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Saves official action status and completes the report.</p>
            </div>
            <Input
              placeholder="e.g. Case resolved, blackmailer banned and video deleted."
              value={officialResolution}
              onChange={(e) => setOfficialResolution(e.target.value)}
              className="rounded-xl text-sm"
            />
            <Button
              onClick={() => {
                onResolve(officialResolution);
                setOpen(false);
                setOfficialResolution('');
              }}
              disabled={!officialResolution.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold uppercase tracking-wider h-11 rounded-xl shadow-lg shadow-green-600/10"
            >
              Mark Grievance Case Resolved
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Lightbox Zoom Modal */}
      {zoomUrl && (
        <Dialog open={!!zoomUrl} onOpenChange={() => setZoomUrl(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none flex items-center justify-center h-[80vh]">
            <img src={zoomUrl} alt="Screenshot Proof Zoomed" className="w-full h-full object-contain animate-in zoom-in-95 duration-200" />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
