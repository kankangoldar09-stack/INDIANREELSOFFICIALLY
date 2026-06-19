import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, MobileNav } from './Sidebar';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const location = useLocation();
  const isFullScreenPage = ['/', '/messages', '/reels', '/stories', '/audio', '/profile'].some(path => 
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className={cn(
        "flex-1 md:ml-64 md:pb-0 h-screen",
        !isFullScreenPage && "pb-16",
        isFullScreenPage && "overflow-hidden"
      )}>
        <div className={cn(
          "max-w-5xl mx-auto h-full",
          !isFullScreenPage && "px-4 py-8 overflow-y-auto"
        )}>
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
