import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { WatchHistory } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, ChevronLeft, Play } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function WatchHistoryPage() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, [profile]);

  const fetchHistory = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('watch_history' as any)
        .select('*, reels(*), posts(*)')
        .eq('user_id', profile.id)
        .order('watched_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      toast.error(`Error loading history: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!profile) return;
    try {
      const { error } = await (supabase as any).from('watch_history').delete().eq('user_id', profile.id);
      if (error) throw error;
      setHistory([]);
      toast.success('Watch history cleared');
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Watch History</h1>
        </div>
        {history.length > 0 && (
          <Button variant="ghost" className="text-destructive font-bold h-8" onClick={clearHistory}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear All
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-24 h-32 rounded-lg bg-muted flex-shrink-0" />
              <div className="space-y-2 flex-1 pt-2">
                <Skeleton className="w-full h-4 bg-muted" />
                <Skeleton className="w-24 h-3 bg-muted" />
              </div>
            </div>
          ))
        ) : history.length > 0 ? (
          history.map((item) => {
            const content = item.reels || item.posts;
            if (!content) return null;
            return (
              <Link 
                key={item.id} 
                to={item.reel_id ? `/reels?id=${item.reel_id}` : `/feed?id=${item.post_id}`} 
                className="flex gap-4 group hover:bg-muted/50 transition-colors p-2 rounded-xl"
              >
                <div className="relative w-24 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {item.reel_id ? (
                    item.reels?.thumbnail_url ? (
                      <img src={item.reels.thumbnail_url} className="w-full h-full object-cover" alt="" />
                    ) : item.reels?.video_url ? (
                      <video
                        src={item.reels.video_url + '#t=0.5'}
                        className="w-full h-full object-cover"
                        muted playsInline preload="metadata"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <Play className="w-6 h-6 text-white/30" />
                      </div>
                    )
                  ) : item.posts?.media_url ? (
                    <img src={item.posts.media_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <Play className="w-6 h-6 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-1 pt-2">
                  <p className="text-sm font-semibold line-clamp-2">{item.reels?.caption || item.posts?.caption || 'No caption'}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.watched_at))} ago</p>
                  <span className="inline-block px-2 py-0.5 bg-muted rounded text-[10px] font-bold uppercase tracking-wider">
                    {item.reel_id ? 'Reel' : 'Post'}
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            No watch history found. Start watching reels and posts!
          </div>
        )}
      </div>
    </div>
  );
}
