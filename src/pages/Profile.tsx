import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Profile, Post, Reel } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Grid3X3, Film, Bookmark, Settings, MoreHorizontal, UserPlus, MessageCircle, Clock, 
  Heart, Trash2, Palette, Plus, Lock, Eye, ChevronDown, Bell, Menu, Share2, 
  Music, Calendar, Camera, Scissors, Paintbrush, ExternalLink, ArrowUpRight, RefreshCw,
  Link as LinkIcon, MoreVertical, Search, ShieldCheck
} from 'lucide-react';
import { VerificationBadge } from '@/components/VerificationBadge';
import { BirthdayBadge } from '@/components/common/BirthdayBadge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { FullScreenImage } from '@/components/common/FullScreenImage';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import Counter from '@/components/common/Counter';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { profile: currentUser, signOut } = useAuth();
  const { isBlocked } = useScreenshotProtection();
  const [profile, setProfile] = useState<Profile | any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollower, setIsFollower] = useState(false);

  const [showFullScreenProfile, setShowFullScreenProfile] = useState(false);
  const [counts, setCounts] = useState({ posts: 0, followers: 0, following: 0, likes: 0 });
  const [isQRFlipped, setIsQRFlipped] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [adminTab, setAdminTab] = useState<'ring' | 'bg'>('bg');
  const [showColorCustomizer, setShowColorCustomizer] = useState(false);
  const navigate = useNavigate();

  const isOwnProfile = currentUser?.username === username || !username || username === 'me';
  const isAdmin = currentUser?.role === 'admin';
  const { globalBgColor, updateGlobalBgColor } = useSettings();

  const THEME_PRESETS = [
    { label: 'TikTok',     value: 'linear-gradient(45deg, #fe2c55, #25f4ee, #fe2c55)' },
    { label: 'Saffron',    value: 'linear-gradient(45deg, #FF9933, #FFFFFF, #138808)' },
    { label: 'Gold',       value: 'linear-gradient(45deg, #f7971e, #ffd200)' },
    { label: 'Neon Pink',  value: 'linear-gradient(45deg, #ff007f, #ff6ec7)' },
    { label: 'Ocean',      value: 'linear-gradient(45deg, #00c6ff, #0072ff)' },
    { label: 'Sunset',     value: 'linear-gradient(45deg, #f83600, #f9d423)' },
    { label: 'Purple',     value: 'linear-gradient(45deg, #9b59b6, #e91e8c)' },
    { label: 'Green',      value: 'linear-gradient(45deg, #11998e, #38ef7d)' },
    { label: 'Fire',       value: 'linear-gradient(45deg, #ff4e00, #ec9f05)' },
    { label: 'Ice',        value: 'linear-gradient(45deg, #74ebd5, #acb6e5)' },
  ];

  const BG_PRESETS = [
    { label: 'Pure Black',   value: '#000000' },
    { label: 'Deep Navy',    value: '#0a0e1a' },
    { label: 'Dark Slate',   value: '#0f172a' },
    { label: 'Charcoal',     value: '#1a1a1a' },
    { label: 'Dark Brown',   value: '#1a0a00' },
    { label: 'Deep Purple',  value: '#0d001a' },
    { label: 'Forest Night', value: '#001a0a' },
    { label: 'Deep Red',     value: '#1a0000' },
    { label: 'Midnight Blue','value': '#00001a' },
    { label: 'Dark Teal',    value: '#001a1a' },
  ];

  const handleSaveTextColor = async (field: 'bio_color' | 'username_color' | 'stats_color', color: string) => {
    if (!currentUser?.id) return;
    try {
      await (supabase as any).from('profiles').update({ [field]: color }).eq('id', currentUser.id);
      setProfile((prev: any) => ({ ...prev, [field]: color }));
      toast.success('Colour updated!');
    } catch {
      toast.error('Failed to update colour');
    }
  };

  const handleSaveThemeColor = async (colorValue: string) => {
    if (!currentUser?.id) return;
    try {
      await (supabase as any).from('profiles').update({ profile_color: colorValue }).eq('id', currentUser.id);
      setProfile((prev: any) => ({ ...prev, profile_color: colorValue }));
      setShowThemePicker(false);
      toast.success('Theme colour updated!');
    } catch {
      toast.error('Failed to update theme colour');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username, currentUser]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      let targetUsername = isOwnProfile ? currentUser?.username : username;
      if (!targetUsername) return;
      targetUsername = targetUsername.replace(/^@/, '').trim();

      const { data: profileData, error: profileError }: any = await (supabase as any)
        .from('profiles')
        .select('*')
        .ilike('username', targetUsername)
        .limit(1)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) { toast.error('Profile not found'); return; }
      setProfile(profileData);

      // Fetch all counts + follow status in parallel — fast single round-trip
      const uid = profileData.id;
      const [postsCount, followersCount, followingCount, likesPostRes, likesReelRes] = await Promise.all([
        (supabase as any).from('posts').select('id', { count: 'exact', head: true }).eq('owner_id', uid),
        (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('following_id', uid),
        (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', uid),
        (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('owner_id', uid),
        (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('reel_owner_id', uid),
      ]);

      setCounts({
        posts: postsCount.count || 0,
        followers: followersCount.count || 0,
        following: followingCount.count || 0,
        likes: (likesPostRes.count || 0) + (likesReelRes.count || 0),
      });
      setLoading(false); // show profile header immediately

      // Load posts/reels + follow status in background
      const [postsData, reelsData]: any[] = await Promise.all([
        (supabase as any).from('posts').select('*, likes_count:likes(count), comments_count:comments(count), views_count:watch_history(count)').eq('owner_id', uid).eq('is_hidden', false).order('created_at', { ascending: false }),
        (supabase as any).from('reels').select('*, likes_count:likes(count), comments_count:comments(count), views_count:watch_history(count)').eq('owner_id', uid).eq('is_hidden', false).order('created_at', { ascending: false }),
      ]);

      setPosts((postsData.data || []).map((p: any) => ({
        ...p,
        likes_count: p.likes_count?.[0]?.count || 0,
        comments_count: p.comments_count?.[0]?.count || 0,
        views_count: p.views_count?.[0]?.count || 0,
      })));
      setReels((reelsData.data || []).map((r: any) => ({
        ...r,
        likes_count: r.likes_count?.[0]?.count || 0,
        comments_count: r.comments_count?.[0]?.count || 0,
        views_count: r.views_count?.[0]?.count || 0,
      })));

      if (currentUser && !isOwnProfile) {
        const [followData, followerData]: any[] = await Promise.all([
          supabase.from('follows' as any).select('id').eq('follower_id', currentUser.id).eq('following_id', uid).maybeSingle(),
          supabase.from('follows' as any).select('id').eq('follower_id', uid).eq('following_id', currentUser.id).maybeSingle(),
        ]);
        setIsFollowing(!!followData.data);
        setIsFollower(!!followerData.data);
      }

      const { data: highlightsData } = await (supabase as any)
        .from('highlights').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      setHighlights(highlightsData || []);
    } catch (error: any) {
      toast.error(`Error loading profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    try {
      if (isFollowing) {
        await (supabase as any).from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id);
        setIsFollowing(false);
        setCounts(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        await (supabase as any).from('follows').insert({ follower_id: currentUser.id, following_id: profile.id } as any);
        setIsFollowing(true);
        setCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-black text-white p-4 animate-pulse">
        <div className="h-14 flex items-center justify-between">
          <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
          <Skeleton className="w-24 h-6 bg-zinc-800" />
          <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
        </div>
        <div className="flex flex-col items-center mt-6 space-y-4">
          <Skeleton className="w-24 h-24 rounded-full bg-zinc-800" />
          <Skeleton className="w-32 h-6 bg-zinc-800" />
          <div className="flex gap-8 w-full justify-center">
            <Skeleton className="w-16 h-10 bg-zinc-800" />
            <Skeleton className="w-16 h-10 bg-zinc-800" />
            <Skeleton className="w-16 h-10 bg-zinc-800" />
          </div>
          <Skeleton className="w-full h-10 bg-zinc-800 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20 no-scrollbar overflow-x-hidden relative">
      {/* Screenshot Protection Overlay */}
      {isBlocked && (
        <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
          <div className="text-center space-y-4">
            <ShieldCheck className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
            <p className="text-xl font-bold">Screenshot Blocked</p>
            <p className="text-sm text-zinc-400">This content is protected</p>
          </div>
        </div>
      )}
      
      {/* TikTok Style Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-zinc-900 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
           {!isOwnProfile && (
             <button onClick={() => navigate(-1)} className="p-1 hover:bg-zinc-800 rounded-full shrink-0">
                <ChevronDown className="w-6 h-6 rotate-90" />
             </button>
           )}
           <div className="flex items-center gap-1 min-w-0">
             <h1 className="font-bold text-lg truncate">{profile?.full_name || profile?.username}</h1>
             {profile?.is_private && <Lock className="w-3.5 h-3.5 text-zinc-400" />}
           </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
           {isOwnProfile ? (
             <>
               <button onClick={() => navigate('/create')} className="p-1 hover:bg-zinc-800 rounded-full">
                 <Plus className="w-7 h-7" />
               </button>
               <button onClick={() => navigate('/settings')} className="p-1 hover:bg-zinc-800 rounded-full">
                 <Menu className="w-6 h-6" />
               </button>
             </>
           ) : (
             <button className="p-1 hover:bg-zinc-800 rounded-full">
                <MoreVertical className="w-6 h-6" />
             </button>
           )}
        </div>
      </header>

      {/* Profile Main Info */}
      <div className="flex flex-col items-center pt-6 px-4 space-y-4">
        <div className="relative group" onClick={() => setShowFullScreenProfile(true)}>
          <div 
            className="w-28 h-28 rounded-full p-0.5 animate-gradient-xy"
            style={{ 
              background: profile?.profile_color && profile.profile_color !== 'transparent' 
                ? profile.profile_color 
                : 'linear-gradient(45deg, #fe2c55, #25f4ee, #fe2c55)' 
            }}
          >
            <Avatar className="w-full h-full border-2 border-black">
              <AvatarImage src={profile?.profile_photo_url || ''} className="object-cover" />
              <AvatarFallback className="text-4xl font-black bg-zinc-900 text-zinc-400">
                {profile?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          {isOwnProfile && (
            <div className="absolute bottom-0 right-0 bg-[#fe2c55] text-white rounded-full p-1.5 border-2 border-black shadow-lg">
              <Plus className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
             <span className="font-bold text-lg" style={{ color: profile?.username_color || '#ffffff' }}>@{profile?.username}</span>
             {profile?.is_verified && <VerificationBadge size={25} />}
          </div>
        </div>

        {/* TikTok Style Stats */}
        <div className="flex justify-center items-center w-full gap-8 py-2">
          <div 
            className="text-center cursor-pointer active:scale-95 transition-transform"
            onClick={() => navigate(`/profile/${profile?.username}/following`)}
          >
            <p className="font-black text-xl tracking-tight leading-none"><Counter value={counts.following} /></p>
            <p className="text-xs mt-1" style={{ color: profile?.stats_color || '#71717a' }}>Following</p>
          </div>
          <div 
            className="text-center cursor-pointer active:scale-95 transition-transform"
            onClick={() => navigate(`/profile/${profile?.username}/followers`)}
          >
            <p className="font-black text-xl tracking-tight leading-none"><Counter value={counts.followers} /></p>
            <p className="text-xs mt-1" style={{ color: profile?.stats_color || '#71717a' }}>Followers</p>
          </div>
          <div className="text-center">
            <p className="font-black text-xl tracking-tight leading-none"><Counter value={counts.likes} /></p>
            <p className="text-xs mt-1" style={{ color: profile?.stats_color || '#71717a' }}>Likes</p>
          </div>
        </div>

        {/* Bio & Links */}
        <div className="w-full max-w-xs text-center space-y-2">
          {profile?.bio && (
            <p className="text-sm font-medium whitespace-pre-wrap leading-tight" style={{ color: profile?.bio_color || '#ffffff' }}>{profile.bio}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full max-w-sm pt-2">
           {isOwnProfile ? (
             <>
               <Button 
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 rounded-md border-none transition-all active:scale-95"
                onClick={() => navigate('/settings/profile')}
               >
                 Edit profile
               </Button>
               
               <Dialog>
                 <DialogTrigger asChild>
                   <Button 
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 rounded-md border-none transition-all active:scale-95"
                   >
                     Share profile
                   </Button>
                 </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-[440px] bg-transparent border-none p-0 overflow-visible mx-auto">
                    <div className="relative w-full flex justify-center">
                      {/* 3D Flip Card QR Code - Phone Size */}
                      <div 
                        className="relative w-[280px] h-[450px] cursor-pointer"
                        style={{ perspective: '1500px' }}
                        onClick={() => setIsQRFlipped(!isQRFlipped)}
                      >
                        <div 
                          className="relative w-full h-full transition-transform duration-700"
                          style={{ 
                            transformStyle: 'preserve-3d',
                            transform: isQRFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                          }}
                        >
                          {/* Front Side */}
                          <div 
                            className="absolute w-full h-full flex flex-col justify-center items-center rounded-[30px] bg-black border-2 border-[#333] p-6"
                            style={{ 
                              backfaceVisibility: 'hidden',
                              boxShadow: '0 0 40px rgba(255, 0, 127, 0.25)'
                            }}
                          >
                            {/* Profile Photo */}
                            <div className="mb-6">
                              <div 
                                className="w-24 h-24 bg-black rounded-full flex justify-center items-center overflow-hidden"
                                style={{ border: '3.5px solid #ff007f' }}
                              >
                                <img 
                                  src={profile?.profile_photo_url || 'https://miaoda-conversation-file.s3cdn.medo.dev/user-a802e9kq6vpc/conv-af2z7g8d924g/20260412/file-aw71wfutmg3k.png'} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>

                            {/* User Info */}
                            <div className="text-center space-y-3 mb-6">
                              <h1 className="text-2xl font-black text-white tracking-tight">
                                {profile?.full_name || profile?.username}
                              </h1>
                              <p className="text-cyan-400 text-sm font-bold uppercase tracking-widest">
                                @{profile?.username}
                              </p>
                              {profile?.bio && (
                                <p className="text-white/60 text-xs px-4">
                                  {profile.bio}
                                </p>
                              )}
                            </div>

                            {/* INDIANREELS Branding */}
                            <h1 className="text-[28px] font-black tracking-[2px] m-0" style={{ color: '#ff007f', textShadow: '0 0 15px rgba(255, 0, 127, 0.8)' }}>
                              INDIANREELS
                            </h1>
                            <div className="text-white text-[12px] tracking-[12px] mt-2 font-thin opacity-80">
                              CARD
                            </div>
                          </div>

                          {/* Back Side */}
                          <div 
                            className="absolute w-full h-full flex flex-col justify-center items-center rounded-[30px] border-2 border-[#333] p-6"
                            style={{ 
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)',
                              background: 'radial-gradient(circle, #1a1a1a 0%, #000 100%)',
                              boxShadow: '0 0 40px rgba(255, 0, 127, 0.25)'
                            }}
                          >
                            <div className="relative bg-white p-4 rounded-[22px] flex justify-center items-center mb-4" style={{ boxShadow: '0 0 50px rgba(255, 0, 127, 0.4)' }}>
                              <QRCodeDataUrl 
                                text={`https://app-af2z7g8d924h.appmedo.com/profile/${profile?.username}`}
                                width={180}
                                color="#ff007f"
                                backgroundColor="#ffffff"
                              />
                              {/* Anime Center Logo */}
                              <div 
                                className="absolute w-12 h-12 bg-black rounded-full flex justify-center items-center overflow-hidden z-10"
                                style={{ border: '3.5px solid #ff007f' }}
                              >
                                <img 
                                  src={profile?.profile_photo_url || 'https://miaoda-conversation-file.s3cdn.medo.dev/user-a802e9kq6vpc/conv-af2z7g8d924g/20260412/file-aw71wfutmg3k.png'} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>

                            {/* User Info on Back */}
                            <div className="text-center space-y-2">
                              <h2 className="text-xl font-black text-white">
                                {profile?.full_name || profile?.username}
                              </h2>
                              <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider">
                                @{profile?.username}
                              </p>
                              <p className="text-white/60 text-[10px] uppercase tracking-[2px] mt-4">
                                Scan to view profile
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Tap Hint */}
                        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-[#666] text-[11px] uppercase tracking-[2px]">
                          Tap to Flip
                        </div>
                      </div>
                    </div>
                 </DialogContent>
               </Dialog>

               <Button 
                variant="secondary" 
                size="icon" 
                className="bg-zinc-900 hover:bg-zinc-800 h-11 w-11 rounded-md transition-all active:scale-95"
                onClick={() => navigate('/settings')}
               >
                 <Bookmark className="w-5 h-5" />
               </Button>

               {/* Own profile text colour customizer */}
               <Button
                 size="icon"
                 className="bg-zinc-900 hover:bg-zinc-800 h-11 w-11 rounded-md transition-all active:scale-95"
                 onClick={() => setShowColorCustomizer(true)}
                 title="Customize profile colours"
               >
                 <Paintbrush className="w-5 h-5 text-violet-400" />
               </Button>

               <Dialog open={showColorCustomizer} onOpenChange={setShowColorCustomizer}>
                 <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-zinc-950 border border-zinc-800 text-white">
                   <DialogHeader>
                     <DialogTitle className="flex items-center gap-2">
                       <Paintbrush className="w-4 h-4 text-violet-400" />
                       Profile Colours
                     </DialogTitle>
                   </DialogHeader>
                   <p className="text-xs text-zinc-400 -mt-1">Personalise text colours on your profile.</p>

                   {[
                     { label: 'Username colour', field: 'username_color' as const, current: profile?.username_color || '#ffffff' },
                     { label: 'Bio text colour',  field: 'bio_color'      as const, current: profile?.bio_color      || '#ffffff' },
                     { label: 'Stats label colour', field: 'stats_color'  as const, current: profile?.stats_color    || '#71717a' },
                   ].map(({ label, field, current }) => (
                     <div key={field} className="space-y-2">
                       <p className="text-xs font-semibold text-zinc-300">{label}</p>
                       <div className="flex flex-wrap gap-2">
                         {['#ffffff','#facc15','#fb923c','#f87171','#4ade80','#38bdf8','#a78bfa','#f472b6','#00eaff','#ff007f'].map(clr => (
                           <button
                             key={clr}
                             onClick={() => handleSaveTextColor(field, clr)}
                             className={cn(
                               "w-8 h-8 rounded-full border-2 transition-transform active:scale-90",
                               current === clr ? "border-white scale-110" : "border-transparent hover:border-zinc-400"
                             )}
                             style={{ background: clr }}
                             title={clr}
                           />
                         ))}
                         {/* native colour input for custom pick */}
                         <label className="w-8 h-8 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center cursor-pointer hover:border-zinc-400 transition-colors" title="Custom colour">
                           <Paintbrush className="w-3.5 h-3.5 text-zinc-400" />
                           <input type="color" className="sr-only" value={current}
                             onChange={(e) => handleSaveTextColor(field, e.target.value)} />
                         </label>
                       </div>
                     </div>
                   ))}
                 </DialogContent>
               </Dialog>

               {/* Admin-only: Theme Colour Picker */}
               {isAdmin && (
                 <>
                   <Button
                     size="icon"
                     className="bg-zinc-900 hover:bg-zinc-800 h-11 w-11 rounded-md transition-all active:scale-95"
                     onClick={() => setShowThemePicker(true)}
                     title="Change Theme Colour (Admin Only)"
                   >
                     <Palette className="w-5 h-5 text-pink-400" />
                   </Button>

                   <Dialog open={showThemePicker} onOpenChange={setShowThemePicker}>
                     <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-zinc-950 border border-zinc-800 text-white">
                       <DialogHeader>
                         <DialogTitle className="flex items-center gap-2">
                           <Palette className="w-4 h-4 text-pink-400" />
                           App Theme
                           <span className="ml-auto text-[10px] bg-pink-600/20 text-pink-400 border border-pink-600/30 px-2 py-0.5 rounded-full font-semibold tracking-wide">ADMIN</span>
                         </DialogTitle>
                       </DialogHeader>

                       {/* Tab switcher */}
                       <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 mt-1">
                         <button
                           onClick={() => setAdminTab('bg')}
                           className={cn("flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
                             adminTab === 'bg' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                         >Background</button>
                         <button
                           onClick={() => setAdminTab('ring')}
                           className={cn("flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
                             adminTab === 'ring' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                         >Profile Ring</button>
                       </div>

                       {adminTab === 'bg' ? (
                         <>
                           <p className="text-xs text-zinc-400">Change the app-wide background colour. Visible to ALL users in real time.</p>
                           <div className="grid grid-cols-2 gap-2 mt-1">
                             {BG_PRESETS.map((preset) => (
                               <button
                                 key={preset.value}
                                 onClick={async () => { await updateGlobalBgColor(preset.value); setShowThemePicker(false); }}
                                 className={cn(
                                   "flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95",
                                   globalBgColor === preset.value
                                     ? "border-pink-500 bg-zinc-800"
                                     : "border-zinc-800 hover:border-zinc-600 bg-zinc-900"
                                 )}
                               >
                                 <div className="w-8 h-8 rounded-full shrink-0 border border-zinc-600" style={{ background: preset.value }} />
                                 <span className="text-xs font-medium text-zinc-300 text-balance">{preset.label}</span>
                                 {globalBgColor === preset.value && <span className="ml-auto text-pink-400 text-xs">✓</span>}
                               </button>
                             ))}
                           </div>
                         </>
                       ) : (
                         <>
                           <p className="text-xs text-zinc-400">Change the profile avatar ring gradient.</p>
                           <div className="grid grid-cols-2 gap-2 mt-1">
                             {THEME_PRESETS.map((preset) => (
                               <button
                                 key={preset.value}
                                 onClick={() => handleSaveThemeColor(preset.value)}
                                 className={cn(
                                   "flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95",
                                   profile?.profile_color === preset.value
                                     ? "border-pink-500 bg-zinc-800"
                                     : "border-zinc-800 hover:border-zinc-600 bg-zinc-900"
                                 )}
                               >
                                 <div className="w-8 h-8 rounded-full shrink-0" style={{ background: preset.value }} />
                                 <span className="text-xs font-medium text-zinc-300 text-balance">{preset.label}</span>
                                 {profile?.profile_color === preset.value && <span className="ml-auto text-pink-400 text-xs">✓</span>}
                               </button>
                             ))}
                           </div>
                         </>
                       )}
                     </DialogContent>
                   </Dialog>
                 </>
               )}
             </>
           ) : (
             <>
               <Button 
                className={cn(
                  "flex-1 font-bold h-11 rounded-md transition-all active:scale-95",
                  isFollowing 
                    ? "bg-zinc-100 text-black hover:bg-zinc-200" 
                    : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                )}
                onClick={handleFollow}
               >
                 {isFollowing ? 'Following' : isFollower ? 'Follow Back' : 'Follow'}
               </Button>
               <Button 
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 rounded-md border-none transition-all active:scale-95"
                onClick={() => navigate(`/messages/${profile?.username}`)}
               >
                 Message
               </Button>
               <Button 
                variant="secondary" 
                size="icon" 
                className="bg-zinc-900 hover:bg-zinc-800 h-11 w-11 rounded-md transition-all active:scale-95"
                onClick={() => {}}
               >
                 <ChevronDown className="w-5 h-5" />
               </Button>
             </>
           )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="w-full mt-6">
        <TabsList className="w-full bg-black border-t border-zinc-900 rounded-none h-12 p-0 flex relative">
          <TabsTrigger value="posts" className="flex-1 data-[state=active]:bg-transparent rounded-none border-none relative h-full">
            <Grid3X3 className={cn("w-6 h-6 transition-colors", "text-zinc-500 data-[state=active]:text-white")} />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white scale-x-0 data-[state=active]:scale-x-100 transition-transform origin-center" />
          </TabsTrigger>
          <TabsTrigger value="reels" className="flex-1 data-[state=active]:bg-transparent rounded-none border-none relative h-full">
            <Film className={cn("w-6 h-6 transition-colors", "text-zinc-500 data-[state=active]:text-white")} />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white scale-x-0 data-[state=active]:scale-x-100 transition-transform origin-center" />
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1 data-[state=active]:bg-transparent rounded-none border-none relative h-full">
            <Lock className={cn("w-5 h-5 transition-colors", "text-zinc-500 data-[state=active]:text-white")} />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white scale-x-0 data-[state=active]:scale-x-100 transition-transform origin-center" />
          </TabsTrigger>
          <TabsTrigger value="liked" className="flex-1 data-[state=active]:bg-transparent rounded-none border-none relative h-full">
            <Heart className={cn("w-6 h-6 transition-colors", "text-zinc-500 data-[state=active]:text-white")} />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white scale-x-0 data-[state=active]:scale-x-100 transition-transform origin-center" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="m-0 pt-0.5">
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => (
              <div key={post.id} onClick={() => navigate(`/feed?id=${post.id}`)} className="aspect-square relative group bg-zinc-900 overflow-hidden cursor-pointer">
                {post.media_url?.match(/\.(mp4|webm|mov)$/i) ? (
                  <>
                    <video 
                      src={post.media_url} 
                      className="w-full h-full object-cover" 
                      muted 
                      autoPlay 
                      loop 
                      playsInline
                    />
                    <div className="absolute top-2 right-2">
                      <Film className="w-5 h-5 text-white drop-shadow-lg" />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-white text-[11px] font-bold shadow-sm">
                      <Eye className="w-3 h-3" /> {post.views_count || 0}
                    </div>
                  </>
                ) : (
                  <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 text-white text-[11px] font-bold shadow-sm">
                  <Heart className="w-3 h-3 fill-current" /> {post.likes_count || 0}
                </div>
              </div>
            ))}
            {posts.length > 0 && Array(Math.max(0, 9 - posts.length)).fill(0).map((_, i) => (
               <div key={`filler-${i}`} className="aspect-square bg-zinc-900/30" />
            ))}
          </div>
          {posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <Grid3X3 className="w-16 h-16 mb-2 opacity-20" />
              <p className="font-bold text-sm">कोई post नहीं है</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reels" className="m-0 pt-0.5">
          <div className="grid grid-cols-3 gap-0.5">
            {reels.map((reel) => (
              <Link key={reel.id} to={`/reels?id=${reel.id}`} className="aspect-[3/4] relative group bg-zinc-900 overflow-hidden">
                <video 
                  src={reel.video_url} 
                  className="w-full h-full object-cover" 
                  muted 
                  autoPlay 
                  loop 
                  playsInline
                />
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-white text-[11px] font-bold shadow-sm">
                  <Play className="w-3 h-3 fill-current" /> {reel.views_count}
                </div>
              </Link>
            ))}
            {/* Fillers for empty grid */}
            {reels.length > 0 && Array(Math.max(0, 9 - reels.length)).fill(0).map((_, i) => (
               <div key={`filler-${i}`} className="aspect-[3/4] bg-zinc-900/30" />
            ))}
          </div>
          {reels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <Film className="w-16 h-16 mb-2 opacity-20" />
              <p className="font-bold text-sm">Upload your first video</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="m-0 pt-0.5">
           <div className="flex flex-col items-center justify-center py-24 text-zinc-600 px-10 text-center">
              <Lock className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="font-bold text-white mb-2">Private collection</h3>
              <p className="text-xs">Your saved videos are only visible to you.</p>
           </div>
        </TabsContent>

        <TabsContent value="liked" className="m-0 pt-0.5">
            <div className="flex flex-col items-center justify-center py-24 text-zinc-600 px-10 text-center">
              <Heart className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="font-bold text-white mb-2">Videos you liked</h3>
              <p className="text-xs">Liked videos are private by default.</p>
           </div>
        </TabsContent>
      </Tabs>

      <FullScreenImage 
        src={profile?.profile_photo_url} 
        isOpen={showFullScreenProfile} 
        onClose={() => setShowFullScreenProfile(false)} 
      />
    </div>
  );
}

function Play({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
       <path d="M7 4V20L19 12L7 4Z" fill="currentColor"/>
    </svg>
  );
}
