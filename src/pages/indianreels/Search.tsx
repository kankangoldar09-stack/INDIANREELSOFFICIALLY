import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import IndianReelsLayout from '@/components/layouts/IndianReelsLayout';

const TEAL = '#00BFA5';

const TRENDING = ['#IndianReels', '#BollywoodDance', '#DesiVibes', '#Mumbai', '#Cricket2024', '#Foodie'];

export default function IRSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  // load random posts grid for discover
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('posts')
        .select('id, media_url, owner_id')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12);
      if (data) setPosts(data.filter((p: any) => !/\.(mp4|mov|webm)/i.test(p.media_url || '')));
    })();
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, username, full_name, profile_photo_url, is_verified')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(12);
    setResults(data || []);
    setLoading(false);
  };

  return (
    <IndianReelsLayout>
      <div className="bg-[#f0f2f5] min-h-full">

        {/* Search bar */}
        <div className="bg-white px-4 py-3 sticky top-0 z-10 border-b border-zinc-100">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-full px-4 h-10">
            <SearchIcon className="w-4 h-4 shrink-0" style={{ color: TEAL }} />
            <input
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Users, posts khojo..."
              className="flex-1 bg-transparent text-[14px] text-zinc-700 outline-none placeholder:text-zinc-400"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); }}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {query ? (
          /* Search results */
          <div className="bg-white">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="w-12 h-12 rounded-full bg-zinc-100" />
                  <div className="space-y-1.5"><Skeleton className="w-28 h-3 rounded bg-zinc-100" /><Skeleton className="w-20 h-2.5 rounded bg-zinc-100" /></div>
                </div>
              ))
              : results.length === 0
                ? <p className="text-center text-zinc-400 text-sm py-12">Koi result nahi mila</p>
                : results.map(user => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                    onClick={() => navigate(`/profile/${user.username}`)}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.profile_photo_url || ''} className="object-cover" />
                      <AvatarFallback style={{ background: TEAL, color: 'white' }} className="font-bold">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-[14px] font-semibold text-zinc-800 leading-tight flex items-center gap-1">
                        {user.full_name || user.username}
                        {user.is_verified && <span className="text-xs">✅</span>}
                      </p>
                      <p className="text-[12px] text-zinc-400">@{user.username}</p>
                    </div>
                  </button>
                ))
            }
          </div>
        ) : (
          <>
            {/* Trending tags */}
            <div className="bg-white mb-2 px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" style={{ color: TEAL }} />
                <span className="text-[13px] font-bold text-zinc-700">Trending</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRENDING.map(tag => (
                  <button
                    key={tag}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                    style={{ background: `${TEAL}18`, color: TEAL }}
                    onClick={() => handleSearch(tag.replace('#', ''))}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Discover grid */}
            <div className="bg-white px-3 py-3">
              <p className="text-[13px] font-bold text-zinc-700 mb-3">Discover</p>
              <div className="grid grid-cols-3 gap-1">
                {posts.map(p => (
                  <div key={p.id} className="aspect-square overflow-hidden rounded-lg bg-zinc-100">
                    <img src={p.media_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </IndianReelsLayout>
  );
}
