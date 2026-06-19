import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';
import { User, Lock, Mail, Calendar, MapPin, ArrowRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara",
  "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi",
  "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur",
  "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Chandigarh", "Guwahati", "Solapur", "Hubli-Dharwad",
];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const { signUpWithUsername } = useAuth();
  const navigate = useNavigate();
  const { speak } = useVoiceGuidance();

  useEffect(() => {
    const welcomePlayed = sessionStorage.getItem('signup_welcome_played');
    if (!welcomePlayed && step === 1) {
      speak("Welcome to Indian Reels! Let's create your account.");
      sessionStorage.setItem('signup_welcome_played', 'true');
    }
  }, [step]);

  const handleStep1 = () => {
    if (!username || !password || !email) {
      toast.error('All fields are required');
      return;
    }
    if (username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setStep(2);
  };

  const handleStep2 = async () => {
    if (!fullName || !dob || !city) {
      toast.error('Please fill in your profile details');
      return;
    }
    setLoading(true);
    const { error } = await signUpWithUsername(username, password, fullName, dob, city, email);
    setLoading(false);
    if (error) {
      toast.error(`Signup failed: ${error.message}`);
    } else {
      toast.success('Welcome to INDIANREELS! 🎉');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="text-white hover:text-primary transition-colors p-2 rounded-lg hover:bg-zinc-900/50"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex-1 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20 mb-3">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent animate-gradient">
              INDIANREELS
            </h1>
          </div>
          {step > 1 && <div className="w-10" />}
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                step >= s ? "w-16 bg-gradient-to-r from-primary to-blue-600" : "w-10 bg-zinc-800"
              )}
            />
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-8 shadow-2xl">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500">
              <div className="text-center space-y-2 mb-6">
                <h2 className="text-2xl font-bold text-white">Create your account</h2>
                <p className="text-sm text-zinc-400">Basic information</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">Username</label>
                  <User className="absolute left-4 bottom-4 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-14 pl-12 pr-4 bg-zinc-950/50 border-zinc-800 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all hover:border-zinc-700"
                  />
                </div>

                <div className="relative group">
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">Email</label>
                  <Mail className="absolute left-4 bottom-4 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 pl-12 pr-4 bg-zinc-950/50 border-zinc-800 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all hover:border-zinc-700"
                  />
                </div>

                <div className="relative group">
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">Password</label>
                  <Lock className="absolute left-4 bottom-4 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 pl-12 pr-4 bg-zinc-950/50 border-zinc-800 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all hover:border-zinc-700"
                  />
                </div>
              </div>

              <Button
                onClick={handleStep1}
                className="w-full h-14 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-bold rounded-xl text-base shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="flex items-center justify-center gap-2">
                  Next
                  <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500">
              <div className="text-center space-y-2 mb-6">
                <h2 className="text-2xl font-bold text-white">Complete your profile</h2>
                <p className="text-sm text-zinc-400">Tell us a bit about yourself</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">Full Name</label>
                  <User className="absolute left-4 bottom-4 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-14 pl-12 pr-4 bg-zinc-950/50 border-zinc-800 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all hover:border-zinc-700"
                  />
                </div>

                <div className="relative group">
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">Birthday</label>
                  <Calendar className="absolute left-4 bottom-4 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors z-10" />
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-14 pl-12 pr-4 bg-zinc-950/50 border-zinc-800 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all hover:border-zinc-700"
                  />
                </div>

                <div className="relative group">
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">City</label>
                  <MapPin className="absolute left-4 top-[52px] -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors z-10" />
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="h-14 pl-12 pr-4 bg-zinc-950/50 border-zinc-800 rounded-xl text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all hover:border-zinc-700">
                      <SelectValue placeholder="Select your city" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-zinc-900 border-zinc-800 rounded-xl">
                      {INDIAN_CITIES.map((cityName) => (
                        <SelectItem key={cityName} value={cityName} className="text-base">
                          {cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleStep2}
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-bold rounded-xl text-base shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign up
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-4 text-zinc-500 font-medium">Already a member?</span>
          </div>
        </div>

        <div className="text-center">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-base font-semibold text-primary hover:text-primary/80 transition-colors duration-200"
          >
            Log in to your account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
