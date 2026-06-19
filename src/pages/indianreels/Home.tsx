import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play, Image, Video, Smile, Home } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import IndianReelsLayout from '@/components/layouts/IndianReelsLayout';

const TEAL = '#00BFA5';
const TEAL_DARK = '#00897B';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface FeedItem {
  id: string;
  owner_id: string;
  media_url: string | null;
  caption: string;
  created_at: string;
  is_video: boolean;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  author: { username: string; full_name: string | null; profile_photo_url: string | null };
}

export default function IRHome() {
  const { profile: me } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<{ id: string; username: string; photo: string | null }[]>([]);

  useEffect(() => { loadFeed(); }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const { data: postsData } = await (supabase as any)
        .from('posts')
        .select('id, owner_id, media_url, caption, created_at, profiles!owner_id(username, full_name, profile_photo_url)')
        .order('created_at', { ascending: false })
        .limit(15);

      if (postsData) {
        const enriched: FeedItem[] = await Promise.all(postsData.map(async (p: any) => {
          const [lk, cm, sv, ld] = await Promise.all([
            (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('post_id', p.id),
            (supabase as any).from('comments').select('id', { count: 'exact', head: true }).eq('post_id', p.id),
            me ? (supabase as any).from('saved_posts').select('id', { count: 'exact', head: true }).eq('post_id', p.id).eq('user_id', me.id) : { count: 0 },
            me ? (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('post_id', p.id).eq('user_id', me.id) : { count: 0 },
          ]);
          return {
            id: p.id, owner_id: p.owner_id, media_url: p.media_url,
            caption: p.caption || '', created_at: p.created_at,
            is_video: !!/\.(mp4|mov|webm|mkv|3gp)/i.exec(p.media_url || ''),
            likes: lk.count || 0, comments: cm.count || 0,
            liked: (ld.count || 0) > 0, saved: (sv.count || 0) > 0,
            author: p.profiles || { username: 'user', full_name: null, profile_photo_url: null },
          };
        }));
        setFeed(enriched);
      }

      // Stories
      const { data: sd } = await (supabase as any)
        .from('stories')
        .select('profiles!user_id(id, username, profile_photo_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      if (sd) {
        const seen = new Set<string>();
        const uniq: any[] = [];
        sd.forEach((s: any) => { const p = s.profiles; if (p && !seen.has(p.id)) { seen.add(p.id); uniq.push(p); } });
        setStories(uniq.slice(0, 8).map((p: any) => ({ id: p.id, username: p.username, photo: p.profile_photo_url })));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const toggleLike = async (postId: string) => {
    if (!me) return;
    setFeed(prev => prev.map(p => p.id === postId
      ? { ...p, liked: !p.liked, likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1 }
      : p));
    const post = feed.find(p => p.id === postId);
    if (!post) return;
    if (post.liked) await (supabase as any).from('likes').delete().eq('post_id', postId).eq('user_id', me.id);
    else await (supabase as any).from('likes').insert({ post_id: postId, user_id: me.id });
  };

  const toggleSave = async (postId: string) => {
    if (!me) return;
    setFeed(prev => prev.map(p => p.id === postId ? { ...p, saved: !p.saved } : p));
    const post = feed.find(p => p.id === postId);
    if (!post) return;
    if (post.saved) await (supabase as any).from('saved_posts').delete().eq('post_id', postId).eq('user_id', me.id);
    else await (supabase as any).from('saved_posts').insert({ post_id: postId, user_id: me.id });
  };

  return (
    <IndianReelsLayout>
      <div className="bg-[#f0f2f5] min-h-full pb-4">

        {/* Create post box */}
        <div className="bg-white mx-0 mb-2 px-4 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={me?.profile_photo_url || ''} className="object-cover" />
              <AvatarFallback style={{ background: TEAL, color: 'white' }} className="text-sm font-bold">
                {(me?.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => navigate('/create')}
              className="flex-1 h-10 rounded-full bg-zinc-100 text-left px-4 text-zinc-400 text-sm active:scale-95 transition-transform"
            >
              Kya soch rahe ho?
            </button>
          </div>
          <div className="flex mt-3 pt-2 border-t border-zinc-100 gap-1">
            {[
              { icon: Video, label: 'Live', color: '#EF4444' },
              { icon: Image, label: 'Photo', color: '#22C55E' },
              { icon: Smile, label: 'Feeling', color: '#F59E0B' },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={() => navigate('/create')}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-zinc-50 active:scale-95 transition-transform"
              >
                <btn.icon className="w-4 h-4" style={{ color: btn.color }} />
                <span className="text-[12px] text-zinc-500 font-medium">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stories — view only, no add option */}
        {stories.length > 0 && (
        <div className="bg-white mb-2 px-4 py-3">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center shrink-0 gap-1">
                  <Skeleton className="w-[60px] h-[60px] rounded-2xl bg-zinc-100" />
                  <Skeleton className="w-10 h-2.5 rounded bg-zinc-100" />
                </div>
              ))
              : stories.map(s => (
                <div key={s.id} className="flex flex-col items-center shrink-0 gap-1 cursor-pointer"
                  onClick={() => navigate(`/stories/${s.id}`)}>
                  <div className="w-[60px] h-[60px] rounded-2xl overflow-hidden border-2" style={{ borderColor: TEAL }}>
                    <Avatar className="w-full h-full rounded-none">
                      <AvatarImage src={s.photo || ''} className="object-cover w-full h-full" />
                      <AvatarFallback style={{ background: TEAL, color: 'white' }} className="text-sm font-bold rounded-none">
                        {s.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium w-14 text-center truncate">{s.username}</span>
                </div>
              ))
            }
          </div>
        </div>
        )}

        {/* Feed */}
        <div className="space-y-2">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full bg-zinc-100" />
                  <div className="space-y-1.5"><Skeleton className="w-28 h-3 rounded bg-zinc-100" /><Skeleton className="w-16 h-2.5 rounded bg-zinc-100" /></div>
                </div>
                <Skeleton className="w-full rounded-xl bg-zinc-100" style={{ height: 220 }} />
              </div>
            ))
            : feed.length === 0
              ? (
                <div className="bg-white rounded-2xl mx-3 p-10 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${TEAL}20` }}>
                    <Home className="w-8 h-8" style={{ color: TEAL }} />
                  </div>
                  <p className="text-zinc-400 text-sm text-center">Feed abhi empty hai. Kuch post karo!</p>
                </div>
              )
              : feed.map(post => (
                <div key={post.id} className="bg-white">
                  {/* post header */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 cursor-pointer"
                        onClick={() => navigate(`/profile/${post.author.username}`)}>
                        <AvatarImage src={post.author.profile_photo_url || ''} className="object-cover" />
                        <AvatarFallback style={{ background: TEAL, color: 'white' }} className="text-sm font-bold">
                          {(post.author.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[14px] font-semibold text-zinc-800 leading-tight">
                          {post.author.full_name || post.author.username}
                        </p>
                        <p className="text-[11px] text-zinc-400">{timeAgo(post.created_at)} · 🌍</p>
                      </div>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-zinc-400" />
                  </div>

                  {/* caption */}
                  {post.caption && (
                    <p className="px-4 pb-2 text-[14px] text-zinc-700 leading-snug">
                      {post.caption.split(/(#\w+)/g).map((part, i) =>
                        part.startsWith('#')
                          ? <span key={i} className="font-semibold" style={{ color: TEAL_DARK }}>{part}</span>
                          : part
                      )}
                    </p>
                  )}

                  {/* media */}
                  {post.media_url && (
                    <div className="relative w-full bg-zinc-100">
                      {post.is_video
                        ? (
                          <div className="relative">
                            <video src={post.media_url} className="w-full object-cover max-h-[360px]" muted playsInline preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                <Play className="w-6 h-6 text-white fill-white ml-1" />
                              </div>
                            </div>
                          </div>
                        )
                        : <img src={post.media_url} alt="" className="w-full object-cover max-h-[360px]" />
                      }
                    </div>
                  )}

                  {/* like/comment counts */}
                  {(post.likes > 0 || post.comments > 0) && (
                    <div className="flex items-center justify-between px-4 py-2 text-[12px] text-zinc-400 border-b border-zinc-100">
                      <span>{post.likes > 0 ? `${fmt(post.likes)} likes` : ''}</span>
                      <span>{post.comments > 0 ? `${fmt(post.comments)} comments` : ''}</span>
                    </div>
                  )}

                  {/* action row */}
                  <div className="flex items-center justify-around px-2 py-1">
                    <button onClick={() => toggleLike(post.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-zinc-50 active:scale-95 transition-transform">
                      <Heart className="w-5 h-5 transition-all"
                        style={{ color: post.liked ? '#FF3B5C' : '#9CA3AF', fill: post.liked ? '#FF3B5C' : 'none' }} />
                      <span className="text-[13px] font-medium" style={{ color: post.liked ? '#FF3B5C' : '#6B7280' }}>Like</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-zinc-50">
                      <MessageCircle className="w-5 h-5 text-zinc-400" />
                      <span className="text-[13px] font-medium text-zinc-500">Comment</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-zinc-50">
                      <Send className="w-5 h-5 text-zinc-400" />
                      <span className="text-[13px] font-medium text-zinc-500">Share</span>
                    </button>
                    <button onClick={() => toggleSave(post.id)}
                      className="flex items-center justify-center p-2 rounded-lg hover:bg-zinc-50 active:scale-95 transition-transform">
                      <Bookmark className="w-5 h-5 transition-all"
                        style={{ color: post.saved ? TEAL_DARK : '#9CA3AF', fill: post.saved ? TEAL_DARK : 'none' }} />
                    </button>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </IndianReelsLayout>
  );
}
