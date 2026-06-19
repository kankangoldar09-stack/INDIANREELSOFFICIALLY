import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, Bookmark, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import IndianReelsLayout from '@/components/layouts/IndianReelsLayout';

const TEAL = '#00BFA5';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

interface Reel {
  id: string;
  video_url: string;
  caption: string;
  owner_id: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  author: { username: string; full_name: string | null; profile_photo_url: string | null };
}

export default function IRReels() {
  const { profile: me } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => { loadReels(); }, []);

  const loadReels = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('reels')
      .select('id, video_url, caption, owner_id, profiles!owner_id(username, full_name, profile_photo_url)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      const enriched: Reel[] = await Promise.all(data.map(async (r: any) => {
        const [lk, cm, sv, ld] = await Promise.all([
          (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('reel_id', r.id),
          (supabase as any).from('comments').select('id', { count: 'exact', head: true }).eq('reel_id', r.id),
          me ? (supabase as any).from('saved_posts').select('id', { count: 'exact', head: true }).eq('reel_id', r.id).eq('user_id', me.id) : { count: 0 },
          me ? (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('reel_id', r.id).eq('user_id', me.id) : { count: 0 },
        ]);
        return {
          id: r.id, video_url: r.video_url, caption: r.caption || '',
          owner_id: r.owner_id,
          likes: lk.count || 0, comments: cm.count || 0,
          liked: (ld.count || 0) > 0, saved: (sv.count || 0) > 0,
          author: r.profiles || { username: 'user', full_name: null, profile_photo_url: null },
        };
      }));
      setReels(enriched);
    }
    setLoading(false);
  };

  // Intersection observer to auto-play visible reel
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          const video = videoRefs.current[idx];
          if (entry.isIntersecting) {
            setActiveIdx(idx);
            video?.play().catch(() => {});
          } else {
            video?.pause();
          }
        });
      },
      { threshold: 0.6 }
    );
    containerRef.current.querySelectorAll('[data-idx]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels]);

  const toggleLike = async (reelId: string) => {
    if (!me) return;
    setReels(prev => prev.map(r => r.id === reelId
      ? { ...r, liked: !r.liked, likes: r.liked ? Math.max(0, r.likes - 1) : r.likes + 1 } : r));
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    if (reel.liked) await (supabase as any).from('likes').delete().eq('reel_id', reelId).eq('user_id', me.id);
    else await (supabase as any).from('likes').insert({ reel_id: reelId, user_id: me.id });
  };

  if (loading) {
    return (
      <IndianReelsLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${TEAL} transparent transparent transparent` }} />
        </div>
      </IndianReelsLayout>
    );
  }

  if (reels.length === 0) {
    return (
      <IndianReelsLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `${TEAL}20` }}>
            <Play className="w-9 h-9" style={{ color: TEAL }} />
          </div>
          <p className="text-zinc-400 text-sm">Koi reel nahi mila</p>
        </div>
      </IndianReelsLayout>
    );
  }

  return (
    <IndianReelsLayout>
      <div ref={containerRef} className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {reels.map((reel, idx) => (
          <div
            key={reel.id}
            data-idx={idx}
            className="relative w-full snap-start snap-always bg-black flex items-center justify-center"
            style={{ height: 'calc(100dvh - 130px)' }}
          >
            {/* Video */}
            <video
              ref={el => { videoRefs.current[idx] = el; }}
              src={reel.video_url}
              className="w-full h-full object-cover"
              loop
              playsInline
              muted={muted}
              onClick={() => {
                const v = videoRefs.current[idx];
                if (!v) return;
                if (v.paused) v.play().catch(() => {}); else v.pause();
              }}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%, transparent 80%, rgba(0,0,0,0.2) 100%)' }} />

            {/* Mute button */}
            <button
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm z-10"
              onClick={() => setMuted(m => !m)}
            >
              {muted
                ? <VolumeX className="w-4 h-4 text-white" />
                : <Volume2 className="w-4 h-4 text-white" />
              }
            </button>

            {/* Right actions */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
              <button onClick={() => toggleLike(reel.id)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                <Heart className="w-7 h-7 transition-all drop-shadow"
                  style={{ color: reel.liked ? '#FF3B5C' : 'white', fill: reel.liked ? '#FF3B5C' : 'none' }} />
                <span className="text-white text-[11px] font-semibold drop-shadow">{fmt(reel.likes)}</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <MessageCircle className="w-7 h-7 text-white drop-shadow" />
                <span className="text-white text-[11px] font-semibold drop-shadow">{fmt(reel.comments)}</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <Send className="w-7 h-7 text-white drop-shadow" />
                <span className="text-white text-[11px] font-semibold drop-shadow">Share</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <Bookmark className="w-7 h-7 text-white drop-shadow" />
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute left-3 bottom-6 right-16 z-10">
              <button className="flex items-center gap-2 mb-2" onClick={() => navigate(`/profile/${reel.author.username}`)}>
                <Avatar className="w-9 h-9 ring-2 ring-white/70">
                  <AvatarImage src={reel.author.profile_photo_url || ''} className="object-cover" />
                  <AvatarFallback style={{ background: TEAL, color: 'white' }} className="text-xs font-bold">
                    {reel.author.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white text-[14px] font-bold drop-shadow">@{reel.author.username}</span>
              </button>
              {reel.caption && (
                <p className="text-white text-[13px] leading-snug drop-shadow line-clamp-2">
                  {reel.caption}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </IndianReelsLayout>
  );
}
