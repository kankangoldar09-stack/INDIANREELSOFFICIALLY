import { useState, useRef, useEffect } from 'react';
import { X, Music, RotateCw, Gauge, Sparkles, Palette, Timer, Zap, Image as ImageIcon, Circle, Disc, Music2, RefreshCw, MicOff, VideoOff } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SoundsLibrary from './SoundsLibrary';
import { cn } from '@/lib/utils';
import { supabase } from '../db/supabase';

interface TikTokCameraProps {
  onClose: () => void;
  onCapture: (file: File, selectedSound?: Sound | null) => void;
  preselectedAudioId?: string | null;
  preselectedAudioTitle?: string | null;
}

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

const FILTERS = [
  { name: 'Normal', filter: 'none' },
  { name: 'Clarendon', filter: 'contrast(1.2) saturate(1.35)' },
  { name: 'Gingham', filter: 'brightness(1.05) hue-rotate(-10deg)' },
  { name: 'Juno', filter: 'contrast(1.2) saturate(1.4) brightness(1.1)' },
  { name: 'Lark', filter: 'contrast(0.9) brightness(1.1)' },
  { name: 'Valencia', filter: 'contrast(1.08) brightness(1.08) sepia(0.08)' },
];

const AI_LENSES = [
  { 
    id: 'normal', 
    name: 'None', 
    icon: '🚫', 
    thumbnail: null,
    filter: 'none', 
    effect: null, 
    animation: null 
  },
  { 
    id: 'glitch', 
    name: 'Glitch', 
    icon: '⚡', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_e7b6c148-3264-47bb-91f0-e35d6d2f2582.jpg',
    filter: 'none', 
    effect: 'glitch', 
    animation: 'glitch' 
  },
  { 
    id: 'blackwhite', 
    name: 'Black & White', 
    icon: '⚫', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d4faafde-a96d-47fd-8962-7c5ecd81bc0a.jpg',
    filter: 'grayscale(1) contrast(1.2)', 
    effect: null, 
    animation: null 
  },
  { 
    id: 'motion', 
    name: 'Motion Blur', 
    icon: '💨', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_6f426622-31de-4801-b336-dfcbab1527b6.jpg',
    filter: 'none', 
    effect: 'motion', 
    animation: 'motion' 
  },
  { 
    id: 'zoom', 
    name: 'Zoom Pulse', 
    icon: '🔍', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c8828203-e973-4e5f-9c55-8b09c3da2729.jpg',
    filter: 'none', 
    effect: null, 
    animation: 'zoom' 
  },
  { 
    id: 'shake', 
    name: 'Shake', 
    icon: '📳', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_67730d00-eaa3-4aba-961b-6696b44fb0da.jpg',
    filter: 'none', 
    effect: null, 
    animation: 'shake' 
  },
  { 
    id: 'rgb', 
    name: 'RGB Split', 
    icon: '🌈', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_3f4961da-23da-4f21-a9ee-8d273f68c200.jpg',
    filter: 'none', 
    effect: null, 
    animation: 'rgb-split' 
  },
  { 
    id: 'vhs', 
    name: 'VHS Retro', 
    icon: '📼', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_069db091-cb9d-41b9-911d-6716cb988151.jpg',
    filter: 'sepia(0.5) contrast(1.2) brightness(0.9)', 
    effect: null, 
    animation: 'vhs' 
  },
  { 
    id: 'vintage', 
    name: 'Vintage', 
    icon: '📷', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_38730ff5-5e71-4647-8ac5-14a7b56c3619.jpg',
    filter: 'sepia(0.8) contrast(1.1) brightness(0.95) saturate(0.8)', 
    effect: null, 
    animation: null 
  },
  { 
    id: 'neon', 
    name: 'Neon Glow', 
    icon: '💡', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_3d522b4b-f62d-4983-8af2-4ff43417847b.jpg',
    filter: 'saturate(2) contrast(1.3) brightness(1.2)', 
    effect: null, 
    animation: 'neon-pulse' 
  },
  { 
    id: 'bollywood', 
    name: 'Bollywood Glow', 
    icon: '🌟', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b6896a65-a02e-4137-b766-a49e0327beee.jpg',
    filter: 'saturate(1.5) contrast(1.1) brightness(1.1) sepia(0.1)', 
    effect: 'glow', 
    animation: null 
  },
  { 
    id: 'glasses', 
    name: 'Cool Glasses', 
    icon: '🕶️', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c756579e-63e5-43a1-8396-d862eec6c7e8.jpg',
    filter: 'none', 
    effect: 'glasses', 
    animation: null 
  },
  { 
    id: 'crown', 
    name: 'Royal Crown', 
    icon: '👑', 
    thumbnail: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_506c26e4-ae04-43d7-a166-f766050ab424.jpg',
    filter: 'none', 
    effect: 'crown', 
    animation: null 
  },
];

