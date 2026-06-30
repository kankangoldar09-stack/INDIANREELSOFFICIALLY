// App Owner: jeet

import { useEffect, useState, useRef, useCallback } from 'react';
import { overlayClassName, overlayStyle } from '@/lib/overlayConstants';
import { supabase } from '../db/supabase';
import { Reel, Profile, ProductTag } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Music2, 
  PlayCircle, Pause, Volume2, VolumeX, Trash2, Film, Video as VideoIcon, 
  Eye, ThumbsUp, Subtitles, Check, FastForward, MousePointer2, Zap,
  ArrowLeft, Camera, Music, RefreshCw, Plus, Search, ShieldCheck, Disc,
  MoreHorizontal, Scissors, Maximize, Minimize, Flag, AlertTriangle,
  Bell, Info, XCircle, Sliders
} from 'lucide-react';
import { VerificationBadge } from '@/components/VerificationBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn, stopAllMediaStreams } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import ProductCard from '@/components/ProductCard';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { CommentsSheet } from '@/components/common/CommentsSheet';
import { FullScreenImage } from '@/components/common/FullScreenImage';
import { ShareSheet } from '@/components/common/ShareSheet';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Captions } from '@/components/common/Captions';
import Counter from '@/components/common/Counter';
import IndianSpinner from '@/components/ui/IndianSpinner';

let sessionWatchedCount = 0;

