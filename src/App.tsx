import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { routes } from './routes';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { PrivacyShutterProvider } from '@/contexts/PrivacyShutterContext';
import { ProximityProvider } from '@/contexts/ProximityContext';
import { BirthdayProvider } from '@/contexts/BirthdayContext';
import { StreamVideoProvider } from '@/contexts/StreamVideoContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { MainLayout } from '@/components/layouts/MainLayout';
import { CallNotification } from '@/components/common/CallNotification';
import { PrivacyOverlay } from '@/components/common/PrivacyOverlay';
import { ProximitySyncOverlay } from '@/components/common/ProximitySyncOverlay';
import { BirthdayTakeoverAnimation } from '@/components/common/BirthdayTakeoverAnimation';
import { useAuth } from '@/contexts/AuthContext';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import IntersectObserver from '@/components/common/IntersectObserver';

function AppContent() {
  const { profile } = useAuth();

  return (
    <RouteGuard>
      <IntersectObserver />
      <CallNotification />
      <PWAInstallPrompt />
      <PrivacyShutterProvider userId={profile?.id}>
        <ProximityProvider>
          <BirthdayProvider>
            <BirthdayTakeoverAnimation />
            <PrivacyOverlay />
            <ProximitySyncOverlay />
            <div className="flex flex-col min-h-screen">
              <Routes>
                <Route path="/login" element={routes.find(r => r.path === '/login')?.element} />
                <Route path="/signup" element={routes.find(r => r.path === '/signup')?.element} />
                <Route path="/call/:roomName" element={routes.find(r => r.path === '/call/:roomName')?.element} />
                
                <Route element={<MainLayout />}>
                  {routes.filter(r => !['/login', '/signup', '/call/:roomName', '*'].includes(r.path)).map((route, index) => (
                    <Route key={index} path={route.path} element={route.element} />
                  ))}
                </Route>
            
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </BirthdayProvider>
        </ProximityProvider>
      </PrivacyShutterProvider>
      <Toaster />
    </RouteGuard>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <StreamVideoProvider>
          <Router>
            <AppContent />
          </Router>
        </StreamVideoProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
