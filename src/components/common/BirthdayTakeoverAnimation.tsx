import { useEffect, useState } from 'react';
import { useBirthday } from '@/contexts/BirthdayContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, PartyPopper, Cake } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const BirthdayTakeoverAnimation = () => {
  const { showAnimation, dismissAnimation, userName } = useBirthday();
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number; duration: number }>>([]);

  // Generate confetti particles
  useEffect(() => {
    if (showAnimation) {
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100, // Random X position (0-100%)
        delay: Math.random() * 2, // Random delay (0-2s)
        duration: 3 + Math.random() * 2 // Random duration (3-5s)
      }));
      setConfetti(particles);

      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => {
        dismissAnimation();
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [showAnimation]);

  if (!showAnimation) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)'
        }}
      >
        {/* Confetti Particles */}
        {confetti.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{
              y: window.innerHeight + 20,
              opacity: [1, 1, 0],
              rotate: 360
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: 'linear'
            }}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: `${particle.x}%`,
              backgroundColor: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#FF6347'][Math.floor(Math.random() * 5)]
            }}
          />
        ))}

        {/* Sparkles Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                delay: Math.random() * 3,
                repeat: Infinity,
                repeatDelay: Math.random() * 2
              }}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            duration: 1
          }}
          className="relative z-10 text-center px-6 max-w-2xl"
        >
          {/* Cake Icon */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="flex justify-center mb-6"
          >
            <Cake className="w-24 h-24 text-white drop-shadow-2xl" />
          </motion.div>

          {/* Birthday Message */}
          <motion.h1
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-2xl"
            style={{
              textShadow: '4px 4px 8px rgba(0,0,0,0.3)'
            }}
          >
            Happy Birthday
          </motion.h1>

          <motion.h2
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl"
            style={{
              textShadow: '4px 4px 8px rgba(0,0,0,0.3)'
            }}
          >
            {userName} Bhai! 🎉
          </motion.h2>

          {/* Party Popper Icons */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center gap-8 mb-8"
          >
            <motion.div
              animate={{ rotate: [0, -20, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <PartyPopper className="w-16 h-16 text-white drop-shadow-2xl" />
            </motion.div>
            <motion.div
              animate={{ rotate: [0, 20, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <PartyPopper className="w-16 h-16 text-white drop-shadow-2xl" />
            </motion.div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xl md:text-2xl text-white/90 font-bold mb-8 drop-shadow-lg"
          >
            आज का दिन आपके लिए खास है! 🎂✨
          </motion.p>

          {/* Close Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <Button
              onClick={dismissAnimation}
              size="lg"
              className="bg-white text-orange-600 hover:bg-white/90 font-bold text-lg px-8 py-6 rounded-full shadow-2xl"
            >
              Let's Celebrate! 🎊
            </Button>
          </motion.div>
        </motion.div>

        {/* Close Icon (Top Right) */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          onClick={dismissAnimation}
          className="absolute top-6 right-6 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </motion.button>

        {/* Pulsing Glow Effect */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)'
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};
