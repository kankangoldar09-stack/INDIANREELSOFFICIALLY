import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';
import { ChevronLeft, Globe, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { translations, LANGUAGES_MAP } from '@/lib/translations';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithUsername, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { speak } = useVoiceGuidance();

  const [lang, setLang] = useState(localStorage.getItem('login_signup_lang') || 'en');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const t = translations[lang] || translations.en;
  const currentLangObj = LANGUAGES_MAP.find((l) => l.code === lang) || LANGUAGES_MAP[0];

  useEffect(() => {
    const welcomePlayed = sessionStorage.getItem('login_welcome_played');
    if (!welcomePlayed) {
      speak(t.welcome_voice_login, lang);
      sessionStorage.setItem('login_welcome_played', 'true');
    }
  }, []);

  // Handle dropdown outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error(t.fields_required);
      return;
    }

    setLoading(true);
    const { error } = await signInWithUsername(identifier, password);
    setLoading(false);

    if (error) {
      toast.error(`${t.login_failed}: ${error.message}`);
    } else {
      toast.success(t.login_success);
      navigate('/');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      toast.error(`${t.google_login_failed}: ${error.message}`);
    }
  };

  const changeLanguage = (code: string) => {
    setLang(code);
    localStorage.setItem('login_signup_lang', code);
    setShowLangDropdown(false);
    const currentTranslation = translations[code] || translations.en;
    speak(currentTranslation.welcome_voice_login, code);
  };

  return (
    <div className="min-h-screen w-full bg-[#E8EBF2] dark:bg-[#08070d] flex items-center justify-center sm:py-8 transition-colors duration-500 font-sans select-none relative overflow-hidden">
      
      {/* Background blobs behind the phone frame on desktop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden sm:block">
        <div className="absolute -right-40 -top-40 w-96 h-96 rounded-full bg-gradient-to-br from-[#ffd3c8] to-[#ffcbd6] blur-[100px] opacity-40" />
        <div className="absolute -left-40 bottom-10 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#e5dbf4] to-[#fdeae2] blur-[120px] opacity-50" />
      </div>

      {/* Mobile Phone Mock frame (renders full-screen on mobile, phone-sized on desktop) */}
      <div className="w-full sm:w-[380px] h-screen sm:h-[800px] bg-[#FAF7F5] dark:bg-[#0c0a11] sm:rounded-[48px] sm:shadow-[0_24px_60px_rgba(0,0,0,0.15)] dark:sm:shadow-[0_24px_60px_rgba(0,0,0,0.5)] sm:border-[10px] sm:border-zinc-900/95 dark:sm:border-zinc-850 relative overflow-hidden flex flex-col justify-between p-6 z-10 transition-all">
        
        {/* Phone Dynamic Island Notch on Desktop */}
        <div className="hidden sm:block absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-zinc-900/95 dark:bg-zinc-800 rounded-full z-50 pointer-events-none" />

        {/* Soft Pastel Blob Gradients inside the Phone Frame */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-gradient-to-br from-[#ffd3c8] to-[#ffcbd6] blur-2xl opacity-75 dark:opacity-20" />
          <div className="absolute -left-20 top-[20%] w-72 h-72 rounded-full bg-gradient-to-br from-[#e5dbf4] to-[#fdeae2] blur-2xl opacity-85 dark:opacity-25" />
          <div className="absolute -bottom-24 left-1/4 w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-[#ffe3df] via-[#ebdffd] to-[#ffdcd4] blur-2xl opacity-80 dark:opacity-20" />
        </div>

        {/* Content wrapper */}
        <div className="w-full flex flex-col justify-between h-full relative z-10 pt-2 sm:pt-4">
          
          {/* Header Bar: Back Trigger & Language Selector */}
          <div className="w-full flex items-center justify-between pt-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center p-2 rounded-full bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-855 text-zinc-700 dark:text-zinc-300 transition-all active:scale-95 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative" ref={langRef}>
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-850 border border-zinc-200/50 dark:border-zinc-800 text-xs font-semibold text-zinc-755 dark:text-zinc-300 transition-all active:scale-95 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
              >
                <Globe className="w-3.5 h-3.5 text-zinc-555 dark:text-zinc-400" />
                <span>{currentLangObj.flag} {currentLangObj.name}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {showLangDropdown && (
                <div className="absolute top-full right-0 mt-2 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-850 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto w-44 py-1 text-xs">
                  {LANGUAGES_MAP.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => changeLanguage(language.code)}
                      className={cn(
                        "w-full text-left px-4 py-2 hover:bg-[#8b5cf6]/5 hover:text-[#8b5cf6] dark:hover:bg-[#8b5cf6]/10 transition-colors flex items-center justify-between cursor-pointer",
                        lang === language.code ? "text-[#8b5cf6] font-bold" : "text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span>{language.flag}</span>
                        <span>{language.native}</span>
                      </span>
                      {lang === language.code && <span className="text-[10px] text-[#8b5cf6]">•</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main content body */}
          <div className="w-full flex-1 flex flex-col justify-center py-4">
            
            {/* Title Header text */}
            <h1 className="text-4xl font-extrabold text-[#2a2046] dark:text-white leading-tight mb-8 text-left tracking-tight">
              Welcome<br/>Back
            </h1>

            <form onSubmit={handlePasswordLogin} className="w-full space-y-4">
              
              {/* Username/Email Input */}
              <div className="relative w-full h-12">
                <input
                  type="text"
                  placeholder={t.phone_or_user_or_email}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  className="w-full h-full bg-white/80 dark:bg-zinc-900/60 border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.03)] focus:border-[#8b5cf6]/50 focus:bg-white dark:focus:bg-zinc-950 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-550 rounded-full px-6 outline-none transition-all"
                />
              </div>

              {/* Password Input */}
              <div className="relative w-full h-12 flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full h-full bg-white/80 dark:bg-zinc-900/60 border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.03)] focus:border-[#8b5cf6]/50 focus:bg-white dark:focus:bg-zinc-950 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-550 rounded-full px-6 pr-14 outline-none transition-all"
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 text-zinc-400 hover:text-[#8b5cf6] transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Saffron/Violet Button with Drop Shadow */}
              <button
                type="submit"
                disabled={loading || googleLoading || !identifier || password.length < 6}
                className={cn(
                  "w-full h-12 rounded-full text-sm font-bold mt-6 transition-all duration-250 flex items-center justify-center text-white shadow-[0_6px_20px_rgba(139,92,246,0.3)]",
                  (identifier && password.length >= 6)
                    ? "bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.99] cursor-pointer"
                    : "bg-[#8b5cf6]/40 text-white/70 cursor-default shadow-none pointer-events-none"
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  t.login
                )}
              </button>
            </form>

            {/* Forgot Password Link */}
            <button
              onClick={() => toast.info("Password recovery requires admin support. Please contact helpline.")}
              className="text-xs mt-6 text-center text-[#8b5cf6] font-semibold hover:underline cursor-pointer block w-full transition-colors"
            >
              {t.forgot_password}
            </button>

            {/* Separator OR Line */}
            <div className="w-full flex items-center justify-center gap-3 py-6">
              <div className="w-10 border-t border-zinc-200 dark:border-zinc-800" />
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">{t.or}</span>
              <div className="w-10 border-t border-zinc-200 dark:border-zinc-800" />
            </div>

            {/* Google & Facebook Round Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => toast.info("Facebook authentication is coming soon.")}
                className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-95 transition-all cursor-pointer"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="text-[#1877f2] fill-current">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </button>
            </div>

          </div>

          {/* Footer Switch Redirection Link */}
          <div className="w-full text-center text-xs pt-4 pb-2 z-10">
            <span className="text-zinc-500 dark:text-zinc-400">{t.no_account} </span>
            <Link to="/signup" className="text-[#8b5cf6] font-bold hover:underline">{t.signup}</Link>
          </div>

        </div>

      </div>

    </div>
  );
}
