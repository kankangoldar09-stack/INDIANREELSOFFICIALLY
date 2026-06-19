import { useBirthday } from '@/contexts/BirthdayContext';
import { motion } from 'framer-motion';
import { Cake } from 'lucide-react';

export const BirthdayBadge = () => {
  const { isBirthday } = useBirthday();

  if (!isBirthday) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
      >
        <Cake className="w-3.5 h-3.5" />
      </motion.div>
      <span>Birthday! 🎉</span>
    </motion.div>
  );
};
