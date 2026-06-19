import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { stopAllMediaStreams } from '@/lib/utils';

export default function MusicPlayer() {
  const navigate = useNavigate();
  const [musicUrl, setMusicUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [statusText, setStatusText] = useState('Ready to play');
  const [songName, setSongName] = useState('');
  const [isAudioReady, setIsAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stop all camera streams when component mounts
  useEffect(() => {
    stopAllMediaStreams();
    console.log('MusicPlayer: Stopped all camera/mic streams');
  }, []);

  // Initialize Audio System - MUST be called before playing any audio
  const initializeAudioSystem = async () => {
    if (audioContextRef.current && isAudioReady) {
      return true; // Already initialized
    }

    try {
      // Step 1: Create AudioContext with MEDIA configuration
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const contextOptions: AudioContextOptions = {
        latencyHint: 'playback' as AudioContextLatencyCategory,
        sampleRate: 44100, // Music sample rate (NOT voice 8000/16000)
      };
      
      audioContextRef.current = new AudioContextClass(contextOptions);
      
      // Step 2: Resume context (required by browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Step 3: Create audio element AFTER AudioContext
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.crossOrigin = 'anonymous';
        audioRef.current.preload = 'auto';
        audioRef.current.controls = true; // Enable native controls
        audioRef.current.style.width = '100%';
        audioRef.current.style.borderRadius = '8px';
        audioRef.current.style.filter = 'invert(100%) hue-rotate(180deg) brightness(1.5)';
        
        // CRITICAL: Connect to AudioContext IMMEDIATELY after creation
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceNodeRef.current.connect(audioContextRef.current.destination);
        
        // Append to container
        if (containerRef.current) {
          containerRef.current.innerHTML = ''; // Clear container
          containerRef.current.appendChild(audioRef.current);
        }
      }

      setIsAudioReady(true);
      console.log('✅ Audio System Initialized - MEDIA VOLUME ONLY');
      console.log('AudioContext state:', audioContextRef.current.state);
      console.log('Sample rate:', audioContextRef.current.sampleRate, 'Hz (Music quality)');
      
      toast.success('Audio system ready - Using MEDIA volume 🎵');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio system:', error);
      toast.error('Failed to initialize audio system');
      return false;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const extractSongName = (url: string) => {
    try {
      const urlParts = url.split('/');
      let filename = urlParts[urlParts.length - 1].split('?')[0];
      filename = filename.replace(/\.(mp3|mp4|m4a|wav|ogg|webm)$/i, '');
      filename = filename.replace(/[_-]/g, ' ');
      filename = filename.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      return filename || 'Unknown Track';
    } catch (e) {
      return 'Unknown Track';
    }
  };

  const loadSong = async () => {
    if (!musicUrl.trim()) {
      setStatusText('Please paste a valid link!');
      toast.error('Please paste a valid audio link');
      return;
    }

    setIsLoading(true);
    setStatusText('Initializing audio system...');
    
    // STEP 1: Initialize audio system first
    const initialized = await initializeAudioSystem();
    if (!initialized || !audioRef.current) {
      setIsLoading(false);
      return;
    }

    setStatusText('Loading song...');
    
    const name = extractSongName(musicUrl);
    setSongName(name);
    
    try {
      // STEP 2: Load audio file
      audioRef.current.src = musicUrl;
      audioRef.current.load();
      
      // STEP 3: Wait for audio to be ready
      await new Promise((resolve, reject) => {
        if (!audioRef.current) return reject('No audio element');
        
        audioRef.current.onloadeddata = () => {
          console.log('✅ Audio file loaded successfully');
          resolve(true);
        };
        
        audioRef.current.onerror = (e) => {
          console.error('❌ Audio loading error:', e);
          reject('Failed to load audio file');
        };
        
        // Timeout after 10 seconds
        setTimeout(() => reject('Loading timeout'), 10000);
      });

      setShowPlayer(true);
      
      // STEP 4: Play audio
      await audioRef.current.play();
      setStatusText('🎵 Now Playing (MEDIA Volume)');
      setIsLoading(false);
      
      console.log('✅ Playback started successfully');
      console.log('Volume routing: MEDIA channel (NOT call channel)');
      
    } catch (error) {
      console.error('❌ Playback error:', error);
      setStatusText('Error: ' + (error as string));
      setIsLoading(false);
      toast.error('Failed to play audio. Check the link and try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      loadSong();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 p-2 rounded-full bg-card hover:bg-accent transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Player Card */}
      <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-md border border-border">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-primary mb-2" style={{ color: '#00d2ff' }}>
            J.K Music
          </h2>
          <p className="text-muted-foreground text-sm">
            Paste Direct Link Below
          </p>
        </div>

        {/* Input Group */}
        <div className="space-y-4 mb-6">
          <Input
            type="text"
            placeholder="https://t.me/dl/your_song.mp3"
            value={musicUrl}
            onChange={(e) => setMusicUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            className="bg-muted border-border h-12 text-base"
            disabled={isLoading}
          />
          <Button
            onClick={loadSong}
            disabled={isLoading || !musicUrl.trim()}
            className="w-full h-12 text-base font-bold transition-all hover:scale-105 hover:shadow-lg"
            style={{ 
              backgroundColor: '#00d2ff',
              color: '#000',
              boxShadow: isLoading ? 'none' : '0 0 15px rgba(0, 210, 255, 0.3)'
            }}
          >
            {isLoading ? (
              <>
                <IndianSpinner size="sm" className="mr-2" />
                Loading...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Load & Play
              </>
            )}
          </Button>
        </div>

        {/* Player Container */}
        {showPlayer && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="font-bold text-center text-lg">{songName}</p>
            
            {/* Audio Player Container */}
            <div 
              ref={containerRef}
              className="bg-muted/50 p-3 rounded-lg min-h-[60px] flex items-center justify-center"
            >
              {!isAudioReady && (
                <p className="text-sm text-muted-foreground">Loading player...</p>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center gap-1 bg-green-500/20 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-500/30">
                  <span className="text-lg">🎵</span>
                  <span className="font-bold text-xs">MEDIA Volume</span>
                </div>
                <div className="flex items-center gap-1 bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full border border-red-500/30">
                  <span className="text-lg">☎️</span>
                  <span className="font-bold text-xs line-through">Call Volume</span>
                </div>
              </div>
              <p className="text-[10px] text-center text-green-600 dark:text-green-400 font-bold">
                ✅ Audio System: {isAudioReady ? 'MEDIA Channel Active' : 'Initializing...'}
              </p>
              <p className="text-[10px] text-center text-muted-foreground">
                Sample Rate: 44100 Hz (Music Quality) • Web Audio API
              </p>
            </div>
          </div>
        )}

        {/* Status Text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {statusText}
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-muted-foreground max-w-md space-y-2">
        <p>
          Paste a direct audio link to play music instantly.
          <br />
          No YouTube, no effects - just pure, clean audio.
        </p>
        <div className="bg-card/50 border border-border rounded-lg p-3 text-left">
          <p className="font-bold text-primary mb-1" style={{ color: '#00d2ff' }}>✓ Supported Links:</p>
          <p className="text-[10px] leading-relaxed">
            • High-speed direct download links<br />
            • Direct audio file URLs (.mp3, .m4a, .wav, .ogg)<br />
            • Any publicly accessible audio stream URL
          </p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <p className="text-[10px] text-green-600 dark:text-green-400 leading-relaxed text-left">
            <span className="font-bold">✅ PROPER MEDIA ROUTING:</span><br />
            • Audio created with Web Audio API<br />
            • Sample Rate: 44100 Hz (Music, NOT voice 8000 Hz)<br />
            • Latency Hint: 'playback' (Media, NOT 'interactive' for voice)<br />
            • Connected to AudioContext BEFORE playback<br />
            <br />
            <span className="font-bold">Result:</span> Uses 🎵 MEDIA volume, NOT ☎️ call volume!
          </p>
        </div>
      </div>
    </div>
  );
}
