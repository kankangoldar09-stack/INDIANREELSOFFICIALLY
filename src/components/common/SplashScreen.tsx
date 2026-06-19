import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SplashScreenProps {
  isLoading: boolean;
  onFinished?: () => void;
}

export function SplashScreen({ isLoading, onFinished }: SplashScreenProps) {
  const [show, setShow] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const handleSkip = () => {
    setShow(false);
    onFinished?.();
  };

  useEffect(() => {
    // Wait for video to load before starting timeout
    if (!videoLoaded) return;

    const timeout = setTimeout(() => {
      setShow(false);
      onFinished?.();
    }, 8000); // Increased to 8s to allow video to play fully

    if (!isLoading) {
      const delay = setTimeout(() => {
        setShow(false);
        onFinished?.();
      }, 1000); // Increased delay to 1s
      return () => {
        clearTimeout(timeout);
        clearTimeout(delay);
      };
    }

    return () => clearTimeout(timeout);
  }, [isLoading, onFinished, videoLoaded]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          {/* Skip Button */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute top-6 right-6 z-10"
          >
            <Button
              variant="ghost"
              size="lg"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground font-semibold text-base"
            >
              Skip
            </Button>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="relative w-80 h-80 mb-8">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover rounded-2xl shadow-2xl"
                src="https://videotourl.com/videos/1778332493231-bfa9264c-b531-4cd2-bcc6-96b11ef75cae.mp4"
                onLoadedData={() => setVideoLoaded(true)}
                onError={() => setVideoLoaded(true)} // Still proceed even if video fails to load
              />
            </div>
            <h1 className="sr-only">INDIANREELS</h1>
            <div className="flex gap-2 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(255,165,0,0.8)]"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
