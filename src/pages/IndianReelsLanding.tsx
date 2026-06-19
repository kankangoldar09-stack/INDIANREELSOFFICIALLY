import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Home, Search, Plus, User, Heart,
  MessageCircle, Send, Bookmark, MoreHorizontal, Play, Video
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

const TEAL = '#00BFA5';
const TEAL_DARK = '#00897B';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─── Types ───────────────────────────────────────────────────────────
interface LandingProfile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  is_verified: boolean;
}

interface FeedPost {
  id: string;
  owner_id: string;
  media_url: string;
  caption: string;
  created_at: string;
  is_video: boolean;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  author: { username: string; full_name: string | null; profile_photo_url: string | null };
}

interface StoryUser {
  id: string;
  username: string;
  profile_photo_url: string | null;
}

// ─── Main Component ──────────────────────────────────────────────────
export default function IndianReelsLanding() {
  const navigate = useNavigate();
  const { profile: me } = useAuth();

  const [profile, setProfile] = useState<LandingProfile | null>(null);
  const [counts, setCounts] = useState({ posts: 0, followers: 0, following: 0 });
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [reelsGrid, setReelsGrid] = useState<{ id: string; thumb: string; likes: number }[]>([]);
  const [tab, setTab] = useState<'posts' | 'reels'>('posts');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  // ── Load data ────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, [me]);

  const loadAll = async () => {
    setLoading(true);
    try {
      // 1. Find @INDIANREELS_OFFICIALLY profile
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('id, username, full_name, bio, profile_photo_url, is_verified')
        .eq('username', 'INDIANREELS_OFFICIALLY')
        .maybeSingle();

      if (!profileData) { setLoading(false); return; }
      setProfile(profileData);

      // 2. Counts in parallel
      const [postsRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
        (supabase as any).from('posts').select('id', { count: 'exact', head: true }).eq('owner_id', profileData.id),
        (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileData.id),
        (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileData.id),
        me ? (supabase as any).from('follows').select('id', { count: 'exact', head: true })
          .eq('follower_id', me.id).eq('following_id', profileData.id) : Promise.resolve({ count: 0 }),
      ]);
      setCounts({
        posts: postsRes.count || 0,
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
      });
      setFollowing((isFollowingRes.count || 0) > 0);

      // 3. Recent posts
      const { data: postsData } = await (supabase as any)
        .from('posts')
        .select('id, owner_id, media_url, caption, created_at, profiles!owner_id(username, full_name, profile_photo_url)')
        .eq('owner_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (postsData) {
        const enriched = await Promise.all(postsData.map(async (p: any) => {
          const [likeRes, commentRes, savedRes, likedRes] = await Promise.all([
            (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('post_id', p.id),
            (supabase as any).from('comments').select('id', { count: 'exact', head: true }).eq('post_id', p.id),
            me ? (supabase as any).from('saved_posts').select('id', { count: 'exact', head: true }).eq('post_id', p.id).eq('user_id', me.id) : Promise.resolve({ count: 0 }),
            me ? (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('post_id', p.id).eq('user_id', me.id) : Promise.resolve({ count: 0 }),
          ]);
          const isVideo = p.media_url?.match(/\.(mp4|mov|webm|mkv|3gp|avi)/i);
          return {
            id: p.id,
            owner_id: p.owner_id,
            media_url: p.media_url,
            caption: p.caption || '',
            created_at: p.created_at,
            is_video: !!isVideo,
            likes: likeRes.count || 0,
            comments: commentRes.count || 0,
            liked: (likedRes.count || 0) > 0,
            saved: (savedRes.count || 0) > 0,
            author: p.profiles || { username: profileData.username, full_name: profileData.full_name, profile_photo_url: profileData.profile_photo_url },
          };
        }));
        setPosts(enriched);
      }

      // 4. Reels grid
      const { data: reelsData } = await (supabase as any)
        .from('reels')
        .select('id, video_url')
        .eq('owner_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (reelsData) {
        const rGrid = await Promise.all(reelsData.map(async (r: any) => {
          const { count } = await (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('reel_id', r.id);
          return { id: r.id, thumb: r.video_url, likes: count || 0 };
        }));
        setReelsGrid(rGrid);
      }

      // 5. Stories (recent active users)
      const { data: storiesData } = await (supabase as any)
        .from('stories')
        .select('profiles!user_id(id, username, profile_photo_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(8);

      if (storiesData) {
        const seen = new Set<string>();
        const unique: StoryUser[] = [];
        storiesData.forEach((s: any) => {
          const p = s.profiles;
          if (p && !seen.has(p.id)) { seen.add(p.id); unique.push(p); }
        });
        setStories(unique.slice(0, 6));
      }
    } catch (e) {
      console.error('IndianReelsLanding load error:', e);
    }
    setLoading(false);
  };

  // ── Follow / Unfollow ────────────────────────────────────────────
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

  // ── Like / Save ──────────────────────────────────────────────────
  const handleLike = async (postId: string) => {
    if (!me) return;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, liked: !p.liked, likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1 };
    }));
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.liked) {
      await (supabase as any).from('likes').delete().eq('post_id', postId).eq('user_id', me.id);
    } else {
      await (supabase as any).from('likes').insert({ post_id: postId, user_id: me.id });
    }
  };

  const handleSave = async (postId: string) => {
    if (!me) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: !p.saved } : p));
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.saved) {
      await (supabase as any).from('saved_posts').delete().eq('post_id', postId).eq('user_id', me.id);
    } else {
      await (supabase as any).from('saved_posts').insert({ post_id: postId, user_id: me.id });
    }
  };

  // ── Nav items ────────────────────────────────────────────────────
  const navItems = [
    { id: 'home',    icon: Home,    label: 'Home',    to: '/' },
    { id: 'search',  icon: Search,  label: 'Search',  to: '/search' },
    { id: 'reels',   icon: Video,   label: 'Reels',   to: '/reels' },
    { id: 'profile', icon: User,    label: 'Profile', to: `/profile/${me?.username || 'me'}` },
  ];

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col bg-[#f0f2f5] overflow-hidden z-50">

      {/* ══ TEAL GRADIENT HEADER ══════════════════════════════════════ */}
      <div
        className="relative shrink-0"
        style={{ background: `linear-gradient(155deg, #00D4B8 0%, ${TEAL} 45%, ${TEAL_DARK} 100%)` }}
      >
        {/* top bar */}
        <div className="flex items-center justify-between px-4 pt-10 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-extrabold text-[15px] tracking-wider drop-shadow">INDIANREELS</span>
          <div className="w-9" />
        </div>

        {/* profile section */}
        <div className="flex flex-col items-center pb-8 px-4 pt-1">
          {loading ? (
            <Skeleton className="w-20 h-20 rounded-full bg-white/20" />
          ) : (
            <div className="relative mb-3">
              <Avatar className="w-20 h-20 ring-4 ring-white/50 shadow-xl">
                <AvatarImage src={profile?.profile_photo_url || ''} className="object-cover" />
                <AvatarFallback
                  className="text-2xl font-black"
                  style={{ background: TEAL_DARK, color: 'white' }}
                >
                  IR
                </AvatarFallback>
              </Avatar>
              {profile?.is_verified && (
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow text-xs">
                  ✅
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-2 mt-2">
              <Skeleton className="w-32 h-5 rounded bg-white/20" />
              <Skeleton className="w-24 h-3 rounded bg-white/20" />
            </div>
          ) : (
            <>
              <h1 className="text-white font-black text-xl tracking-tight drop-shadow mt-1">
                {profile?.full_name || profile?.username || 'INDIANREELS'}
              </h1>
              <p className="text-white/70 text-[12px] mt-0.5">@{profile?.username}</p>
            </>
          )}

          {/* stats row */}
          <div className="flex gap-10 mt-4">
            {[
              { label: 'Posts', value: counts.posts },
              { label: 'Followers', value: counts.followers },
              { label: 'Following', value: counts.following },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center">
                {loading
                  ? <Skeleton className="w-8 h-5 rounded bg-white/20 mb-1" />
                  : <span className="text-white font-black text-lg leading-none">{fmt(s.value)}</span>
                }
                <span className="text-white/65 text-[11px] mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>

          {/* bio */}
          {profile?.bio && (
            <p className="text-white/80 text-[12px] text-center mt-2.5 leading-snug max-w-[240px]">
              {profile.bio}
            </p>
          )}

          {/* follow button */}
          {me && profile && me.id !== profile.id && (
            <button
              onClick={handleFollow}
              className="mt-4 px-10 h-10 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all duration-200"
              style={following
                ? { background: 'rgba(255,255,255,0.2)', color: 'white', border: '1.5px solid rgba(255,255,255,0.6)' }
                : { background: 'white', color: TEAL_DARK }
              }
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* tab bar — rounded white card rising from bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex bg-white rounded-t-[28px] shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
          {(['posts', 'reels'] as const).map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-[13px] font-semibold transition-colors
                ${i === 0 ? 'rounded-tl-[28px]' : 'rounded-tr-[28px]'}
                ${tab === t ? 'text-[#00897B]' : 'text-zinc-400'}`}
            >
              {t === 'posts' ? '⊞  Post' : '▷  Reels'}
            </button>
          ))}
          {/* sliding underline */}
          <div
            className="absolute bottom-0 h-[2.5px] rounded-full transition-all duration-300"
            style={{ background: TEAL, width: '38%', left: tab === 'posts' ? '6%' : '56%' }}
          />
        </div>
      </div>

      {/* ══ SCROLLABLE BODY ═══════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto bg-white min-w-0">

        {/* Stories row */}
        <div className="px-4 pt-4 pb-2 border-b border-zinc-100">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {/* Add Story */}
            <div className="flex flex-col items-center shrink-0 gap-1 cursor-pointer"
              onClick={() => navigate('/create')}>
              <div className="w-[56px] h-[56px] rounded-2xl bg-zinc-100 flex items-center justify-center border-2 border-dashed border-zinc-300 relative">
                <Plus className="w-5 h-5" style={{ color: TEAL }} />
              </div>
              <span className="text-[10px] text-zinc-400 font-medium w-14 text-center truncate">Your Story</span>
            </div>

            {/* Real stories */}
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center shrink-0 gap-1">
                  <Skeleton className="w-14 h-14 rounded-2xl bg-zinc-100" />
                  <Skeleton className="w-10 h-2.5 rounded bg-zinc-100" />
                </div>
              ))
              : stories.map(s => (
                <div
                  key={s.id}
                  className="flex flex-col items-center shrink-0 gap-1 cursor-pointer"
                  onClick={() => navigate(`/stories/${s.id}`)}
                >
                  <div className="w-[56px] h-[56px] rounded-2xl overflow-hidden border-2" style={{ borderColor: TEAL }}>
                    <img
                      src={s.profile_photo_url || ''}
                      alt={s.username}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium w-14 text-center truncate">
                    {s.username}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

        {/* recently post label */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            {tab === 'posts' ? 'Recently Post' : 'Recent Reels'}
          </span>
          <MoreHorizontal className="w-4 h-4 text-zinc-300" />
        </div>

        {/* ── POST FEED ── */}
        {tab === 'posts' && (
          <div className="space-y-3 pb-28 px-3">
            {loading
              ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-zinc-100 shadow-sm">
                  <div className="flex items-center gap-2.5 p-3">
                    <Skeleton className="w-9 h-9 rounded-full bg-zinc-100" />
                    <div className="space-y-1.5"><Skeleton className="w-24 h-3 rounded bg-zinc-100" /><Skeleton className="w-16 h-2.5 rounded bg-zinc-100" /></div>
                  </div>
                  <Skeleton className="mx-3 mb-2 rounded-xl bg-zinc-100" style={{ height: 200 }} />
                  <div className="flex gap-3 px-3 pb-3"><Skeleton className="w-12 h-4 rounded bg-zinc-100" /><Skeleton className="w-12 h-4 rounded bg-zinc-100" /></div>
                </div>
              ))
              : posts.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${TEAL}15` }}>
                      <Play className="w-7 h-7" style={{ color: TEAL }} />
                    </div>
                    <p className="text-zinc-400 text-sm">No posts yet</p>
                  </div>
                )
                : posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={() => handleLike(post.id)}
                    onSave={() => handleSave(post.id)}
                  />
                ))
            }
          </div>
        )}

        {/* ── REELS GRID ── */}
        {tab === 'reels' && (
          <div className="px-3 pb-28 pt-1">
            {loading
              ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-2xl bg-zinc-100" />
                  ))}
                </div>
              )
              : reelsGrid.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${TEAL}15` }}>
                      <Video className="w-7 h-7" style={{ color: TEAL }} />
                    </div>
                    <p className="text-zinc-400 text-sm">No reels yet</p>
                  </div>
                )
                : (
                  <div className="grid grid-cols-2 gap-2">
                    {reelsGrid.map(r => (
                      <div
                        key={r.id}
                        className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 shadow-sm cursor-pointer"
                        onClick={() => navigate(`/reels?id=${r.id}`)}
                      >
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
                )
            }
          </div>
        )}
      </div>

      {/* ══ FAB ══════════════════════════════════════════════════════ */}
      <Link
        to="/create"
        className="absolute bottom-20 right-4 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-20"
        style={{ background: `linear-gradient(135deg, #00D4B8, ${TEAL_DARK})` }}
      >
        <Plus className="w-7 h-7 text-white" />
      </Link>

      {/* ══ BOTTOM NAV ═══════════════════════════════════════════════ */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-100 flex items-center justify-around px-2 z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.07)]">
        {navItems.map(item => (
          <Link
            key={item.id}
            to={item.to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 active:scale-90 transition-transform"
          >
            <item.icon
              className="w-6 h-6 transition-colors"
              style={{ color: TEAL }}
              strokeWidth={1.8}
            />
            <span className="text-[10px] font-medium" style={{ color: TEAL }}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────
function PostCard({ post, onLike, onSave }: {
  post: FeedPost;
  onLike: () => void;
  onSave: () => void;
}) {
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-50">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-9 h-9">
            <AvatarImage src={post.author.profile_photo_url || ''} className="object-cover" />
            <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-bold">
              {(post.author.username || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[13px] font-semibold text-zinc-800 leading-tight">
              {post.author.full_name || post.author.username}
            </p>
            <p className="text-[10px] text-zinc-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-zinc-300" />
      </div>

      {/* caption */}
      {post.caption ? (
        <p className="px-3 pb-2 text-[13px] text-zinc-700 leading-snug">
          {post.caption.split(/(#\w+)/g).map((part, i) =>
            part.startsWith('#')
              ? <span key={i} className="font-semibold" style={{ color: TEAL_DARK }}>{part}</span>
              : part
          )}
        </p>
      ) : null}

      {/* media */}
      {post.media_url && (
        <div className="relative mx-3 mb-2 rounded-xl overflow-hidden bg-zinc-100">
          {post.is_video
            ? (
              <div className="relative">
                <video
                  src={post.media_url}
                  className="w-full object-cover rounded-xl"
                  style={{ maxHeight: 280 }}
                  muted playsInline preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </div>
            )
            : (
              <img
                src={post.media_url}
                alt="Post"
                className="w-full object-cover"
                style={{ maxHeight: 280 }}
              />
            )
          }
        </div>
      )}

      {/* actions */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-4">
          <button onClick={onLike} className="flex items-center gap-1.5 active:scale-90 transition-transform">
            <Heart
              className="w-5 h-5 transition-all"
              style={{ color: post.liked ? '#FF3B5C' : '#9CA3AF', fill: post.liked ? '#FF3B5C' : 'none' }}
            />
            <span className="text-[12px] text-zinc-500 font-medium">{fmt(post.likes)}</span>
          </button>
          <button className="flex items-center gap-1.5">
            <MessageCircle className="w-5 h-5 text-zinc-400" />
            <span className="text-[12px] text-zinc-500 font-medium">{fmt(post.comments)}</span>
          </button>
          <button>
            <Send className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <button onClick={onSave} className="active:scale-90 transition-transform">
          <Bookmark
            className="w-5 h-5 transition-all"
            style={{ color: post.saved ? TEAL_DARK : '#9CA3AF', fill: post.saved ? TEAL_DARK : 'none' }}
          />
        </button>
      </div>
    </div>
  );
}

