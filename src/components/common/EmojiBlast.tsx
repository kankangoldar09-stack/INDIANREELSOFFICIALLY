import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const QUICK_EMOJIS = ['❤️', '😂', '😍', '🔥', '👏', '😮', '😢', '🎉', '💯', '🥰', '😎', '👑'];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  lane: number;
}

interface EmojiBlastProps {
  onSend: (emoji: string) => void;
  isLovePinkTheme?: boolean;
}

let _eid = 0;

export function EmojiBlast({ onSend, isLovePinkTheme }: EmojiBlastProps) {
  const [open, setOpen] = useState(false);
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const blast = useCallback((emoji: string) => {
    onSend(emoji);
    const id = ++_eid;
    const lane = Math.floor(Math.random() * 5); // 0-4 lanes spread across screen
    const x = 10 + lane * 18 + Math.random() * 8; // spread horizontally
    setFloating(prev => [...prev, { id, emoji, x, lane }]);
    setTimeout(() => setFloating(prev => prev.filter(f => f.id !== id)), 2400);
    setOpen(false);
  }, [onSend]);

  // auto-close picker after 3s idle
  useEffect(() => {
    if (open) {
      timerRef.current = setTimeout(() => setOpen(false), 3000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'h-8 w-8 flex items-center justify-center rounded-full transition-all active:scale-90',
          open
            ? 'bg-yellow-400/20 scale-110'
            : isLovePinkTheme
              ? 'text-pink-600 hover:bg-pink-200'
              : 'text-foreground/60 hover:text-yellow-400 hover:bg-yellow-400/10'
        )}
      >
        <span className="text-lg leading-none select-none">😊</span>
      </button>

      {/* Quick emoji picker */}
      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 z-50 flex flex-wrap gap-1 p-2 rounded-2xl border border-white/10 shadow-2xl w-[200px]"
          style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(16px)' }}
        >
          {QUICK_EMOJIS.map(em => (
            <button
              key={em}
              type="button"
              onClick={() => blast(em)}
              className="text-2xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-90 transition-all"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Floating emojis portal */}
      {createPortal(
        <>
          {floating.map(f => (
            <FloatingEmojiParticle key={f.id} emoji={f.emoji} x={f.x} />
          ))}
        </>,
        document.body
      )}
    </>
  );
}

function FloatingEmojiParticle({ emoji, x }: { emoji: string; x: number }) {
  return (
    <div
      className="fixed bottom-24 z-[9999] pointer-events-none select-none"
      style={{ left: `${x}%`, animation: 'emojiFloat 2.4s ease-out forwards' }}
    >
      <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>
        {emoji}
      </span>
    </div>
  );
}
