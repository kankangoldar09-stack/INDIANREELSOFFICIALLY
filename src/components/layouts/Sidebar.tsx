import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, PlusSquare, Heart, MessageCircle, User, Settings, LogOut, Video, Plus, Bell, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Friends', path: '/search' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: Heart, label: 'Notifications', path: '/notifications' },
  { icon: PlusSquare, label: 'Create', path: '/create' },
];

export function Sidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (profile) {
      fetchUnreadCount();
      const channel = supabase
        .channel('notifications-count')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
          () => fetchUnreadCount()
        )
        .subscribe();
      return () => { channel.unsubscribe(); };
    }
  }, [profile]);

  const fetchUnreadCount = async () => {
    const { count } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile?.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    const currentTime = Date.now();
    if (currentTime - lastClickTime < 300) {
      // Double click detected
      e.preventDefault();
      setIsSwitcherOpen(true);
    }
    setLastClickTime(currentTime);
  };

  return (
    <div className="hidden md:flex flex-col w-64 h-screen border-r bg-background p-4 fixed left-0 top-0">
      <div className="mb-8 px-4 flex items-center gap-3">
        <img 
          src="https://miaoda-conversation-file.s3cdn.medo.dev/user-a802e9kq6vpc/conv-af2z7g8d924g/20260509/file-bitn16is4pvk.png" 
          alt="INDIANREELS Logo" 
          className="w-10 h-10 rounded-lg"
        />
        <h1 className="text-2xl brand-text">INDIANREELS</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-md transition-colors hover:bg-accent relative",
              location.pathname === item.path ? "font-bold bg-accent/50" : "font-medium"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span>{item.label}</span>
            {item.label === 'Notifications' && unreadCount > 0 && (
              <span className="absolute top-2 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        ))}

        <Link
          to={`/profile/${profile?.username || 'me'}`}
          onClick={handleProfileClick}
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-md transition-colors hover:bg-accent",
            location.pathname.startsWith('/profile') ? "font-bold bg-accent/50" : "font-medium"
          )}
        >
          <Avatar className="w-6 h-6 border">
            <AvatarImage src={profile?.profile_photo_url || ''} />
            <AvatarFallback>{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span>Profile</span>
        </Link>
      </nav>

      <div className="mt-auto space-y-2">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-md transition-colors hover:bg-accent",
            location.pathname === '/settings' ? "font-bold bg-accent/50" : "font-medium"
          )}
        >
          <Settings className="w-6 h-6" />
          <span>Settings</span>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-4 px-4 py-3 h-auto font-medium"
          onClick={() => signOut()}
        >
          <LogOut className="w-6 h-6" />
          <span>Log Out</span>
        </Button>
      </div>

      <AccountSwitcherDialog open={isSwitcherOpen} onOpenChange={setIsSwitcherOpen} />
    </div>
  );
}

