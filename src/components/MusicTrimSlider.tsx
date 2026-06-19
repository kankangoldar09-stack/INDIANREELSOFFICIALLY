import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Check, X, Music2, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

interface MusicTrimSliderProps {
  sound: Sound;
  onConfirm: (startTime: number) => void;
  onCancel: () => void;
}

export default function MusicTrimSlider({ sound, onConfirm, onCancel }: MusicTrimSliderProps) {
  const [startTime, setStartTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recommendedPoints, setRecommendedPoints] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const PIXELS_PER_SECOND = 40;
  const VIEWPORT_WIDTH = 300; // Fixed width of the "window"

  // We use the previewUrl for trimming if available, otherwise audioUrl
  const audioSource = sound.previewUrl || (sound.audioUrl?.startsWith('http') && !sound.audioUrl.includes('t.me/') ? sound.audioUrl : '');

  useEffect(() => {
    if (!audioSource) return;
    const audio = new Audio(audioSource);
    audioRef.current = audio;
    audio.loop = true;

    audio.onloadedmetadata = () => {
      const d = audio.duration;
      setDuration(d);
      
      const p1 = Math.floor(d * 0.2);
      const p2 = Math.floor(d * 0.45);
      const p3 = Math.floor(d * 0.75);
      setRecommendedPoints([p1, p2, p3]);
      
      // Default to the first main point
      const initialStart = p1;
      setStartTime(initialStart);
      setScrollLeft(initialStart * PIXELS_PER_SECOND);
      
      audio.currentTime = initialStart;
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
      
      setIsReady(true);
    };

    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioSource]);

  // Sync scroll with startTime
  useEffect(() => {
    if (!isDragging) {
      setScrollLeft(startTime * PIXELS_PER_SECOND);
    }
  }, [startTime, isDragging]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = startTime;
      audioRef.current.play().catch(console.error);
    }
  };

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
    if (audioRef.current) audioRef.current.pause();
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = dragStartX - clientX;
    const newScrollLeft = Math.max(0, Math.min(scrollLeft + deltaX, duration * PIXELS_PER_SECOND));
    
    setScrollLeft(newScrollLeft);
    setDragStartX(clientX);
    
    const newStartTime = newScrollLeft / PIXELS_PER_SECOND;
    setStartTime(newStartTime);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play().catch(console.error);
    }
  };

  // Generate waveform bars once
  const waveformBars = useRef<number[]>([]);
  if (waveformBars.current.length === 0) {
    waveformBars.current = Array.from({ length: 150 }, () => Math.random() * 60 + 20);
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-[70] flex flex-col items-center justify-center p-6 text-white animate-in fade-in zoom-in duration-300 select-none touch-none">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg">Adjust Music</span>
          <button onClick={() => onConfirm(startTime)} className="p-2 bg-primary text-primary-foreground rounded-full transition-colors">
            <Check className="w-6 h-6" />
          </button>
        </div>

        {/* Info */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group">
            <img src={sound.thumbnail} alt={sound.title} className="w-full h-full object-cover" />
            <button 
              onClick={togglePlay}
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isPlaying ? <Pause className="w-12 h-12 fill-white" /> : <Play className="w-12 h-12 fill-white pl-1" />}
            </button>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-black truncate max-w-[280px]">{sound.title}</h2>
            <p className="text-zinc-400 font-medium">{sound.artist}</p>
          </div>
        </div>

        {/* Draggable Waveform Trimmer */}
        <div className="w-full space-y-6 flex flex-col items-center">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-full flex justify-between px-2">
            <span>{Math.floor(startTime)}s</span>
            <span>{Math.floor(duration)}s Total</span>
          </div>

          <div 
            className="relative w-full h-24 bg-zinc-900/50 rounded-2xl border border-zinc-800 flex items-center overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
            onTouchEnd={handleDragEnd}
          >
            {/* Center Indicator Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-primary z-20 rounded-full shadow-[0_0_15px_rgba(254,44,85,0.8)] -translate-x-1/2" />
            
            {/* Waveform Container */}
            <div 
              className="absolute h-full flex items-center gap-1 px-[50%]"
              style={{ 
                transform: `translateX(-${scrollLeft}px)`,
                width: `${duration * PIXELS_PER_SECOND}px`
              }}
            >
              {Array.from({ length: Math.ceil(duration * 10) }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-[3px] rounded-full transition-colors",
                    (i/10) >= startTime && (i/10) < startTime + 15 
                      ? "bg-primary shadow-[0_0_5px_rgba(254,44,85,0.3)]" 
                      : "bg-zinc-700"
                  )} 
                  style={{ 
                    height: `${waveformBars.current[i % waveformBars.current.length]}%`,
                    minHeight: '4px'
                  }} 
                />
              ))}
              
              {/* Highlight Points on Waveform */}
              {recommendedPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="absolute bottom-0 w-4 h-4 bg-primary rounded-full border-2 border-zinc-900 -translate-x-1/2 translate-y-1/2 shadow-lg"
                  style={{ left: `${point * PIXELS_PER_SECOND}px` }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-primary font-bold">
               <div className="flex gap-0.5 items-end h-3">
                  <div className="w-0.5 bg-primary animate-[music-wave_0.6s_ease-in-out_infinite]" />
                  <div className="w-0.5 bg-primary animate-[music-wave_0.9s_ease-in-out_infinite_0.1s]" />
                  <div className="w-0.5 bg-primary animate-[music-wave_0.7s_ease-in-out_infinite_0.2s]" />
                </div>
                <span className="text-xs uppercase tracking-tighter font-black">Drag to adjust start point</span>
            </div>
            
            {/* Quick jump points */}
            <div className="flex gap-2">
              {recommendedPoints.map((point, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setStartTime(point);
                    setScrollLeft(point * PIXELS_PER_SECOND);
                    if (audioRef.current) {
                      audioRef.current.currentTime = point;
                      audioRef.current.play().catch(console.error);
                    }
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
                    Math.abs(startTime - point) < 0.5 
                      ? "bg-primary border-primary text-white" 
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  )}
                >
                  Point {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button 
          onClick={() => onConfirm(startTime)}
          className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-14 rounded-2xl text-lg shadow-xl active:scale-95 transition-transform"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
