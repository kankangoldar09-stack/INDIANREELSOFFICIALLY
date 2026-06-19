import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Reel } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Play, Music2, Share2, Bookmark } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function AudioPage() {
  const { reelId } = useParams();
  const navigate = useNavigate();
  const [sourceReel, setSourceReel] = useState<Reel | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reelId) {
      fetchAudioData();
    }
  }, [reelId]);

  const fetchAudioData = async () => {
    setLoading(true);
    try {
      // 1. Get the source reel that "owns" this audio
      const { data: source, error: sourceError } = await (supabase as any)
        .from('reels')
        .select(`
          *,
          profiles(*),
          views_count:watch_history(count)
        `)
        .eq('id', reelId)
        .maybeSingle();

      if (sourceError) throw sourceError;
      if (!source) return navigate('/reels');

      // Transform views_count from array/object to number
      const transformedSource = {
        ...source,
        views_count: source.views_count?.[0]?.count || 0
      };
      setSourceReel(transformedSource);

      // 2. Get all reels that use this specific audio (including the original)
      // Logic: id = reelId OR audio_source_id = reelId
      const { data: related, error: relatedError } = await (supabase as any)
        .from('reels')
        .select(`
          *,
          profiles(*),
          views_count:watch_history(count)
        `)
        .or(`id.eq.${reelId},audio_source_id.eq.${reelId}`)
        .order('created_at', { ascending: false });

      if (relatedError) throw relatedError;
      
      let enrichedReels: Reel[] = (related || []).map((r: any) => ({
        ...r,
        views_count: r.views_count?.[0]?.count || 0
      }));

      // Ensure the source reel is at the TOP (index 0)
      const sourceIndex = enrichedReels.findIndex(r => r.id === reelId);
      if (sourceIndex > 0) {
        const [targetReel] = enrichedReels.splice(sourceIndex, 1);
        enrichedReels.unshift(targetReel);
      } else if (sourceIndex === -1 && source) {
        enrichedReels.unshift(transformedSource);
      }

      setReels(enrichedReels);

    } catch (error: any) {
      toast.error('Error loading audio page');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <Skeleton className="w-10 h-10 mb-8 rounded-full" />
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-24 h-24 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!sourceReel) return null;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md px-4 h-14 flex items-center justify-between border-b border-white/10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
          <ChevronLeft className="w-7 h-7" />
        </Button>
        <span className="font-bold">Audio</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `${sourceReel.profiles?.username} · Original Audio`,
                url: window.location.href
              });
            } else {
              toast.info('Link copied to clipboard');
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-4">
        {/* Audio Info */}
        <div className="flex items-start gap-5 mb-8">
          <div className="relative group">
            <Avatar className="w-24 h-24 rounded-xl border border-white/20 shadow-xl overflow-hidden">
              <AvatarImage src={sourceReel.profiles?.profile_photo_url || ''} className="object-cover" />
              <AvatarFallback className="bg-zinc-800"><Music2 className="w-10 h-10 text-zinc-500" /></AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-8 h-8 fill-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <h1 className="text-xl font-black mb-1 leading-tight tracking-tight uppercase">
              {sourceReel.audio_title || `${sourceReel.profiles?.username} · Original Audio`}
            </h1>
            <p className="text-zinc-400 text-sm mb-4">
              {reels.length} reels
            </p>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate(`/create?audioId=${reelId}&audioName=${encodeURIComponent(sourceReel.audio_title || `${sourceReel.profiles?.username} · Original Audio`)}`)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-9 rounded-md flex-1"
              >
                Use Audio
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-9 w-9 bg-zinc-800 hover:bg-zinc-700"
                onClick={() => toast.success('Audio saved to collection')}
              >
                <Bookmark className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Reels Grid */}
        <div className="grid grid-cols-3 gap-0.5 -mx-4">
          {reels.map((reel) => (
            <Link 
              key={reel.id} 
              to={`/reels?id=${reel.id}`} 
              className="relative aspect-[3/4] bg-zinc-900 overflow-hidden group hover:opacity-90 transition-opacity"
            >
              <video 
                src={reel.video_url} 
                className="w-full h-full object-cover"
                onMouseOver={(e) => e.currentTarget.play()}
                onMouseOut={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
                muted
                autoPlay
                loop
                playsInline
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-bold">
                <Play className="w-3 h-3 fill-white" />
                {(reel.views_count || 0).toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