export function MobileNav() {
  const location = useLocation();
  const { profile } = useAuth();
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (profile) {
      fetchUnreadCount();
      const channel = supabase
        .channel('notifications-mobile-count')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
          () => fetchUnreadCount()
        )
        .subscribe();
      return () => { channel.unsubscribe(); };
    }
  }, [profile]);

  const fetchUnreadCount = async () => {
    const { count } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile?.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const handleProfileClick = (e: React.MouseEvent | React.TouchEvent) => {
    const currentTime = Date.now();
    if (currentTime - lastClickTime < 300) {
      // Double tap detected
      e.preventDefault();
      setIsSwitcherOpen(true);
    }
    setLastClickTime(currentTime);
  };

  const GlitchIcon = ({ children, active, className }: { children: React.ReactNode, active: boolean, className?: string }) => (
    <div className={cn("relative w-7 h-7 flex items-center justify-center", className)}>
      <div className={cn("absolute -left-[0.8px] top-0 text-[#25F4EE] opacity-80", active ? "fill-current" : "")}>
        {children}
      </div>
      <div className={cn("absolute -right-[0.8px] top-0 text-[#FE2C55] opacity-80", active ? "fill-current" : "")}>
        {children}
      </div>
      <div className={cn("relative z-10 text-white", active ? "fill-current" : "")}>
        {children}
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-white/5 flex items-center justify-around px-1 z-40">
        {/* Home */}
        <Link to="/" className="flex flex-col items-center justify-center gap-0.5 py-1 px-3">
          <GlitchIcon active={location.pathname === '/'}>
            <Home className="w-7 h-7" strokeWidth={location.pathname === '/' ? 0 : 2} fill={location.pathname === '/' ? "currentColor" : "none"} />
          </GlitchIcon>
          <span className="text-[10px] font-medium text-white">Home</span>
        </Link>

        {/* Friends (Now points to messages as requested) */}
        <Link to="/messages" className="flex flex-col items-center justify-center gap-0.5 py-1 px-3">
          <GlitchIcon active={location.pathname === '/messages'}>
            <Users className="w-7 h-7" strokeWidth={location.pathname === '/messages' ? 0 : 2} fill={location.pathname === '/messages' ? "currentColor" : "none"} />
          </GlitchIcon>
          <span className="text-[10px] font-medium text-white">Friends</span>
        </Link>

        {/* Create - TikTok Style Dual-Color Button */}
        <Link to="/create" className="relative flex items-center justify-center -mt-1 scale-90">
          <div className="relative w-11 h-7 bg-white rounded-[7px] flex items-center justify-center overflow-visible">
            {/* Background cyan/pink edges */}
            <div className="absolute -left-[3px] top-0 bottom-0 w-3 bg-[#25F4EE] rounded-l-[7px] -z-10"></div>
            <div className="absolute -right-[3px] top-0 bottom-0 w-3 bg-[#FE2C55] rounded-r-[7px] -z-10"></div>
            <Plus className="w-5 h-5 text-black" strokeWidth={4} />
          </div>
        </Link>

        {/* Inbox */}
        <Link to="/notifications" className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 relative">
          <div className="relative">
            <GlitchIcon active={location.pathname === '/notifications'}>
              <div className="relative w-7 h-7 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill={location.pathname === '/notifications' ? "currentColor" : "none"} stroke="currentColor" strokeWidth={location.pathname === '/notifications' ? 0.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  <line x1="8" y1="12" x2="16" y2="12" stroke={location.pathname === '/notifications' ? "black" : "currentColor"} strokeWidth="2"></line>
                </svg>
              </div>
            </GlitchIcon>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FE2C55] text-[8px] text-white font-bold z-20 border border-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium text-white">Inbox</span>
        </Link>

        {/* Profile */}
        <Link 
          to={`/profile/${profile?.username || 'me'}`} 
          onClick={handleProfileClick}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-3"
        >
          <GlitchIcon active={location.pathname.startsWith('/profile')}>
            <User className="w-7 h-7" strokeWidth={location.pathname.startsWith('/profile') ? 0 : 2} fill={location.pathname.startsWith('/profile') ? "currentColor" : "none"} />
          </GlitchIcon>
          <span className="text-[10px] font-medium text-white">Profile</span>
        </Link>
      </div>

      <AccountSwitcherDialog open={isSwitcherOpen} onOpenChange={setIsSwitcherOpen} />
    </>
  );
}

function AccountSwitcherDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleAddAccount = () => {
    onOpenChange(false);
    toast.info("Logging out to add another account...");
    setTimeout(() => signOut(), 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center text-sm font-bold">Switch Accounts</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border">
                <AvatarImage src={profile?.profile_photo_url || ''} />
                <AvatarFallback>{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-bold text-sm">@{profile?.username}</span>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500" />
          </div>
          
          <button 
            onClick={handleAddAccount}
            className="w-full flex items-center gap-3 py-2 text-blue-500 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full border border-dashed border-blue-500 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold">Add Account</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
