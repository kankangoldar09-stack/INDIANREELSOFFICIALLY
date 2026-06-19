import { useState, useEffect, useRef } from 'react';
import { X, Search, Play, Pause, Bookmark, Flame, Star, Music2, Heart, Palmtree, Sparkles, Award, Disc, Music, PlayCircle } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import MusicTrimSlider from './MusicTrimSlider';

interface Sound {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  audioUrl: string;
  previewUrl?: string | null;
  startTime?: number;
}

interface SoundsLibraryProps {
  onClose: () => void;
  onSelectSound: (sound: Sound) => void;
}

const PLAYLISTS = [
  { id: 'trending', name: 'Trending', icon: Flame, color: 'text-red-500', bgColor: 'bg-red-50' },
  { id: 'bollywood', name: 'Featured', icon: Award, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  { id: 'punjabi', name: 'Greatest Hits', icon: Disc, color: 'text-cyan-500', bgColor: 'bg-cyan-50' },
  { id: 'love', name: 'Love', icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-50' },
  { id: 'party', name: 'New Releases', icon: Sparkles, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  { id: 'international', name: 'Travel', icon: Palmtree, color: 'text-green-500', bgColor: 'bg-green-50' },
];

export default function SoundsLibrary({ onClose, onSelectSound }: SoundsLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('discover');
  const [tracks, setTracks] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('trending');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [trimmingSound, setTrimmingSound] = useState<Sound | null>(null);
  const [favorites, setFavorites] = useState<Sound[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();

  useEffect(() => {
    fetchMusicTracks(0);
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedTab === 'favorites') {
      fetchFavorites();
    }
  }, [selectedTab, profile]);

  const fetchFavorites = async () => {
    if (!profile) return;
    setLoadingFavorites(true);
    try {
      const { data, error } = await supabase
        .from('music_favorites')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formatted: Sound[] = (data || []).map((f: any) => ({
        id: f.track_id,
        title: f.title,
        artist: f.artist,
        duration: '3:00',
        thumbnail: f.thumbnail,
        audioUrl: f.audio_url,
        previewUrl: f.preview_url
      }));
      setFavorites(formatted);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, sound: Sound) => {
    e.stopPropagation();
    if (!profile) {
      toast.error('Please login to save favorites');
      return;
    }

    const isFav = favorites.some(f => f.id === sound.id);
    
    try {
      if (isFav) {
        const { error } = await supabase
          .from('music_favorites')
          .delete()
          .eq('user_id', profile.id)
          .eq('track_id', sound.id);
        
        if (error) throw error;
        setFavorites(prev => prev.filter(f => f.id !== sound.id));
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase
          .from('music_favorites')
          .insert({
            user_id: profile.id,
            track_id: sound.id,
            title: sound.title,
            artist: sound.artist,
            thumbnail: sound.thumbnail,
            audio_url: sound.audioUrl,
            preview_url: sound.previewUrl
          } as any);
        
        if (error) throw error;
        setFavorites(prev => [sound, ...prev]);
        toast.success('Added to favorites');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Failed to update favorites');
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && searchQuery === '') {
          fetchMusicTracks(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore, page, searchQuery]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(() => {
        searchMusicTracks();
      }, 500);
      return () => clearTimeout(timer);
    } else if (searchQuery.length === 0) {
      fetchMusicTracks();
    }
  }, [searchQuery]);

  const fetchMusicTracks = async (pageNum = 0) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const pageSize = 20;
      const { data: localTracks, error: localError } = await supabase
        .from('music_library')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);

      if (localError) {
        console.error('Error fetching local tracks:', localError);
      }

      let formattedTracks: Sound[] = [];

      if (localTracks && localTracks.length > 0) {
        formattedTracks = localTracks.map((track: any) => ({
          id: track.id,
          title: track.song_name,
          artist: track.artist_name,
          duration: '3:00',
          thumbnail: track.image_url || 'https://via.placeholder.com/150',
          audioUrl: track.telegram_file_id ? `https://t.me/c/${track.telegram_file_id}` : '',
          previewUrl: track.preview_url || null
        }));
      }

      let spotifyTracks: Sound[] = [];
      if (pageNum === 0 || formattedTracks.length < pageSize) {
        const { data, error } = await supabase.functions.invoke('spotify-tracks', {
          body: { category: selectedCategory },
        });

        if (!error && data?.tracks) {
          spotifyTracks = data.tracks;
        }
      }

      const combinedTracks = pageNum === 0 
        ? [...formattedTracks, ...spotifyTracks]
        : [...tracks, ...formattedTracks];

      const uniqueTracks = combinedTracks.filter((track, index, self) =>
        index === self.findIndex((t) => t.id === track.id)
      );

      setTracks(uniqueTracks);
      setHasMore(formattedTracks.length === pageSize);
      setPage(pageNum);
      
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load songs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const searchMusicTracks = async () => {
    setLoading(true);
    try {
      const { data: localTracks } = await supabase
        .from('music_library')
        .select('*')
        .or(`song_name.ilike.%${searchQuery}%,artist_name.ilike.%${searchQuery}%`)
        .limit(20);

      let allResults: Sound[] = [];

      if (localTracks && localTracks.length > 0) {
        const formattedTracks: Sound[] = localTracks.map((track: any) => ({
          id: track.id,
          title: track.song_name,
          artist: track.artist_name,
          duration: '3:00',
          thumbnail: track.image_url || 'https://via.placeholder.com/150',
          audioUrl: track.telegram_file_id ? `https://t.me/c/${track.telegram_file_id}` : '',
          previewUrl: track.preview_url || null
        }));
        allResults = [...formattedTracks];
      }

      const { data, error } = await supabase.functions.invoke('spotify-tracks', {
        body: { query: searchQuery },
      });

      if (!error && data?.tracks) {
        allResults = [...allResults, ...data.tracks];
      }

      setTracks(allResults);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to search songs');
    } finally {
      setLoading(false);
    }
  };


  const isSoundPlayable = (sound: Sound) => {
    const url = sound.previewUrl || sound.audioUrl;
    return url && url.startsWith('http') && !url.includes('t.me/');
  };

  const handlePlayPreview = async (track: Sound, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const audioUrl = track.previewUrl || (track.audioUrl?.startsWith('http') && !track.audioUrl.includes('t.me/') ? track.audioUrl : null);

    if (!audioUrl) {
      toast.error('Audio preview not available for this song');
      setLoadingAudioId(null);
      return;
    }

    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
      setLoadingAudioId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setLoadingAudioId(track.id);
    setPlayingTrackId(null);

    const audio = new Audio(audioUrl);
    audio.loop = true;
    audioRef.current = audio;
    
    audio.onerror = () => {
      toast.error('Failed to play preview. Audio not available.');
      setPlayingTrackId(null);
      setLoadingAudioId(null);
    };
    
    audio.play().then(() => {
      if (audio.duration > 10) {
        audio.currentTime = Math.min(5, audio.duration * 0.2);
      }
      setPlayingTrackId(track.id);
      setLoadingAudioId(null);
    }).catch((err) => {
      console.error('Error playing audio:', err);
      setPlayingTrackId(null);
      setLoadingAudioId(null);
    });

    audio.onended = () => {
      setPlayingTrackId(null);
      setLoadingAudioId(null);
    };
  };


  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-zinc-950 text-zinc-100 z-[60] flex flex-col h-full overflow-hidden">
      {trimmingSound && (
        <MusicTrimSlider
          sound={trimmingSound}
          onConfirm={(startTime) => {
            onSelectSound({ ...trimmingSound, startTime });
            setTrimmingSound(null);
          }}
          onCancel={() => setTrimmingSound(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-center p-4 border-b border-zinc-800 relative bg-zinc-900/50 backdrop-blur-md shrink-0">
        <button
          onClick={onClose}
          className="absolute left-4 p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Sounds</h1>
      </div>

      {/* Search Bar */}
      <div className="p-4 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search music..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl h-11 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
          />
        </div>
      </div>

      {/* Featured Banner */}
      <div className="px-4 pb-4 shrink-0">
        <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-zinc-800">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="bg-primary/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 border border-primary/30">
                <Music2 className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">INDIANREELS</h2>
              <p className="text-[10px] mt-1 text-zinc-400 font-medium">PREMIUM MUSIC LIBRARY</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start border-b border-zinc-800 rounded-none bg-transparent p-0 h-auto px-4 shrink-0">
          <TabsTrigger 
            value="discover" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-bold text-zinc-400 data-[state=active]:text-zinc-100 transition-none"
          >
            Discover
          </TabsTrigger>
          <TabsTrigger 
            value="favorites" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-zinc-500 font-bold data-[state=active]:text-zinc-100 transition-none"
          >
            Favorites
          </TabsTrigger>
        </TabsList>


        <div className="flex-1 min-h-0 overflow-hidden relative">
          <ScrollArea className="h-full">
            <TabsContent value="discover" className="mt-0 p-4 space-y-6 pb-24">
              {/* Recommend Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black uppercase tracking-tight text-zinc-200">Featured Hits</h3>
                </div>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-2">
                        <Skeleton className="w-16 h-16 rounded-xl bg-zinc-900" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4 bg-zinc-900/50" />
                          <Skeleton className="h-3 w-1/2 bg-zinc-900/30" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : tracks.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600">
                    <Music2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-bold">No tracks found</p>
                    <p className="text-sm mt-1 uppercase tracking-widest opacity-50">Explore another vibe</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tracks.map((sound) => {
                      const isPlaying = playingTrackId === sound.id;
                      const isLoadingAudio = loadingAudioId === sound.id;
                      const isFav = favorites.some(f => f.id === sound.id);
                      return (
                        <div
                          key={sound.id}
                          onClick={() => {
                            if (!isSoundPlayable(sound)) {
                              toast.error('This sound is currently unavailable for playback');
                              return;
                            }
                            if (audioRef.current) audioRef.current.pause();
                            setTrimmingSound(sound);
                          }}
                          className="flex items-center gap-4 p-2.5 hover:bg-zinc-900/80 rounded-2xl transition-all cursor-pointer group border border-zinc-800/30 hover:border-zinc-700/50 shadow-sm"
                        >
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 shrink-0 shadow-xl border border-zinc-800/50">
                            <img src={sound.thumbnail} alt={sound.title} className={cn("w-full h-full object-cover transition-transform duration-500", isPlaying ? "scale-110" : "group-hover:scale-105")} />
                            
                            {isPlaying && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                <div className="flex gap-1 items-end h-6 pb-1">
                                  <div className="w-1 bg-primary rounded-full animate-music-bar h-2" style={{ animationDelay: '0.1s' }} />
                                  <div className="w-1 bg-primary rounded-full animate-music-bar h-5" style={{ animationDelay: '0.3s' }} />
                                  <div className="w-1 bg-primary rounded-full animate-music-bar h-3" style={{ animationDelay: '0.2s' }} />
                                  <div className="w-1 bg-primary rounded-full animate-music-bar h-6" style={{ animationDelay: '0.4s' }} />
                                </div>
                              </div>
                            )}

                            {isLoadingAudio && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                <IndianSpinner size="sm" />
                              </div>
                            )}

                            <button
                              onClick={(e) => handlePlayPreview(sound, e)}
                              className={cn(
                                "absolute inset-0 flex items-center justify-center transition-all z-10",
                                isPlaying ? "bg-transparent" : "bg-black/20 group-hover:bg-black/40 opacity-0 group-hover:opacity-100"
                              )}
                            >
                              {!isPlaying && !isLoadingAudio && <Play className="w-8 h-8 text-white fill-white drop-shadow-lg" />}
                            </button>
                          </div>

                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-[15px] font-bold text-zinc-100 truncate group-hover:text-primary transition-colors">
                                {sound.title}
                              </h4>
                              {isPlaying && (
                                <span className="bg-primary/20 text-primary text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-tighter">
                                  Live
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-zinc-400 truncate">
                                {sound.artist}
                              </span>
                              <div className="w-1 h-1 rounded-full bg-zinc-800" />
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                                {sound.duration || '0:30'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(e, sound);
                              }}
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-zinc-800/50",
                                isFav ? "text-primary bg-primary/10 border-primary/20" : "text-zinc-600 bg-transparent hover:text-zinc-300 hover:bg-zinc-800/50"
                              )}
                            >
                              <Bookmark className={cn("w-5 h-5", isFav && "fill-current")} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
                      {loadingMore && <IndianSpinner size="md" />}
                    </div>
                  </div>
                )}
              </div>

              {/* Playlist Section */}
              <div>
                <h3 className="text-lg font-bold mb-4">Playlists</h3>
                <div className="grid grid-cols-2 gap-3 pb-8">
                  {PLAYLISTS.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => setSelectedCategory(playlist.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-6 rounded-2xl border transition-all active:scale-95",
                        selectedCategory === playlist.id 
                          ? "bg-zinc-900 border-primary shadow-lg shadow-primary/10" 
                          : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3", playlist.bgColor)}>
                        <playlist.icon className={cn("w-6 h-6", playlist.color)} />
                      </div>
                      <span className="text-sm font-bold tracking-tight">{playlist.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="favorites" className="mt-0 p-4 pb-24">
              {loadingFavorites ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="w-20 h-20 rounded-xl bg-zinc-900" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 bg-zinc-900" />
                        <Skeleton className="h-3 w-1/2 bg-zinc-900" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-20 text-zinc-600">
                  <div className="bg-zinc-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                    <Bookmark className="w-10 h-10 opacity-30" />
                  </div>
                  <p className="font-bold text-zinc-400">No favorite sounds yet</p>
                  <p className="text-xs mt-1 text-zinc-600 max-w-[200px] mx-auto">Tap the bookmark icon on any track to save it here for quick access</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {favorites.map((sound) => {
                    const isPlaying = playingTrackId === sound.id;
                    const isLoadingAudio = loadingAudioId === sound.id;
                    return (
                      <div
                        key={sound.id}
                        onClick={() => {
                          if (!isSoundPlayable(sound)) {
                            toast.error('This sound is currently unavailable for playback');
                            return;
                          }
                          if (audioRef.current) audioRef.current.pause();
                          setTrimmingSound(sound);
                        }}
                        className="flex items-center gap-4 p-2 hover:bg-zinc-900/50 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-zinc-800"
                      >
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-900 shrink-0 shadow-xl group/disc">
                          <div className={cn(
                            "w-full h-full relative transition-transform duration-500",
                            isPlaying ? "animate-spin-slow scale-90" : "group-hover:scale-110"
                          )}>
                            <img src={sound.thumbnail} alt={sound.title} className={cn("w-full h-full object-cover", isPlaying && "rounded-full border-4 border-zinc-800")} />
                          </div>
                          <button
                            onClick={(e) => handlePlayPreview(sound, e)}
                            className={cn(
                              "absolute inset-0 flex items-center justify-center transition-all z-10",
                              isPlaying ? "bg-primary/20 backdrop-blur-[1px]" : "bg-black/20 group-hover:bg-black/40"
                            )}
                          >
                            {isLoadingAudio ? (
                              <IndianSpinner size="md" />
                            ) : isPlaying ? (
                              <Pause className="w-8 h-8 text-white fill-white drop-shadow-lg" />
                            ) : (
                              <Play className="w-8 h-8 text-white fill-white drop-shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-base text-zinc-100 line-clamp-1 group-hover:text-primary transition-colors">{sound.title}</h4>
                          <p className="text-sm text-zinc-500 line-clamp-1 font-medium">{sound.artist}</p>
                        </div>
                        <button 
                          className="p-2 hover:bg-zinc-800 rounded-full transition-colors group/btn"
                          onClick={(e) => toggleFavorite(e, sound)}
                        >
                          <Bookmark className="w-5 h-5 fill-primary text-primary transition-colors" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

          </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}