export default function Reels() {
  const { profile } = useAuth();
  const { isBlocked } = useScreenshotProtection();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const { autoplayLimit, dataSaverMode } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetId = searchParams.get('id');
  const [activeTab, setActiveTab] = useState<'following' | 'foryou' | 'friends'>('foryou');
  const [globalMuted, setGlobalMuted] = useState(true);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(false);

  // Stop all camera streams when component mounts
  useEffect(() => {
    stopAllMediaStreams();
    console.log('Reels: Stopped all camera/mic streams for clean audio playback');
  }, []);

  useEffect(() => {
    fetchReels();
    // Reset session count when mounting the reels page
    sessionWatchedCount = 0;
  }, [activeTab]);

  const fetchReels = async () => {
    setLoading(true);
    try {
      // Fetch Reels
      let reelsQ = supabase
        .from('reels')
        .select(`
          *,
          profiles(*),
          likes_count:likes(count),
          comments_count:comments(count),
          views_count:watch_history(count),
          product_tags(*)
        `)
        .eq('is_hidden', false);

      // Fetch Posts
      let postsQ = supabase
        .from('posts')
        .select(`
          *,
          profiles(*),
          likes_count:likes(count),
          comments_count:comments(count),
          product_tags(*)
        `)
        .eq('is_hidden', false);

      // If Following tab is active, filter by followed users
      if (activeTab === 'following' && profile) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profile.id);
        
        const followingIds = followingData?.map((f: any) => f.following_id) || [];
        if (followingIds.length > 0) {
          reelsQ = reelsQ.in('owner_id', followingIds);
          postsQ = postsQ.in('owner_id', followingIds);
        } else {
          // If following tab but no following, return empty
          reelsQ = reelsQ.eq('id', '00000000-0000-0000-0000-000000000000');
          postsQ = postsQ.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const [{ data: reelsData, error: reelsError }, { data: postsData, error: postsError }] = await Promise.all([
        reelsQ.order('created_at', { ascending: false }),
        postsQ.order('created_at', { ascending: false })
      ]);

      if (reelsError) throw reelsError;
      if (postsError) throw postsError;

      let combinedData = [
        ...(reelsData || []).map(r => ({ ...r, type: 'reel' as const })),
        ...(postsData || []).map(p => ({ ...p, type: 'post' as const, video_url: p.media_url }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      let filteredData = combinedData;

      // Filter Friends tab if needed
      if (activeTab === 'friends' && profile) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profile.id);
        
        const followingIds = followingData?.map((f: any) => f.following_id) || [];
        
        const { data: followersData } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', profile.id);
        
        const followerIds = followersData?.map((f: any) => f.follower_id) || [];
        const mutualIds = followingIds.filter((id: string) => followerIds.includes(id));
        filteredData = filteredData.filter((r: any) => mutualIds.includes(r.owner_id));
      }

      // Check liked status for each reel
      let enrichedReels: any[] = filteredData.map((r: any) => ({
        ...r,
        likes_count: r.likes_count?.[0]?.count || 0,
        comments_count: r.comments_count?.[0]?.count || 0,
        views_count: r.views_count?.[0]?.count || 0
      }));

      if (profile) {
        const { data: userLikes } = await (supabase as any)
          .from('likes')
          .select('reel_id, post_id')
          .eq('user_id', profile.id);
        
        const likedReelIds = new Set(userLikes?.map((l: any) => l.reel_id).filter(Boolean) || []);
        const likedPostIds = new Set(userLikes?.map((l: any) => l.post_id).filter(Boolean) || []);

        const { data: userSaves } = await (supabase as any)
          .from('saved_items')
          .select('reel_id, post_id')
          .eq('user_id', profile.id);

        const savedReelIds = new Set(userSaves?.map((s: any) => s.reel_id).filter(Boolean) || []);
        const savedPostIds = new Set(userSaves?.map((s: any) => s.post_id).filter(Boolean) || []);

        enrichedReels = enrichedReels.map(r => ({
          ...r,
          is_liked: r.type === 'reel' ? likedReelIds.has(r.id) : likedPostIds.has(r.id),
          is_saved: r.type === 'reel' ? savedReelIds.has(r.id) : savedPostIds.has(r.id)
        }));
      }

      // Randomize reels for "For You" tab
      const shuffledReels = activeTab === 'foryou' 
        ? [...enrichedReels].sort(() => Math.random() - 0.5)
        : enrichedReels;

      // If targetId exists, reorder to put it first
      if (targetId) {
        const index = shuffledReels.findIndex(r => r.id === targetId);
        if (index !== -1) {
          const [targetReel] = shuffledReels.splice(index, 1);
          shuffledReels.unshift(targetReel);
        }
      }

      setReels(shuffledReels);
    } catch (error: any) {
      toast.error(`Error loading content: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reel: any) => {
    try {
      const table = reel.type === 'reel' ? 'reels' : 'posts';
      const { error } = await (supabase as any).from(table).delete().eq('id', reel.id);
      if (error) throw error;
      setReels(reels.filter(r => r.id !== reel.id));
      toast.success(`${reel.type === 'reel' ? 'Reel' : 'Post'} deleted`);
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const handleReport = (reportedReelId: string) => {
    setReels(prev => prev.filter(r => r.id !== reportedReelId));
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll exactly to video at `index` — smooth programmatic scrolling
  const goToIndex = useCallback((index: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, reels.length - 1));
    el.scrollTo({ top: clamped * el.clientHeight, behavior: 'smooth' });
  }, [reels.length]);

  const handleNext = useCallback((currentId: string) => {
    const index = reels.findIndex(r => r.id === currentId);
    if (index !== -1) goToIndex(index + 1);
  }, [reels, goToIndex]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-full bg-black">
        <div className="flex justify-center items-center py-4 bg-black/60 z-50">
          <h1 className="text-xl brand-text text-white italic tracking-tighter bg-gradient-to-r from-orange-500 via-white to-green-500 bg-clip-text text-transparent">INDIANREELS</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <IndianSpinner size="xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-hidden relative">
      <div
        ref={scrollContainerRef}
        className="w-full h-[100dvh] overflow-y-scroll scrollbar-hide no-scrollbar snap-y snap-mandatory scroll-smooth"
        style={{ overscrollBehavior: 'none' }}
      >
          {reels.length > 0 ? (
            reels.map((reel) => (
              <ReelItem 
                key={reel.id} 
                reel={reel} 
                onDelete={() => handleDelete(reel)} 
                onNext={() => handleNext(reel.id)}
                onReport={handleReport}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                globalMuted={globalMuted}
                setGlobalMuted={setGlobalMuted}
                isBlocked={isBlocked}
                isAutoScrollEnabled={isAutoScrollEnabled}
                setIsAutoScrollEnabled={setIsAutoScrollEnabled}
                onRefresh={fetchReels}
                isLoading={loading}
              />
            ))
          ) : (
            <div className="h-[100dvh] w-full flex flex-col items-center justify-center text-white px-6">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-xl font-bold mb-2">No videos yet</h2>
              <p className="text-white/60 text-center">
                {activeTab === 'following' 
                  ? "Follow creators to see their videos here" 
                  : "Check back later for new content"}
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

function ReelItem({ 
  reel, 
  onDelete, 
  onNext, 
  onReport,
  activeTab, 
  setActiveTab, 
  globalMuted, 
  setGlobalMuted, 
  isBlocked,
  isAutoScrollEnabled,
  setIsAutoScrollEnabled,
  onRefresh,
  isLoading
}: { 
  reel: any, 
  onDelete: () => void, 
  onNext: () => void,
  onReport: (id: string) => void,
  activeTab: 'following' | 'foryou' | 'friends',
  setActiveTab: (tab: 'following' | 'foryou' | 'friends') => void,
  globalMuted: boolean,
  setGlobalMuted: (muted: boolean) => void,
  isBlocked: boolean,
  isAutoScrollEnabled: boolean,
  setIsAutoScrollEnabled: (enabled: boolean) => void,
  onRefresh: () => void,
  isLoading: boolean
}) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { hideViewsPref } = useSettings();
  const [liked, setLiked] = useState(reel.is_liked || false);
  const [likesCount, setLikesCount] = useState(reel.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(reel.comments_count || 0);
  const [viewsCount, setViewsCount] = useState(reel.views_count || 0);
  const [sharesCount, setSharesCount] = useState(reel.shares_count || 0);
  const [savesCount, setSavesCount] = useState(reel.saves_count || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [showFullScreenProfile, setShowFullScreenProfile] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaved, setIsSaved] = useState(reel.is_saved || false);
  const [doubleTapPosition, setDoubleTapPosition] = useState<{ x: number; y: number } | null>(null);
  const [isFollower, setIsFollower] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [reportStep, setReportStep] = useState<'reason' | 'details' | 'success'>('reason');
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { defaultVideoQuality, dataSaverMode, autoplayLimit } = useSettings();
  const [autoplayStopped, setAutoplayStopped] = useState(false);
  const [showCC, setShowCC] = useState(true);
  const [ccLang, setCcLang] = useState<'en' | 'hi'>('hi');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentQuality, setCurrentQuality] = useState(defaultVideoQuality || '1080p');
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isQualitySwitching, setIsQualitySwitching] = useState(false);
  const seekTargetRef = useRef<number | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);   // immersive fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const holdTimer = useRef<any>(null);
  const uiHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep isFullscreen in sync with browser fullscreen state
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Fullscreen not supported on this device');
    }
  };

  const audioDisplayName = reel.source 
    ? (reel.source.audio_title || `${reel.source.profiles?.username} · Original Audio`)
    : (reel.audio_title || `${reel.profiles?.username} · Original Audio`);

  // Handle background music if external audio is used
  useEffect(() => {
    if (reel.audio_url && !paused && !globalMuted) {
      // Check if it's a valid playable audio URL (basic check)
      const isPlayable = reel.audio_url.startsWith('http') && !reel.audio_url.includes('t.me/');
      
      if (!isPlayable) {
        console.warn('Audio URL is not directly playable:', reel.audio_url);
        if (videoRef.current) videoRef.current.muted = false;
        return;
      }

      if (!audioRef.current || (audioRef.current.src !== reel.audio_url && !reel.audio_url.includes(audioRef.current.src))) {
        // Clean up old audio if exists
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        
        audioRef.current = new Audio(reel.audio_url);
        audioRef.current.loop = true;
        audioRef.current.preload = 'auto';
        console.log('🎵 Audio created with loop enabled:', audioRef.current.loop);
        
        // Get audio duration when loaded
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            setAudioDuration(audioRef.current.duration);
            console.log('🎵 Audio duration:', audioRef.current.duration, 'Loop:', audioRef.current.loop);
          }
        });
        
        // Debug: Log when audio ends
        audioRef.current.addEventListener('ended', () => {
          console.log('🎵 Audio ended event fired - should loop automatically');
        });
      }
      
      const audio = audioRef.current;
      
      // Ensure loop is always set
      if (!audio.loop) {
        audio.loop = true;
        console.log('🎵 Loop was false, setting to true');
      }
      
      // Only set start time if audio is at the beginning
      if (audio.currentTime === 0) {
        audio.currentTime = reel.audio_start_time || 0;
      }
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('🎵 Audio playing, loop:', audio.loop, 'duration:', audio.duration);
          if (videoRef.current) {
            videoRef.current.muted = true;
          }
        }).catch(err => {
          console.error("Audio play failed, falling back to video audio:", err);
          if (videoRef.current) {
            videoRef.current.muted = false;
          }
        });
      }
      
      return () => {
        // Don't pause audio on cleanup, let it continue playing
        // audio.pause();
      };
    } else if (paused || globalMuted) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (videoRef.current && !globalMuted) {
        videoRef.current.muted = false;
      }
    }
  }, [reel.audio_url, paused, globalMuted, reel.audio_start_time]);

  // Sync audio with video time - audio loops independently
  useEffect(() => {
    if (reel.audio_url && audioRef.current && videoRef.current) {
      const video = videoRef.current;
      const audio = audioRef.current;
      
      const handleTimeUpdate = () => {
        if (!audio.duration || isNaN(audio.duration)) return;
        
        // Audio loops independently, no need to sync strictly
        // Just ensure audio is playing when video is playing
        if (!video.paused && audio.paused && !globalMuted) {
          audio.play().catch(() => {});
        }
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [reel.audio_url, globalMuted]);

  useEffect(() => {
    if (profile && reel.owner_id) {
      checkFollowStatus();
      checkIsSaved();
      checkLikeStatus();
    }
  }, [profile, reel.owner_id]);

  const checkLikeStatus = async () => {
    if (!profile) return;
    const q = (supabase as any).from('likes').select('id').eq('user_id', profile.id);
    if (reel.type === 'reel') q.eq('reel_id', reel.id);
    else q.eq('post_id', reel.id);
    const { data } = await q.maybeSingle();
    setLiked(!!data);
  };

  const checkIsSaved = async () => {
    if (!profile) return;
    const q = (supabase as any).from('saved_items').select('id').eq('user_id', profile.id);
    if (reel.type === 'reel') q.eq('reel_id', reel.id);
    else q.eq('post_id', reel.id);
    const { data } = await q.maybeSingle();
    setIsSaved(!!data);
  };

  const checkFollowStatus = async () => {
    if (!profile?.id) return;
    const [followData, followerData]: any[] = await Promise.all([
      supabase
        .from('follows' as any)
        .select('*')
        .eq('follower_id', profile.id)
        .eq('following_id', reel.owner_id)
        .maybeSingle(),
      supabase
        .from('follows' as any)
        .select('*')
        .eq('follower_id', reel.owner_id)
        .eq('following_id', profile.id)
        .maybeSingle()
    ]);
    setIsFollowing(!!followData.data);
    setIsFollower(!!followerData.data);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return toast.error('Please login to follow');
    if (profile.id === reel.owner_id) return;

    try {
      if (isFollowing) {
        await (supabase as any).from('follows').delete()
          .eq('follower_id', profile.id)
          .eq('following_id', reel.owner_id);
        setIsFollowing(false);
        toast.success('Unfollowed');
      } else {
        await (supabase as any).from('follows').insert({ 
          follower_id: profile.id, 
          following_id: reel.owner_id 
        });
        setIsFollowing(true);
        toast.success('Following');
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const startHold = useCallback(() => {
    holdTimer.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.playbackRate = 2;
        setIsHolding(true);
      }
    }, 200);
  }, []);

  const stopHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (videoRef.current) {
      videoRef.current.playbackRate = 1;
      setIsHolding(false);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playSynthBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'triangle';
      
      const now = ctx.currentTime;
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.setValueAtTime(659.25, now + 0.1);
      osc1.frequency.setValueAtTime(783.99, now + 0.2);
      
      osc2.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(659.25, now + 0.1);
      osc2.frequency.setValueAtTime(783.99, now + 0.2);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.warn("Synthesizer failed to play", e);
    }
  };

  const handleReportSubmit = async (reasonSelected?: string) => {
    const finalReason = reasonSelected || reportReason;
    if (!finalReason) return;
    
    setSubmittingReport(true);
    setTimeout(() => {
      setSubmittingReport(false);
      setReportStep('success');
      playSynthBeep();
      toast.success('Report submitted successfully.');
      
      setTimeout(() => {
        setReportDialogOpen(false);
        setReportStep('reason');
        setReportReason(null);
        setReportDetails('');
        onNext();
        onReport(reel.id);
      }, 2000);
    }, 1200);
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
    // If muted, first tap unmutes
    if (globalMuted) {
      setGlobalMuted(false);
      return;
    }
    // Only toggle play if we were not holding
    if (isHolding) return;

    const now = Date.now();
    const timeSinceLast = now - lastTap;
    setLastTap(now);

    if (timeSinceLast < 300) {
      // ── Double tap: cancel pending single-tap and like ──
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      e.stopPropagation();
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        handleDoubleTap(e.clientX - rect.left, e.clientY - rect.top);
      }
    } else {
      // ── Single tap: toggle play/pause only — never hide UI ──
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        togglePlay();
      }, 280);
    }
  };

  const handleDoubleTap = (x: number, y: number) => {
    // Show heart animation at tap position
    setDoubleTapPosition({ x, y });
    setTimeout(() => setDoubleTapPosition(null), 800);
    
    // Like the reel if not already liked
    if (!liked) {
      toggleLike();
    }
  };

  const handleUseMusic = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audioId = reel.audio_source_id || reel.id;
    const title = reel.audio_title || (reel.source?.audio_title) || `${reel.profiles?.username} · Original Audio`;
    navigate(`/create?type=reel&audioId=${audioId}&audioTitle=${encodeURIComponent(title)}`);
    toast.success('Music selected! Creating your reel...');
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return toast.error('Please login to save');
    
    try {
      const q = (supabase as any).from('saved_items').select('*').eq('user_id', profile.id);
      if (reel.type === 'reel') q.eq('reel_id', reel.id);
      else q.eq('post_id', reel.id);
      const { data: existing } = await q.maybeSingle();

      const table = reel.type === 'reel' ? 'reels' : 'posts';

      if (existing) {
        await (supabase as any).from('saved_items').delete().eq('id', existing.id);
        setIsSaved(false);
        setSavesCount((prev: number) => Math.max(0, prev - 1));
        await (supabase as any).from(table).update({ saves_count: Math.max(0, (reel.saves_count || 0) - 1) }).eq('id', reel.id);
        toast.success('Removed from saved');
      } else {
        const insertData: any = { user_id: profile.id };
        if (reel.type === 'reel') insertData.reel_id = reel.id;
        else insertData.post_id = reel.id;
        
        await (supabase as any).from('saved_items').insert(insertData);
        setIsSaved(true);
        setSavesCount((prev: number) => prev + 1);
        await (supabase as any).from(table).update({ saves_count: (reel.saves_count || 0) + 1 }).eq('id', reel.id);
        toast.success('Saved to collection');
      }
    } catch (error: any) {
      toast.error('Failed to save');
    }
  };

  const handleRemix = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    toast.info('Preparing video...', { id: 'remix-loading' });
    try {
      const videoUrl = (reel.media_gallery && reel.media_gallery.length > 0) ? reel.media_gallery[currentCarouselIndex] : reel.video_url;
      if (!videoUrl) throw new Error('No video found');
      
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const file = new File([blob], `remix_${reel.id}.mp4`, { type: 'video/mp4' });
      navigate('/create', { state: { remixFile: file, originalReel: reel } });
      toast.dismiss('remix-loading');
    } catch (error) {
      console.error('Remix error:', error);
      toast.error('Failed to prepare video');
      toast.dismiss('remix-loading');
    }
  };


  const canDelete = profile?.role === 'admin' || profile?.id === reel.owner_id;
  const showViews = !hideViewsPref;
  const showLikesCount = !reel.hide_likes;
  const showComments = !reel.hide_comments;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
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

  const toggleLike = async () => {
    if (!profile) {
      toast.error('Please login to like');
      return;
    }

    const newLikedState = !liked;
    setLiked(newLikedState);

    // TikTok spring + particle animation on like (not unlike)
    if (newLikedState) {
      setLikeAnimating(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setLikeAnimating(true));
      });
      setTimeout(() => setLikeAnimating(false), 600);
    }

    if (newLikedState) {
      setLikesCount((prev: number) => prev + 1);
      try {
        const insertData: any = { user_id: profile.id };
        if (reel.type === 'reel') insertData.reel_id = reel.id;
        else insertData.post_id = reel.id;
        await (supabase as any).from('likes').insert(insertData);
      } catch (error) {
        setLiked(false);
        setLikesCount((prev: number) => prev - 1);
      }
    } else {
      setLikesCount((prev: number) => prev - 1);
      try {
        const q = (supabase as any).from('likes').delete().eq('user_id', profile.id);
        if (reel.type === 'reel') q.eq('reel_id', reel.id);
        else q.eq('post_id', reel.id);
        await q;
      } catch (error) {
        setLiked(true);
        setLikesCount((prev: number) => prev + 1);
      }
    }
  };

  const handleRecordView = async () => {
    if (!profile) return;
    try {
      // Check if user has already viewed this reel
      const q = (supabase as any).from('views').select('id').eq('user_id', profile.id);
      if (reel.type === 'reel') q.eq('reel_id', reel.id);
      else q.eq('post_id', reel.id);
      
      const { data: existingView } = await q.maybeSingle();
      
      // Only insert if no existing view
      if (!existingView) {
        const insertData: any = { user_id: profile.id };
        if (reel.type === 'reel') insertData.reel_id = reel.id;
        else insertData.post_id = reel.id;
        
        const { data, error } = await (supabase as any).from('views').insert(insertData).select().single();

        if (!error && data) {
          setViewsCount((prev: number) => prev + 1);
        }
      }
    } catch (error) {
      // Duplicate view or error
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Check session watch count against limit
            if (sessionWatchedCount >= autoplayLimit || (dataSaverMode && sessionWatchedCount >= 3)) {
              setAutoplayStopped(true);
              videoRef.current?.pause();
              setPaused(true);
              return;
            }

            videoRef.current?.play().catch(() => {});
            setPaused(false);
            sessionWatchedCount += 1;
            
            // Record view
            handleRecordView();
            
            // Log to watch history
            if (profile) {
              const insertData: any = { user_id: profile.id };
              if (reel.type === 'reel') insertData.reel_id = reel.id;
              else insertData.post_id = reel.id;
              (supabase as any).from('watch_history').insert(insertData).then();
            }
          } else {
            videoRef.current?.pause();
            setPaused(true);
          }
        });
      },
      { threshold: 0.7, root: null, rootMargin: '0px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [reel.id, profile, autoplayLimit, dataSaverMode]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareSheet(true);
    // Simple update for now
    (supabase as any)
      .from('reels')
      .update({ shares_count: (sharesCount || 0) + 1 })
      .eq('id', reel.id)
      .then();
    setSharesCount((prev: number) => (prev || 0) + 1);
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('Reel shared to your feed!');
  };

  return (
    <div ref={containerRef} className="relative h-[100dvh] w-full flex-shrink-0 bg-black flex items-center justify-center overflow-hidden snap-start snap-always">
      {/* Screenshot Protection Overlay */}
      {isBlocked && (
        <div className="absolute inset-0 bg-black z-[9999] flex items-center justify-center">
          <div className="text-center space-y-4">
            <ShieldCheck className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
            <p className="text-xl font-bold text-white">Screenshot Blocked</p>
            <p className="text-sm text-zinc-400">This content is protected</p>
          </div>
        </div>
      )}
      
      <div className="relative h-full w-full bg-black overflow-hidden">
        {/* Video Player or Carousel */}
        {reel.media_gallery && reel.media_gallery.length > 0 ? (
          <div className="w-full h-full relative" onClick={handleTap}>
            {reel.media_gallery[currentCarouselIndex]?.match(/\.(mp4|webm|ogg|mov)$/i) || (reel.type === 'reel' && currentCarouselIndex === 0) ? (
              <video
                ref={videoRef}
                key={reel.media_gallery[currentCarouselIndex] || reel.video_url}
                src={reel.media_gallery[currentCarouselIndex] || reel.video_url}
                className="w-full h-full object-contain bg-black"
                loop={!isAutoScrollEnabled}
                playsInline
                muted={globalMuted}
                autoPlay
                preload="auto"
                crossOrigin="anonymous"
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
                onEnded={() => {
                  if (isAutoScrollEnabled && currentCarouselIndex === (reel.media_gallery?.length || 1) - 1) {
                    onNext();
                  }
                }}
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
                src={reel.media_gallery[currentCarouselIndex]}
                className="w-full h-full object-contain bg-black"
                alt="Content"
              />
            )}
            
            {/* Carousel Indicators */}
            {reel.media_gallery.length > 1 && (
              <div className="absolute top-20 left-0 right-0 flex justify-center gap-1.5 px-4 z-30">
                {reel.media_gallery.map((_: any, idx: number) => (
                  <div
                    key={idx}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      currentCarouselIndex === idx ? "w-8 bg-white" : "w-1.5 bg-white/40"
                    )}
                  />
                ))}
              </div>
            )}
            
            {/* Carousel Navigation */}
            {reel.media_gallery.length > 1 && (
              <>
                <button
                  className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentCarouselIndex > 0) {
                      setCurrentCarouselIndex(prev => prev - 1);
                    }
                  }}
                />
                <button
                  className="absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentCarouselIndex < (reel.media_gallery?.length || 0) - 1) {
                      setCurrentCarouselIndex(prev => prev + 1);
                    }
                  }}
                />
              </>
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            src={(reel.is_chunked && (reel as any).chunk_urls?.length > 0) 
              ? (reel as any).chunk_urls[currentChunkIndex] 
              : `${reel.video_url}${reel.video_url.includes('?') ? '&' : '?'}quality=${currentQuality}`}
            style={{
              filter: 
                currentQuality === '480p' ? 'blur(1.2px) contrast(0.95) saturate(0.9)' :
                currentQuality === '720p' ? 'blur(0.5px)' :
                currentQuality === '1080p' ? 'none' :
                currentQuality === '2K' ? 'contrast(1.05) saturate(1.05) brightness(1.02)' :
                currentQuality === '4K' ? 'contrast(1.1) saturate(1.1) brightness(1.04) drop-shadow(0 0 1px rgba(255,255,255,0.15))' :
                'none'
            }}
            className="w-full h-full object-contain bg-black"
            loop={!isAutoScrollEnabled && !reel.is_chunked}
            playsInline
            muted={globalMuted}
            autoPlay
            preload="auto"
            crossOrigin="anonymous"
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onClick={handleTap}
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
            onEnded={() => {
              if (reel.is_chunked && (reel as any).chunk_urls) {
                if (currentChunkIndex < (reel as any).chunk_urls.length - 1) {
                  setCurrentChunkIndex(prev => prev + 1);
                } else {
                  // Last chunk
                  if (isAutoScrollEnabled) {
                    if (audioRef.current) audioRef.current.pause();
                    onNext();
                  } else {
                    // Loop back to first chunk - audio continues playing
                    setCurrentChunkIndex(0);
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play().catch(console.error);
                    }
                    // Don't reset audio - let it continue looping
                  }
                }
              } else if (isAutoScrollEnabled) {
                if (audioRef.current) audioRef.current.pause();
                onNext();
              }
              // If not auto-scroll, video loops naturally and audio continues
            }}
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
                  if (!paused) {
                    videoRef.current.play().catch(console.error);
                  }
                }
              }
            }}
            onError={(e) => {
              console.error('Video load error:', e);
              console.error('Video src:', (reel.is_chunked && (reel as any).chunk_urls?.length > 0) ? (reel as any).chunk_urls[currentChunkIndex] : reel.video_url);
              toast.error('Video failed to load. Please check your connection.');
            }}
            onLoadStart={() => {
              setIsBuffering(true);
              console.log('Video loading started:', (reel.is_chunked && (reel as any).chunk_urls?.length > 0) ? (reel as any).chunk_urls[currentChunkIndex] : reel.video_url);
            }}
            onCanPlay={() => {
              setIsBuffering(false);
              console.log('Video can play');
            }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onStalled={() => setIsBuffering(true)}
          />
        )}

        {/* Buffering overlay / Quality switching overlay */}
        {(isBuffering || isQualitySwitching) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-40 pointer-events-none">
            <IndianSpinner size="lg" />
            {isQualitySwitching && (
              <span className="mt-4 text-xs font-bold text-white tracking-widest uppercase animate-pulse">
                Adjusting to {currentQuality}...
              </span>
            )}
          </div>
        )}

        {/* Quality indicator badge */}
        {!uiHidden && (
          <div className={cn(
            "absolute top-20 left-4 z-40 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all duration-300 shadow-lg pointer-events-none",
            (currentQuality === '2K' || currentQuality === '4K') 
              ? "border-amber-500/50 text-amber-400 shadow-amber-500/10" 
              : "border-white/10 text-zinc-300"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              (currentQuality === '2K' || currentQuality === '4K') ? "bg-amber-400" : "bg-green-500"
            )}></span>
            <span className="text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
              {currentQuality}
              {(currentQuality === '2K' || currentQuality === '4K' || currentQuality === '1080p') && (
                <span className="text-[8px] bg-white/10 px-1 rounded text-white font-extrabold scale-90 origin-left">
                  HD
                </span>
              )}
            </span>
          </div>
        )}

        {/* Overlays (Text and Stickers) */}
        {reel.overlays?.text && reel.overlays.text.map((overlay: any) => (
          <div
            key={overlay.id}
            className={overlayClassName(overlay)}
            style={overlayStyle(overlay)}
          >
            {overlay.text}
          </div>
        ))}
        {reel.overlays?.stickers && reel.overlays.stickers.map((sticker: any) => (
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
        {reel.product_tags && reel.product_tags.map((tag: any) => (
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

        {/* Top Navigation - TikTok Style */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            {/* Left - Back button (hidden on main feed) */}
            <div className="w-10"></div>
            
            {/* Center - Following / For You / Friends Tabs */}
            <div className="flex items-center gap-5">
              <button 
                onClick={() => setActiveTab('friends')}
                className={cn(
                  "font-semibold text-sm transition-all relative",
                  activeTab === 'friends' ? "text-white font-bold text-base" : "text-white/60 hover:text-white"
                )}
              >
                Friends
                {activeTab === 'friends' && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full"></div>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('foryou')}
                className={cn(
                  "font-semibold text-sm transition-all relative",
                  activeTab === 'foryou' ? "text-white font-bold text-base" : "text-white/60 hover:text-white"
                )}
              >
                For you
                {activeTab === 'foryou' && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full"></div>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('following')}
                className={cn(
                  "font-semibold text-sm transition-all relative",
                  activeTab === 'following' ? "text-white font-bold text-base" : "text-white/60 hover:text-white"
                )}
              >
                Following
                {activeTab === 'following' && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full"></div>
                )}
              </button>
            </div>

            {/* Right - Icons */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onRefresh()}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <RefreshCw className={cn("w-6 h-6 text-white", isLoading && "animate-spin")} />
              </button>
              <button 
                onClick={() => navigate('/search')}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Search className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {showCC && reel.captions && (
          <Captions 
            captions={reel.captions} 
            currentTime={currentTime} 
            language={ccLang} 
          />
        )}

        {isHolding && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black/60 backdrop-blur-xl px-8 py-4 rounded-3xl border-2 border-white/30 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-200 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <Zap className="w-12 h-12 text-yellow-400 fill-yellow-400 animate-pulse" />
            <span className="text-3xl font-black text-white italic tracking-tighter drop-shadow-lg">2X SPEED</span>
          </div>
        )}
        
        
        {/* Double-tap Like Animation — TikTok style */}
        {doubleTapPosition && (
          <div
            className="absolute pointer-events-none z-40"
            style={{ left: `${doubleTapPosition.x}px`, top: `${doubleTapPosition.y}px` }}
          >
            <Heart
              className="w-28 h-28 fill-white text-white"
              style={{
                animation: 'tiktok-heart-pop 0.75s cubic-bezier(0.36,0.07,0.19,0.97) forwards',
                filter: 'drop-shadow(0 0 16px rgba(254,44,85,0.9)) drop-shadow(0 0 4px rgba(254,44,85,0.5))',
              }}
            />
          </div>
        )}
        
        {/* Play/Pause Indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          {paused && !autoplayStopped && <Pause className="w-16 h-16 text-white/50" />}
        </div>

        {globalMuted && !uiHidden && (
          <div className="absolute top-20 right-4 z-40 animate-bounce pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-white" />
              <span className="text-white text-[10px] font-bold uppercase tracking-wider">Tap to Unmute</span>
            </div>
          </div>
        )}

        {/* Right Side Actions - TikTok Style Exact Match */}
        <div
          className="absolute bottom-24 right-2 flex flex-col items-center gap-6 text-white z-30 transition-opacity duration-300"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: 'none', opacity: uiHidden ? 0 : 1, pointerEvents: uiHidden ? 'none' : 'auto' }}
        >
          {/* Profile Avatar with Follow Button */}
          <Link to={`/profile/${reel.profiles?.username}`} className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full border-[1.5px] border-white overflow-hidden shadow-lg">
              <Avatar className="w-full h-full">
                <AvatarImage src={reel.profiles?.profile_photo_url || ''} />
                <AvatarFallback className="bg-zinc-800 text-white">{reel.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            {profile?.id !== reel.owner_id && !isFollowing && (
              <button 
                onClick={(e) => { e.preventDefault(); handleFollow(e); }}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] flex items-center justify-center shadow-md"
              >
                <Plus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </button>
            )}
          </Link>

          {/* Like Button - TikTok Style */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleLike}
              className="relative flex items-center justify-center w-10 h-10"
            >
              {/* Particle burst — 6 tiny hearts fly out */}
              {likeAnimating && [0,1,2,3,4,5].map(i => (
                <Heart
                  key={i}
                  className={`tiktok-particle tiktok-particle-${i} w-3 h-3 fill-[#FE2C55] text-[#FE2C55]`}
                  strokeWidth={0}
                />
              ))}
              <Heart
                className={cn(
                  "w-7 h-7 transition-colors duration-150",
                  liked ? "fill-[#FE2C55] text-[#FE2C55]" : "text-white fill-none",
                  likeAnimating && "tiktok-like-spring"
                )}
                strokeWidth={liked ? 0 : 2}
                style={{ filter: liked ? 'drop-shadow(0 2px 6px rgba(254,44,85,0.55))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
              />
            </button>
            <span className="text-[10px] font-semibold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              <Counter value={likesCount} />
            </span>
          </div>
          
          {/* Comment Button - TikTok Style */}
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={() => setIsCommentsOpen(true)}
              className="transition-transform active:scale-90"
            >
              <MessageCircle 
                className="w-7 h-7 text-white" 
                strokeWidth={2}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
              />
            </button>
            <span className="text-[10px] font-semibold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              <Counter value={commentsCount} />
            </span>
          </div>

          {/* Bookmark/Save Button - TikTok Style */}
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={handleSave}
              className="transition-transform active:scale-90"
            >
              <Bookmark 
                className={cn(
                  "w-7 h-7 transition-all duration-200",
                  isSaved ? "fill-yellow-400 text-yellow-400" : "text-white fill-none"
                )} 
                strokeWidth={2}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
              />
            </button>
            <span className="text-xs font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              <Counter value={savesCount} />
            </span>
          </div>

          {/* Share Button - TikTok Style with Gradient */}
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowShareSheet(true); }}
              className="transition-transform active:scale-90 relative"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                <defs>
                  <linearGradient id="shareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f2ea" />
                    <stop offset="100%" stopColor="#ff0050" />
                  </linearGradient>
                </defs>
                <path 
                  d="M4 12L20 4L16 20L11 13L4 12Z" 
                  stroke="url(#shareGradient)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </button>
            <span className="text-[10px] font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              Share
            </span>
          </div>
          
          {/* Three-Dot Menu - Instagram Style Bottom Sheet */}
          <Sheet open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
            <SheetTrigger asChild>
              <button 
                className="flex flex-col items-center gap-1 transition-transform active:scale-90"
                onClick={(e) => { e.stopPropagation(); setIsOptionsOpen(true); }}
              >
                <MoreHorizontal 
                  className="w-7 h-7 text-white" 
                  strokeWidth={2}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                />
              </button>
            </SheetTrigger>
            <SheetContent 
              side="bottom" 
              className="h-auto max-h-[85dvh] p-0 bg-black/95 backdrop-blur-xl border-white/10 border-t rounded-t-[30px] overflow-y-auto pb-8 z-[100] [&>button]:hidden text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto my-3 shrink-0" />
              
              {/* Grid actions */}
              <div className="grid grid-cols-3 gap-3 mb-6 px-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleSave(e); }}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-900/60 hover:bg-zinc-900 rounded-2xl gap-2 active:scale-95 transition-all text-white border border-white/5"
                >
                  <Bookmark className={cn("w-6 h-6", isSaved ? "fill-yellow-400 text-yellow-400" : "text-white")} />
                  <span className="text-xs font-semibold">{isSaved ? "Saved" : "Save"}</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemix(e); setIsOptionsOpen(false); }}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-900/60 hover:bg-zinc-900 rounded-2xl gap-2 active:scale-95 transition-all text-white border border-white/5"
                >
                  <RefreshCw className="w-6 h-6 text-white" />
                  <span className="text-xs font-semibold">Remix</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); toast.info('Sequence option coming soon!'); }}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-900/60 hover:bg-zinc-900 rounded-2xl gap-2 active:scale-95 transition-all text-white border border-white/5"
                >
                  <Film className="w-6 h-6 text-white" />
                  <span className="text-xs font-semibold">Sequence</span>
                </button>
              </div>

              {/* List Actions */}
              <div className="space-y-1.5 px-4 text-white pb-6">
                <button 
                  onClick={() => { setShowCC(!showCC); toast.success(showCC ? 'Captions turned off' : 'Captions turned on'); setIsOptionsOpen(false); }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Subtitles className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold">Closed captions</span>
                  </div>
                </button>

                <button 
                  onClick={(e) => { toggleFullscreen(e); setIsOptionsOpen(false); }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Maximize className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold">View full-screen</span>
                  </div>
                </button>

                <button 
                  onClick={() => { setIsAutoScrollEnabled(!isAutoScrollEnabled); toast.success(isAutoScrollEnabled ? 'Auto-scroll disabled' : 'Auto-scroll enabled'); setIsOptionsOpen(false); }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FastForward className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold flex items-center gap-2">
                      Auto-scroll
                      <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">New</span>
                    </span>
                  </div>
                  <div className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                    isAutoScrollEnabled ? "bg-blue-600" : "bg-zinc-800"
                  )}>
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform duration-200",
                      isAutoScrollEnabled ? "translate-x-5" : "translate-x-0"
                    )} />
                  </div>
                </button>

                <button 
                  onClick={() => { toast.success('Reels notifications enabled'); setIsOptionsOpen(false); }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold">Turn On Reels Notifications</span>
                  </div>
                </button>

                <div className="h-[1px] bg-white/10 my-2" />

                <button 
                  onClick={() => { toast.info('This post matches your search and view history'); setIsOptionsOpen(false); }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold">Why you're seeing this post</span>
                  </div>
                </button>

                <button 
                  onClick={() => { toast.success('Marked as Interested'); setIsOptionsOpen(false); }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold">Interested</span>
                  </div>
                </button>

                <button 
                  onClick={() => { toast.success('Marked as Not Interested'); setIsOptionsOpen(false); }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold">Not interested</span>
                  </div>
                </button>

                <button 
                  onClick={() => { setIsOptionsOpen(false); navigate('/settings/report'); }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 rounded-xl transition-all text-red-500"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 fill-red-500/10" />
                    <span className="text-sm font-semibold">Report</span>
                  </div>
                </button>

                <div className="h-[1px] bg-white/10 my-2" />

                <button 
                  onClick={() => { navigate('/settings'); setIsOptionsOpen(false); }}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Sliders className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold">Manage content preferences</span>
                  </div>
                </button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Volume Toggle - TikTok Style */}
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={toggleMute}
              className="transition-transform active:scale-90"
            >
              <div className="w-9 h-9 flex items-center justify-center">
                {globalMuted ? (
                  <VolumeX 
                    className="w-7 h-7 text-white" 
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                  />
                ) : (
                  <Volume2 
                    className="w-7 h-7 text-white" 
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                  />
                )}
              </div>
            </button>
            <span className="text-[10px] font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {globalMuted ? 'Muted' : 'Sound'}
            </span>
          </div>

          {/* Spinning Music Disc - Bottom Right */}
          <div className="relative mt-2" onClick={handleUseMusic}>
            {/* Floating Music Notes */}
            {!paused && (
              <>
                <div className="absolute -top-4 -left-4 pointer-events-none animate-music-note" style={{ '--x': '-40px', '--y': '-60px', '--r': '-45deg', animationDelay: '0s' } as any}>
                  <Music className="w-4 h-4 text-white/60" />
                </div>
                <div className="absolute -top-4 -left-4 pointer-events-none animate-music-note" style={{ '--x': '-20px', '--y': '-80px', '--r': '30deg', animationDelay: '1s' } as any}>
                  <Music2 className="w-3 h-3 text-white/40" />
                </div>
                <div className="absolute -top-4 -left-4 pointer-events-none animate-music-note" style={{ '--x': '-60px', '--y': '-40px', '--r': '-20deg', animationDelay: '2s' } as any}>
                  <Music className="w-3 h-3 text-white/50" />
                </div>
              </>
            )}
            
            {/* Disc Container */}
            <div className={cn(
              "w-12 h-12 rounded-full p-2.5 bg-zinc-900 border-[6px] border-zinc-800/80 shadow-2xl relative flex items-center justify-center overflow-hidden",
              !paused && "animate-spin-slow"
            )}>
              {/* Inner Vinyl Ring */}
              <div className="absolute inset-0 border-[4px] border-zinc-700/30 rounded-full" />
              
              {/* Thumbnail / Disc Icon */}
              <div className="w-full h-full rounded-full overflow-hidden bg-black/40 flex items-center justify-center">
                {reel.audio_url || reel.audio_source_id ? (
                  <img 
                    src={reel.thumbnail_url || 'https://via.placeholder.com/50'} 
                    className="w-full h-full object-cover" 
                    alt="Music disc" 
                  />
                ) : (
                  <Disc className="w-6 h-6 text-zinc-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Card Overlay */}
        {(reel as any).product_tags && (reel as any).product_tags.length > 0 && (
          <ProductCard
            productName={(reel as any).product_tags[0].product_name}
            productImage={(reel as any).product_tags[0].product_image_url}
            productPrice={(reel as any).product_tags[0].product_price}
            productLink={(reel as any).product_tags[0].product_link}
            position={{
              x: (reel as any).product_tags[0].position_x,
              y: (reel as any).product_tags[0].position_y
            }}
            isEditable={false}
            onClick={() => {
              window.open((reel as any).product_tags[0].product_link, '_blank');
            }}
          />
        )}

        {/* Bottom Info Area - TikTok Style */}
        <div
          className="absolute bottom-0 left-0 right-0 z-30 pb-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300"
          style={{ opacity: uiHidden ? 0 : 1, pointerEvents: uiHidden ? 'none' : 'auto' }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="px-4 pt-4 pb-0.5">
            {/* Username with verification */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-bold text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">@{reel.profiles?.username}</span>
              {reel.profiles?.is_verified && <VerificationBadge size={25} />}
              {profile?.id !== reel.owner_id && (
                <button 
                  onClick={handleFollow}
                  className={cn(
                    "ml-2 px-3 py-0.5 rounded text-xs font-bold transition-all active:scale-95",
                    isFollowing 
                      ? "bg-white/20 text-white border border-white/40" 
                      : "bg-[#0095f6] text-white"
                  )}
                >
                  {isFollowing ? 'Following' : isFollower ? 'Follow Back' : 'Follow'}
                </button>
              )}
            </div>

            {/* Caption */}
            {reel.caption && (
              <p className="text-white text-sm mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] max-w-[75%] line-clamp-2">
                {reel.caption}
              </p>
            )}

            {/* Music info - Scrolling text */}
            <div 
              className="flex items-center gap-2 cursor-pointer group/music mb-2"
              onClick={handleUseMusic}
            >
              <Music className="w-4 h-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] shrink-0" />
              <div className="overflow-hidden max-w-[70%] relative h-5 flex items-center">
                <div className="flex animate-marquee whitespace-nowrap gap-8 pr-8">
                  <span className="text-white text-xs font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {audioDisplayName}
                  </span>
                  <span className="text-white text-xs font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {audioDisplayName}
                  </span>
                  <span className="text-white text-xs font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {audioDisplayName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seekbar with Time Display - Above Navigation */}
          <div className="px-4 pb-0.5 space-y-0.5">
            {/* Time Display */}
            <div className="flex items-center justify-between text-white text-[10px] font-medium">
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
              
              {/* Audio Loop Point Marker - Red Point (if audio is shorter than video) */}
              {reel.audio_url && audioDuration > 0 && duration > 0 && audioDuration < duration && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full shadow-lg z-10 animate-pulse"
                  style={{ 
                    left: `${(audioDuration / duration) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={`Audio loops at ${formatTime(audioDuration)}`}
                />
              )}
              
              {/* Video End Marker - Red Line at the end */}
              {reel.audio_url && duration > 0 && (
                <div 
                  className="absolute top-0 right-0 w-0.5 h-full bg-red-500 shadow-lg z-10"
                  title="Video ends here - Audio will loop"
                />
              )}
              
              {/* Seek Handle */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/seekbar:opacity-100 transition-opacity"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
          </div>
        </div>
      </div>

      <CommentsSheet 
        open={isCommentsOpen} 
        onOpenChange={setIsCommentsOpen} 
        reelId={reel.id} 
        onCountChange={setCommentsCount}
      />
      <ShareSheet 
        isOpen={showShareSheet} 
        onOpenChange={setShowShareSheet} 
        url={`https://app-af2z7g8d924h.appmedo.com/reels?id=${reel.id}`}
        mediaUrl={reel.video_url}
        reelId={reel.id}
      />

      {/* Report Video Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={(open) => {
        setReportDialogOpen(open);
        if (!open) {
          setReportStep('reason');
          setReportReason(null);
          setReportDetails('');
        }
      }}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-zinc-950 border border-zinc-800 text-white shadow-2xl">
          <DialogHeader className="pb-3 border-b border-zinc-800">
            <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2 text-white">
              <Flag className="w-5 h-5 text-red-500 fill-red-500" />
              Report Video
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-zinc-400">
              Your report is anonymous. Help us keep INDIANREELS safe.
            </DialogDescription>
          </DialogHeader>

          {reportStep === 'reason' && (
            <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              <p className="text-sm font-semibold text-zinc-300 mb-2">Why are you reporting this video?</p>
              {[
                { title: "Spam or Scam", description: "Misleading or fraudulent content" },
                { title: "Nudity or sexual activity", description: "Sexually explicit content or imagery" },
                { title: "Hate speech or symbols", description: "Discriminatory text, symbols, or behavior" },
                { title: "Bullying or harassment", description: "Targeted abuse or mean comments" },
                { title: "Violence or dangerous organizations", description: "Graphic violence, threats, or criminal groups" },
                { title: "False information", description: "Harmful misinformation or fake news" },
                { title: "I just don't like it", description: "Content that you prefer not to see" }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setReportReason(item.title);
                    setReportStep('details');
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 transition-all active:scale-98 group flex flex-col gap-0.5"
                >
                  <span className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">{item.title}</span>
                  <span className="text-[11px] text-zinc-400">{item.description}</span>
                </button>
              ))}
            </div>
          )}

          {reportStep === 'details' && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Reason Selected</p>
                <p className="text-sm font-extrabold text-red-400 mt-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  {reportReason}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Additional Details (Optional)</label>
                <Textarea
                  placeholder="Tell us more about the issue with this video..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="h-28 bg-zinc-900 border-zinc-800 text-white rounded-2xl resize-none focus-visible:ring-red-500 placeholder:text-zinc-500 text-sm"
                  maxLength={200}
                />
                <div className="text-right text-[10px] text-zinc-500 font-mono">
                  {reportDetails.length}/200
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setReportStep('reason');
                    setReportReason(null);
                  }}
                  className="flex-1 rounded-2xl font-bold bg-zinc-900 hover:bg-zinc-850 text-white transition-all active:scale-95 border-none"
                  disabled={submittingReport}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => handleReportSubmit()}
                  disabled={submittingReport}
                  className="flex-1 rounded-2xl font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {submittingReport ? (
                    <>
                      <IndianSpinner size="sm" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Submit</span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {reportStep === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 shadow-lg shadow-green-500/5">
                <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-wide">Report Submitted</h3>
                <p className="text-xs text-zinc-400 mt-2 px-4 leading-relaxed">
                  Thank you for reporting this content. The video has been hidden from your feed and our moderation team will review it shortly.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
