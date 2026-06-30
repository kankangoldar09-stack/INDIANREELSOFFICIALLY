import { formatDistanceToNow } from 'date-fns';
import { Bike, Bookmark, Check, Eye, 
  Heart, MessageCircle, MoreHorizontal, Pause, 
  Play, PlusSquare, RefreshCw, Search, Send, Subtitles, ThumbsUp, Trash2, Video, Volume2, VolumeX 
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Captions } from '@/components/common/Captions';
import { CommentsSheet } from '@/components/common/CommentsSheet';
import Counter from '@/components/common/Counter';
import { FullScreenImage } from '@/components/common/FullScreenImage';
import { ShareSheet } from '@/components/common/ShareSheet';
import ProductCard from '@/components/ProductCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';
import { overlayClassName, overlayStyle } from '@/lib/overlayConstants';
import { cn } from '@/lib/utils';
import { Post, Profile, Reel, Story } from '@/types';
import { supabase } from '../db/supabase';

export default function Home() {
  const { profile } = useAuth();
  const { speak } = useVoiceGuidance();
  const navigate = useNavigate();
  const [items, setItems] = useState<(Post | Reel)[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(!items.length);
  const [unreadCount, setUnreadCount] = useState(0);
  const [globalMuted, setGlobalMuted] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');

  useEffect(() => {
    fetchContent();
  }, [profile]);

  useEffect(() => {
    if (targetId && items.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`post-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setActiveVideoId(targetId);
        }
      }, 500);
    }
  }, [targetId, items]);

  useEffect(() => {
    if (profile) {
      fetchUnreadCount();
      const channel = supabase
        .channel('home-notifications-count')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
          () => fetchUnreadCount()
        )
        .subscribe();

      // Add Realtime for stories
      const storiesChannel = supabase
        .channel('home-stories-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'stories' },
          () => fetchContent()
        )
        .subscribe();

      return () => { 
        channel.unsubscribe(); 
        storiesChannel.unsubscribe();
      };
    }
  }, [profile]);

  const fetchUnreadCount = async () => {
    const { count } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile?.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  useEffect(() => {
    if (profile) {
      const welcomePlayed = sessionStorage.getItem('welcome_played');
      if (!welcomePlayed) {
        speak(`Hello ${profile.full_name || profile.username}! Welcome to Indian Reels.`);
        sessionStorage.setItem('welcome_played', 'true');
      }
    }
  }, [profile]);

  const fetchContent = async () => {
    if (items.length === 0) setLoading(true);
    try {
      // Fetch Posts from all projects
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(*),
          likes_count:likes(count),
          comments_count:comments(count),
          views_count:watch_history(count),
          product_tags(*)
        `)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      // Fetch Reels from all projects
      const { data: reelsData } = await supabase
        .from('reels')
        .select(`
          *,
          profiles(*),
          likes_count:likes(count),
          comments_count:comments(count),
          views_count:watch_history(count),
          product_tags(*)
        `)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      // Fetch user likes (only from primary project for now)
      let likedPostIds = new Set<string>();
      let likedReelIds = new Set<string>();
      
      if (profile) {
        const { data: postLikes } = await (supabase as any).from('likes').select('post_id').eq('user_id', profile.id).not('post_id', 'is', null);
        const { data: reelLikes } = await (supabase as any).from('likes').select('reel_id').eq('user_id', profile.id).not('reel_id', 'is', null);
        likedPostIds = new Set(postLikes?.map((l: any) => l.post_id as string) || []);
        likedReelIds = new Set(reelLikes?.map((l: any) => l.reel_id as string) || []);
      }

      // Combine and format
      const combined: any[] = [
        ...(postsData || []).map((p: any) => ({ 
          ...p, 
          type: 'post',
          is_liked: likedPostIds.has(p.id),
          likes_count: p.likes_count?.[0]?.count || 0,
          comments_count: p.comments_count?.[0]?.count || 0,
          views_count: p.views_count?.[0]?.count || 0
        })),
        ...(reelsData || []).map((r: any) => ({ 
          ...r, 
          type: 'reel',
          is_liked: likedReelIds.has(r.id),
          likes_count: r.likes_count?.[0]?.count || 0,
          comments_count: r.comments_count?.[0]?.count || 0,
          views_count: r.views_count?.[0]?.count || 0
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(combined);

      // Fetch Stories (From everyone who has an active story)
      if (profile) {
        const { data: storiesData, error: storiesError } = await supabase
          .from('stories' as any)
          .select('*, profiles(*)')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (storiesError) throw storiesError;

        // Group stories by owner_id to show one entry per user
        const uniqueStories: any[] = [];
        const seenOwners = new Set<string>();
        
        // Add current user's story if exists (though we show the 'plus' button, seeing it as a story is also good)
        (storiesData || []).forEach((s: any) => {
          if (!seenOwners.has(s.owner_id)) {
            uniqueStories.push(s);
            seenOwners.add(s.owner_id);
          }
        });

        setStories(uniqueStories);
      }
    } catch (error: any) {
      toast.error(`Error loading feed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    const table = item.type === 'reel' ? 'reels' : 'posts';
    try {
      const { error } = await (supabase as any).from(table).delete().eq('id', item.id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== item.id));
      toast.success(`${item.type === 'reel' ? 'Reel' : 'Post'} deleted`);
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const hasMyStory = stories.some(s => s.owner_id === profile?.id);

  return (
    <div className="flex flex-col gap-6 relative bg-background h-full overflow-y-auto pb-20 no-scrollbar">
      {/* Brand Header with Actions */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-primary/10 px-4 h-16 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-orange-500 via-white to-green-500 bg-clip-text text-transparent italic drop-shadow-sm">
            INDIANREELS
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <button 
            onClick={() => navigate('/search')}
            className="p-2 hover:bg-accent rounded-full transition-all duration-300 active:scale-90"
          >
            <Search className="w-6 h-6 text-muted-foreground hover:text-primary" />
          </button>
          <button 
            onClick={() => fetchContent()}
            className="p-2 hover:bg-accent rounded-full transition-all duration-300 active:scale-90"
          >
            <RefreshCw className={cn("w-6 h-6 text-muted-foreground hover:text-primary", loading && "animate-spin")} />
          </button>
          <button 
            onClick={() => setGlobalMuted(!globalMuted)} 
            className="p-2 hover:bg-accent rounded-full transition-all duration-300 active:scale-90"
          >
            {globalMuted ? (
              <VolumeX className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Volume2 className="w-6 h-6 text-primary animate-in zoom-in duration-300" />
            )}
          </button>
          <Link to="/notifications" className="relative group transition-transform active:scale-90">
            <Heart className="w-6 h-6 group-hover:text-primary transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white animate-pulse shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/messages" className="transition-transform active:scale-90">
            <MessageCircle className="w-6 h-6 hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>

      {/* Stories Section */}
      <div className="py-3">
        <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar px-4">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="min-w-[72px]">
                <Skeleton className="w-[72px] h-[72px] rounded-full bg-muted shadow-inner" />
              </div>
            ))
          ) : (
            <>
              <div 
                className="min-w-[72px] cursor-pointer group"
                onClick={() => hasMyStory ? navigate(`/stories/${profile?.id}`) : navigate('/create?type=story')}
              >
                <div className={cn(
                  "w-[72px] h-[72px] rounded-full p-[3px] relative transition-all duration-300 hover:scale-105 active:scale-95",
                  hasMyStory ? "bg-gradient-to-tr from-orange-600 via-pink-500 to-purple-600" : "bg-gradient-to-tr from-zinc-700 to-zinc-800"
                )}>
                  <div className="bg-background rounded-full p-[2px] h-full w-full overflow-hidden">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={profile?.profile_photo_url || ''} className="object-cover" />
                      <AvatarFallback className="bg-muted text-sm">{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  {!hasMyStory && (
                    <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 border-[3px] border-background shadow-lg">
                      <PlusSquare className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
              {stories.filter(s => s.owner_id !== profile?.id).map((story) => (
                <div 
                  key={story.id} 
                  className="min-w-[72px] cursor-pointer group"
                  onClick={() => navigate(`/stories/${story.owner_id}`)}
                >
                  <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-tr from-orange-600 via-pink-500 to-purple-600 p-[3px] transition-all duration-300 group-hover:scale-105 shadow-md group-active:scale-95">
                    <div className="bg-background rounded-full p-[2px] h-full w-full overflow-hidden">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={story.profiles?.profile_photo_url || ''} className="object-cover" />
                        <AvatarFallback className="bg-muted text-sm">{story.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Posts & Reels Feed */}
      <div className="flex flex-col gap-6 max-w-[470px] mx-auto w-full">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full bg-muted" />
                <Skeleton className="w-24 h-4 bg-muted" />
              </div>
              <Skeleton className="w-full aspect-square bg-muted rounded-sm" />
              <div className="space-y-2">
                <Skeleton className="w-full h-4 bg-muted" />
                <Skeleton className="w-3/4 h-4 bg-muted" />
              </div>
            </div>
          ))
        ) : items.length > 0 ? (
          items.map((item: any) => (
            <div key={item.id} id={`post-${item.id}`}>
              <PostCard 
                post={item} 
                isReel={item.type === 'reel'} 
                onDelete={() => handleDelete(item)}
                globalMuted={globalMuted}
                setGlobalMuted={setGlobalMuted}
                isActive={activeVideoId === item.id}
                setActive={() => setActiveVideoId(item.id)}
              />
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <h2 className="text-xl font-bold">No posts yet</h2>
            <p className="text-muted-foreground">Follow some friends to see their posts here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, isReel, onDelete, globalMuted, setGlobalMuted, isActive, setActive }: { post: any, isReel?: boolean, onDelete: () => void, globalMuted: boolean, setGlobalMuted: (v: boolean) => void, isActive: boolean, setActive: () => void }) {
  const navigate = useNavigate();
  const { profile: currentUser } = useAuth();
  const { hideViewsPref } = useSettings();
  const [liked, setLiked] = useState(post.is_liked || false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollower, setIsFollower] = useState(false);

  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [viewsCount, setViewsCount] = useState(post.views_count || 0);
  const [sharesCount, setSharesCount] = useState(post.shares_count || 0);
  const [paused, setPaused] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showFlag, setShowFlag] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeTouchStartX = useRef<number>(0);
  const [showFullScreenProfile, setShowFullScreenProfile] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isSaved, setIsSaved] = useState(post.is_saved || false);
  const [savesCount, setSavesCount] = useState(post.saves_count || 0);
  const [showCC, setShowCC] = useState(true);
  const [ccLang, setCcLang] = useState<'en' | 'hi'>('hi');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const { defaultVideoQuality } = useSettings();
  const [currentQuality, setCurrentQuality] = useState(defaultVideoQuality || '1080p');
  const [isQualitySwitching, setIsQualitySwitching] = useState(false);
  const seekTargetRef = useRef<number | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  useEffect(() => {
    checkIsSaved();
    checkLikeStatus();
  }, [currentUser]);

  const checkLikeStatus = async () => {
    if (!currentUser) return;
    const { data } = await (supabase as any)
      .from('likes')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq(isReel ? 'reel_id' : 'post_id', post.id)
      .maybeSingle();
    setLiked(!!data);
  };

  const checkIsSaved = async () => {
    if (!currentUser) return;
    const { data } = await (supabase as any)
      .from('saved_items')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq(isReel ? 'reel_id' : 'post_id', post.id)
      .maybeSingle();
    setIsSaved(!!data);
  };


  const isOwnPost = currentUser?.id === post.owner_id;
  const canDelete = currentUser?.role === 'admin' || isOwnPost;
  const showViews = !hideViewsPref;
  const showLikesCount = !post.hide_likes;
  const showComments = !post.hide_comments;

  useEffect(() => {
    if (currentUser && !isOwnPost) {
      checkFollowStatus();
    }
  }, [currentUser, post.owner_id]);

  const checkFollowStatus = async () => {
    if (!currentUser?.id) return;
    const [followData, followerData]: any[] = await Promise.all([
      supabase
        .from('follows' as any)
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', post.owner_id)
        .maybeSingle(),
      supabase
        .from('follows' as any)
        .select('*')
        .eq('follower_id', post.owner_id)
        .eq('following_id', currentUser.id)
        .maybeSingle()
    ]);
    setIsFollowing(!!followData.data);
    setIsFollower(!!followerData.data);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.id) return toast.error('Please login to follow');
    try {
      if (isFollowing) {
        await (supabase as any).from('follows').delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', post.owner_id);
        setIsFollowing(false);
      } else {
        await (supabase as any).from('follows').insert({ 
          follower_id: currentUser.id, 
          following_id: post.owner_id 
        } as any);
        setIsFollowing(true);
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const handleRecordView = async () => {
    if (!currentUser) return;
    try {
      const payload: any = {
        user_id: currentUser?.id,
        post_id: !isReel ? post?.id : null,
        reel_id: isReel ? post?.id : null
      };

      const { data, error } = await (supabase as any)
        .from('watch_history')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        setViewsCount((prev: number) => prev + 1);
      }
    } catch (error) {
      // Catch any error
    }
  };

  const toggleLike = async () => {
    if (!currentUser) {
      toast.error('Please login to like');
      return;
    }

    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikesCount((prev: number) => newLikedState ? prev + 1 : prev - 1);
    
    if (newLikedState) {
      setShowFlag(true);
      setTimeout(() => setShowFlag(false), 1800);
    }

    try {
      if (newLikedState) {
        await (supabase as any).from('likes').insert({
          user_id: currentUser.id,
          post_id: !isReel ? post.id : null,
          reel_id: isReel ? post.id : null
        });
      } else {
        await (supabase as any).from('likes').delete()
          .eq('user_id', currentUser.id)
          .eq(isReel ? 'reel_id' : 'post_id', post.id);
      }
    } catch (error: any) {
      setLiked(!newLikedState);
      setLikesCount((prev: number) => !newLikedState ? prev + 1 : prev - 1);
      toast.error(`Error liking: ${error.message}`);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPaused(false);
    } else {
      videoRef.current.pause();
      setPaused(true);
    }
  };

  const handleQualityChange = (q: string) => {
    if (q === currentQuality) return;
    const video = videoRef.current;
    if (video) {
      seekTargetRef.current = video.currentTime;
      video.pause();
    }
    setIsQualitySwitching(true);
    setTimeout(() => {
      setCurrentQuality(q);
      setIsQualitySwitching(false);
      toast.success(`Quality set to ${q}`);
    }, 700);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setGlobalMuted(!globalMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
    if (videoRef.current && !paused) {
      videoRef.current.pause();
    }
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
    if (videoRef.current && !paused) {
      videoRef.current.play();
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const timeSinceLast = now - lastTap;
    setLastTap(now);

    if (timeSinceLast < 300) {
      // Double tap — cancel pending single-tap, just like
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      e.stopPropagation();
      e.preventDefault();
      handleDoubleTap();
    } else {
      // Single tap — delay so double-tap can cancel it
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        if (isReel) {
          navigate(`/reels?id=${post.id}`);
        } else {
          togglePlay();
        }
      }, 280);
    }
  };

  const handleDoubleTap = () => {
    if (!liked) {
      toggleLike();
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return toast.error("Please login to save");
    
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    const table = isReel ? "reels" : "posts";

    try {
      if (newSavedState) {
        await (supabase as any).from("saved_items").insert({
          user_id: currentUser.id,
          post_id: !isReel ? post.id : null,
          reel_id: isReel ? post.id : null
        });
        setSavesCount((prev: number) => prev + 1);
        const table = isReel ? "reels" : "posts";
        await (supabase as any).from(table).update({ saves_count: (post.saves_count || 0) + 1 }).eq("id", post.id);
        toast.success("Saved to collection");
      } else {
        await (supabase as any).from("saved_items").delete()
          .eq("user_id", currentUser.id)
          .eq(isReel ? "reel_id" : "post_id", post.id);
        setSavesCount((prev: number) => Math.max(0, prev - 1));
        const table = isReel ? "reels" : "posts";
        await (supabase as any).from(table).update({ saves_count: Math.max(0, (post.saves_count || 0) - 1) }).eq("id", post.id);
        toast.success("Removed from saved");
      }
    } catch (error: any) {
      setIsSaved(!newSavedState);
      toast.error("Failed to save");
    }
  };
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            handleRecordView();
            setActive(); // Set this video as active when it's mostly in view
          }
        });
      },
      { threshold: 0.7 }
    );

    const target = videoRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [post.id]);

  return (
    <Card className="border-none shadow-xl bg-card/40 backdrop-blur-sm rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 border border-primary/5">
      <CardHeader className="flex flex-row items-center justify-between p-4 space-y-0">
        <div className="flex items-center gap-3">
          <Avatar 
            className="w-10 h-10 border-2 border-primary/20 cursor-pointer hover:scale-110 transition-transform duration-300 shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullScreenProfile(true);
            }}
          >
            <AvatarImage src={post.profiles?.profile_photo_url || ''} className="object-cover" />
            <AvatarFallback className="bg-muted">{post.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm cursor-pointer hover:text-primary transition-colors tracking-tight" onClick={() => navigate(`/profile/${post.profiles?.username}`)}>
                {post.profiles?.username}
              </span>
              {post.profiles?.is_verified && <VerificationBadge size={25} />}
              {!isOwnPost && (
                <>
                  <span className="text-zinc-500 text-[10px]">·</span>
                  <button 
                    onClick={handleFollow}
                    className={cn(
                      "text-[13px] font-black transition-all active:scale-95 px-3 py-1 rounded-md",
                      isFollowing 
                        ? "bg-zinc-100 text-black hover:bg-zinc-200" 
                        : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                    )}
                  >
                    {isFollowing ? 'Following' : isFollower ? 'Follow Back' : 'Follow'}
                  </button>
                </>
              )}
            </div>
            <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider opacity-60">
              {formatDistanceToNow(new Date(post.created_at))} ago
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-accent/50 transition-colors">
              <MoreHorizontal className="w-5 h-5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dark min-w-[200px] rounded-2xl border-primary/10 bg-background/95 backdrop-blur-xl">
            {isReel && post.captions && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-sm">
                  <Subtitles className="w-4 h-4 mr-2" />
                  Subtitles
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="dark">
                    <DropdownMenuItem 
                      className="text-sm flex justify-between items-center"
                      onClick={() => setShowCC(false)}
                    >
                      Off
                      {!showCC && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-sm flex justify-between items-center"
                      onClick={() => { setShowCC(true); setCcLang('en'); }}
                    >
                      English
                      {showCC && ccLang === 'en' && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-sm flex justify-between items-center"
                      onClick={() => { setShowCC(true); setCcLang('hi'); }}
                    >
                      Hindi
                      {showCC && ccLang === 'hi' && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}

            {isReel && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-sm">
                  <Video className="w-4 h-4 mr-2" />
                  Quality
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="dark">
                    {['4K', '2K', '1080p', '720p', '480p'].map((q) => (
                      <DropdownMenuItem 
                        key={q}
                        className="text-sm flex justify-between items-center"
                        onClick={() => handleQualityChange(q)}
                      >
                        {q}
                        {currentQuality === q && <Check className="w-4 h-4 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}

            <DropdownMenuItem className="text-sm">Copy Link</DropdownMenuItem>
            <DropdownMenuSeparator />
            {canDelete && (
              <DropdownMenuItem 
                className="text-sm text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="p-0">
        <div 
          className={cn(
            "relative bg-muted/20 flex items-center justify-center overflow-hidden border-y border-primary/5 cursor-pointer group shadow-inner",
            !isReel && !post.media_url?.match(/\.(mp4|webm|ogg|mov)$|^https:\/\/.*video.*$/i) && (!post.media_gallery || post.media_gallery.length === 0) ? "aspect-square" : "min-h-[300px] max-h-[85vh] w-full"
          )}
          onClick={isReel ? handleTap : undefined}
          onMouseEnter={!isReel ? handleRecordView : undefined}
        >
          {/* Quality switching loader overlay */}
          {isQualitySwitching && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] z-50 pointer-events-none">
              <IndianSpinner size="lg" />
              <span className="mt-4 text-xs font-bold text-white tracking-widest uppercase animate-pulse">
                Adjusting to {currentQuality}...
              </span>
            </div>
          )}

          {/* Quality indicator badge */}
          {isReel && (
            <div className={cn(
              "absolute top-4 left-4 z-40 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border flex items-center gap-1.5 shadow-lg pointer-events-none transition-all duration-300",
              (currentQuality === '2K' || currentQuality === '4K') 
                ? "border-amber-500/50 text-amber-400 shadow-amber-500/10" 
                : "border-white/15 text-zinc-300"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                (currentQuality === '2K' || currentQuality === '4K') ? "bg-amber-400" : "bg-green-500"
              )}></span>
              <span className="text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                {currentQuality}
                {(currentQuality === '2K' || currentQuality === '4K' || currentQuality === '1080p') && (
                  <span className="text-[8px] bg-white/10 px-1 rounded text-white font-extrabold scale-90 origin-left">HD</span>
                )}
              </span>
            </div>
          )}
          {post.media_gallery && post.media_gallery.length > 0 ? (
            <div
              className="w-full h-full relative"
              onClick={isReel ? handleTap : undefined}
              onTouchStart={(e) => { swipeTouchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                const dx = e.changedTouches[0].clientX - swipeTouchStartX.current;
                if (Math.abs(dx) > 40) {
                  if (dx < 0 && currentCarouselIndex < post.media_gallery.length - 1) {
                    setCurrentCarouselIndex(prev => prev + 1);
                  } else if (dx > 0 && currentCarouselIndex > 0) {
                    setCurrentCarouselIndex(prev => prev - 1);
                  }
                }
              }}
            >
              {post.media_gallery[currentCarouselIndex]?.match(/\.(mp4|webm|ogg|mov)$/i) || (isReel && currentCarouselIndex === 0) ? (
                <video
                  ref={videoRef}
                  key={post.media_gallery[currentCarouselIndex]}
                  src={post.media_gallery[currentCarouselIndex]}
                  className="w-full h-full object-contain bg-black shadow-2xl"
                  loop={!isReel}
                  muted={isReel ? (!isActive || globalMuted) : globalMuted}
                  playsInline
                  autoPlay={isReel ? isActive : false}
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      setCurrentTime(videoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration);
                    }
                  }}
                />
              ) : (
                <img
                  src={post.media_gallery[currentCarouselIndex]}
                  className="w-full h-full object-contain bg-black"
                  alt="Post content"
                />
              )}
              
              {/* Carousel Indicators */}
              {post.media_gallery.length > 1 && (
                <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 px-4 z-30">
                  {post.media_gallery.map((_: any, idx: number) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-1 rounded-full transition-all duration-300",
                        currentCarouselIndex === idx ? "w-8 bg-white shadow-sm" : "w-1.5 bg-white/40"
                      )}
                    />
                  ))}
                </div>
              )}
              
              {/* Carousel Navigation */}
              {post.media_gallery.length > 1 && (
                <>
                  <button
                    className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentCarouselIndex > 0) setCurrentCarouselIndex(prev => prev - 1);
                    }}
                  />
                  <button
                    className="absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentCarouselIndex < post.media_gallery.length - 1) {
                        setCurrentCarouselIndex(prev => prev + 1);
                      }
                    }}
                  />
                </>
              )}

              {isReel && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-40">
                  <button 
                    onClick={toggleMute}
                    className="p-3 rounded-full bg-black/60 text-white hover:bg-primary transition-all duration-300 backdrop-blur-xl shadow-xl active:scale-90"
                  >
                    {globalMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
              )}
            </div>
          ) : isReel ? (
            <>
              <video 
                ref={videoRef}
                src={((post as any).is_chunked && (post as any).chunk_urls?.length > 0) 
                  ? (post as any).chunk_urls[currentChunkIndex] 
                  : `${(post as any).video_url}${(post as any).video_url.includes('?') ? '&' : '?'}quality=${currentQuality}`} 
                style={{
                  filter: 
                    currentQuality === '480p' ? 'blur(1.2px) contrast(0.95) saturate(0.9)' :
                    currentQuality === '720p' ? 'blur(0.5px)' :
                    currentQuality === '1080p' ? 'none' :
                    currentQuality === '2K' ? 'contrast(1.05) saturate(1.05) brightness(1.02)' :
                    currentQuality === '4K' ? 'contrast(1.1) saturate(1.1) brightness(1.04) drop-shadow(0 0 1px rgba(255,255,255,0.15))' :
                    'none'
                }}
                poster={post.thumbnail_url || undefined}
                className="w-full h-full object-contain bg-black shadow-2xl" 
                loop={false}
                muted={isReel ? (!isActive || globalMuted) : globalMuted}
                playsInline
                autoPlay={isReel ? isActive : false}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                    if (seekTargetRef.current !== null) {
                      videoRef.current.currentTime = seekTargetRef.current;
                      seekTargetRef.current = null;
                      if (!paused && isActive) {
                        videoRef.current.play().catch(console.error);
                      }
                    }
                  }
                }}
              />
              {showCC && post.captions && (
                <Captions 
                  captions={post.captions} 
                  currentTime={currentTime} 
                  language={ccLang} 
                />
              )}
              {ended && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-500">
                  <div className="flex flex-col items-center gap-5">
                    <Button 
                      variant="default" 
                      className="rounded-full px-10 bg-white text-black hover:bg-zinc-200 font-black flex items-center gap-3 h-14 shadow-xl transform transition hover:scale-105 active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnded(false);
                        if (videoRef.current) {
                           videoRef.current.currentTime = 0;
                           videoRef.current.play();
                        }
                      }}
                    >
                      <RefreshCw className="w-6 h-6 animate-spin-slow" /> Watch Again
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="rounded-full px-10 bg-black/60 text-white hover:bg-black/80 border border-white/20 font-black flex items-center gap-3 h-14 shadow-xl transform transition hover:scale-105 active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reels?id=${post.id}`);
                      }}
                    >
                      <Video className="w-6 h-6" /> View Video
                    </Button>
                  </div>
                </div>
              )}
              {showFlag && (
                <div className="flag-animation flex flex-col items-center gap-3 z-50">
                  <div className="text-9xl filter drop-shadow-[0_0_20px_rgba(255,165,0,0.8)] animate-bounce">
                    🇮🇳
                  </div>
                  <div className="brand-text text-2xl font-black bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/30 text-white tracking-[0.3em] shadow-2xl">
                    INDIA
                  </div>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                {paused && !ended && <Pause className="w-20 h-20 text-white/50 fill-white/10 animate-pulse" />}
              </div>
              <div className="absolute bottom-4 right-4 flex items-center gap-2 z-40">
                {post.captions && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCC(!showCC);
                    }}
                    className={cn(
                      "p-3 rounded-full text-white hover:bg-primary transition-all duration-300 backdrop-blur-xl shadow-xl active:scale-90",
                      showCC ? "bg-primary" : "bg-black/60"
                    )}
                    title={showCC ? "CC चालू है" : "CC बंद है"}
                  >
                    <Subtitles className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={toggleMute}
                  className="p-3 rounded-full bg-black/60 text-white hover:bg-primary transition-all duration-300 backdrop-blur-xl shadow-xl active:scale-90"
                >
                  {globalMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Seekbar for Reels */}
              <div className="absolute bottom-16 left-4 right-4 z-40">
                <div className="space-y-2">
                  {/* Time Display */}
                  <div className="flex items-center justify-between text-white text-xs font-medium">
                    <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{formatTime(currentTime)}</span>
                    <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{formatTime(duration)}</span>
                  </div>
                  
                  {/* Seekbar */}
                  <div 
                    className="relative h-1 bg-white/30 rounded-full cursor-pointer group/seekbar"
                    onClick={handleSeek}
                    onMouseDown={handleSeekStart}
                    onMouseUp={handleSeekEnd}
                    onTouchStart={handleSeekStart}
                    onTouchEnd={handleSeekEnd}
                  >
                    {/* Progress Bar */}
                    <div 
                      className="absolute top-0 left-0 h-full bg-white rounded-full transition-all"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    
                    {/* Seek Handle */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/seekbar:opacity-100 transition-opacity"
                      style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full relative">
              {post.media_url?.match(/\.(mp4|webm|ogg|mov)$|^https:\/\/.*video.*$/i) ? (
                <>
                  <video 
                    ref={videoRef}
                    src={(post.is_chunked && post.chunk_urls && post.chunk_urls.length > 0) 
                      ? post.chunk_urls[currentChunkIndex] 
                      : `${post.media_url}${post.media_url.includes('?') ? '&' : '?'}quality=${currentQuality}`} 
                    style={{
                      filter: 
                        currentQuality === '480p' ? 'blur(1.2px) contrast(0.95) saturate(0.9)' :
                        currentQuality === '720p' ? 'blur(0.5px)' :
                        currentQuality === '1080p' ? 'none' :
                        currentQuality === '2K' ? 'contrast(1.05) saturate(1.05) brightness(1.02)' :
                        currentQuality === '4K' ? 'contrast(1.1) saturate(1.1) brightness(1.04) drop-shadow(0 0 1px rgba(255,255,255,0.15))' :
                        'none'
                    }}
                    poster={post.thumbnail_url || undefined}
                    className="w-full h-full object-contain bg-black" 
                    controls
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onEnded={() => {
                      if (post.is_chunked && post.chunk_urls && currentChunkIndex < post.chunk_urls.length - 1) {
                        setCurrentChunkIndex(prev => prev + 1);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        if (seekTargetRef.current !== null) {
                          videoRef.current.currentTime = seekTargetRef.current;
                          seekTargetRef.current = null;
                        }
                      }
                    }}
                  />
                  {showCC && post.captions && (
                    <Captions 
                      captions={post.captions} 
                      currentTime={currentTime} 
                      language={ccLang} 
                    />
                  )}
                  {post.captions && (
                    <div className="absolute bottom-4 right-4 z-40">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCC(!showCC);
                        }}
                        className={cn(
                          "p-3 rounded-full text-white hover:bg-primary transition-all duration-300 backdrop-blur-xl shadow-xl active:scale-90",
                          showCC ? "bg-primary" : "bg-black/60"
                        )}
                        title={showCC ? "CC चालू है" : "CC बंद है"}
                      >
                        <Subtitles className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <img src={post.media_url} alt="Post content" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
              )}

              {/* Overlays (Text and Stickers) */}
              {post.overlays?.text && post.overlays.text.map((overlay: any) => (
                <div
                  key={overlay.id}
                  className={overlayClassName(overlay)}
                  style={overlayStyle(overlay)}
                >
                  {overlay.text}
                </div>
              ))}
              {post.overlays?.stickers && post.overlays.stickers.map((sticker: any) => (
                <div
                  key={sticker.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    width: `${sticker.size}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 25
                  }}
                >
                  <img src={sticker.url} alt="Sticker" className="w-full h-full object-contain" />
                </div>
              ))}

              {/* Product Tags */}
              {post.product_tags && post.product_tags.map((tag: any) => (
                <div key={tag.id} className="absolute inset-0 pointer-events-none z-40">
                  <ProductCard
                    productName={tag.product_name}
                    productImage={tag.product_image_url}
                    productPrice={tag.product_price}
                    productLink={tag.product_link}
                    position={{ x: tag.position_x, y: tag.position_y }}
                    isEditable={false}
                    onClick={() => window.open(tag.product_link, '_blank')}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-1 group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-auto p-0 hover:bg-transparent transition-all duration-300"
                  onClick={toggleLike}
                >
                  <ThumbsUp className={cn("w-10 h-10 transition-all duration-500", liked ? "fill-primary text-primary scale-125 drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "text-foreground group-hover:scale-110 group-active:scale-90")} />
                </Button>
                <span className="text-[10px] font-bold"><Counter value={likesCount} /></span>
              </div>
              
              {showComments && (
                <div className="flex flex-col items-center gap-1 group">
                  <Button onClick={() => setIsCommentsOpen(true)} variant="ghost" size="icon" className="h-auto p-0 hover:bg-transparent transition-all duration-300">
                    <MessageCircle className="w-10 h-10 group-hover:scale-110 group-active:scale-90 opacity-80 group-hover:opacity-100" />
                  </Button>
                  <span className="text-[10px] font-bold"><Counter value={commentsCount} /></span>
                </div>
              )}

              <div className="flex flex-col items-center gap-1 group">
                <Button 
                  onClick={() => {
                    setShowShareSheet(true);
                    setSharesCount((prev: number) => prev + 1);
                    const table = isReel ? 'reels' : 'posts';
                    (supabase as any).from(table).update({ shares_count: (post.shares_count || 0) + 1 }).eq('id', post.id).then();
                  }} 
                  variant="ghost" 
                  size="icon" 
                  className="h-auto p-0 hover:bg-transparent transition-all duration-300"
                >
                  <Send className="w-10 h-10 group-hover:scale-110 group-active:scale-90 opacity-80 group-hover:opacity-100" />
                </Button>
                <span className="text-[10px] font-bold"><Counter value={sharesCount} /></span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {showViews && (
                <div className="flex flex-col items-center gap-1 px-3 py-1 bg-accent/30 rounded-full backdrop-blur-md">
                   <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 opacity-70" />
                    <span className="text-[11px] font-black"><Counter value={viewsCount} /></span>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center gap-1 group">
                <Button onClick={handleSave} variant="ghost" size="icon" className="h-auto p-0 hover:bg-transparent transition-all duration-300">
                  <Bookmark className={cn("w-10 h-10 transition-all duration-500", isSaved ? "fill-primary text-primary scale-110 shadow-lg" : "text-foreground group-hover:scale-110 group-active:scale-90 opacity-80 group-hover:opacity-100")} />
                </Button>
                <span className="text-[10px] font-bold"><Counter value={savesCount} /></span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {showLikesCount && (
              <p className="font-black text-[13px] tracking-tight text-primary">
                <Counter value={likesCount} /> <span className="text-foreground opacity-80">INDIANS LOVED THIS</span>
              </p>
            )}
            <div className="text-sm leading-relaxed">
              <span className="font-black mr-2 text-primary">@{post.profiles?.username}</span>
              <span className="opacity-90">{post.caption}</span>
            </div>
            {showComments && commentsCount > 0 && (
              <button 
                onClick={() => setIsCommentsOpen(true)}
                className="text-muted-foreground text-xs font-black tracking-wider uppercase opacity-60 hover:opacity-100 hover:text-primary transition-all mt-1"
              >
                View all <Counter value={commentsCount} /> comments
              </button>
            )}
          </div>
        </div>

        <CommentsSheet
          postId={!isReel ? post.id : undefined}
          reelId={isReel ? post.id : undefined}
          open={isCommentsOpen}
          onOpenChange={setIsCommentsOpen}
          onCountChange={setCommentsCount}
        />
      </CardContent>

      <FullScreenImage 
        src={post.profiles?.profile_photo_url} 
        isOpen={showFullScreenProfile} 
        onClose={() => setShowFullScreenProfile(false)} 
      />
      <ShareSheet 
        isOpen={showShareSheet} 
        onOpenChange={setShowShareSheet} 
        url={`https://app-af2z7g8d924h.appmedo.com${isReel ? '/reels?id=' : '/post/'}${post.id}`} 
        mediaUrl={isReel ? post.video_url : post.media_url}
        title={post.caption || 'INDIANREELS'}
        postId={!isReel ? post.id : undefined}
        reelId={isReel ? post.id : undefined}
      />
    </Card>
  );
}
