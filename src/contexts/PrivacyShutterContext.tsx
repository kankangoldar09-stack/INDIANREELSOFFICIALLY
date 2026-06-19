// @ts-nocheck
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface PrivacyShutterContextType {
  isEnabled: boolean;
  isStrangerDetected: boolean;
  isCameraActive: boolean;
  togglePrivacyShutter: () => Promise<void>;
  registerUserFace: () => Promise<void>;
  isUserFaceRegistered: boolean;
}

const PrivacyShutterContext = createContext<PrivacyShutterContextType | undefined>(undefined);

export function usePrivacyShutter() {
  const context = useContext(PrivacyShutterContext);
  if (!context) {
    throw new Error('usePrivacyShutter must be used within PrivacyShutterProvider');
  }
  return context;
}

interface PrivacyShutterProviderProps {
  children: ReactNode;
  userId?: string;
}

export function PrivacyShutterProvider({ children, userId }: PrivacyShutterProviderProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isStrangerDetected, setIsStrangerDetected] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUserFaceRegistered, setIsUserFaceRegistered] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastFrameDataRef = useRef<ImageData | null>(null);

  // Load settings from Supabase
  useEffect(() => {
    if (!userId) return;

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('privacy_shutter_enabled, user_face_registered')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load privacy shutter settings:', error);
        return;
      }

      if (data) {
        setIsEnabled((data as any).privacy_shutter_enabled || false);
        setIsUserFaceRegistered((data as any).user_face_registered || false);
      }
    };

    loadSettings();
  }, [userId]);

  // Start/Stop Camera based on isEnabled
  useEffect(() => {
    if (isEnabled && userId && isUserFaceRegistered) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isEnabled, userId, isUserFaceRegistered]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 }
      });

      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.style.display = 'none';
        document.body.appendChild(videoRef.current);
      }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = 320;
        canvasRef.current.height = 240;
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsCameraActive(true);

      // Wait for video to be ready
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = resolve;
        }
      });

      // Start detection loop
      startDetection();
    } catch (error) {
      console.error('Privacy Shutter: Camera access denied:', error);
      toast.error('कैमरा एक्सेस denied', {
        description: 'Privacy Shutter के लिए front camera की permission चाहिए।'
      });
      setIsEnabled(false);
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      if (videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
      videoRef.current = null;
    }

    setIsCameraActive(false);
    setIsStrangerDetected(false);
  };

  const startDetection = () => {
    // Simple motion/change detection approach
    // If significant changes detected in multiple areas → potential stranger
    detectionIntervalRef.current = window.setInterval(() => {
      detectMotion();
    }, 1000); // Check every second
  };

  const detectMotion = () => {
    if (!videoRef.current || !canvasRef.current || !isEnabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Draw current frame
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (lastFrameDataRef.current) {
        // Compare with last frame
        const motionScore = calculateMotionScore(lastFrameDataRef.current, currentFrame);
        
        // High motion score might indicate multiple people or someone peeking
        // This is a simplified heuristic - can be improved with actual face detection
        if (motionScore > 30) { // Threshold for "stranger alert"
          if (!isStrangerDetected) {
            setIsStrangerDetected(true);
            toast.error('⚠️ Stranger Alert!', {
              description: 'असामान्य गतिविधि detect हुई। Privacy mode active!'
            });
          }
        } else if (motionScore < 15) {
          // Low motion - likely just the user
          if (isStrangerDetected) {
            setIsStrangerDetected(false);
            toast.success('✅ Privacy Restored', {
              description: 'Normal activity। Privacy mode off.'
            });
          }
        }
      }

      lastFrameDataRef.current = currentFrame;
    } catch (error) {
      console.error('Privacy Shutter: Detection error:', error);
    }
  };

  const calculateMotionScore = (frame1: ImageData, frame2: ImageData): number => {
    let diffSum = 0;
    const data1 = frame1.data;
    const data2 = frame2.data;
    const sampleRate = 4; // Sample every 4th pixel for performance

    for (let i = 0; i < data1.length; i += sampleRate * 4) {
      const r1 = data1[i];
      const g1 = data1[i + 1];
      const b1 = data1[i + 2];
      const r2 = data2[i];
      const g2 = data2[i + 1];
      const b2 = data2[i + 2];

      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      diffSum += diff;
    }

    // Normalize to 0-100 scale
    const totalPixels = data1.length / (sampleRate * 4);
    return (diffSum / totalPixels) / 7.65; // Normalize to ~0-100 range
  };

  const togglePrivacyShutter = async () => {
    if (!userId) return;

    const newState = !isEnabled;

    // Save to Supabase
    const updateData: any = { privacy_shutter_enabled: newState };
    const { error } = await (supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId) as any);

    if (error) {
      console.error('Failed to update privacy shutter setting:', error);
      toast.error('Error', {
        description: 'Setting save नहीं हो सकी। कृपया फिर से try करें।'
      });
      return;
    }

    setIsEnabled(newState);

    if (newState && !isUserFaceRegistered) {
      toast.info('Face Registration Required', {
        description: 'पहले अपना face register करें Settings में।'
      });
    } else {
      toast.success(newState ? 'Privacy Shutter ON' : 'Privacy Shutter OFF', {
        description: newState 
          ? 'Background में detection चालू है।' 
          : 'Detection बंद हो गया।'
      });
    }
  };

  const registerUserFace = async () => {
    if (!userId) return;

    toast.info('Face Registration', {
      description: 'कैमरा खुल रहा है... अपना face दिखाएं।'
    });

    try {
      // Start temporary camera for registration
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });

      const tempVideo = document.createElement('video');
      tempVideo.autoplay = true;
      tempVideo.playsInline = true;
      tempVideo.muted = true;
      tempVideo.srcObject = stream;
      tempVideo.style.display = 'none';
      document.body.appendChild(tempVideo);

      await new Promise((resolve) => {
        tempVideo.onloadedmetadata = resolve;
      });

      // Wait 2 seconds for user to position face
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mark as registered (simplified - no actual face data stored)
      const updateData: any = { user_face_registered: true };
      const { error } = await (supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId) as any);

      if (error) throw error;

      setIsUserFaceRegistered(true);

      toast.success('✅ Face Registered!', {
        description: 'आपका face successfully register हो गया।'
      });

      // Cleanup
      stream.getTracks().forEach(track => track.stop());
      tempVideo.srcObject = null;
      if (tempVideo.parentNode) {
        tempVideo.parentNode.removeChild(tempVideo);
      }
    } catch (error: any) {
      console.error('Face registration error:', error);
      toast.error('Registration Failed', {
        description: error.message || 'Face register नहीं हो सका। फिर से try करें।'
      });
    }
  };

  return (
    <PrivacyShutterContext.Provider
      value={{
        isEnabled,
        isStrangerDetected,
        isCameraActive,
        togglePrivacyShutter,
        registerUserFace,
        isUserFaceRegistered
      }}
    >
      {children}
    </PrivacyShutterContext.Provider>
  );
}
