import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SplashScreen } from './SplashScreen';
import { supabase } from '@/db/supabase';
import { ShieldAlert } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
}

// Please add the pages that can be accessed without logging in to PUBLIC_ROUTES.
const PUBLIC_ROUTES = ['/login', '/signup', '/403', '/404'];

function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [splashFinished, setSplashFinished] = useState(false);

  // Ban check states
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [clientIp, setClientIp] = useState('');

  // 1. Fetch current client IP and check for active IP bans in DB
  useEffect(() => {
    const checkIpBan = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        const currentIp = data.ip;
        setClientIp(currentIp);

        // Fetch banned profiles that have a device/IP ban
        const { data: bannedProfiles } = await (supabase as any)
          .from('profiles')
          .select('ban_reason')
          .eq('is_banned', true)
          .like('ban_reason', 'DEVICE_IP_BAN%');

        if (bannedProfiles) {
          for (const p of bannedProfiles as any[]) {
            if (p.ban_reason && p.ban_reason.includes(currentIp)) {
              setIsBanned(true);
              const reasonText = p.ban_reason.split('|')[2] || 'Severe security violation';
              setBanReason(`Device Ban (IP: ${currentIp}) - ${reasonText}`);
              localStorage.setItem('device_banned', 'true');
              localStorage.setItem('ban_reason', `Device Ban (IP: ${currentIp}) - ${reasonText}`);
              return; // Exit early
            }
          }
        }
      } catch (err) {
        console.error('IP ban check failed:', err);
      }
    };

    checkIpBan();
  }, []);

  // 2. Main profile ban state logic
  useEffect(() => {
    if (loading) return;

    // Check localStorage lockout flag first
    const isLocalDeviceBanned = localStorage.getItem('device_banned') === 'true';
    const localBanReason = localStorage.getItem('ban_reason') || 'Severe violation';

    if (profile) {
      if (profile.is_banned) {
        setIsBanned(true);
        const displayReason = profile.ban_reason || 'Banned by administrator';
        setBanReason(displayReason);

        // If it's a device ban, write it to localStorage
        if (profile.ban_reason && profile.ban_reason.startsWith('DEVICE_IP_BAN')) {
          localStorage.setItem('device_banned', 'true');
          localStorage.setItem('ban_reason', displayReason);
        }
      } else {
        // If logged in and account is NOT banned, clear localStorage device ban
        localStorage.removeItem('device_banned');
        localStorage.removeItem('ban_reason');
        setIsBanned(false);
      }
    } else if (isLocalDeviceBanned) {
      setIsBanned(true);
      setBanReason(localBanReason);
    }
  }, [profile, loading]);

  // 3. Navigation checks for non-banned users
  useEffect(() => {
    if (loading || !splashFinished || isBanned) return;

    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [user, loading, location.pathname, navigate, splashFinished, isBanned]);

  // Render full-screen lockout screen if banned
  if (isBanned) {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg shadow-red-500/5 mx-auto">
            <ShieldAlert className="w-12 h-12 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Device / Account Banned</h1>
            <p className="text-sm text-red-400 font-bold uppercase tracking-wider">Access Permanently Restricted</p>
            <p className="text-zinc-400 text-sm leading-relaxed mt-4">
              Your account and device have been permanently banned from accessing IndianReels due to severe violations (harassment, blackmailing, or privacy policy breaches).
            </p>
            <p className="text-zinc-500 text-xs italic mt-2">
              आपके डिवाइस और अकाउंट को ब्लैकमेल या प्राइवेसी नियमों के उल्लंघन के कारण ब्लॉक कर दिया गया है।
            </p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-left text-xs font-mono text-zinc-400 break-all space-y-1">
            <p><strong>Grievance Status:</strong> Permanent Lockout</p>
            <p><strong>Reason:</strong> {banReason}</p>
          </div>
          {clientIp && (
            <p className="text-[10px] text-zinc-600 font-medium">Banned Device IP: {clientIp}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <SplashScreen isLoading={loading} onFinished={() => setSplashFinished(true)} />
      {(!loading && splashFinished) ? children : null}
    </>
  );
}
