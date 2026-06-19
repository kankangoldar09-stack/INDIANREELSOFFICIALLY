import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, TrendingUp, Zap, DollarSign, Play, Eye, Heart, Users, Video, ArrowUpRight, ArrowDownRight, BarChart2, Award, AlertCircle, Pencil, X, Check } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'home' | 'grow' | 'virals' | 'monetize';

interface StudioStats {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  followers: number;
  following: number;
  recentReels: any[];
  viewsThisWeek: number;
  viewsLastWeek: number;
  likesThisWeek: number;
  likesLastWeek: number;
}

export default function IndianReelsStudio() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [stats, setStats] = useState<StudioStats>({
    totalVideos: 0, totalViews: 0, totalLikes: 0,
    followers: 0, following: 0, recentReels: [],
    viewsThisWeek: 0, viewsLastWeek: 0, likesThisWeek: 0, likesLastWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [previewReel, setPreviewReel] = useState<any>(null);
  const [editingReel, setEditingReel] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [reelsRes, followersRes, followingRes] = await Promise.all([
          supabase.from('reels').select('id,thumbnail_url,video_url,caption,title,created_at').eq('owner_id', profile.id).order('created_at', { ascending: false }).limit(20),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id).eq('status', 'accepted'),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id).eq('status', 'accepted'),
        ]);

        const reels = reelsRes.data || [];
        const reelIds = reels.map((r: any) => r.id);

        const [viewsRes, likesRes] = reelIds.length > 0 ? await Promise.all([
          supabase.from('views').select('id,reel_id,created_at', { count: 'exact' }).in('reel_id', reelIds),
          supabase.from('reel_likes').select('id,reel_id,created_at', { count: 'exact' }).in('reel_id', reelIds),
        ]) : [{ data: [], count: 0 }, { data: [], count: 0 }];

        // Attach view counts per reel
        const viewsByReel: Record<string, number> = {};
        (viewsRes.data || []).forEach((v: any) => { viewsByReel[v.reel_id] = (viewsByReel[v.reel_id] || 0) + 1; });
        const reelsWithViews = reels.map((r: any) => ({ ...r, view_count: viewsByReel[r.id] || 0 }));
        const totalViews = reelsWithViews.reduce((s: number, r: any) => s + (r.view_count || 0), 0);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const viewsThisWeek = (viewsRes.data || []).filter((v: any) => new Date(v.created_at) > weekAgo).length;
        const viewsLastWeek = (viewsRes.data || []).filter((v: any) => new Date(v.created_at) > twoWeeksAgo && new Date(v.created_at) <= weekAgo).length;

        const allLikes = likesRes.data || [];
        const likesThisWeek = allLikes.filter((l: any) => new Date(l.created_at) > weekAgo).length;
        const likesLastWeek = allLikes.filter((l: any) => new Date(l.created_at) > twoWeeksAgo && new Date(l.created_at) <= weekAgo).length;

        setStats({
          totalVideos: reelsWithViews.length,
          totalViews,
          totalLikes: likesRes.count || 0,
          followers: followersRes.count || 0,
          following: followingRes.count || 0,
          recentReels: reelsWithViews,
          viewsThisWeek, viewsLastWeek,
          likesThisWeek, likesLastWeek,
        });
      } catch {/* silent */}
      setLoading(false);
    };
    load();
  }, [profile?.id]);

  const growthPct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const viewsGrowth = growthPct(stats.viewsThisWeek, stats.viewsLastWeek);
  const likesGrowth = growthPct(stats.likesThisWeek, stats.likesLastWeek);

  const openEdit = (reel: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingReel(reel);
    setEditTitle(reel.title || reel.caption || '');
    setTimeout(() => editInputRef.current?.focus(), 80);
  };

  const saveTitle = async () => {
    if (!editingReel) return;
    setSavingTitle(true);
    const { error } = await (supabase as any).from('reels').update({ title: editTitle }).eq('id', editingReel.id);
    if (error) { toast.error('Save nahi hua, dobara try karo'); }
    else {
      toast.success('Title save ho gaya ✅');
      setStats(prev => ({
        ...prev,
        recentReels: prev.recentReels.map(r => r.id === editingReel.id ? { ...r, title: editTitle } : r),
      }));
      setEditingReel(null);
    }
    setSavingTitle(false);
  };

  // ── TAB COMPONENTS ──

  const HomeTab = () => (
    <div className="flex-1 overflow-y-auto pb-20">
      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-3 px-4 pt-4">
        {[
          { icon: Video, label: 'Videos', value: stats.totalVideos, color: 'bg-purple-500/20 text-purple-400' },
          { icon: Eye, label: 'Views', value: stats.totalViews, color: 'bg-blue-500/20 text-blue-400' },
          { icon: Heart, label: 'Likes', value: stats.totalLikes, color: 'bg-rose-500/20 text-rose-400' },
        ].map(card => (
          <div key={card.label} className="bg-zinc-900 rounded-xl p-3 flex flex-col gap-1.5 border border-zinc-800">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', card.color)}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className="text-white font-bold text-lg leading-none">{card.value.toLocaleString()}</p>
            <p className="text-zinc-500 text-[11px]">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Followers row */}
      <div className="flex gap-3 px-4 pt-3">
        {[
          { icon: Users, label: 'Followers', value: stats.followers, color: 'text-teal-400' },
          { icon: Users, label: 'Following', value: stats.following, color: 'text-orange-400' },
        ].map(c => (
          <div key={c.label} className="flex-1 bg-zinc-900 rounded-xl p-3 flex items-center gap-3 border border-zinc-800">
            <c.icon className={cn('w-5 h-5', c.color)} />
            <div>
              <p className="text-white font-bold">{c.value.toLocaleString()}</p>
              <p className="text-zinc-500 text-[11px]">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Videos */}
      <div className="px-4 pt-5">
        <h2 className="text-white font-bold text-base mb-3">Recent Videos</h2>
        {stats.totalVideos === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-zinc-500">
            <Video className="w-10 h-10" />
            <p className="text-sm">Abhi tak koi video nahi hai</p>
            <button onClick={() => navigate('/create')} className="px-5 py-2 rounded-full bg-[#fe2c55] text-white text-sm font-semibold">
              Video Upload Karo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {stats.recentReels.map((reel: any) => (
              <div
                key={reel.id}
                className="relative aspect-[9/16] rounded-lg overflow-hidden bg-zinc-800 cursor-pointer group"
                onClick={() => setPreviewReel(reel)}
              >
                {/* Thumbnail: prefer thumbnail_url, else extract from video */}
                {reel.thumbnail_url ? (
                  <img src={reel.thumbnail_url} alt={reel.title || reel.caption || 'video'} className="w-full h-full object-cover" />
                ) : reel.video_url ? (
                  <video
                    src={reel.video_url + '#t=0.5'}
                    className="w-full h-full object-cover"
                    muted playsInline preload="metadata"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white/40" />
                  </div>
                )}
                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />
                {/* Play icon center on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                {/* Views badge */}
                <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/60 rounded px-1 py-0.5">
                  <Eye className="w-2.5 h-2.5 text-white/80" />
                  <span className="text-[9px] text-white font-medium">{(reel.view_count || 0).toLocaleString()}</span>
                </div>
                {/* Edit pencil */}
                <button
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => openEdit(reel, e)}
                >
                  <Pencil className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /* ── Preview Modal ── */
  const PreviewModal = () => {
    if (!previewReel) return null;
    return (
      <div
        className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
        onClick={() => setPreviewReel(null)}
      >
        <button
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center"
          onClick={() => setPreviewReel(null)}
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <div
          className="w-full max-w-xs aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <video
            src={previewReel.video_url}
            className="w-full h-full object-contain bg-black"
            controls
            autoPlay
            playsInline
          />
        </div>
        {/* Title + edit button below */}
        <div className="mt-3 w-full max-w-xs flex items-center gap-2">
          <p className="text-white text-sm font-medium flex-1 truncate">
            {previewReel.title || previewReel.caption || 'No title'}
          </p>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-800 text-white text-xs"
            onClick={(e) => { setPreviewReel(null); openEdit(previewReel, e); }}
          >
            <Pencil className="w-3 h-3" /> Edit Title
          </button>
        </div>
      </div>
    );
  };

  /* ── Title Edit Modal ── */
  const EditTitleModal = () => {
    if (!editingReel) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center p-4" onClick={() => setEditingReel(null)}>
        <div
          className="w-full max-w-sm bg-zinc-900 rounded-2xl p-5 border border-zinc-700"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-base mb-4">Title Edit Karo</h3>
          <input
            ref={editInputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Video ka title likho..."
            className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-[#fe2c55] mb-4"
            maxLength={150}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); }}
          />
          <div className="flex gap-3">
            <button
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium"
              onClick={() => setEditingReel(null)}
            >
              Cancel
            </button>
            <button
              className="flex-1 py-2.5 rounded-xl bg-[#fe2c55] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={saveTitle}
              disabled={savingTitle}
            >
              {savingTitle ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <><Check className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const GrowTab = () => {
    const viewsUp = viewsGrowth >= 0;
    const likesUp = likesGrowth >= 0;
    return (
      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4 space-y-4">
        <h2 className="text-white font-bold text-base">Channel Growth Analytics</h2>

        {/* Views trend */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="p-4 flex items-start justify-between">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Views This Week</p>
              <p className="text-white font-bold text-2xl">{stats.viewsThisWeek.toLocaleString()}</p>
              <div className={cn('flex items-center gap-1 mt-1', viewsUp ? 'text-green-400' : 'text-rose-400')}>
                {viewsUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span className="text-xs font-semibold">{Math.abs(viewsGrowth)}% vs last week</span>
              </div>
            </div>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', viewsUp ? 'bg-green-500/15' : 'bg-rose-500/15')}>
              {viewsUp ? <ArrowUpRight className="w-6 h-6 text-green-400" /> : <ArrowDownRight className="w-6 h-6 text-rose-400" />}
            </div>
          </div>
          {/* Simple bar chart */}
          <div className="px-4 pb-4">
            <div className="flex items-end gap-1.5 h-20">
              {stats.recentReels.slice(0, 8).map((r: any, i: number) => {
                const maxV = Math.max(...stats.recentReels.slice(0, 8).map((x: any) => x.view_count || 1));
                const h = Math.max(8, ((r.view_count || 0) / maxV) * 72);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-sm bg-blue-500/70" style={{ height: `${h}px` }} />
                  </div>
                );
              })}
              {stats.recentReels.length === 0 && (
                <div className="w-full flex items-center justify-center text-zinc-600 text-xs">No data yet</div>
              )}
            </div>
            <p className="text-zinc-600 text-[10px] mt-1 text-center">Recent videos views</p>
          </div>
          <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/40">
            <p className="text-zinc-400 text-xs leading-relaxed">
              {viewsUp
                ? '📈 Channel ke views badhh rahe hain! Isi tarah content daalo.'
                : '📉 Views thode kam hue hain. Posting frequency badhao aur trending sounds use karo.'}
            </p>
          </div>
        </div>

        {/* Likes trend */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="p-4 flex items-start justify-between">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Likes This Week</p>
              <p className="text-white font-bold text-2xl">{stats.likesThisWeek.toLocaleString()}</p>
              <div className={cn('flex items-center gap-1 mt-1', likesUp ? 'text-green-400' : 'text-rose-400')}>
                {likesUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span className="text-xs font-semibold">{Math.abs(likesGrowth)}% vs last week</span>
              </div>
            </div>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', likesUp ? 'bg-green-500/15' : 'bg-rose-500/15')}>
              {likesUp ? <ArrowUpRight className="w-6 h-6 text-green-400" /> : <ArrowDownRight className="w-6 h-6 text-rose-400" />}
            </div>
          </div>
          <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-800/40">
            <p className="text-zinc-400 text-xs leading-relaxed">
              {likesUp
                ? '❤️ Tumhare videos ko log pasand kar rahe hain! Engagement badhh raha hai.'
                : '💔 Likes thodi kam hain. Engaging hooks aur captions try karo.'}
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold text-sm">Grow Tips</h3>
          </div>
          {[
            'Roz ek naya video daalo consistency ke liye',
            'Trending music aur hashtags use karo',
            'Pehle 3 seconds mein hook banana zaroori hai',
            'Comments ka jawab do — engagement badhega',
            'Collaborations karo bade creators ke saath',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">{i + 1}</div>
              <p className="text-zinc-400 text-xs leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ViralsTab = () => {
    const topReels = [...stats.recentReels].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);
    return (
      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
        <h2 className="text-white font-bold text-base mb-1">Top Viral Videos</h2>
        <p className="text-zinc-500 text-xs mb-4">Sabse zyada dekhe gaye videos</p>

        {topReels.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
            <Zap className="w-10 h-10" />
            <p className="text-sm text-center">Abhi koi viral video nahi hai.<br/>Videos upload karo aur dekhte raho!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topReels.map((reel: any, i: number) => (
              <div key={reel.id} className="flex gap-3 items-center bg-zinc-900 rounded-xl border border-zinc-800 p-3">
                {/* Rank */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                  i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-500'
                )}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                {/* Thumbnail */}
                <div className="w-12 h-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                  {reel.thumbnail_url ? (
                    <img src={reel.thumbnail_url} className="w-full h-full object-cover" alt="" />
                  ) : reel.video_url ? (
                    <video
                      src={reel.video_url + '#t=0.5'}
                      className="w-full h-full object-cover"
                      muted playsInline preload="metadata"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-4 h-4 text-white/30" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{reel.caption || 'No caption'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1 text-blue-400">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{(reel.view_count || 0).toLocaleString()}</span>
                    </div>
                    {i === 0 && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-semibold">🔥 Top Video</span>
                    )}
                  </div>
                  <p className="text-zinc-600 text-[10px] mt-0.5">{new Date(reel.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Viral tips */}
        <div className="mt-5 bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-semibold text-sm">Viral Karne Ke Tips</h3>
          </div>
          {['15–30 sec ka short engaging video banao','Pehle frame mein face ya action dikhao','Trending audio use karo','Caption mein question karo viewers se'].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
              <span className="text-yellow-400 text-sm shrink-0">⚡</span>
              <p className="text-zinc-400 text-xs leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MonetizeTab = () => (
    <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4 space-y-4">
      <h2 className="text-white font-bold text-base">Monetization</h2>

      {/* Eligibility */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Award className="w-6 h-6 text-yellow-400" />
          <h3 className="text-white font-semibold">Eligibility Status</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Followers (need 1K)', current: stats.followers, required: 1000 },
            { label: 'Videos (need 10)', current: stats.totalVideos, required: 10 },
            { label: 'Views (need 10K)', current: stats.totalViews, required: 10000 },
          ].map(c => {
            const pct = Math.min(100, Math.round((c.current / c.required) * 100));
            const done = c.current >= c.required;
            return (
              <div key={c.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-400 text-xs">{c.label}</span>
                  <span className={cn('text-xs font-semibold', done ? 'text-green-400' : 'text-zinc-400')}>
                    {c.current.toLocaleString()} / {c.required.toLocaleString()} {done && '✓'}
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', done ? 'bg-green-400' : 'bg-[#fe2c55]')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming soon features */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h3 className="text-white font-semibold text-sm">Earning Features</h3>
        </div>
        {[
          { icon: '🎁', title: 'Creator Fund', desc: 'Views ke basis pe earning — jald aayega' },
          { icon: '💎', title: 'Brand Deals', desc: 'Brands ke saath collaboration' },
          { icon: '🎪', title: 'Live Gifts', desc: 'Live stream pe audience se gifts lo' },
          { icon: '🛒', title: 'Shop Integration', desc: 'Videos mein products tag karo aur beecho' },
        ].map(f => (
          <div key={f.title} className="flex items-start gap-3 mb-3 last:mb-0">
            <span className="text-2xl shrink-0">{f.icon}</span>
            <div>
              <p className="text-white text-sm font-medium">{f.title}</p>
              <p className="text-zinc-500 text-[11px]">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-yellow-300/80 text-xs leading-relaxed">
          Monetization abhi setup mode mein hai. Eligibility criteria poori karo aur jald hi earning shuru kar sakte ho!
        </p>
      </div>
    </div>
  );

  const TABS = [
    { id: 'home' as Tab, icon: Home, label: 'Home' },
    { id: 'grow' as Tab, icon: TrendingUp, label: 'Grow' },
    { id: 'virals' as Tab, icon: Zap, label: 'Virals' },
    { id: 'monetize' as Tab, icon: DollarSign, label: 'Monetize' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          {/* Logo + name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#fe2c55] shrink-0">
              {profile?.profile_photo_url ? (
                <img src={profile.profile_photo_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#fe2c55] to-[#ff6b35] text-white font-bold text-lg">
                  {(profile?.full_name || profile?.username || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-white font-bold text-base leading-tight truncate">
                  {profile?.full_name || profile?.username || 'Creator'}
                </h1>
                <span className="text-[10px] bg-gradient-to-r from-[#fe2c55] to-[#ff6b35] text-white px-2 py-0.5 rounded-full font-bold shrink-0">STUDIO</span>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">
                {stats.followers.toLocaleString()} Followers
              </p>
            </div>
          </div>
        </div>

        {/* Studio brand */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">IndianReels Studio</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#fe2c55] border-t-transparent animate-spin" />
            <p className="text-zinc-500 text-sm">Studio load ho raha hai...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'grow' && <GrowTab />}
          {activeTab === 'virals' && <ViralsTab />}
          {activeTab === 'monetize' && <MonetizeTab />}
        </div>
      )}

      {/* Bottom nav */}
      <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors',
              activeTab === tab.id ? 'text-[#fe2c55]' : 'text-zinc-500'
            )}
          >
            {activeTab === tab.id && <div className="absolute top-0 w-8 h-0.5 bg-[#fe2c55] rounded-b-full" />}
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Modals */}
      <PreviewModal />
      <EditTitleModal />
    </div>
  );
}
