import {
  Camera,
  ChevronDown,
  ChevronLeft,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CropModal from '@/components/profile/CropModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';
import { LANGUAGES_MAP, translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

const ANIME_AVATARS = [
  { name: "Gojo Satoru (Jujutsu Kaisen)", url: "/images/anime_gojo.jpg" },
  { name: "Naruto Uzumaki (Naruto)", url: "/images/anime_naruto.jpg" },
  { name: "indianreels (One Piece)", url: "https://i.pinimg.com/736x/69/b4/3b/69b43bbc3a9f786dbd9560dc5a75ced2.jpg" },
  { name: "indianreels (One Piece)", url: "https://i.pinimg.com/originals/e0/c3/63/e0c3635d0f027db3f531e959cbff0e84.jpg" },
  { name: "indianreels Hatake (Naruto)", url: "https://i.pinimg.com/originals/7e/c0/20/7ec0209a446f3a2914e416d086387585.jpg?nii=t" },
  { name: "anime channel", url: "https://static.vecteezy.com/system/resources/previews/004/967/183/original/anime-eyes-vision-fire-pop-culture-logo-design-vector.jpg" },
  { name: "indianreelsc(Demon Slayer)", url: "https://img.icons8.com/fluent/1200/cat-profile.jpg" },
  { name: "indianreels cute (One Punch Man)", url: "https://i.pinimg.com/originals/82/47/0b/82470b4ed44c3edacfcd4201e2297050.jpg?nii=t" }
];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');

  const { user, signUpWithUsername, signInWithGoogle, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { speak } = useVoiceGuidance();

  const [lang, setLang] = useState(localStorage.getItem('login_signup_lang') || 'en');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Step 3 states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [animeSearchQuery, setAnimeSearchQuery] = useState('');

  // Location search states
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [searchingLocationSuggestions, setSearchingLocationSuggestions] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  const t = translations[lang] || translations.en;
  const currentLangObj = LANGUAGES_MAP.find((l) => l.code === lang) || LANGUAGES_MAP[0];

  useEffect(() => {
    const welcomePlayed = sessionStorage.getItem('signup_welcome_played');
    if (!welcomePlayed && step === 1) {
      speak(t.welcome_voice_signup, lang);
      sessionStorage.setItem('signup_welcome_played', 'true');
    }
  }, [step, lang]);

  // Handle dropdown outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced location suggestions fetch
  useEffect(() => {
    if (!locationSearchQuery || locationSearchQuery.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchingLocationSuggestions(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearchQuery)}&format=json&addressdetails=1&limit=8&accept-language=${lang}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocationSuggestions(data);
        }
      } catch (e) {
        console.error('Error fetching location suggestions:', e);
      } finally {
        setSearchingLocationSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [locationSearchQuery, lang]);

  const handleUseMyLocation = () => {
    setGettingCurrentLocation(true);

    const useIpFallback = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && (data.city || data.region)) {
          const locationString = [data.city, data.region, data.postal, data.country_name].filter(Boolean).join(', ');
          setCity(locationString);
          setLocationSearchQuery(locationString);
          toast.success("Location set automatically (IP fallback)!");
        } else {
          toast.error("Could not auto-detect location from IP");
        }
      } catch (err) {
        console.error("IP fallback failed:", err);
        toast.error("Failed to detect location address");
      } finally {
        setGettingCurrentLocation(false);
      }
    };

    if (!navigator.geolocation) {
      useIpFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=${lang}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data && data.display_name) {
            const addr = data.address;
            const localName = addr.village || addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.city || '';
            const state = addr.state || '';
            const postcode = addr.postcode || '';
            const country = addr.country || '';

            const parts = [localName, state, postcode, country].filter(Boolean);
            const finalAddress = parts.join(', ') || data.display_name;

            setCity(finalAddress);
            setLocationSearchQuery(finalAddress);
            toast.success("Location set successfully!");
          } else {
            await useIpFallback();
          }
        } catch (e) {
          console.warn('Reverse geocoding failed, falling back to IP:', e);
          await useIpFallback();
        } finally {
          setGettingCurrentLocation(false);
        }
      },
      async (error) => {
        console.warn('GPS location access failed, falling back to IP:', error);
        await useIpFallback();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleStep1 = () => {
    if (!username || !password || !email) {
      toast.error(t.fields_required);
      return;
    }
    if (username.length < 3) {
      toast.error(t.username_min);
      return;
    }
    if (password.length < 6) {
      toast.error(t.password_min);
      return;
    }
    if (!email.includes('@')) {
      toast.error(t.email_invalid);
      return;
    }
    setStep(2);
  };

  const handleStep2 = async () => {
    if (!fullName || !dob || !city) {
      toast.error(t.fill_profile);
      return;
    }

    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      toast.error("Please enter a valid date of birth");
      return;
    }
    const birthYear = birthDate.getFullYear();
    if (birthYear < 1900 || birthYear > 2026) {
      toast.error("Please enter a valid birth year between 1900 and 2026");
      return;
    }

    // Minimum 13 years old check
    const today = new Date("2026-06-30");
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 13) {
      toast.error("You must be at least 13 years old to open an account");
      return;
    }

    setLoading(true);
    const { error } = await signUpWithUsername(username, password, fullName, dob, city, email);
    setLoading(false);
    if (error) {
      toast.error(`${t.signup_failed}: ${error.message}`);
    } else {
      toast.success("Account created! Let's set up your profile picture. 🎉");
      setStep(3);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      toast.error(`${t.google_signup_failed}: ${error.message}`);
    }
  };

  const changeLanguage = (code: string) => {
    setLang(code);
    localStorage.setItem('login_signup_lang', code);
    setShowLangDropdown(false);
    const currentTranslation = translations[code] || translations.en;
    speak(currentTranslation.welcome_voice_signup, code);
  };

  // Step 3 Profile Avatar handlers
  const handleRandomAvatar = () => {
    const randomIndex = Math.floor(Math.random() * ANIME_AVATARS.length);
    const selected = ANIME_AVATARS[randomIndex];
    setAvatarPreview(selected.url);
    setCroppedImageBlob(null);
    toast.success(`Selected ${selected.name}!`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input to allow re-uploading same file
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    setSelectedImage(null);
    setCroppedImageBlob(croppedBlob);
    const croppedUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(croppedUrl);
    toast.success("Photo cropped successfully!");
  };

  const handleFinishStep3 = async () => {
    const activeUser = user;
    if (!activeUser) {
      toast.error("User session not found. Please log in.");
      navigate('/login');
      return;
    }

    setUploadLoading(true);
    try {
      let finalPhotoUrl = avatarPreview;

      if (croppedImageBlob) {
        const fileName = `${activeUser.id}_${Date.now()}.jpg`;
        const filePath = `avatars/${fileName}`;

        const { data: uploadData, error: uploadError } = await (supabase as any)
          .storage
          .from('media')
          .upload(filePath, croppedImageBlob, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = (supabase as any)
          .storage
          .from('media')
          .getPublicUrl(filePath);

        finalPhotoUrl = urlData.publicUrl;
      }

      if (finalPhotoUrl) {
        const { error: updateError } = await (supabase as any)
          .from('profiles')
          .update({ profile_photo_url: finalPhotoUrl } as any)
          .eq('id', activeUser.id);

        if (updateError) throw updateError;
      }

      await refreshProfile();
      toast.success("Welcome! Profile completed successfully. 🎉");
      navigate('/');
    } catch (err: any) {
      console.error("Failed to save profile picture:", err);
      toast.error(err.message || "Failed to save profile picture");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSkipStep3 = () => {
    toast.info("You can set a profile picture later from settings.");
    navigate('/');
  };

  const filteredAvatars = ANIME_AVATARS.filter(avatar =>
    avatar.name.toLowerCase().includes(animeSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#E8EBF2] dark:bg-[#08070d] flex items-center justify-center sm:py-8 transition-colors duration-500 font-sans select-none relative overflow-hidden">

      {/* Background blobs behind the phone frame on desktop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden sm:block">
        <div className="absolute -right-40 -top-40 w-96 h-96 rounded-full bg-gradient-to-br from-[#ffd3c8] to-[#ffcbd6] blur-[100px] opacity-40" />
        <div className="absolute -left-40 bottom-10 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#e5dbf4] to-[#fdeae2] blur-[120px] opacity-50" />
      </div>

      {/* Mobile Phone Mock frame */}
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
              onClick={() => {
                if (step > 1) {
                  setStep(step - 1);
                } else {
                  navigate(-1);
                }
              }}
              className="flex items-center justify-center p-2 rounded-full bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 transition-all active:scale-95 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative" ref={langRef}>
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-850 border border-zinc-200/50 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all active:scale-95 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
              >
                <Globe className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
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
            <h1 className="text-4xl font-extrabold text-[#2a2046] dark:text-white leading-tight mb-6 text-left tracking-tight">
              {step === 1 ? (
                <>Create<br />Account</>
              ) : step === 2 ? (
                <>Personal<br />Details</>
              ) : (
                <>Profile<br />Picture</>
              )}
            </h1>

            {/* Step 1: Credentials */}
            {step === 1 && (
              <div className="w-full space-y-4 animate-in slide-in-from-right-4 duration-300">
                {/* Username Input */}
                <div className="relative w-full h-12">
                  <input
                    type="text"
                    placeholder={t.username}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-full bg-white/80 dark:bg-zinc-900/60 border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.03)] focus:border-[#8b5cf6]/50 focus:bg-white dark:focus:bg-zinc-950 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 rounded-full px-6 outline-none transition-all"
                  />
                </div>

                {/* Email Input */}
                <div className="relative w-full h-12">
                  <input
                    type="email"
                    placeholder={t.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-full bg-white/80 dark:bg-zinc-900/60 border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.03)] focus:border-[#8b5cf6]/50 focus:bg-white dark:focus:bg-zinc-950 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 rounded-full px-6 outline-none transition-all"
                  />
                </div>

                {/* Password Input */}
                <div className="relative w-full h-12 flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t.password}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-full bg-white/80 dark:bg-zinc-900/60 border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.03)] focus:border-[#8b5cf6]/50 focus:bg-white dark:focus:bg-zinc-950 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 rounded-full px-6 pr-14 outline-none transition-all"
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

                {/* Next Step Button */}
                <button
                  type="button"
                  onClick={handleStep1}
                  disabled={!email || username.length < 3 || password.length < 6}
                  className={cn(
                    "w-full h-12 rounded-full text-sm font-bold mt-6 transition-all duration-250 flex items-center justify-center text-white shadow-[0_6px_20px_rgba(139,92,246,0.3)]",
                    (email && username.length >= 3 && password.length >= 6)
                      ? "bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.99] cursor-pointer"
                      : "bg-[#8b5cf6]/40 text-white/70 cursor-default shadow-none pointer-events-none"
                  )}
                >
                  {t.next}
                </button>

                {/* Separator OR Line */}
                <div className="w-full flex items-center justify-center gap-3 py-5">
                  <div className="w-10 border-t border-zinc-200 dark:border-zinc-800" />
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-650 uppercase tracking-widest">{t.or}</span>
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
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={googleLoading || loading}
                    className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Personal Details */}
            {step === 2 && (
              <div className="w-full space-y-4 animate-in slide-in-from-right-4 duration-300">
                {/* Full Name Input */}
                <div className="relative w-full h-12">
                  <input
                    type="text"
                    placeholder={t.fullname}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-full bg-white/80 dark:bg-zinc-900/60 border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.03)] focus:border-[#8b5cf6]/50 focus:bg-white dark:focus:bg-zinc-950 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 rounded-full px-6 outline-none transition-all"
                  />
                </div>

                {/* Birthday Date Input */}
                <div className="relative w-full h-12 flex items-center">
                  <span className="absolute left-6 text-xs text-zinc-400 select-none">{t.birthday}</span>
                  <input
                    type="date"
                    value={dob}
                    min="1900-01-01"
                    max="2026-12-31"
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full h-full bg-white/80 dark:bg-zinc-900/60 border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.03)] focus:border-[#8b5cf6]/50 focus:bg-white dark:focus:bg-zinc-950 text-sm text-zinc-800 dark:text-zinc-100 rounded-full pl-24 pr-6 outline-none transition-all cursor-pointer dark:[color-scheme:dark] [color-scheme:light]"
                  />
                </div>

                {/* Location Search Field with Geolocation Integration */}
                <div className="relative w-full" ref={locationRef}>
                  <div className="relative w-full h-12 flex items-center">
                    <Search className="absolute left-5 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search city, village, postcode..."
                      value={locationSearchQuery}
                      onChange={(e) => {
                        setLocationSearchQuery(e.target.value);
                        setCity(e.target.value);
                        setShowLocationDropdown(true);
                      }}
                      onFocus={() => setShowLocationDropdown(true)}
                      className="w-full h-full bg-white/80 dark:bg-zinc-900/60 border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.03)] focus:border-[#8b5cf6]/50 focus:bg-white dark:focus:bg-zinc-950 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 rounded-full pl-12 pr-12 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={gettingCurrentLocation}
                      className="absolute right-4 p-1.5 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-full active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      title="Use my location"
                    >
                      {gettingCurrentLocation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {showLocationDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-850 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto py-1 text-xs">
                      {searchingLocationSuggestions ? (
                        <div className="flex items-center justify-center py-4 text-zinc-400 gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#8b5cf6]" />
                          <span>Searching global database...</span>
                        </div>
                      ) : locationSuggestions.length > 0 ? (
                        locationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCity(suggestion.display_name);
                              setLocationSearchQuery(suggestion.display_name);
                              setShowLocationDropdown(false);
                            }}
                            className="w-full text-left px-5 py-2.5 hover:bg-[#8b5cf6]/5 hover:text-[#8b5cf6] dark:hover:bg-[#8b5cf6]/10 transition-colors flex flex-col gap-0.5 border-b border-zinc-100/50 dark:border-zinc-800/50 last:border-b-0 cursor-pointer text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="font-semibold truncate">{suggestion.display_name}</span>
                            {suggestion.address && (
                              <span className="text-[10px] text-zinc-400 truncate">
                                {[suggestion.address.suburb, suggestion.address.city, suggestion.address.postcode, suggestion.address.country].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </button>
                        ))
                      ) : locationSearchQuery.length < 3 ? (
                        <>
                          <div className="px-5 py-2 font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Popular Cities</div>
                          {["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune"].map((cityName) => (
                            <button
                              key={cityName}
                              type="button"
                              onClick={() => {
                                setCity(cityName);
                                setLocationSearchQuery(cityName);
                                setShowLocationDropdown(false);
                              }}
                              className="w-full text-left px-5 py-2 hover:bg-[#8b5cf6]/5 hover:text-[#8b5cf6] dark:hover:bg-[#8b5cf6]/10 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                            >
                              📍 {cityName}
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="px-5 py-4 text-center text-zinc-400">
                          No locations found. Try adjusting your query.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Next/Registration Button */}
                <button
                  type="button"
                  onClick={handleStep2}
                  disabled={loading || !fullName || !dob || !city}
                  className={cn(
                    "w-full h-12 rounded-full text-sm font-bold mt-6 transition-all duration-250 flex items-center justify-center text-white shadow-[0_6px_20px_rgba(139,92,246,0.3)]",
                    (fullName && dob && city && !loading)
                      ? "bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.99] cursor-pointer"
                      : "bg-[#8b5cf6]/40 text-white/70 cursor-default shadow-none pointer-events-none"
                  )}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    t.next
                  )}
                </button>
              </div>
            )}

            {/* Step 3: Profile Icon Setup */}
            {step === 3 && (
              <div className="w-full space-y-5 animate-in slide-in-from-right-4 duration-300">
                {/* Profile Pic Upload & Action Buttons */}
                <div className="flex flex-col items-center mb-2">
                  <div className="relative w-24 h-24 mb-4">
                    <div className="w-full h-full rounded-full p-1 bg-gradient-to-tr from-[#ffe3df] via-[#ebdffd] to-[#ffdcd4] dark:from-[#8b5cf6]/50 dark:to-zinc-800 shadow-md">
                      <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800">
                        {avatarPreview ? (
                          <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar preview" />
                        ) : (
                          <div className="text-zinc-300 dark:text-zinc-650 font-extrabold text-3xl select-none">
                            {username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-full shadow-lg active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-[#0c0a11]"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRandomAvatar}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8b5cf6]/10 text-[#8b5cf6] dark:bg-[#8b5cf6]/20 border border-[#8b5cf6]/15 rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer hover:bg-[#8b5cf6]/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Random Anime</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Photo</span>
                    </button>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />

                {/* Anime Avatar Search Field */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block text-left">Or select an anime character</span>

                  <div className="relative w-full h-11 flex items-center bg-white/80 dark:bg-zinc-900/60 border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.03)] focus-within:border-[#8b5cf6]/50 rounded-full px-4">
                    <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search Gojo, Naruto, Luffy..."
                      value={animeSearchQuery}
                      onChange={(e) => setAnimeSearchQuery(e.target.value)}
                      className="w-full h-full bg-transparent text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 outline-none"
                    />
                    {animeSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAnimeSearchQuery('')}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full"
                      >
                        <X className="w-3 h-3 text-zinc-400" />
                      </button>
                    )}
                  </div>

                  {/* Character Avatar Grid */}
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1 bg-white/40 dark:bg-zinc-900/20 p-2 rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30">
                    {filteredAvatars.map((avatar) => (
                      <button
                        key={avatar.name}
                        type="button"
                        onClick={() => {
                          setAvatarPreview(avatar.url);
                          setCroppedImageBlob(null);
                          toast.info(`Selected ${avatar.name}`);
                        }}
                        className={cn(
                          "flex flex-col items-center p-1.5 rounded-xl transition-all active:scale-95 border border-transparent cursor-pointer text-zinc-700 dark:text-zinc-300",
                          avatarPreview === avatar.url
                            ? "bg-[#8b5cf6]/10 border-[#8b5cf6]/30 text-[#8b5cf6]"
                            : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        <img
                          src={avatar.url}
                          className="w-10 h-10 rounded-full object-cover border border-zinc-200/60 dark:border-zinc-800/60"
                          alt={avatar.name}
                        />
                        <span className="text-[9px] font-semibold mt-1 truncate w-full text-center">
                          {avatar.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                    {filteredAvatars.length === 0 && (
                      <div className="col-span-4 text-center py-4 text-xs text-zinc-400">
                        No characters found.
                      </div>
                    )}
                  </div>
                </div>

                {/* Save and Skip controls */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleFinishStep3}
                    disabled={uploadLoading}
                    className={cn(
                      "w-full h-12 rounded-full text-sm font-bold transition-all duration-250 flex items-center justify-center text-white shadow-[0_6px_20px_rgba(139,92,246,0.3)] bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.99] cursor-pointer",
                      uploadLoading && "pointer-events-none opacity-85"
                    )}
                  >
                    {uploadLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving profile...</span>
                      </div>
                    ) : (
                      "Save & Finish"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipStep3}
                    disabled={uploadLoading}
                    className="w-full h-10 rounded-full text-xs font-bold text-zinc-500 hover:text-[#8b5cf6] active:scale-95 transition-all cursor-pointer bg-transparent border border-transparent"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer Switch Redirection Link */}
          <div className="w-full text-center text-xs pt-4 pb-2 z-10">
            <span className="text-zinc-500 dark:text-zinc-400">{t.have_account} </span>
            <Link to="/login" className="text-[#8b5cf6] font-bold hover:underline">{t.login}</Link>
          </div>

        </div>

      </div>

      {selectedImage && (
        <CropModal
          image={selectedImage}
          onCrop={handleCropComplete}
          onCancel={() => setSelectedImage(null)}
        />
      )}

    </div>
  );
}
