import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithUsername, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { speak } = useVoiceGuidance();

  useEffect(() => {
    const welcomePlayed = sessionStorage.getItem('login_welcome_played');
    if (!welcomePlayed) {
      speak("Welcome back to Indian Reels!");
      sessionStorage.setItem('login_welcome_played', 'true');
    }
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Please enter both email/username and password');
      return;
    }

    setLoading(true);
    const { error } = await signInWithUsername(identifier, password);
    setLoading(false);

    if (error) {
      toast.error(`Login failed: ${error.message}`);
    } else {
      toast.success('Login successful!');
      navigate('/');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      toast.error(`Google login failed: ${error.message}`);
    }
    // On success Supabase redirects automatically
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20 mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent animate-gradient">
            INDIANREELS
          </h1>
          <p className="text-zinc-400 text-base font-medium">Welcome back! Log in to continue</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-8 shadow-2xl space-y-6">
          <form onSubmit={handlePasswordLogin} className="space-y-6">
            <div className="space-y-4">
              {/* Email/Username Input */}
              <div className="relative group">
                <label className="text-sm font-medium text-zinc-300 mb-2 block">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    type="text"
                    placeholder="Enter your email or username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-14 pl-12 pr-4 bg-zinc-950/50 border-zinc-800 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200 hover:border-zinc-700"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="relative group">
                <label className="text-sm font-medium text-zinc-300 mb-2 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 pl-12 pr-4 bg-zinc-950/50 border-zinc-800 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200 hover:border-zinc-700"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-14 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-bold rounded-xl text-base shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Log in
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900/50 px-3 text-zinc-500 font-medium">or continue with</span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full h-14 flex items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950/60 hover:bg-zinc-800/60 text-white font-semibold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-4 text-zinc-500 font-medium">New to INDIANREELS?</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 text-base font-semibold text-primary hover:text-primary/80 transition-colors duration-200"
          >
            Create an account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
