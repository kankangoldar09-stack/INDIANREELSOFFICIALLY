import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Music2, Play, Pause, X, Upload, Search } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Sound {
  id: string;
  song_name: string;
  artist_name: string;
  image_url: string;
  preview_url: string;
}

interface ProfileMusicSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileMusicSettings({ open, onOpenChange }: ProfileMusicSettingsProps) {
  const { profile, refreshProfile } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<any>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [tracks, setTracks] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (profile && open) {
      setEnabled(profile.profile_music_enabled || false);
      if (profile.profile_music_title) {
        setCurrentMusic({
          title: profile.profile_music_title,
          artist: profile.profile_music_artist,
          thumbnail: profile.profile_music_thumbnail_url,
          audioUrl: profile.profile_music_custom_url
        });
      }
    }
  }, [profile, open]);

  useEffect(() => {
    if (showLibrary) {
      fetchTracks();
    }
  }, [showLibrary]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('music_library')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load music library');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ profile_music_enabled: checked })
        .eq('id', profile.id);

      if (error) throw error;
      setEnabled(checked);
      await refreshProfile();
      toast.success(checked ? 'Profile music enabled' : 'Profile music disabled');
    } catch (error) {
      console.error('Error updating profile music:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTrack = async (track: Sound) => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          profile_music_track_id: track.id,
          profile_music_title: track.song_name,
          profile_music_artist: track.artist_name,
          profile_music_thumbnail_url: track.image_url,
          profile_music_custom_url: track.preview_url,
          profile_music_enabled: true
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setCurrentMusic(track);
      setEnabled(true);
      setShowLibrary(false);
      await refreshProfile();
      toast.success('Profile music updated!');
    } catch (error) {
      console.error('Error setting profile music:', error);
      toast.error('Failed to set profile music');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMusic = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          profile_music_track_id: null,
          profile_music_title: null,
          profile_music_artist: null,
          profile_music_thumbnail_url: null,
          profile_music_custom_url: null,
          profile_music_enabled: false
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setCurrentMusic(null);
      setEnabled(false);
      await refreshProfile();
      toast.success('Profile music removed');
    } catch (error) {
      console.error('Error removing profile music:', error);
      toast.error('Failed to remove profile music');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = (track: Sound) => {
    if (audioRef) {
      audioRef.pause();
      setAudioRef(null);
    }

    if (previewingId === track.id) {
      setPreviewingId(null);
      return;
    }

    const audio = new Audio(track.preview_url);
    audio.volume = 0.5;
    audio.play();
    setPreviewingId(track.id);
    setAudioRef(audio);

    audio.onended = () => {
      setPreviewingId(null);
      setAudioRef(null);
    };
  };

  const filteredTracks = tracks.filter(track =>
    track.song_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            Profile Music
          </DialogTitle>
        </DialogHeader>

        {!showLibrary ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="font-bold text-sm">Enable Profile Music</p>
                <p className="text-xs text-muted-foreground">Auto-play when visitors view your profile</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={saving || !currentMusic}
              />
            </div>

            {/* Current Music */}
            {currentMusic ? (
              <div className="space-y-4">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Current Music</p>
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                  <img 
                    src={currentMusic.thumbnail} 
                    alt={currentMusic.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{currentMusic.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentMusic.artist}</p>
                  </div>
                  <Music2 className="w-5 h-5 text-primary" />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowLibrary(true)}
                  >
                    Change Music
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveMusic}
                    disabled={saving}
                  >
                    {saving ? <IndianSpinner size="sm" /> : <X className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Music2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="font-bold mb-2">No Music Selected</p>
                <p className="text-sm text-muted-foreground mb-6">Choose a track from your library</p>
                <Button onClick={() => setShowLibrary(true)}>
                  Browse Music Library
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLibrary(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
                <p className="font-bold text-sm">Select Music</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tracks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="w-14 h-14 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTracks.length === 0 ? (
                <div className="text-center py-12">
                  <Music2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="font-bold">No tracks found</p>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {filteredTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors group"
                      onClick={() => handleSelectTrack(track)}
                    >
                      <img
                        src={track.image_url}
                        alt={track.song_name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                          {track.song_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(track);
                        }}
                      >
                        {previewingId === track.id ? (
                          <Pause className="w-5 h-5 text-primary" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
