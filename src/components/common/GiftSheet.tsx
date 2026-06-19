import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, Gift, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface GiftItem {
  type: string;
  emoji: string;
  name: string;
  coins: number;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const GIFTS: GiftItem[] = [
  { type: 'rose',      emoji: '🌹', name: 'Rose',        coins: 10,   color: '#e11d48', rarity: 'common'    },
  { type: 'heart',     emoji: '💝', name: 'Heart',       coins: 20,   color: '#ec4899', rarity: 'common'    },
  { type: 'fire',      emoji: '🔥', name: 'Fire',        coins: 30,   color: '#f97316', rarity: 'common'    },
  { type: 'star',      emoji: '⭐', name: 'Star',        coins: 50,   color: '#eab308', rarity: 'rare'      },
  { type: 'diamond',   emoji: '💎', name: 'Diamond',     coins: 100,  color: '#06b6d4', rarity: 'rare'      },
  { type: 'crown',     emoji: '👑', name: 'Crown',       coins: 150,  color: '#a855f7', rarity: 'epic'      },
  { type: 'rocket',    emoji: '🚀', name: 'Rocket',      coins: 200,  color: '#3b82f6', rarity: 'epic'      },
  { type: 'trophy',    emoji: '🏆', name: 'Trophy',      coins: 300,  color: '#f59e0b', rarity: 'epic'      },
  { type: 'unicorn',   emoji: '🦄', name: 'Unicorn',     coins: 500,  color: '#d946ef', rarity: 'legendary' },
  { type: 'explosion', emoji: '🎆', name: 'Fireworks',   coins: 500,  color: '#10b981', rarity: 'legendary' },
  { type: 'india',     emoji: '🇮🇳', name: 'Bharat',     coins: 100,  color: '#ff9933', rarity: 'rare'      },
  { type: 'kiss',      emoji: '💋', name: 'Kiss',        coins: 75,   color: '#f43f5e', rarity: 'rare'      },
];

const RARITY_STYLE: Record<string, string> = {
  common:    'from-zinc-800 to-zinc-900 border-zinc-700',
  rare:      'from-blue-900/60 to-zinc-900 border-blue-700/60',
  epic:      'from-purple-900/60 to-zinc-900 border-purple-700/60',
  legendary: 'from-yellow-900/60 to-zinc-900 border-yellow-600/60',
};

const RARITY_BADGE: Record<string, string> = {
  common:    'bg-zinc-700 text-zinc-300',
  rare:      'bg-blue-900 text-blue-300',
  epic:      'bg-purple-900 text-purple-300',
  legendary: 'bg-yellow-900 text-yellow-300',
};

interface GiftSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  receiverId: string;
  receiverName: string;
}

