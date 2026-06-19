import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Video, MessageCircle, User } from 'lucide-react';

const TEAL = '#00BFA5';
const TEAL_DARK = '#00897B';

const NAV = [
  { id: 'home',    icon: Home,          label: 'Home',    to: '/indianreels/home' },
  { id: 'search',  icon: Search,        label: 'Search',  to: '/indianreels/search' },
  { id: 'reels',   icon: Video,         label: 'Reels',   to: '/indianreels/reels' },
  { id: 'chat',    icon: MessageCircle, label: 'Chat',    to: '/indianreels/chat' },
  { id: 'profile', icon: User,          label: 'Profile', to: '/indianreels/profile' },
];

export default function IndianReelsLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const activeId = NAV.find(n => location.pathname.startsWith(n.to))?.id ?? 'home';

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f0f2f5] z-50 overflow-hidden">
      {/* IndianReels top header bar */}
      <div
        className="shrink-0 flex items-center px-4 pt-10 pb-3 gap-2"
        style={{ background: `linear-gradient(135deg, #00D4B8 0%, ${TEAL} 50%, ${TEAL_DARK} 100%)` }}
      >
        <span className="text-white font-black text-lg tracking-wider drop-shadow flex-1">
          🇮🇳 INDIANREELS
        </span>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto min-w-0">
        {children}
      </div>

      {/* Bottom nav */}
      <div
        className="shrink-0 h-16 bg-white border-t border-zinc-100 flex items-center justify-around px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]"
      >
        {NAV.map(item => {
          const active = activeId === item.id;
          return (
            <Link
              key={item.id}
              to={item.to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 active:scale-90 transition-transform"
            >
              <item.icon
                className="w-6 h-6 transition-all"
                style={{ color: active ? TEAL : '#9CA3AF' }}
                strokeWidth={active ? 2.5 : 1.8}
                fill={active ? `${TEAL}22` : 'none'}
              />
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: active ? TEAL : '#9CA3AF' }}
              >
                {item.label}
              </span>
              {active && (
                <span
                  className="absolute bottom-0 w-8 h-[2.5px] rounded-full"
                  style={{ background: TEAL }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
