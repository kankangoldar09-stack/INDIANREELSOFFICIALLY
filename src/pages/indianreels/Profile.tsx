import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Heart, MoreHorizontal, MessageCircle, Send, Bookmark } from 'lucide-react';
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
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function IRProfile() {
  const { profile: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [counts, setCounts] = useState({ posts: 0, followers: 0, following: 0, views: 0, videos: 0, likes: 0 });
  const [posts, setPosts] = useState<any[]>([]);
  const [reelsGrid, setReelsGrid] = useState<any[]>([]);
  const [tab, setTab] = useState<'posts' | 'reels'>('posts');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => { loadAll(); }, [me]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: pd } = await (supabase as any)
        .from('profiles').select('id, username, full_name, bio, profile_photo_url, is_verified')
        .eq('username', 'INDIANREELS_OFFICIALLY').maybeSingle();

      if (!pd) { setLoading(false); return; }
      setProfile(pd);

      const [pr, fr, fg, isf, vc, vwPost, vwReel, lkPost, lkReel] = await Promise.all([
        (supabase as any).from('posts').select('id', { count: 'exact', head: true }).eq('owner_id', pd.id),
        (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('following_id', pd.id),
        (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', pd.id),
        me ? (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', me.id).eq('following_id', pd.id) : { count: 0 },
        // total reels (videos)
        (supabase as any).from('reels').select('id', { count: 'exact', head: true }).eq('owner_id', pd.id),
        // total views on posts
        (supabase as any).from('watch_history').select('id', { count: 'exact', head: true })
          .in('post_id', (await (supabase as any).from('posts').select('id').eq('owner_id', pd.id).then((r: any) => (r.data || []).map((x: any) => x.id))),),
        // total views on reels
        (supabase as any).from('watch_history').select('id', { count: 'exact', head: true })
          .in('reel_id', (await (supabase as any).from('reels').select('id').eq('owner_id', pd.id).then((r: any) => (r.data || []).map((x: any) => x.id))),),
        // total likes on posts
        (supabase as any).from('likes').select('id', { count: 'exact', head: true })
          .in('post_id', (await (supabase as any).from('posts').select('id').eq('owner_id', pd.id).then((r: any) => (r.data || []).map((x: any) => x.id))),),
        // total likes on reels
        (supabase as any).from('likes').select('id', { count: 'exact', head: true })
          .in('reel_id', (await (supabase as any).from('reels').select('id').eq('owner_id', pd.id).then((r: any) => (r.data || []).map((x: any) => x.id))),),
      ]);
      setCounts({
        posts: pr.count || 0,
        followers: fr.count || 0,
        following: fg.count || 0,
        videos: vc.count || 0,
        views: (vwPost.count || 0) + (vwReel.count || 0),
        likes: (lkPost.count || 0) + (lkReel.count || 0),
      });
      setFollowing((isf.count || 0) > 0);

      const { data: postsData } = await (supabase as any)
        .from('posts').select('id, owner_id, media_url, caption, created_at, profiles!owner_id(username, full_name, profile_photo_url)')
        .eq('owner_id', pd.id).order('created_at', { ascending: false }).limit(10);

      if (postsData) {
        const enriched = await Promise.all(postsData.map(async (p: any) => {
          const [lk, cm, sv, ld] = await Promise.all([
            (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('post_id', p.id),
            (supabase as any).from('comments').select('id', { count: 'exact', head: true }).eq('post_id', p.id),
            me ? (supabase as any).from('saved_posts').select('id', { count: 'exact', head: true }).eq('post_id', p.id).eq('user_id', me.id) : { count: 0 },
            me ? (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('post_id', p.id).eq('user_id', me.id) : { count: 0 },
          ]);
          return {
            id: p.id, media_url: p.media_url, caption: p.caption || '', created_at: p.created_at,
            is_video: !!/\.(mp4|mov|webm|mkv|3gp)/i.exec(p.media_url || ''),
            likes: lk.count || 0, comments: cm.count || 0,
            liked: (ld.count || 0) > 0, saved: (sv.count || 0) > 0,
            author: p.profiles || pd,
          };
        }));
        setPosts(enriched);
      }

      const { data: rd } = await (supabase as any)
        .from('reels').select('id, video_url').eq('owner_id', pd.id)
        .order('created_at', { ascending: false }).limit(6);
      if (rd) {
        const rg = await Promise.all(rd.map(async (r: any) => {
          const { count } = await (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('reel_id', r.id);
          return { id: r.id, thumb: r.video_url, likes: count || 0 };
        }));
        setReelsGrid(rg);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!me || !profile) return;
    if (following) {
      await (supabase as any).from('follows').delete().eq('follower_id', me.id).eq('following_id', profile.id);
      setCounts(c => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      setFollowing(false);
    } else {
      await (supabase as any).from('follows').insert({ follower_id: me.id, following_id: profile.id });
      setCounts(c => ({ ...c, followers: c.followers + 1 }));
      setFollowing(true);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!me) return;
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked: !p.liked, likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1 } : p));
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.liked) await (supabase as any).from('likes').delete().eq('post_id', postId).eq('user_id', me.id);
    else await (supabase as any).from('likes').insert({ post_id: postId, user_id: me.id });
  };

  const toggleSave = async (postId: string) => {
    if (!me) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: !p.saved } : p));
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.saved) await (supabase as any).from('saved_posts').delete().eq('post_id', postId).eq('user_id', me.id);
    else await (supabase as any).from('saved_posts').insert({ post_id: postId, user_id: me.id });
  };

  return (
    <IndianReelsLayout>
      <div className="bg-[#f0f2f5] min-h-full">
        {/* Profile card */}
        <div
          className="flex flex-col items-center pb-6 px-4 pt-6"
          style={{ background: `linear-gradient(160deg, #00D4B8 0%, ${TEAL} 50%, ${TEAL_DARK} 100%)` }}
        >
          {loading ? <Skeleton className="w-20 h-20 rounded-full bg-white/20 mb-3" /> : (
            <div className="relative mb-3">
              <Avatar className="w-20 h-20 ring-4 ring-white/50 shadow-xl">
                <AvatarImage src={profile?.profile_photo_url || ''} className="object-cover" />
                <AvatarFallback className="text-2xl font-black" style={{ background: TEAL_DARK, color: 'white' }}>IR</AvatarFallback>
              </Avatar>
              {profile?.is_verified && (
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow text-xs">✅</span>
              )}
            </div>
          )}

          {loading
            ? <div className="flex flex-col items-center gap-2"><Skeleton className="w-32 h-5 rounded bg-white/20" /><Skeleton className="w-24 h-3 rounded bg-white/20" /></div>
            : <>
              <h1 className="text-white font-black text-xl drop-shadow">{profile?.full_name || profile?.username || 'INDIANREELS'}</h1>
              <p className="text-white/70 text-[12px] mt-0.5">@{profile?.username}</p>
            </>
          }

          <div className="flex flex-col items-center gap-3 mt-4 w-full px-4">
            {/* Row 1: Posts · Followers · Following */}
            <div className="flex gap-8 justify-center">
              {[
                { label: 'Posts', v: counts.posts },
                { label: 'Followers', v: counts.followers },
                { label: 'Following', v: counts.following },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center">
                  {loading ? <Skeleton className="w-8 h-5 rounded bg-white/20 mb-1" />
                    : <span className="text-white font-black text-lg leading-none">{fmt(s.v)}</span>}
                  <span className="text-white/65 text-[11px] mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/20 mx-4" />

            {/* Row 2: Views · Videos · Likes */}
            <div className="flex gap-8 justify-center">
              {[
                { label: 'Views', v: counts.views, icon: '👁️' },
                { label: 'Videos', v: counts.videos, icon: '🎬' },
                { label: 'Likes', v: counts.likes, icon: '❤️' },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center">
                  {loading ? <Skeleton className="w-10 h-5 rounded bg-white/20 mb-1" />
                    : <span className="text-white font-black text-lg leading-none">{fmt(s.v)}</span>}
                  <span className="text-white/65 text-[11px] mt-0.5 flex items-center gap-0.5">
                    <span className="text-[10px]">{s.icon}</span> {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {profile?.bio && <p className="text-white/80 text-[12px] text-center mt-2.5 leading-snug max-w-[240px]">{profile.bio}</p>}

          <div className="flex gap-3 mt-4">
            {me && profile && me.id !== profile.id && (
              <button
                onClick={handleFollow}
                className="px-8 h-10 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all"
                style={following
                  ? { background: 'rgba(255,255,255,0.2)', color: 'white', border: '1.5px solid rgba(255,255,255,0.6)' }
                  : { background: 'white', color: TEAL_DARK }
                }
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
            <button
              onClick={() => navigate(`/messages/INDIANREELS_OFFICIALLY`)}
              className="px-8 h-10 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)' }}
            >
              Message
            </button>
          </div>

          {/* Tab switcher */}
          <div className="absolute left-0 right-0 flex bg-white" style={{ bottom: 0 }}>
            {(['posts', 'reels'] as const).map((t, i) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${i === 0 ? '' : ''} ${tab === t ? 'text-[#00897B]' : 'text-zinc-400'}`}>
                {t === 'posts' ? '⊞  Post' : '▷  Reels'}
              </button>
            ))}
            <div className="absolute bottom-0 h-[2.5px] rounded-full transition-all duration-300"
              style={{ background: TEAL, width: '40%', left: tab === 'posts' ? '5%' : '55%' }} />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white">
          {tab === 'posts' ? (
            <div className="space-y-3 p-3 pb-6">
              {loading
                ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-zinc-100 shadow-sm p-3 space-y-2">
                    <div className="flex items-center gap-2"><Skeleton className="w-9 h-9 rounded-full bg-zinc-100" /><Skeleton className="w-28 h-3 rounded bg-zinc-100" /></div>
                    <Skeleton className="w-full h-44 rounded-xl bg-zinc-100" />
                  </div>
                ))
                : posts.length === 0
                  ? <div className="flex flex-col items-center py-16 gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${TEAL}15` }}>
                      <Play className="w-7 h-7" style={{ color: TEAL }} />
                    </div>
                    <p className="text-zinc-400 text-sm">No posts yet</p>
                  </div>
                  : posts.map(post => (
                    <div key={post.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-50">
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={post.author?.profile_photo_url || ''} className="object-cover" />
                            <AvatarFallback style={{ background: TEAL, color: 'white' }} className="text-xs font-bold">
                              {(post.author?.username || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[13px] font-semibold text-zinc-800 leading-tight">{post.author?.full_name || post.author?.username}</p>
                            <p className="text-[10px] text-zinc-400">{timeAgo(post.created_at)}</p>
                          </div>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-zinc-300" />
                      </div>
                      {post.caption && (
                        <p className="px-3 pb-2 text-[13px] text-zinc-700 leading-snug">
                          {post.caption.split(/(#\w+)/g).map((part: string, i: number) =>
                            part.startsWith('#') ? <span key={i} className="font-semibold" style={{ color: TEAL_DARK }}>{part}</span> : part
                          )}
                        </p>
                      )}
                      {post.media_url && (
                        <div className="relative mx-3 mb-2 rounded-xl overflow-hidden bg-zinc-100">
                          {post.is_video
                            ? <div className="relative"><video src={post.media_url} className="w-full object-cover" style={{ maxHeight: 260 }} muted playsInline preload="metadata" />
                              <div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm"><Play className="w-5 h-5 text-white fill-white ml-0.5" /></div></div>
                            </div>
                            : <img src={post.media_url} alt="Post" className="w-full object-cover" style={{ maxHeight: 260 }} />
                          }
                        </div>
                      )}
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-4">
                          <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5 active:scale-90 transition-transform">
                            <Heart className="w-5 h-5 transition-all" style={{ color: post.liked ? '#FF3B5C' : '#9CA3AF', fill: post.liked ? '#FF3B5C' : 'none' }} />
                            <span className="text-[12px] text-zinc-500 font-medium">{fmt(post.likes)}</span>
                          </button>
                          <button className="flex items-center gap-1.5">
                            <MessageCircle className="w-5 h-5 text-zinc-400" />
                            <span className="text-[12px] text-zinc-500 font-medium">{fmt(post.comments)}</span>
                          </button>
                          <button><Send className="w-5 h-5 text-zinc-400" /></button>
                        </div>
                        <button onClick={() => toggleSave(post.id)} className="active:scale-90 transition-transform">
                          <Bookmark className="w-5 h-5 transition-all" style={{ color: post.saved ? TEAL_DARK : '#9CA3AF', fill: post.saved ? TEAL_DARK : 'none' }} />
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>
          ) : (
            <div className="p-3 pb-6">
              {loading
                ? <div className="grid grid-cols-2 gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl bg-zinc-100" />)}</div>
                : reelsGrid.length === 0
                  ? <div className="flex flex-col items-center py-16 gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${TEAL}15` }}>
                      <Play className="w-7 h-7" style={{ color: TEAL }} />
                    </div>
                    <p className="text-zinc-400 text-sm">No reels yet</p>
                  </div>
                  : <div className="grid grid-cols-2 gap-2">
                    {reelsGrid.map(r => (
                      <div key={r.id} className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 shadow-sm cursor-pointer"
                        onClick={() => navigate(`/indianreels/reels`)}>
                        <video src={r.thumb} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-white fill-white" />
                          <span className="text-white text-[10px] font-semibold drop-shadow">{fmt(r.likes)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>
      </div>
    </IndianReelsLayout>
  );
}
