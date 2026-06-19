import { useEffect, useState } from 'react';
import { useProximity } from '@/contexts/ProximityContext';
import { motion, AnimatePresence } from 'framer-motion';

export const ProximitySyncOverlay = () => {
  const { isSyncing, syncedFriend, gradientColors } = useProximity();
  const [showHeartbeat, setShowHeartbeat] = useState(false);

  useEffect(() => {
    if (isSyncing) {
      setShowHeartbeat(true);
      // Hide heartbeat after 3 seconds
      const timer = setTimeout(() => setShowHeartbeat(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing]);

  if (!isSyncing || !syncedFriend || !gradientColors) return null;

  const gradientStyle = {
    background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`
  };

  return (
    <AnimatePresence>
      {isSyncing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          {/* Gradient Background Glow */}
          <motion.div
            className="absolute inset-0"
            style={gradientStyle}
            animate={{
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Heartbeat Animation */}
          <AnimatePresence>
            {showHeartbeat && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              >
                <div className="bg-background/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-primary/50 max-w-sm w-full">
                  {/* Pulsing Heart Icon */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="text-6xl text-center mb-4"
                  >
                    💖
                  </motion.div>

                  {/* Friend Info */}
                  <div className="flex flex-col items-center gap-3">
                    {syncedFriend.profile_photo_url && (
                      <motion.img
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        src={syncedFriend.profile_photo_url}
                        alt={syncedFriend.username}
                        className="w-20 h-20 rounded-full border-4 border-primary object-cover"
                      />
                    )}
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-foreground mb-1">
                        Dosti Sync! 🎉
                      </h3>
                      <p className="text-lg text-muted-foreground">
                        <span className="font-semibold text-primary">@{syncedFriend.username}</span> के साथ connected
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        आप दोनों 5 मीटर के अंदर हैं
                      </p>
                    </div>
                  </div>

                  {/* Color Indicators */}
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-12 rounded-full border-2 border-foreground/20"
                        style={{ backgroundColor: gradientColors[0] }}
                      />
                      <span className="text-xs text-muted-foreground">You</span>
                    </div>
                    <div className="text-2xl">🤝</div>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-12 rounded-full border-2 border-foreground/20"
                        style={{ backgroundColor: gradientColors[1] }}
                      />
                      <span className="text-xs text-muted-foreground">Friend</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Continuous Glow Ring */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${gradientColors[0]}40 0%, ${gradientColors[1]}40 50%, transparent 70%)`
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
