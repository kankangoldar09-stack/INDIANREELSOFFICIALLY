import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SplashScreen } from './SplashScreen';

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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    if (loading || !splashFinished) return;

    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [user, loading, location.pathname, navigate, splashFinished]);

  return (
    <>
      <SplashScreen isLoading={loading} onFinished={() => setSplashFinished(true)} />
      {(!loading && splashFinished) ? children : null}
    </>
  );
}
