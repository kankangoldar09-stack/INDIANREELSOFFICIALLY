import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, X, Minimize2, Maximize2, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileMusicPlayerProps {
  title: string;
  artist: string;
  thumbnail: string;
  audioUrl: string;
  autoPlay?: boolean;
  onPlayCountIncrement?: () => void;
}

export default function ProfileMusicPlayer({
  title,
  artist,
  thumbnail,
  audioUrl,
  autoPlay = true,
  onPlayCountIncrement
}: ProfileMusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasIncrementedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.loop = true;
    audio.volume = volume / 100;
    audioRef.current = audio;

    if (autoPlay) {
      audio.play().then(() => {
        setIsPlaying(true);
        if (!hasIncrementedRef.current && onPlayCountIncrement) {
          onPlayCountIncrement();
          hasIncrementedRef.current = true;
        }
      }).catch((error) => {
        console.error('Auto-play failed:', error);
      });
    }

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl, autoPlay]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        if (!hasIncrementedRef.current && onPlayCountIncrement) {
          onPlayCountIncrement();
          hasIncrementedRef.current = true;
        }
      });
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform animate-pulse"
        onClick={() => setIsMinimized(false)}
      >
        <Music2 className="w-6 h-6 text-primary-foreground" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4">
      <div className="max-w-md mx-auto bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={thumbnail}
            alt={title}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{artist}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          <div className="flex-1 flex items-center gap-2">
            <Music2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">
              {volume}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