export default function TikTokCamera({ onClose, onCapture, preselectedAudioId, preselectedAudioTitle }: TikTokCameraProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState<15 | 60 | 'Photo'>(15);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(
    preselectedAudioTitle ? { id: preselectedAudioId || '', title: preselectedAudioTitle, artist: '', duration: '', thumbnail: '', audioUrl: '' } : null
  );
  const [beautyLevel, setBeautyLevel] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showSoundsLibrary, setShowSoundsLibrary] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAILenses, setShowAILenses] = useState(false);
  const [selectedAILens, setSelectedAILens] = useState(0);
  const [aiFilterString, setAiFilterString] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [faceLandmarker, setFaceLandmarker] = useState<any>(null);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [isCameraDisabled, setIsCameraDisabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (audioRef.current && selectedSound) {
      audioRef.current.load();
    }
  }, [selectedSound]);

  useEffect(() => {
    startCamera();
    initializeMediaPipe();
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceLandmarker) {
        faceLandmarker.close();
      }
    };
  }, [facingMode]);

  useEffect(() => {
    const fetchPreselectedAudio = async () => {
      if (preselectedAudioId && (!selectedSound || !selectedSound.previewUrl)) {
        setIsAudioLoading(true);
        try {
          console.log('Fetching preselected audio for ID:', preselectedAudioId);
          
          // 1. Try local music library
          const { data: localTrack } = await supabase
            .from('music_library')
            .select('*')
            .eq('id', preselectedAudioId)
            .maybeSingle();
            
          if (localTrack) {
            console.log('Found in music_library:', localTrack.song_name);
            setSelectedSound({
              id: localTrack.id,
              title: localTrack.song_name,
              artist: localTrack.artist_name,
              duration: '3:00',
              thumbnail: localTrack.image_url || '',
              audioUrl: '',
              previewUrl: localTrack.preview_url || null
            });
            return;
          }

          // 2. Try Reels table (for "Original Audio")
          const { data: reelTrack } = await supabase
            .from('reels')
            .select('*, profiles(username, profile_photo_url)')
            .eq('id', preselectedAudioId)
            .maybeSingle();

          if (reelTrack) {
            console.log('Found in reels (Original Audio):', reelTrack.caption);
            setSelectedSound({
              id: reelTrack.id,
              title: reelTrack.audio_title || `${reelTrack.profiles?.username} · Original Audio`,
              artist: reelTrack.profiles?.username || '',
              duration: '0:15',
              thumbnail: reelTrack.thumbnail_url || reelTrack.profiles?.profile_photo_url || '',
              audioUrl: '',
              previewUrl: reelTrack.audio_url || reelTrack.video_url || null
            });
            return;
          }

          // 3. If not in local/reels, it might be a global Spotify track
          if (preselectedAudioTitle) {
            console.log('Searching Spotify for:', preselectedAudioTitle);
            const { data, error } = await supabase.functions.invoke('spotify-tracks', {
              body: { query: preselectedAudioTitle },
            });
            
            if (!error && data?.tracks?.length > 0) {
              const track = data.tracks.find((t: any) => t.id === preselectedAudioId) || data.tracks[0];
              console.log('Found on Spotify:', track.title);
              setSelectedSound(track);
            }
          }
        } catch (err) {
          console.error('Error fetching preselected audio:', err);
        } finally {
          setIsAudioLoading(false);
        }
      }
    };
    fetchPreselectedAudio();
  }, [preselectedAudioId]);

  useEffect(() => {
    if (preselectedAudioTitle && !selectedSound) {
      setSelectedSound({ id: preselectedAudioId || '', title: preselectedAudioTitle, artist: '', duration: '', thumbnail: '', audioUrl: '', previewUrl: '' });
    }
  }, [preselectedAudioTitle, preselectedAudioId]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Flash control
  useEffect(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities() as any;
      if (capabilities.torch) {
        videoTrack.applyConstraints({
          advanced: [{ torch: flashEnabled } as any]
        }).catch(() => {
          // Torch not supported
        });
      }
    }
  }, [flashEnabled]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Apply playback speed
        videoRef.current.playbackRate = speed;
      }
    } catch (err) {
      toast.error('कैमरा एक्सेस नहीं मिल सका');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }
  };

  const pauseCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        // Disable both video and audio tracks
        track.enabled = false;
        console.log(`${track.kind} track disabled`);
      });
    }
    setIsCameraDisabled(true);
    toast.info('Camera and microphone paused');
  };

  const resumeCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        // Re-enable both video and audio tracks
        track.enabled = true;
        console.log(`${track.kind} track enabled`);
      });
    }
    setIsCameraDisabled(false);
  };

  const initializeMediaPipe = async () => {
    try {
      // Load MediaPipe script dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js';
      script.type = 'module';
      document.head.appendChild(script);

      await new Promise((resolve) => {
        script.onload = resolve;
      });

      // Wait for MediaPipe to be available on window
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // @ts-ignore - MediaPipe loaded via CDN
      const { FaceLandmarker, FilesetResolver } = window.MediaPipeVision || {};

      if (!FaceLandmarker || !FilesetResolver) {
        throw new Error('MediaPipe not loaded');
      }

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });

      setFaceLandmarker(landmarker);
      console.log('✅ MediaPipe Face Landmarker initialized!');
      toast.success('AR Face Tracking Ready!');
    } catch (error) {
      console.error('❌ MediaPipe initialization failed:', error);
      toast.error('AR tracking unavailable');
    }
  };

  const renderFaceEffects = (results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      
      // Apply selected effect
      if (currentEffect === 'glasses') {
        drawGlasses(ctx, landmarks, canvas.width, canvas.height);
      } else if (currentEffect === 'crown') {
        drawCrown(ctx, landmarks, canvas.width, canvas.height);
      } else if (currentEffect === 'glow') {
        drawGlowEffect(ctx, landmarks, canvas.width, canvas.height);
      }
    }
  };

  const drawGlasses = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    // Left eye center: landmark 33, Right eye center: landmark 263
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    
    const eyeDistance = Math.sqrt(
      Math.pow((rightEye.x - leftEye.x) * width, 2) + 
      Math.pow((rightEye.y - leftEye.y) * height, 2)
    );
    
    // Draw cool sunglasses
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    
    const glassWidth = eyeDistance * 0.6;
    const glassHeight = eyeDistance * 0.4;
    
    // Left lens
    ctx.beginPath();
    ctx.ellipse(leftEye.x * width, leftEye.y * height, glassWidth, glassHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Right lens
    ctx.beginPath();
    ctx.ellipse(rightEye.x * width, rightEye.y * height, glassWidth, glassHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Bridge
    ctx.beginPath();
    ctx.moveTo(leftEye.x * width + glassWidth, leftEye.y * height);
    ctx.lineTo(rightEye.x * width - glassWidth, rightEye.y * height);
    ctx.stroke();
  };

  const drawCrown = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    // Forehead landmark: 10
    const forehead = landmarks[10];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    
    const eyeDistance = Math.sqrt(
      Math.pow((rightEye.x - leftEye.x) * width, 2) + 
      Math.pow((rightEye.y - leftEye.y) * height, 2)
    );
    
    const crownX = forehead.x * width;
    const crownY = forehead.y * height - eyeDistance * 0.5;
    const crownWidth = eyeDistance * 1.2;
    const crownHeight = eyeDistance * 0.6;
    
    // Draw crown
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(crownX - crownWidth / 2, crownY + crownHeight);
    ctx.lineTo(crownX - crownWidth / 3, crownY);
    ctx.lineTo(crownX - crownWidth / 6, crownY + crownHeight / 2);
    ctx.lineTo(crownX, crownY - crownHeight / 4);
    ctx.lineTo(crownX + crownWidth / 6, crownY + crownHeight / 2);
    ctx.lineTo(crownX + crownWidth / 3, crownY);
    ctx.lineTo(crownX + crownWidth / 2, crownY + crownHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Add jewels
    ctx.fillStyle = '#FF0000';
    const jewelSize = eyeDistance * 0.05;
    ctx.beginPath();
    ctx.arc(crownX, crownY - crownHeight / 4, jewelSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawGlowEffect = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    // Draw soft glow around face
    const noseTip = landmarks[1];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    
    const faceRadius = Math.sqrt(
      Math.pow((rightCheek.x - leftCheek.x) * width, 2) + 
      Math.pow((rightCheek.y - leftCheek.y) * height, 2)
    ) / 2;
    
    const gradient = ctx.createRadialGradient(
      noseTip.x * width, noseTip.y * height, faceRadius * 0.5,
      noseTip.x * width, noseTip.y * height, faceRadius * 1.5
    );
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  const processVideoFrame = async () => {
    if (!faceLandmarker || !videoRef.current || videoRef.current.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const video = videoRef.current;
    const currentTime = video.currentTime;

    // Only process if video time has changed (new frame)
    if (currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = currentTime;

      try {
        const results = faceLandmarker.detectForVideo(video, performance.now());
        renderFaceEffects(results);
      } catch (error) {
        console.error('Face detection error:', error);
      }
    }

    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  };

  useEffect(() => {
    if (faceLandmarker && currentEffect) {
      processVideoFrame();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [faceLandmarker, currentEffect]);

  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const startRecording = () => {
    // Unlock audio for browsers that block play() outside of direct user action
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.muted = true;
      audio.play().then(() => {
        audio.pause();
        audio.muted = false;
      }).catch(() => {});
    }

    if (timerSeconds > 0) {
      // Start countdown
      setCountdown(timerSeconds);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            actuallyStartRecording();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      actuallyStartRecording();
    }
  };

  const actuallyStartRecording = () => {
    console.log('Starting actual recording...');
    if (!videoRef.current?.srcObject) {
      console.error('No video stream available');
      return;
    }
    
    // Play audio if selected
    if (selectedSound && audioRef.current) {
      const audio = audioRef.current;
      console.log('Attempting to play selected sound:', selectedSound.title);
      console.log('Audio Source URL:', audio.src);
      
      if (!audio.src || audio.src === window.location.href) {
        console.error('Audio source is invalid or empty');
        toast.error("Audio not loaded yet. Please wait a second.");
        return;
      }

      audio.currentTime = selectedSound.startTime || 0;
      audio.playbackRate = speed;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Audio playing successfully');
        }).catch(err => {
          console.error("Audio play failed detailed error:", err);
          if (err.name === 'NotAllowedError') {
            toast.error("Please tap anywhere to enable audio recording");
          } else {
            toast.error(`Audio error: ${err.message || 'Check your connection'}`);
          }
        });
      }
    } else if (selectedSound) {
      console.warn('Selected sound exists but audioRef.current is missing');
      toast.error("Audio system is still initializing...");
    }

    const recorder = new MediaRecorder(videoRef.current.srcObject as MediaStream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `reel_${Date.now()}.webm`, { type: 'video/webm' });
      onCapture(file, selectedSound);
      
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
    
    recorder.start();
    setIsRecording(true);

    // Auto-stop after duration
    if (recordingDuration !== 'Photo') {
      const duration = recordingDuration === 15 ? 15000 : 60000;
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, duration);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const applyAILens = async (index: number) => {
    setSelectedAILens(index);
    const lens = AI_LENSES[index];
    
    // Set the effect for MediaPipe rendering
    setCurrentEffect(lens.effect);
    setCurrentAnimation(lens.animation);
    
    // Apply CSS filter
    setAiFilterString(lens.filter);
    toast.success(`${lens.name} applied!`);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, null);
      }
    }, 'image/jpeg');
  };

  const openGallery = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        onCapture(file, selectedSound);
      }
    };
    input.click();
  };

  const handleAutoSelect = async () => {
    try {
      toast.info('Auto-selecting random song...', { id: 'auto-select' });
      
      // 1. Get total count of songs first
      const { count } = await supabase
        .from('music_library')
        .select('*', { count: 'exact', head: true });

      let randomOffset = 0;
      if (count && count > 0) {
        randomOffset = Math.floor(Math.random() * count);
      }

      // 2. Fetch a random song from music library using offset
      const { data: songs } = await supabase
        .from('music_library')
        .select('*')
        .range(randomOffset, randomOffset);

      let randomSong = null;
      if (songs && songs.length > 0) {
        randomSong = {
          id: songs[0].id,
          title: songs[0].song_name,
          artist: songs[0].artist_name,
          duration: '3:00',
          thumbnail: songs[0].image_url || '',
          audioUrl: '',
          previewUrl: songs[0].preview_url || null
        };
      }

      toast.success('Song selected! Now pick a video from your gallery.', { id: 'auto-select' });

      // 2. Open gallery for video selection
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          onCapture(file, randomSong);
        }
      };
      input.click();
    } catch (error) {
      console.error('Auto-select error:', error);
      toast.error('Auto-select failed');
    }
  };


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {showSoundsLibrary && (
        <SoundsLibrary
          onClose={() => {
            setShowSoundsLibrary(false);
            resumeCamera();
          }}
          onSelectSound={(sound) => {
            setSelectedSound(sound);
            setShowSoundsLibrary(false);
            resumeCamera();
            toast.success(`Selected: ${sound.title}`);
          }}
        />
      )}

      <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Preview */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className={cn(
          "absolute inset-0 w-full h-full object-cover pointer-events-none",
          facingMode === 'user' ? 'scale-x-[-1]' : '',
          currentAnimation === 'glitch' && 'animate-glitch',
          currentAnimation === 'shake' && 'animate-shake',
          currentAnimation === 'zoom' && 'animate-zoom-pulse',
          currentAnimation === 'rgb-split' && 'animate-rgb-split',
          currentAnimation === 'vhs' && 'animate-vhs',
          currentAnimation === 'neon-pulse' && 'animate-neon-pulse'
        )}
        style={{ 
          filter: `brightness(${1 + beautyLevel * 0.1}) ${FILTERS[selectedFilter].filter} ${aiFilterString}`,
          transition: 'filter 0.3s ease-in-out'
        }}
      />
      
      {/* Motion Blur Overlay */}
      {currentAnimation === 'motion' && (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-5 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-motion-blur" />
      )}
      
      {/* MediaPipe AR Canvas (overlays video for AR effects) */}
      <canvas 
        ref={canvasRef}
        className={cn(
          "absolute inset-0 w-full h-full object-cover pointer-events-none z-10 transition-opacity duration-300",
          facingMode === 'user' ? 'scale-x-[-1]' : ''
        )}
      />

      {/* Camera Disabled Overlay */}
      {isCameraDisabled && (
        <div className="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center gap-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <VideoOff className="w-10 h-10 text-white" />
            </div>
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <MicOff className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Music className="w-10 h-10 text-primary" />
          </div>
          <p className="text-white text-lg font-medium">Selecting Music...</p>
          <p className="text-white/70 text-sm">Camera and microphone paused</p>
        </div>
      )}

      {/* Recording Timer */}
      {isRecording && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
          <Circle className="w-3 h-3 fill-current animate-pulse" />
          {formatTime(recordingTime)}
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="text-white text-9xl font-black animate-pulse">{countdown}</div>
        </div>
      )}

      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-7 h-7 text-white" />
        </button>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Music button clicked');
            pauseCamera();
            setShowSoundsLibrary(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Music button touched');
            pauseCamera();
            setShowSoundsLibrary(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors active:scale-95 min-h-[44px] cursor-pointer touch-manipulation"
          type="button"
        >
          <Music className="w-5 h-5 text-white pointer-events-none" />
          <span className="text-white text-sm font-medium pointer-events-none">
            {selectedSound?.title || 'Add Music'}
          </span>
        </button>
        <div className="w-10" />
      </div>

      {/* Right Side Controls */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-5 items-center">
        {showToolbar && (
          <div className="flex flex-col gap-5 animate-in slide-in-from-right-full duration-300">
            <button onClick={handleAutoSelect} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30 animate-pulse">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <span className="text-white text-[10px] font-medium shadow-sm">Auto Select</span>
            </button>

            <button onClick={flipCamera} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <RotateCw className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-[10px] font-medium shadow-sm">Flip</span>
            </button>

            <button onClick={() => setSpeed(speed === 1 ? 0.5 : speed === 0.5 ? 2 : 1)} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Gauge className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-[10px] font-medium shadow-sm">{speed}x</span>
            </button>

            <button onClick={() => setBeautyLevel((beautyLevel + 1) % 4)} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className={`w-5 h-5 ${beautyLevel > 0 ? 'text-yellow-400' : 'text-white'}`} />
              </div>
              <span className="text-white text-[10px] font-medium shadow-sm">Beauty</span>
            </button>

            <button onClick={() => setShowFilters(!showFilters)} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-[10px] font-medium shadow-sm">Filters</span>
            </button>

            <button onClick={() => setTimerSeconds(timerSeconds === 0 ? 3 : timerSeconds === 3 ? 10 : 0)} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Timer className={`w-5 h-5 ${timerSeconds > 0 ? 'text-yellow-400' : 'text-white'}`} />
              </div>
              <span className="text-white text-[10px] font-medium shadow-sm">
                {timerSeconds > 0 ? `${timerSeconds}s` : 'Timer'}
              </span>
            </button>

            <button onClick={() => setFlashEnabled(!flashEnabled)} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center ${flashEnabled ? 'bg-yellow-500/60' : 'bg-black/40'}`}>
                <Zap className={`w-5 h-5 ${flashEnabled ? 'text-yellow-300 fill-yellow-300' : 'text-white'}`} />
              </div>
              <span className="text-white text-[10px] font-medium shadow-sm">Flash</span>
            </button>
          </div>
        )}

        {/* Toggle Button (3 points style - compact) */}
        <button 
          onClick={() => setShowToolbar(!showToolbar)} 
          className="flex flex-col items-center gap-1 mt-2"
        >
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group hover:bg-black/60 transition-colors">
            {showToolbar ? (
              <svg className="w-4 h-4 text-white transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <div className="flex flex-col gap-0.5 items-center justify-center">
                <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
              </div>
            )}
          </div>
          <span className="text-white text-[9px] font-medium shadow-sm">{showToolbar ? 'Less' : 'More'}</span>
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-8 bg-gradient-to-t from-black/60 to-transparent">
        {/* AI Lenses Panel */}
        {showAILenses && (
          <div className="mb-6 px-4 animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth">
              {AI_LENSES.map((lens, index) => (
                <button
                  key={lens.id}
                  onClick={() => applyAILens(index)}
                  className="flex flex-col items-center gap-2 shrink-0 snap-center transition-transform duration-200 hover:scale-105 active:scale-95"
                >
                  <div 
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300 border-2 overflow-hidden",
                      selectedAILens === index ? "border-primary scale-110 shadow-lg shadow-primary/50" : "border-white/30 bg-black/50"
                    )}
                  >
                    {lens.thumbnail ? (
                      <img 
                        src={lens.thumbnail} 
                        alt={lens.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{lens.icon}</span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider transition-colors duration-200",
                    selectedAILens === index ? "text-primary" : "text-white/70"
                  )}>
                    {lens.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-4 px-4">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {FILTERS.map((filter, index) => (
                <button
                  key={filter.name}
                  onClick={() => {
                    setSelectedFilter(index);
                    setShowFilters(false);
                  }}
                  className="flex flex-col items-center gap-2 shrink-0"
                >
                  <div 
                    className={`w-16 h-16 rounded-full overflow-hidden border-2 ${selectedFilter === index ? 'border-white' : 'border-transparent'}`}
                    style={{ filter: filter.filter }}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500" />
                  </div>
                  <span className="text-white text-xs font-medium">{filter.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-8 mb-6">
          <button 
            onClick={() => {
              setShowAILenses(!showAILenses);
              setShowFilters(false);
            }} 
            className="flex flex-col items-center gap-2"
          >
            <div className={cn(
              "w-14 h-14 rounded-full backdrop-blur-sm flex items-center justify-center transition-all",
              showAILenses ? "bg-primary/40 border-2 border-primary" : "bg-white/20"
            )}>
              <Sparkles className={cn("w-7 h-7 transition-colors", showAILenses ? "text-primary" : "text-white")} />
            </div>
            <span className="text-white text-sm font-medium">Lenses</span>
          </button>

          <button 
            onClick={recordingDuration === 'Photo' ? capturePhoto : (isRecording ? stopRecording : startRecording)}
            disabled={isAudioLoading}
            className={cn("relative", isAudioLoading && "opacity-50 cursor-not-allowed")}
          >
            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${isRecording ? 'border-red-500 p-2' : 'border-white p-1'}`}>
              {isAudioLoading ? (
                <IndianSpinner size="lg" />
              ) : (
                <div className={`w-full h-full rounded-full transition-all ${isRecording ? 'bg-red-500 rounded-sm scale-50' : 'bg-[#FE2C55]'}`} />
              )}
            </div>
            {isRecording && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
                <Circle className="w-3 h-3 fill-current text-white" />
              </div>
            )}
          </button>

          <button onClick={openGallery} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
              <ImageIcon className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-sm font-medium">Upload</span>
          </button>
        </div>

        {/* Music Disc during recording */}
        {selectedSound && (
          <div className="absolute right-4 bottom-32 flex flex-col items-center gap-1 z-20">
             <div className={cn(
               "w-12 h-12 rounded-full p-2.5 bg-zinc-900 border-[6px] border-zinc-800/80 shadow-2xl relative flex items-center justify-center overflow-hidden",
               isRecording && !isAudioLoading && "animate-spin-slow"
             )}>
               <div className="absolute inset-0 border-[4px] border-zinc-700/30 rounded-full" />
               <div className="w-full h-full rounded-full overflow-hidden bg-black/40 flex items-center justify-center">
                 {selectedSound.thumbnail ? (
                   <img src={selectedSound.thumbnail} className="w-full h-full object-cover" alt="Selected music" />
                 ) : (
                   <Disc className="w-6 h-6 text-zinc-400" />
                 )}
               </div>
             </div>
             {isRecording && !isAudioLoading && (
                <>
                  <div className="absolute -top-4 -left-4 pointer-events-none animate-music-note" style={{ '--x': '-40px', '--y': '-60px', '--r': '-45deg', animationDelay: '0s' } as any}>
                    <Music className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="absolute -top-4 -left-4 pointer-events-none animate-music-note" style={{ '--x': '-20px', '--y': '-80px', '--r': '30deg', animationDelay: '1s' } as any}>
                    <Music2 className="w-3 h-3 text-white/40" />
                  </div>
                </>
             )}
          </div>
        )}

        {/* Duration Selector */}
        <div className="flex items-center justify-center gap-6">
          <button 
            onClick={() => setRecordingDuration(60)}
            className={`text-sm font-medium ${recordingDuration === 60 ? 'text-white' : 'text-white/50'}`}
          >
            60s
          </button>
          <button 
            onClick={() => setRecordingDuration(15)}
            className={`text-sm font-medium ${recordingDuration === 15 ? 'text-white' : 'text-white/50'}`}
          >
            15s
          </button>
          <button 
            onClick={() => setRecordingDuration('Photo')}
            className={`text-sm font-medium ${recordingDuration === 'Photo' ? 'text-white' : 'text-white/50'}`}
          >
            Photo
          </button>
          <button className="text-sm font-medium text-white/50">
            Templates
          </button>
        </div>
      </div>

      {/* Hidden audio element for music playback */}
      {(selectedSound?.previewUrl || selectedSound?.audioUrl) && (
        <audio 
          ref={audioRef} 
          src={selectedSound?.previewUrl || (selectedSound?.audioUrl?.startsWith('http') && !selectedSound?.audioUrl?.includes('t.me/') ? selectedSound.audioUrl : '')} 
          loop 
          playsInline
          preload="auto"
          crossOrigin="anonymous"
        />
      )}
    </div>
    </>
  );
}
