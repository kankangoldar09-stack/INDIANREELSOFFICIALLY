import { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  videoUrl: string;
  duration?: number; // in milliseconds
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  videoUrl, 
  duration = 8000, 
  onComplete 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  useEffect(() => {
    if (isVideoLoaded || videoError) {
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 500);
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, onComplete, isVideoLoaded, videoError]);

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay failed
      });
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 2000);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onComplete, 500);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      style={{
        animation: isVisible ? 'fadeIn 0.5s ease-in' : 'fadeOut 0.5s ease-out',
      }}
    >
      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="text-white text-center px-8">
            <p className="text-lg font-bold mb-2">Unable to load video</p>
            <p className="text-sm text-white/70">Starting app...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover"
        style={{
          opacity: 1,
          transition: 'opacity 0.3s ease-in',
        }}
        src={videoUrl}
        onLoadedData={handleVideoLoaded}
        onCanPlay={handleVideoLoaded}
        onError={handleVideoError}
      >
        Your browser does not support the video tag.
      </video>

      {isVideoLoaded && (
        <button
          onClick={handleSkip}
          className="absolute bottom-8 right-8 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full text-sm font-medium transition-all"
        >
          Skip
        </button>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
