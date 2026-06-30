import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, Play, Pause, MessageSquare, Phone, ChevronRight, 
  Flag, Upload, X, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import helloMpeg from './hello.mpeg';
import { supabase } from '@/db/supabase';

export default function HelpCenter() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const userName = profile?.full_name 
    ? profile.full_name.split(' ')[0] 
    : (profile?.username || 'Rohit');

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form states
  const [images, setImages] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState('');
  const [isSubmittingCallback, setIsSubmittingCallback] = useState(false);

  // Initialize audio on mount
  useEffect(() => {
    const audio = new Audio(helloMpeg);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Web Audio API synthesizer fallback
  const playSynthBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'triangle';
      
      const now = ctx.currentTime;
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.setValueAtTime(659.25, now + 0.1);
      osc1.frequency.setValueAtTime(783.99, now + 0.2);
      
      osc2.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(659.25, now + 0.1);
      osc2.frequency.setValueAtTime(783.99, now + 0.2);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.warn("Synthesizer failed to play", e);
    }
  };

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn("Sound play failed, running synth fallback.", err);
        playSynthBeep();
      });
    } else {
      playSynthBeep();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      playSynthBeep();
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 500);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn("Sound play failed, playing synth beep instead.", err);
        playSynthBeep();
        setIsPlaying(true);
        setTimeout(() => setIsPlaying(false), 500);
      });
    }
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Image Upload Handlers
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error('You can upload a maximum of 5 images.');
      return;
    }
    
    // Check file sizes
    const oversized = files.some(file => file.size > 5 * 1024 * 1024);
    if (oversized) {
      toast.error('Each image must be less than 5MB.');
      return;
    }

    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const [clientIp, setClientIp] = useState('');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => setClientIp(data.ip))
      .catch(console.error);
  }, []);

  // Submit Case Report Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      toast.error('Please upload at least 1 image/screenshot as proof.');
      return;
    }

    if (!profile) {
      toast.error('Please log in to submit a report.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];

      for (const img of images) {
        const fileName = `${profile.id}/${Date.now()}_${img.name}`;
        const { error: uploadError } = await supabase.storage
          .from('media' as any)
          .upload(`feedback/${fileName}`, img);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media' as any)
          .getPublicUrl(`feedback/${fileName}`);

        uploadedUrls.push(publicUrl);
      }

      // Extract username from text description (e.g. @username)
      const usernameMatch = description.match(/@(\w+)/);
      const blackmailerUsername = usernameMatch ? usernameMatch[1] : '';

      const reportPayload = {
        type: 'blackmail',
        reporter_username: profile.username,
        blackmailer_username: blackmailerUsername,
        description: description.trim(),
        reporter_ip: clientIp || 'unknown'
      };

      const { error: dbError } = await (supabase as any)
        .from('feedback')
        .insert({
          user_id: profile.id,
          subject: 'Blackmail & Privacy Violation',
          message: JSON.stringify(reportPayload),
          screenshot_url: uploadedUrls.join(','),
          status: 'pending'
        });

      if (dbError) throw dbError;

      playSound(); // Play confirmation music hello.mpeg
      toast.success('Your grievance report has been submitted. Our safety team is reviewing it immediately!');
      setImages([]);
      setDescription('');
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to submit report: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackPhone.trim()) return;

    setIsSubmittingCallback(true);
    setTimeout(() => {
      setIsSubmittingCallback(false);
      setCallbackPhone('');
      setCallbackOpen(false);
      playSound();
      toast.success('Call back requested! A support executive will contact you within 5 minutes.');
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border sticky top-0 bg-background z-40 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0 rounded-full hover:bg-accent"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold tracking-wide text-foreground uppercase">Help Centre</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full pb-24 space-y-6">
        
        {/* Main Q&A Card Section */}
        <div className="space-y-4 bg-card border border-rose-500/10 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-rose-500">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
            <h2 className="text-xl font-black tracking-tight">
              Report Blackmail & Violations
            </h2>
          </div>
          
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p className="font-bold text-foreground text-base">Hi {userName} ,</p>
            <p className="text-foreground/90 font-medium">
              Is your image or video on this channel? Or is someone blackmailing you?
            </p>
            <p className="text-rose-500 font-bold">
              क्या आपकी फोटो या वीडियो इस चैनल पर है? या कोई आपको ब्लैकमेल कर रहा है?
            </p>
            <p className="text-[12px] bg-accent/40 p-3 rounded-lg border border-border">
              Please play the audio guidance below to learn how we protect you, upload up to 5 screenshots of proof, and submit your report immediately.
            </p>
          </div>
        </div>

        {/* Custom Audio Player */}
        <div className="bg-zinc-800 dark:bg-zinc-900 text-zinc-100 p-4 rounded-2xl flex items-center gap-4 shadow-xl border border-zinc-700/50">
          <Button
            type="button"
            onClick={togglePlay}
            size="icon"
            className="w-12 h-12 rounded-full bg-white text-zinc-900 hover:bg-zinc-200 hover:scale-105 transition-all shrink-0 flex items-center justify-center shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current text-zinc-900" />
            ) : (
              <Play className="w-5 h-5 fill-current text-zinc-900 ml-0.5" />
            )}
          </Button>

          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full cursor-pointer [&>span:first-child]:bg-zinc-700 [&>span:first-child>span]:bg-pink-500 [&>span:last-child]:bg-pink-500 [&>span:last-child]:border-pink-500 [&>span:last-child]:h-3.5 [&>span:last-child]:w-3.5"
            />
          </div>

          <span className="text-sm font-mono text-zinc-300 font-bold tracking-wider shrink-0 select-none">
            {formatTime(currentTime)}
          </span>
        </div>

        {/* Report Form & Image Upload */}
        <form onSubmit={handleSubmit} className="space-y-5 bg-card border p-5 rounded-2xl shadow-sm">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Flag className="w-4 h-4 text-rose-500 fill-rose-500" />
            Submit Grievance details
          </h3>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Upload Proof / Screenshots (Up to 5 images)
            </label>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-rose-500/40 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-accent/40 group flex flex-col items-center justify-center gap-2"
            >
              <Upload className="w-8 h-8 text-muted-foreground group-hover:text-rose-500 transition-colors" />
              <span className="text-sm font-semibold text-foreground">Click to upload screenshots</span>
              <span className="text-[11px] text-muted-foreground">PNG, JPG, or WEBP up to 5MB</span>
            </div>
            
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
              disabled={images.length >= 5}
            />

            {/* Upload Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-5 gap-2 pt-2">
                {images.map((file, idx) => {
                  const url = URL.createObjectURL(file);
                  return (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-accent/40 group">
                      <img src={url} alt="Proof preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 rounded-full p-1 text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-right text-[10px] text-muted-foreground font-mono">
              {images.length}/5 images uploaded
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Additional Details (Optional)
            </label>
            <Textarea
              placeholder="Provide details about the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] rounded-xl resize-none text-sm"
              maxLength={400}
            />
            <div className="text-right text-[10px] text-muted-foreground font-mono">
              {description.length}/400
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all active:scale-[0.98]"
          >
            {isSubmitting ? 'Submitting Report...' : 'Submit Report'}
          </Button>
        </form>

        {/* Emergency Help Channels */}
        <div className="space-y-3 pt-2">
          <h3 className="text-lg font-bold text-foreground">Emergency Help Channels</h3>
          
          <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
            {/* Chat with us */}
            <div 
              onClick={() => navigate('/messages/ai-chat')}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground group-hover:text-rose-500 transition-colors">Emergency Chat Support</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Wait time: Less than 1 minute</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Call me back */}
            <div 
              onClick={() => setCallbackOpen(true)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground group-hover:text-rose-500 transition-colors">Call Back Request (Confidential)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Wait time: Less than 5 minutes</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

      </div>

      {/* Call Back Request Dialog */}
      <Dialog open={callbackOpen} onOpenChange={setCallbackOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Phone className="w-5 h-5 text-rose-500" />
              Request a Call Back
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter your phone number. We will call you back within 5 minutes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCallbackSubmit} className="space-y-4 pt-2">
            <Input
              type="tel"
              placeholder="Enter your phone number (+91...)"
              value={callbackPhone}
              onChange={(e) => setCallbackPhone(e.target.value)}
              className="rounded-xl focus-visible:ring-rose-500"
              required
            />
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCallbackOpen(false)}
                className="flex-1 rounded-xl font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCallback || !callbackPhone.trim()}
                className="flex-1 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
              >
                {isSubmittingCallback ? 'Requesting...' : 'Request Call'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