export function GiftSheet({ isOpen, onOpenChange, receiverId, receiverName }: GiftSheetProps) {
  const { profile } = useAuth();
  const [coins, setCoins] = useState<number>(0);
  const [selected, setSelected] = useState<GiftItem | null>(null);
  const [sending, setSending] = useState(false);
  const [sentGift, setSentGift] = useState<GiftItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');

  useEffect(() => {
    if (isOpen && profile?.id) fetchCoins();
  }, [isOpen, profile?.id]);

  const fetchCoins = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await (supabase as any).rpc('get_or_create_gift_coins', { p_user_id: profile.id });
      setCoins(data || 0);
    } catch {
      setCoins(0);
    }
  };

  const handleSendGift = async () => {
    if (!selected || !profile?.id) return;
    if (coins < selected.coins) {
      toast.error(`Not enough coins! You need ${selected.coins} coins.`);
      return;
    }
    setSending(true);
    try {
      const { error } = await (supabase as any).rpc('send_gift', {
        p_sender_id: profile.id,
        p_receiver_id: receiverId,
        p_gift_type: selected.type,
        p_gift_emoji: selected.emoji,
        p_gift_name: selected.name,
        p_coins_spent: selected.coins,
      });
      if (error) throw error;
      setCoins(c => c - selected.coins);
      setSentGift(selected);
      setTimeout(() => {
        setSentGift(null);
        setSelected(null);
        onOpenChange(false);
      }, 1800);
      toast.success(`${selected.emoji} ${selected.name} sent to ${receiverName}!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  const filtered = filter === 'all' ? GIFTS : GIFTS.filter(g => g.rarity === filter);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[75vh] p-0 rounded-t-3xl border-none overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%)' }}
      >
        {/* Success animation */}
        <AnimatePresence>
          {sentGift && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.85)' }}
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1, 1.2, 1], rotate: [0, -10, 10, -5, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-8xl mb-4"
              >
                {sentGift.emoji}
              </motion.div>
              <p className="text-white text-xl font-black tracking-wide">Gift Sent! 🎉</p>
              <p className="text-zinc-400 text-sm mt-1">{sentGift.name} → {receiverName}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#ff007f]" />
            <h2 className="text-white font-black text-lg tracking-tight">Send Gift</h2>
            <span className="text-zinc-400 text-sm">to {receiverName}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-3 py-1">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-300 font-black text-sm">{coins}</span>
          </div>
        </div>

        {/* Free coins hint */}
        {coins === 100 && (
          <div className="mx-4 mt-2 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-emerald-300 text-xs font-medium">🎉 100 free welcome coins credited!</p>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={cn(
                'shrink-0 px-3 py-1 rounded-full text-xs font-bold capitalize transition-all',
                filter === r
                  ? 'bg-[#ff007f] text-white'
                  : 'bg-white/10 text-zinc-400 hover:bg-white/20'
              )}
            >
              {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {/* Gift Grid */}
        <div className="overflow-y-auto px-4 pb-32" style={{ maxHeight: 'calc(75vh - 180px)' }}>
          <div className="grid grid-cols-3 gap-2.5">
            {filtered.map((gift) => {
              const isSelected = selected?.type === gift.type;
              const canAfford = coins >= gift.coins;
              return (
                <motion.button
                  key={gift.type}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setSelected(isSelected ? null : gift)}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-2xl py-3 px-2 border-2 bg-gradient-to-b transition-all',
                    RARITY_STYLE[gift.rarity],
                    isSelected && 'border-[#ff007f] shadow-[0_0_16px_rgba(255,0,127,0.5)] scale-[1.04]',
                    !canAfford && 'opacity-40'
                  )}
                >
                  {gift.rarity !== 'common' && (
                    <span className={cn('absolute top-1.5 right-1.5 text-[8px] font-black uppercase px-1 py-0.5 rounded-full', RARITY_BADGE[gift.rarity])}>
                      {gift.rarity === 'legendary' ? '✨' : gift.rarity[0].toUpperCase()}
                    </span>
                  )}
                  <span className="text-3xl mb-1.5 leading-none">{gift.emoji}</span>
                  <span className="text-white text-[11px] font-bold">{gift.name}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-300 text-[11px] font-black">{gift.coins}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Send Button */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 border-t border-white/10" style={{ background: 'linear-gradient(to top, #0f0f0f 70%, transparent)' }}>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key="selected"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-2xl px-4 py-2.5 border border-white/10">
                  <span className="text-2xl">{selected.emoji}</span>
                  <div>
                    <p className="text-white text-sm font-bold">{selected.name}</p>
                    <p className="text-zinc-400 text-xs flex items-center gap-1">
                      <Coins className="w-3 h-3 text-yellow-400" />
                      {selected.coins} coins
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSendGift}
                  disabled={sending || coins < selected.coins}
                  className="h-12 px-6 font-black rounded-2xl text-white"
                  style={{ background: 'linear-gradient(135deg, #ff007f, #ff4d00)' }}
                >
                  {sending ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    `Send 🎁`
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-zinc-500 text-sm"
              >
                Tap a gift to select it
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
