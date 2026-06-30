import { Bot, Camera, 
  ChevronLeft, Download, Gift, Heart, Image as ImageIcon, Info, LogOut, MoreVertical,PenTool, 
  Phone, PlayCircle, Plus, RefreshCw, Send, Smile, Trash2, Users, Video, 
  Volume2, X 
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DrawingCanvas } from '@/components/common/DrawingCanvas';
import { EmojiBlast } from '@/components/common/EmojiBlast';
import { FullScreenImage } from '@/components/common/FullScreenImage';
import { GifSelector } from '@/components/common/GifSelector';
import { GiftSheet } from '@/components/common/GiftSheet';
import IncomingCallModal from '@/components/IncomingCallModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Dialog, DialogContent, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import VideoCallScreen from '@/components/VideoCallScreen';
import VoiceCallScreen from '@/components/VoiceCallScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { Message, Profile } from '@/types';

interface IncomingCall {
  room_name: string;
  caller_id: string;
  caller_username: string;
  caller_photo: string;
  call_type: 'video' | 'voice';
}

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  creator_id: string;
  created_at: string;
}

const VOICE_LANG_MAP: Record<string, { bcp47: string; iso: string }> = {
  "English": { bcp47: "en-US", iso: "en" },
  "Hindi": { bcp47: "hi-IN", iso: "hi" },
  "Bengali": { bcp47: "bn-IN", iso: "bn" },
  "Telugu": { bcp47: "te-IN", iso: "te" },
  "Marathi": { bcp47: "mr-IN", iso: "mr" },
  "Tamil": { bcp47: "ta-IN", iso: "ta" },
  "Gujarati": { bcp47: "gu-IN", iso: "gu" },
  "Urdu": { bcp47: "ur-PK", iso: "ur" },
  "Kannada": { bcp47: "kn-IN", iso: "kn" },
  "Odia": { bcp47: "or-IN", iso: "or" },
  "Punjabi": { bcp47: "pa-IN", iso: "pa" },
  "Malayalam": { bcp47: "ml-IN", iso: "ml" },
  "Assamese": { bcp47: "as-IN", iso: "as" },
  "Kashmiri": { bcp47: "ks-IN", iso: "ks" },
  "Nepali": { bcp47: "ne-NP", iso: "ne" },
  "Spanish": { bcp47: "es-ES", iso: "es" },
  "French": { bcp47: "fr-FR", iso: "fr" },
  "German": { bcp47: "de-DE", iso: "de" },
  "Chinese": { bcp47: "zh-CN", iso: "zh" },
  "Japanese": { bcp47: "ja-JP", iso: "ja" },
  "Korean": { bcp47: "ko-KR", iso: "ko" },
  "Russian": { bcp47: "ru-RU", iso: "ru" },
  "Portuguese": { bcp47: "pt-PT", iso: "pt" },
  "Italian": { bcp47: "it-IT", iso: "it" },
  "Arabic": { bcp47: "ar-SA", iso: "ar" },
  "Turkish": { bcp47: "tr-TR", iso: "tr" },
  "Vietnamese": { bcp47: "vi-VN", iso: "vi" },
  "Thai": { bcp47: "th-TH", iso: "th" },
  "Indonesian": { bcp47: "id-ID", iso: "id" },
  "Dutch": { bcp47: "nl-NL", iso: "nl" },
  "Polish": { bcp47: "pl-PL", iso: "pl" },
  "Swedish": { bcp47: "sv-SE", iso: "sv" },
  "Greek": { bcp47: "el-GR", iso: "el" },
  "Czech": { bcp47: "cs-CZ", iso: "cs" },
  "Danish": { bcp47: "da-DK", iso: "da" },
  "Finnish": { bcp47: "fi-FI", iso: "fi" },
  "Hungarian": { bcp47: "hu-HU", iso: "hu" },
  "Norwegian": { bcp47: "no-NO", iso: "no" },
  "Romanian": { bcp47: "ro-RO", iso: "ro" },
  "Ukrainian": { bcp47: "uk-UA", iso: "uk" },
  "Hebrew": { bcp47: "he-IL", iso: "he" },
  "Malay": { bcp47: "ms-MY", iso: "ms" },
  "Persian": { bcp47: "fa-IR", iso: "fa" },
  "Pashto": { bcp47: "ps-AF", iso: "ps" },
  "Amharic": { bcp47: "am-ET", iso: "am" },
  "Burmese": { bcp47: "my-MM", iso: "my" },
  "Khmer": { bcp47: "km-KH", iso: "km" },
  "Lao": { bcp47: "lo-LA", iso: "lo" },
  "Sinhala": { bcp47: "si-LK", iso: "si" },
  "Kazakh": { bcp47: "kk-KZ", iso: "kk" },
  "Uzbek": { bcp47: "uz-UZ", iso: "uz" },
  "Azerbaijani": { bcp47: "az-AZ", iso: "az" }
};

export default function IndividualChat({ isGroup = false }: { isGroup?: boolean }) {
  const { username, groupId } = useParams<{ username?: string; groupId?: string }>();
  const { profile: currentUser } = useAuth();
  const { chatBackgroundUrl, chatBackgroundStyle } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullScreenProfile, setShowFullScreenProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [groupOnlineCount, setGroupOnlineCount] = useState(0);
  const [showDrawing, setShowDrawing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [friendsToInvite, setFriendsToInvite] = useState<Profile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const holdTimerRef = useRef<any>(null);

  // Voice translation states
  const [recognition, setRecognition] = useState<any>(null);
  const [translatedTextPreview, setTranslatedTextPreview] = useState<string | null>(null);
  const recognitionTextRef = useRef<string>('');
  const [activeCall, setActiveCall] = useState<{ type: 'video' | 'voice'; roomId: string } | null>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{ callerName: string; callerAvatar?: string; callType: 'video' | 'voice'; roomName: string } | null>(null);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [inAppNotif, setInAppNotif] = useState<{ avatar?: string; name: string; text: string } | null>(null);
  const notifTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ── Notification permission ──────────────────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Dark Mode Detection for Chat Background ──────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(true);
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    checkTheme();
    
    // Set up a MutationObserver to watch for class changes on documentElement
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ── Soft bubble-pop sound (two-tone, pleasant) ───────────────────────────
  const playPopSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const play = (freq: number, start: number, dur: number, vol: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + start + dur);
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      play(1200, 0,    0.1, 0.22);
      play(900,  0.07, 0.12, 0.15);
    } catch {
      // ignore
    }
  };

  // ── Beautiful in-app floating notification banner ────────────────────────
  const showInAppNotif = (avatar: string | undefined, name: string, text: string) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setInAppNotif({ avatar, name, text });
    notifTimerRef.current = setTimeout(() => setInAppNotif(null), 3500);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChatDetails();
  }, [username, groupId, isGroup, currentUser]);

  useEffect(() => {
    let subscription: any;
    let callSubscription: any;
    let presenceChannel: any;
    let myPresenceChannel: any;
    let typingChannel: any;
    
    if (currentUser && (isGroup ? groupId : profile?.id)) {
       subscription = subscribeToMessages(isGroup ? groupId! : profile!.id);
       
       if (isGroup ? groupId : profile?.id) {
         if (!isGroup) callSubscription = subscribeToIncomingCalls();

         // Subscribe to typing indicators
         const targetId = isGroup ? groupId : profile!.id;
         typingChannel = supabase
           .channel(`typing-watch-${targetId}`)
           .on(
             'postgres_changes',
             {
               event: '*',
               schema: 'public',
               table: 'typing_indicators',
               filter: isGroup ? `group_id=eq.${groupId}` : `user_id=eq.${profile?.id}`
             },
             (payload) => {
               if (payload.eventType === 'DELETE') {
                 setIsTyping(false);
               } else {
                 setIsTyping((payload.new as any).is_typing);
               }
             }
           )
           .subscribe();
         // Track Presence for Online Status
         
         // Channel where I track my own presence
         // For individual: my own channel. For group: the group channel.
         const myTrackChannelName = isGroup ? `presence-group-${groupId}` : `presence-user-${currentUser.id}`;
         myPresenceChannel = supabase.channel(myTrackChannelName);
         myPresenceChannel.subscribe(async (status: any) => {
           if (status === 'SUBSCRIBED') {
             await myPresenceChannel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
           }
         });

         // Channel I subscribe to to see others
         const subscribeChannelName = isGroup ? `presence-group-${groupId}` : `presence-user-${targetId}`;
         presenceChannel = supabase.channel(subscribeChannelName);
         presenceChannel
           .on('presence', { event: 'sync' }, () => {
             const state = presenceChannel.presenceState();
             
             if (isGroup) {
               // Count unique users in the group channel
               const onlineUsers = new Set(Object.values(state).flatMap((presence: any) => 
                 presence.map((p: any) => p.user_id)
               ));
               setGroupOnlineCount(onlineUsers.size);
               setIsOnline(onlineUsers.size > 1); // Me + someone else
             } else {
               const isUserOnline = Object.values(state).some((presence: any) => 
                 presence.some((p: any) => p.user_id === targetId)
               );
               setIsOnline(isUserOnline);
             }
           })
           .subscribe();
       }
    }
    
    return () => {
      if (subscription) subscription.unsubscribe();
      if (callSubscription) callSubscription.unsubscribe();
      if (typingChannel) supabase.removeChannel(typingChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
      if (myPresenceChannel) supabase.removeChannel(myPresenceChannel);
    };
  }, [currentUser, profile?.id, groupId, isGroup]);

  useEffect(() => {
    if (!content.trim() || !currentUser || (!profile?.id && !isGroup)) return;
    
    const sendTyping = async (typing: boolean) => {
      if (!currentUser) return;
      try {
        if (typing) {
          await (supabase as any).from('typing_indicators').upsert({
            user_id: currentUser.id,
            target_id: isGroup ? null : profile?.id,
            group_id: isGroup ? groupId : null,
            is_typing: true,
            updated_at: new Date().toISOString()
          });
        } else {
          await (supabase as any).from('typing_indicators').delete()
            .match({ user_id: currentUser.id, target_id: isGroup ? null : profile?.id, group_id: isGroup ? groupId : null });
        }
      } catch (err) {
        console.error(err);
      }
    };

    sendTyping(true);
    const timeout = setTimeout(() => sendTyping(false), 3000);
    return () => {
      clearTimeout(timeout);
      sendTyping(false);
    };
  }, [content, currentUser, profile?.id, isGroup, groupId]);

  const fetchChatDetails = async () => {
    if (!currentUser) return;
    isInitialLoad.current = true; // reset on every new chat open
    setLoading(true);
    try {
      if (isGroup && groupId) {
        // Fetch Group
        const { data: groupData, error: groupError } = await (supabase as any)
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();
        
        if (groupError) throw groupError;
        setGroup(groupData);

        // Fetch Members
        const { data: membersData } = await (supabase as any)
          .from('group_members')
          .select('profiles(*)')
          .eq('group_id', groupId);
        
        setGroupMembers((membersData || []).map((m: any) => m.profiles));

        // Fetch Messages
        const { data: messagesData, error: messagesError } = await (supabase as any)
          .from('messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(messagesData || []);
        
        fetchFriendsToInvite();
      } else if (username) {
        const targetUsername = username.replace(/^@/, '').trim();
        const { data: profileData, error: profileError }: any = await (supabase as any)
          .from('profiles')
          .select('*')
          .ilike('username', targetUsername)
          .limit(1)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData) {
          toast.error('User not found');
          navigate('/messages');
          return;
        }
        setProfile(profileData);

        // Allow chatting if there's any follow or if it's already an active chat
        const { data: follows } = await (supabase as any)
          .from('follows')
          .select('*')
          .in('follower_id', [currentUser.id, profileData.id])
          .in('following_id', [currentUser.id, profileData.id]);

        const iFollow = follows?.some((f: any) => f.follower_id === currentUser.id && f.following_id === profileData.id);
        const theyFollow = follows?.some((f: any) => f.follower_id === profileData.id && f.following_id === currentUser.id);

        if (!iFollow && !theyFollow) {
          // If no follow, check for existing messages
          const { data: messageCheck } = await (supabase as any)
            .from('messages')
            .select('id')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${profileData.id}),and(sender_id.eq.${profileData.id},receiver_id.eq.${currentUser.id})`)
            .limit(1);

          if (!messageCheck || messageCheck.length === 0) {
            toast.error('Follow this user to start a conversation');
            navigate('/messages');
            return;
          }
        }

        const { data: messagesData, error: messagesError }: any = await (supabase as any)
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${profileData.id}),and(sender_id.eq.${profileData.id},receiver_id.eq.${currentUser.id})`)
          .is('group_id', null)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(messagesData || []);

        // Mark messages as read
        if (currentUser && profileData) {
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('read_receipts_enabled')
            .eq('id', currentUser.id)
            .maybeSingle();

          if ((currentUserProfile as any)?.read_receipts_enabled !== false) {
            await (supabase as any)
              .from('messages')
              .update({ is_read: true })
              .eq('receiver_id', currentUser.id)
              .eq('sender_id', profileData.id)
              .eq('is_read', false);
          }
        }
      }
    } catch (error: any) {
      toast.error('Error loading chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendsToInvite = async () => {
    if (!currentUser) return;
    try {
      const { data: followsData } = await (supabase as any)
        .from('follows')
        .select('*')
        .or(`follower_id.eq.${currentUser.id},following_id.eq.${currentUser.id}`);

      if (!followsData) return;
      const iFollowSet = new Set(followsData.filter((f: any) => f.follower_id === currentUser.id).map((f: any) => f.following_id));
      const theyFollowSet = new Set(followsData.filter((f: any) => f.following_id === currentUser.id).map((f: any) => f.follower_id));
      const mutualIds = Array.from(iFollowSet).filter(id => theyFollowSet.has(id));

      if (mutualIds.length === 0) return;

      const { data: profilesData } = await (supabase as any)
        .from('profiles')
        .select('*')
        .in('id', mutualIds);

      // Filter out existing members
      const memberIds = new Set(groupMembers.map(m => m.id));
      setFriendsToInvite((profilesData || []).filter((p: any) => !memberIds.has(p.id)));
    } catch (error) {
      console.error(error);
    }
  };

  const inviteToGroup = async (userId: string) => {
    if (!groupId) return;
    try {
      const { error } = await (supabase as any)
        .from('group_members')
        .insert({ group_id: groupId, user_id: userId });
      
      if (error) throw error;
      toast.success('Member added');
      fetchChatDetails();
    } catch (error) {
      toast.error('Failed to add member');
    }
  };

  const startRecording = async () => {
    // Reset transcript ref
    recognitionTextRef.current = '';

    if (localStorage.getItem('voice_transcribe_enabled') === 'true') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        
        const inputLangPref = localStorage.getItem('voice_transcribe_input_lang') || 'English';
        const langConfig = VOICE_LANG_MAP[inputLangPref] || { bcp47: 'en-US', iso: 'en' };
        rec.lang = langConfig.bcp47;
        
        let transcriptResult = '';
        rec.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcriptResult += event.results[i][0].transcript + ' ';
            }
          }
          recognitionTextRef.current = transcriptResult.trim();
        };
        
        rec.onerror = (err: any) => {
          console.warn("Speech recognition error:", err);
        };
        
        rec.start();
        setRecognition(rec);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        const isEnabled = localStorage.getItem('voice_transcribe_enabled') === 'true';
        const originalBlob = chunks.length > 0 ? new Blob(chunks, { type: 'audio/webm' }) : null;
        const originalUrl = originalBlob ? URL.createObjectURL(originalBlob) : null;
        
        if (isEnabled) {
          // Wait slightly for speech recognition to finalize transcription
          await new Promise(r => setTimeout(r, 600));
          const transcriptText = recognitionTextRef.current.trim();
          
          if (transcriptText) {
            toast.loading("Translating voice...", { id: "voice-translation-toast" });
            try {
              const inputLangPref = localStorage.getItem('voice_transcribe_input_lang') || 'English';
              const targetLangPref = localStorage.getItem('voice_transcribe_target_lang') || 'Japanese';
              
              const inputLangConfig = VOICE_LANG_MAP[inputLangPref] || { iso: 'auto' };
              const targetLangConfig = VOICE_LANG_MAP[targetLangPref] || { iso: 'ja' };
              
              const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${inputLangConfig.iso}&tl=${targetLangConfig.iso}&dt=t&q=${encodeURIComponent(transcriptText)}`;
              const translationRes = await fetch(translateUrl);
              const translationData = await translationRes.json();
              const translatedText = translationData[0][0][0] || transcriptText;
              
              const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLangConfig.iso}&client=tw-ob&q=${encodeURIComponent(translatedText)}`;
              
              setVoicePreviewBlob(originalBlob || new Blob([], { type: 'audio/webm' }));
              setVoicePreviewUrl(ttsUrl);
              setTranslatedTextPreview(translatedText);
              
              toast.success("Translated & voice transcript ready!", { id: "voice-translation-toast" });
            } catch (err) {
              console.warn("Translation failed, using original audio:", err);
              toast.error("Translation failed, using original audio", { id: "voice-translation-toast" });
              setVoicePreviewBlob(originalBlob);
              setVoicePreviewUrl(originalUrl);
              setTranslatedTextPreview(null);
            }
          } else {
            toast.error("No speech detected, sending original audio", { id: "voice-translation-toast" });
            setVoicePreviewBlob(originalBlob);
            setVoicePreviewUrl(originalUrl);
            setTranslatedTextPreview(null);
          }
        } else {
          setVoicePreviewBlob(originalBlob);
          setVoicePreviewUrl(originalUrl);
          setTranslatedTextPreview(null);
        }
      };

      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (recorder && isRecording) {
      recorder.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
  };

  const cancelRecording = () => {
    if (recorder && isRecording) {
      recorder.stream.getTracks().forEach(track => track.stop());
      setRecorder(null);
      setIsRecording(false);
      setAudioChunks([]);
      setRecordingTime(0);
      clearInterval(recordingTimerRef.current);
    }
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    // Also discard preview
    if (voicePreviewUrl && !voicePreviewUrl.startsWith('https://translate.google.com')) {
      URL.revokeObjectURL(voicePreviewUrl);
    }
    setVoicePreviewBlob(null);
    setVoicePreviewUrl(null);
    setTranslatedTextPreview(null);
  };

  const sendVoicePreview = async () => {
    if (!voicePreviewUrl) return;

    if (translatedTextPreview) {
      const ttsUrl = voicePreviewUrl;
      const text = translatedTextPreview;
      setVoicePreviewBlob(null);
      setVoicePreviewUrl(null);
      setTranslatedTextPreview(null);
      await sendMessage(ttsUrl, 'voice', text);
    } else if (voicePreviewBlob) {
      const blob = voicePreviewBlob;
      if (voicePreviewUrl && !voicePreviewUrl.startsWith('https://translate.google.com')) {
        URL.revokeObjectURL(voicePreviewUrl);
      }
      setVoicePreviewBlob(null);
      setVoicePreviewUrl(null);
      setTranslatedTextPreview(null);
      await handleVoiceUpload(blob);
    }
  };

  // Cleanup recording on component unmount or navigation
  useEffect(() => {
    return () => {
      // Cancel recording if user navigates away
      if (isRecording && recorder) {
        recorder.stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, recorder]);

  // Hold-to-record handlers (WhatsApp style)
  const handleMicPressStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isRecording || voicePreviewBlob) return;
    startRecording();
  };

  const handleMicPressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) stopRecording();
  };

  const handleVoiceUpload = async (blob: Blob) => {
    if (!currentUser || (!profile?.id && !isGroup)) return;
    setUploading(true);
    try {
      const fileName = `${currentUser.id}/${Date.now()}.webm`;
      const filePath = `chat_voice/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media' as any)
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media' as any)
        .getPublicUrl(filePath);

      await sendMessage(publicUrl, 'voice');
    } catch (error: any) {
      toast.error('Failed to upload voice message');
    } finally {
      setUploading(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    if (!currentUser) return;
    try {
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('read_receipts_enabled')
        .eq('id', currentUser.id)
        .maybeSingle();

      if ((currentUserProfile as any)?.read_receipts_enabled !== false) {
        await (supabase as any)
          .from('messages')
          .update({ is_read: true })
          .eq('id', messageId);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };



  const leaveGroup = async () => {
    if (!groupId || !currentUser) return;
    try {
      const { error } = await (supabase as any)
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      toast.success('Left group');
      navigate('/messages');
    } catch (error) {
      toast.error('Failed to leave group');
    }
  };

  const subscribeToMessages = (targetId: string) => {
    // For individual chats, consistently order IDs to use the same channel name
    const ids = isGroup ? [targetId] : [currentUser?.id, targetId].sort();
    const channelName = isGroup ? `chat-group-${targetId}` : `chat-${ids[0]}-${ids[1]}`;
    
    return supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: isGroup ? `group_id=eq.${targetId}` : undefined
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            if (isGroup) {
               setMessages(prev => {
                  if (prev.find(m => m.id === newMessage.id)) return prev;
                  // Play sound + notify for others' messages
                  if (newMessage.sender_id !== currentUser?.id) {
                    playPopSound();
                    const senderMember = groupMembers.find(m => m.id === newMessage.sender_id);
                    showInAppNotif(
                      senderMember?.profile_photo_url || undefined,
                      senderMember?.username || 'Someone',
                      newMessage.content || '🎵 Voice message'
                    );
                  }
                  return [...prev, newMessage];
               });
            } else if (
              (newMessage.sender_id === targetId && newMessage.receiver_id === currentUser?.id) ||
              (newMessage.sender_id === currentUser?.id && newMessage.receiver_id === targetId)
            ) {
              setMessages((prev) => {
                 if (prev.find(m => m.id === newMessage.id)) return prev;
                 // Play sound + notify only for incoming messages
                 if (newMessage.sender_id === targetId) {
                   playPopSound();
                   showInAppNotif(
                     profile?.profile_photo_url || undefined,
                     profile?.username || 'New message',
                     newMessage.content || '🎵 Voice message'
                   );
                   markMessageAsRead(newMessage.id);
                 }
                 return [...prev, newMessage];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as Message;
            setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
          }
        }
      )
      .subscribe();
  };

  const isInitialLoad = useRef(true);

  // Scroll helper — direct scrollTop is more reliable than scrollIntoView
  const jumpToBottom = (smooth = false) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialLoad.current) {
      // Use rAF so DOM is fully painted before we measure scrollHeight
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          jumpToBottom(false);
          isInitialLoad.current = false;
        });
      });
    } else {
      jumpToBottom(true);
    }
  }, [messages]);

  const scrollToBottom = () => jumpToBottom(true);

  const startCall = async (callType: 'video' | 'voice') => {
    if (!currentUser || !profile || isGroup) return;
    
    const roomId = `room_${currentUser.id}_${profile.id}_${Date.now()}`;
    
    try {
      // Create call record in database
      const { error } = await (supabase as any).from('video_calls').insert({
        room_name: roomId,
        caller_id: currentUser.id,
        receiver_id: profile.id,
        status: 'pending',
        call_type: callType
      });

      if (error) throw error;
      
      // Set active call state to show call screen
      setActiveCall({ type: callType, roomId });
      
      toast.success(`${callType === 'video' ? 'Video' : 'Voice'} call started`);
    } catch (error: any) {
      toast.error('Failed to start call');
      console.error(error);
    }
  };

  const handleAcceptIncomingCall = () => {
    if (!incomingCallData) return;
    
    setActiveCall({ type: incomingCallData.callType, roomId: incomingCallData.roomName });
    setShowIncomingCall(false);
  };

  const handleDeclineIncomingCall = () => {
    setShowIncomingCall(false);
    setIncomingCallData(null);
    toast.info('Call declined');
  };

  const handleEndCall = () => {
    setActiveCall(null);
    toast.info('Call ended');
  };

  const subscribeToIncomingCalls = () => {
    return supabase
      .channel(`incoming-calls-${currentUser?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_calls',
          filter: `receiver_id=eq.${currentUser?.id}`
        },
        async (payload) => {
          const call = payload.new as any;
          
          // Fetch caller profile
          const { data: callerProfile } = await (supabase as any)
            .from('profiles')
            .select('username, profile_photo_url')
            .eq('id', call.caller_id)
            .maybeSingle();
          
          if (callerProfile) {
            setIncomingCallData({
              callerName: callerProfile.username,
              callerAvatar: callerProfile.profile_photo_url,
              callType: call.call_type || 'video',
              roomName: call.room_name
            });
            setShowIncomingCall(true);
            
            // Auto-dismiss after 30 seconds
            setTimeout(() => {
              setShowIncomingCall(false);
              setIncomingCallData(null);
            }, 30000);
          }
        }
      )
      .subscribe();
  };

  const joinCall = () => {
    if (incomingCall) {
      navigate(`/call/${incomingCall.room_name}?type=${incomingCall.call_type}`);
      setIncomingCall(null);
    }
  };

  const declineCall = async () => {
    if (incomingCall) {
      // Update call status to declined
      await (supabase as any)
        .from('video_calls')
        .update({ status: 'declined' })
        .eq('room_name', incomingCall.room_name);
      
      setIncomingCall(null);
      toast.info('Call declined');
    }
  };

  const sendMessage = async (e?: React.FormEvent | string, mediaTypeParam?: 'image' | 'video' | 'file' | 'voice', customContent?: string) => {
    if (typeof e !== 'string') e?.preventDefault();
    
    // Check if we have anything to send
    const isMedia = typeof e === 'string' || !!selectedGif;
    const isText = content.trim().length > 0;
    const isCustom = !!customContent;
    
    if (!isMedia && !isText && !isCustom) return;

    if (!currentUser) return;
    if (!isGroup && !profile) return;
    if (isGroup && !groupId) return;

    const mediaUrl = typeof e === 'string' ? e : (selectedGif || null);
    const newContent = customContent || (isMedia && !selectedGif ? null : content);
    const mediaType = mediaTypeParam || (mediaUrl ? 'image' : null);
    
    if (!isMedia && !isCustom) setContent('');
    if (selectedGif) setSelectedGif(null);
    if (!isMedia && !isCustom) setContent('');

    try {
      const { data, error } = await (supabase as any).from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: isGroup ? null : profile!.id,
        group_id: isGroup ? groupId : null,
        content: newContent || null,
        media_url: mediaUrl,
        media_type: mediaType,
      }).select().single();

      if (error) throw error;
      if (data) {
        setMessages((prev) => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }

      // Clear typing indicator
      if (currentUser) {
        await (supabase as any).from('typing_indicators').delete()
          .match({ user_id: currentUser.id, target_id: isGroup ? null : profile?.id, group_id: isGroup ? groupId : null });
      }

      // ── AI Auto-Reply: check if recipient has it enabled ──
      if (!isGroup && profile && newContent && typeof newContent === 'string') {
        const { data: recipientProfile } = await (supabase as any)
          .from('profiles')
          .select('ai_auto_pilot, username, full_name')
          .eq('id', profile.id)
          .maybeSingle();

        if (recipientProfile?.ai_auto_pilot) {
          triggerAIAutoReply(recipientProfile, newContent);
        }
      }
    } catch (error: any) {
      toast.error('Failed to send message');
      if (!isMedia && !isCustom) setContent(newContent || '');
    }
  };

  // ── AI Auto-Reply helper (fire-and-forget, non-blocking) ──
  const triggerAIAutoReply = async (recipientProfile: any, userMessage: string) => {
    try {
      // Small delay so it feels like they're "typing"
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 1500));

      const recentMsgs = messages.slice(-10).map(m => ({
        role: m.sender_id === profile!.id ? 'assistant' : 'user',
        content: m.content || '',
      })).filter(m => m.content);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          language: 'hinglish',
          autoReplyFor: {
            name: recipientProfile.full_name || recipientProfile.username,
            username: recipientProfile.username,
          },
          messages: [
            ...recentMsgs,
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aiReply = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const chunk = JSON.parse(jsonStr);
            if (chunk.token) aiReply += chunk.token;
          } catch { /* skip */ }
        }
      }

      if (!aiReply.trim()) return;

      // Insert AI reply as the recipient's message
      const { data: aiMsg } = await (supabase as any).from('messages').insert({
        sender_id: profile!.id,
        receiver_id: currentUser!.id,
        content: aiReply.trim(),
        is_ai_reply: true,
      }).select().single();

      if (aiMsg) {
        setMessages(prev => {
          if (prev.find(m => m.id === aiMsg.id)) return prev;
          return [...prev, aiMsg];
        });
      }
    } catch (err) {
      console.warn('AI auto-reply failed silently:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (!isGroup && !profile) return;

    setUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const filePath = `chat_files/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from('media' as any)
        .upload(filePath, file);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage.from('media' as any).getPublicUrl(filePath);

      // 2. Sync with Storage (Optional)
      if (isImage || isVideo) {
        try {
          await supabase.functions.invoke('telegram-proxy', {
            body: {
              method: isImage ? 'sendPhoto' : 'sendVideo',
              [isImage ? 'photo' : 'video']: publicUrl,
              caption: `File from ${currentUser.username} in ${isGroup ? group?.name : 'chat'}`
            }
          });
        } catch (err) {
          console.error('Storage sync failed:', err);
        }
      }

      // 3. Save to Database using reusable sendMessage
      await sendMessage(
        publicUrl, 
        isImage ? 'image' : isVideo ? 'video' : 'file',
        file.name
      );
      
      toast.success('File sent successfully');
    } catch (error: any) {
      toast.error(`File upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const sendHeart = async () => {
    if (!currentUser) return;
    if (!isGroup && !profile) return;
    
    try {
      // Use reusable sendMessage for heart
      await sendMessage(undefined, undefined, '❤️');
    } catch (error) {
      toast.error('Failed to send heart');
    }
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.media_type === 'voice') {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <VoicePlayer url={msg.media_url!} />
          {msg.content && (
            <p className="text-xs italic opacity-95 text-left border-t border-white/10 pt-1.5 mt-1 select-text">
              {msg.content}
            </p>
          )}
        </div>
      );
    }

    // Gift message rendering
    if (msg.gift_type) {
      const isMe = msg.sender_id === currentUser?.id;
      return (
        <div className={cn(
          "flex flex-col items-center py-2 px-4 rounded-2xl",
          isMe
            ? "bg-gradient-to-br from-[#ff007f]/20 to-[#ff4d00]/10 border border-[#ff007f]/30"
            : "bg-gradient-to-br from-purple-900/30 to-zinc-900/30 border border-purple-500/20"
        )}>
          <div className="text-5xl mb-1 animate-bounce" style={{ animationDuration: '1.5s' }}>
            {msg.gift_emoji}
          </div>
          <p className="text-white font-black text-sm">{msg.gift_name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-yellow-400 text-xs">🪙</span>
            <span className="text-yellow-300 text-xs font-bold">{msg.coins_spent} coins</span>
          </div>
          <p className="text-zinc-400 text-[10px] mt-1 uppercase tracking-widest">
            {isMe ? `Sent to ${profile?.username}` : `Gift from ${profile?.username}`}
          </p>
        </div>
      );
    }

    const content = msg.content || '';
    const reelMatch = content.match(/reels\?id=([a-f0-9-]+)/i) || content.match(/reels\/([a-f0-9-]+)/i);
    const postMatch = content.match(/post\/([a-f0-9-]+)/i);
    
    // If it's a shared reel/post, prioritize the preview card
    if (reelMatch || postMatch) {
      const type = reelMatch ? 'Reel' : 'Post';
      const id = reelMatch ? reelMatch[1] : postMatch![1];
      const previewUrl = msg.media_url;
      const isVideo = msg.media_type === 'video' || previewUrl?.match(/\.(mp4|webm|ogg|mov)$|^https:\/\/.*video.*$/i);
      
      return (
        <div className="flex flex-col gap-2">
          {content.split('\n')[0] && (
            <p className="whitespace-pre-wrap break-words overflow-hidden text-xs opacity-90 px-1">{content.split('\n')[0]}</p>
          )}
          <div 
            className="bg-black/20 dark:bg-white/10 p-2 rounded-xl border border-white/10 cursor-pointer hover:bg-black/30 transition-all active:scale-[0.98] shadow-inner group overflow-hidden"
            onClick={() => navigate(type === 'Reel' ? `/reels?id=${id}` : `/post/${id}`)}
          >
            {previewUrl ? (
              <div className="h-48 w-full bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden border border-white/5 relative mb-2">
                {isVideo ? (
                  <video src={previewUrl} className="w-full h-full object-contain" muted autoPlay loop playsInline />
                ) : (
                  <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-1">
                     <Plus className="w-3 h-3" /> View {type}
                  </span>
                </div>
                <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-full">
                  {type === 'Reel' ? <Video className="w-3 h-3 text-white" /> : <ImageIcon className="w-3 h-3 text-white" />}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2 px-1">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  {type === 'Reel' ? <Video className="w-5 h-5 text-white" /> : <ImageIcon className="w-5 h-5 text-white" />}
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-[10px] uppercase tracking-widest text-primary">Shared {type}</span>
                  <span className="text-[9px] text-muted-foreground font-bold italic">Tap to view full content</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (msg.media_url) {
      const isVideo = msg.media_type === 'video' || msg.media_url.match(/\.(mp4|webm|ogg|mov)$|^https:\/\/.*video.*$/i);
      const isImage = msg.media_type === 'image' || msg.media_url.match(/\.(jpg|jpeg|png|gif|webp|svg)$|^https:\/\/.*image.*$/i);
      
      if (!isVideo && !isImage) {
        // Generic File
        return (
          <div className="flex items-center gap-3 p-2 bg-black/10 dark:bg-white/5 rounded-xl border border-white/5">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary rotate-45" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold truncate max-w-[150px]">{msg.content || 'File'}</span>
              <a 
                href={msg.media_url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] text-primary hover:underline"
                download={msg.content || 'file'}
              >
                Download File
              </a>
            </div>
          </div>
        );
      }
      
      return (
        <div className="relative group cursor-pointer" onClick={() => !isVideo && setShowFullScreenProfile(true)}>
          {isVideo ? (
            <video 
              src={msg.media_url} 
              className="w-full rounded-lg object-contain max-h-60" 
              controls
              autoPlay
              muted
              loop
            />
          ) : (
            <img src={msg.media_url} className="w-full rounded-lg object-contain" alt="Sent photo" />
          )}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <a 
              href={msg.media_url} 
              download 
              target="_blank" 
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 bg-black/50 rounded-full hover:bg-black/70"
            >
              <Download className="w-4 h-4 text-white" />
            </a>
          </div>
        </div>
      );
    }

    return <p className="whitespace-pre-wrap break-words overflow-hidden">{content}</p>;
  };

  // Check if Love Pink theme is active
  const isLovePinkTheme = chatBackgroundUrl === 'love-pink-theme';

  const isDefaultBg = !isLovePinkTheme && (!chatBackgroundUrl || chatBackgroundStyle === 'default');

  const defaultBgStyle = isDefaultBg ? {
    backgroundImage: isDarkMode
      ? `radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 60%), radial-gradient(circle at 1.5px 1.5px, rgba(255, 255, 255, 0.035) 1.5px, transparent 0), linear-gradient(180deg, #07070a 0%, #0d0b18 50%, #07070a 100%)`
      : `radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 60%), radial-gradient(circle at 1.5px 1.5px, rgba(0, 0, 0, 0.035) 1.5px, transparent 0), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)`,
    backgroundSize: '100% 100%, 24px 24px, 100% 100%',
    backgroundRepeat: 'no-repeat, repeat, no-repeat',
  } : {
    backgroundImage: !isLovePinkTheme && chatBackgroundStyle === 'image' ? `url(${chatBackgroundUrl})` : !isLovePinkTheme && chatBackgroundUrl?.startsWith('linear-gradient') ? chatBackgroundUrl : 'none',
    backgroundColor: !isLovePinkTheme && (chatBackgroundStyle === 'color' && !chatBackgroundUrl?.startsWith('linear-gradient') ? chatBackgroundUrl : undefined) as any,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  };

  return (
    <>
      {/* ── Beautiful In-App Notification Banner ── */}
      {inAppNotif && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          style={{ animation: 'notifSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl min-w-[240px] max-w-[320px]"
            style={{
              background: 'rgba(20,20,30,0.88)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/60">
                {inAppNotif.avatar
                  ? <img src={inAppNotif.avatar} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-base">
                      {inAppNotif.name[0]?.toUpperCase()}
                    </div>
                }
              </div>
              {/* Green online dot */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-[rgba(20,20,30,0.88)]" />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{inAppNotif.name}</p>
              <p className="text-white/65 text-xs truncate mt-0.5">
                {inAppNotif.text.length > 45
                  ? inAppNotif.text.slice(0, 45) + '…'
                  : inAppNotif.text}
              </p>
            </div>
            {/* Pulse ring */}
            <div className="shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      )}
      {/* Call Screen Overlays — rendered on top of chat, no unmount/remount */}
      {activeCall && currentUser && profile && (
        activeCall.type === 'video' ? (
          <VideoCallScreen
            roomId={activeCall.roomId}
            userId={currentUser.id}
            userName={currentUser.username || currentUser.full_name || 'User'}
            userAvatar={currentUser.profile_photo_url || undefined}
            recipientName={profile.full_name || profile.username}
            recipientAvatar={profile.profile_photo_url || undefined}
            onEndCall={handleEndCall}
          />
        ) : (
          <VoiceCallScreen
            roomId={activeCall.roomId}
            userId={currentUser.id}
            userName={currentUser.username || currentUser.full_name || 'User'}
            userAvatar={currentUser.profile_photo_url || undefined}
            recipientName={profile.full_name || profile.username}
            recipientAvatar={profile.profile_photo_url || undefined}
            onEndCall={handleEndCall}
          />
        )
      )}

      <div 
      className={cn(
        "flex flex-col h-full md:h-screen relative overflow-hidden",
        isLovePinkTheme ? "bg-gradient-to-br from-pink-100 via-pink-200 to-rose-200" : (isDefaultBg ? "" : "bg-background")
      )}
      style={defaultBgStyle}
    >
      {/* Background Overlay for better readability */}
      {chatBackgroundUrl && !isLovePinkTheme && (
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 pointer-events-none" />
      )}
      {/* Love Pink Theme Hearts Background */}
      {isLovePinkTheme && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-10 text-6xl opacity-10 animate-pulse">💕</div>
          <div className="absolute top-32 right-20 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>💖</div>
          <div className="absolute bottom-40 left-20 text-7xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}>💗</div>
          <div className="absolute bottom-20 right-32 text-6xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>💝</div>
          <div className="absolute top-1/2 left-1/3 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>❤️</div>
        </div>
      )}
      {/* Incoming Call Notification */}
      {incomingCall && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 via-white to-green-500 p-4 shadow-2xl border-b-4 border-orange-600 animate-in slide-in-from-top duration-500">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-white shadow-lg ring-2 ring-orange-400">
                <AvatarImage src={incomingCall.caller_photo || ''} />
                <AvatarFallback className="bg-orange-600 text-white font-bold">
                  {incomingCall.caller_username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-black text-lg text-orange-900 flex items-center gap-2">
                  {incomingCall.call_type === 'video' ? <Video className="w-5 h-5 animate-pulse" /> : <Phone className="w-5 h-5 animate-pulse" />}
                  {incomingCall.caller_username} is calling...
                </p>
                <p className="text-xs text-green-800 font-bold">📞 {incomingCall.call_type === 'video' ? 'Video' : 'Voice'} Call Incoming</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={joinCall}
                className="bg-green-600 hover:bg-green-700 text-white font-black px-6 py-2 rounded-full shadow-lg border-2 border-white animate-pulse"
              >
                Join
              </Button>
              <Button 
                onClick={declineCall}
                variant="destructive"
                size="icon"
                className="rounded-full bg-red-600 hover:bg-red-700 border-2 border-white shadow-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-4 pt-10 pb-4 border-b sticky top-0 z-20 shrink-0",
        isLovePinkTheme 
          ? "bg-pink-300/90 backdrop-blur-md border-pink-400" 
          : "bg-background/80 backdrop-blur-md"
      )}>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className={cn(
              "rounded-full",
              isLovePinkTheme 
                ? "hover:bg-pink-200 text-pink-700" 
                : "hover:bg-accent/50"
            )}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => !isGroup && setShowFullScreenProfile(true)}>
              <AvatarImage src={(isGroup ? group?.avatar_url : profile?.profile_photo_url) || ''} />
              <AvatarFallback className={isGroup ? "bg-primary text-white" : ""}>
                 {isGroup ? <Users className="w-4 h-4" /> : profile?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div 
              className="flex flex-col cursor-pointer"
              onClick={() => isGroup ? setIsGroupSettingsOpen(true) : navigate(`/profile/${profile?.username}`)}
            >
              <span className="font-bold text-sm leading-tight">{isGroup ? group?.name : profile?.username}</span>
              {isGroup ? (
                <span className="text-[10px] text-muted-foreground">{groupMembers.length} members</span>
              ) : (
                <div className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-zinc-500")} />
                  <span className="text-[11px] font-bold text-muted-foreground/80 tracking-tight">
                    {isGroup 
                      ? `${groupOnlineCount} online` 
                      : (isOnline ? 'Online' : 'Offline')
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isGroup && (
            <>
              <Button 
                onClick={() => startCall('voice')} 
                variant="ghost" 
                size="icon" 
                className={cn(
                  isLovePinkTheme 
                    ? "text-pink-700 hover:bg-pink-200" 
                    : "text-foreground"
                )}
              >
                <Phone className="w-6 h-6" />
              </Button>
              <Button 
                onClick={() => startCall('video')} 
                variant="ghost" 
                size="icon" 
                className={cn(
                  isLovePinkTheme 
                    ? "text-pink-700 hover:bg-pink-200" 
                    : "text-foreground"
                )}
              >
                <Video className="w-7 h-7" />
              </Button>
            </>
          )}
          <Button 
            onClick={() => setShowDrawing(true)} 
            variant="ghost" 
            size="icon" 
            className={cn(
              isLovePinkTheme 
                ? "text-pink-700 hover:bg-pink-200" 
                : "text-primary"
            )}
          >
            <PenTool className="w-6 h-6" />
          </Button>
          <Button 
            onClick={() => isGroup ? setIsGroupSettingsOpen(true) : {}} 
            variant="ghost" 
            size="icon" 
            className={cn(
              isLovePinkTheme 
                ? "text-pink-700 hover:bg-pink-200" 
                : "text-foreground"
            )}
          >
             <Info className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col justify-end min-h-full gap-3">
        {loading ? (
          <div className="space-y-3">
             <Skeleton className="w-48 h-12 rounded-2xl bg-muted" />
             <Skeleton className="w-48 h-12 rounded-2xl bg-muted ml-auto" />
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser?.id;
            const senderProfile = isGroup ? groupMembers.find(m => m.id === msg.sender_id) : (isMe ? currentUser : profile);
            
            return (
              <div 
                key={msg.id} 
                className={cn(
                  "flex items-end gap-2 w-full",
                  isMe ? "flex-row-reverse justify-start" : "flex-row justify-start"
                )}
              >
                {isGroup && !isMe && (
                   <Avatar className="w-7 h-7 shrink-0">
                      <AvatarImage src={senderProfile?.profile_photo_url || ''} />
                      <AvatarFallback className="text-[10px]">{senderProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                   </Avatar>
                )}
                
                <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                  {isGroup && !isMe && (
                    <span className="text-[10px] text-muted-foreground ml-2 mb-0.5 font-semibold">{senderProfile?.username}</span>
                  )}
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-[15px] shadow-sm break-words relative group",
                    isMe 
                      ? isLovePinkTheme 
                        ? "bg-pink-500 text-white rounded-tr-sm" 
                        : "bg-primary text-primary-foreground rounded-tr-sm" 
                      : isLovePinkTheme 
                        ? "bg-pink-200 text-pink-900 rounded-tl-sm" 
                        : "bg-muted text-foreground rounded-tl-sm",
                    msg.media_url ? "p-1.5 rounded-xl" : ""
                  )}>
                    {renderMessageContent(msg)}
                    {msg.is_ai_reply && (
                      <div className="absolute -top-2 -left-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1 border-2 border-background shadow-lg group-hover:scale-110 transition-transform">
                        <Bot className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-2">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && msg.is_read && <span className="ml-1 font-semibold">· Seen</span>}
                    {msg.is_ai_reply && <span className="ml-1 text-purple-500 font-semibold">· 🤖 AI Reply</span>}
                  </span>
                </div>
              </div>
            );
          })
        )}
        {isTyping && (
          <div className="flex justify-start items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={isGroup ? '' : profile?.profile_photo_url || ''} />
                <AvatarFallback className="text-[10px]">{isGroup ? 'G' : profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
             </Avatar>
             <div className={cn(
               "rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center",
               isLovePinkTheme ? "bg-pink-200 text-pink-900" : "bg-muted text-foreground"
             )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]",
                  isLovePinkTheme ? "bg-pink-500/60" : "bg-primary/40"
                )} />
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]",
                  isLovePinkTheme ? "bg-pink-500/80" : "bg-primary/60"
                )} />
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full animate-bounce",
                  isLovePinkTheme ? "bg-pink-500" : "bg-primary/80"
                )} />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Drawing Canvas */}
      {showDrawing && (
        <DrawingCanvas 
          channelName={isGroup ? `draw-group-${groupId}` : `draw-${[currentUser!.id, profile!.id].sort().join('-')}`}
          onClose={() => setShowDrawing(false)}
        />
      )}

      {/* Gift Sheet */}
      {!isGroup && profile && (
        <GiftSheet
          isOpen={showGiftSheet}
          onOpenChange={setShowGiftSheet}
          receiverId={profile.id}
          receiverName={profile.username}
        />
      )}


      {/* Group Settings Dialog */}
      <Dialog open={isGroupSettingsOpen} onOpenChange={setIsGroupSettingsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
             <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Users className="w-6 h-6" /> {group?.name}
             </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
             <section>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                   Members ({groupMembers.length})
                </h3>
                <div className="space-y-3">
                   {groupMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border">
                               <AvatarImage src={member.profile_photo_url || ''} />
                               <AvatarFallback>{member.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-bold">{member.username}</span>
                         </div>
                         {member.id === group?.creator_id && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">Admin</span>
                         )}
                      </div>
                   ))}
                </div>
             </section>

             {friendsToInvite.length > 0 && group?.creator_id === currentUser?.id && (
               <section>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Add Members</h3>
                  <div className="space-y-2">
                     {friendsToInvite.map(friend => (
                        <div key={friend.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border">
                           <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                 <AvatarImage src={friend.profile_photo_url || ''} />
                                 <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-bold">{friend.username}</span>
                           </div>
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             className="text-primary font-bold text-xs"
                             onClick={() => inviteToGroup(friend.id)}
                           >
                              <Plus className="w-4 h-4" /> Add
                           </Button>
                        </div>
                     ))}
                  </div>
               </section>
             )}
          </div>

          <DialogFooter className="p-6 pt-0 border-t bg-zinc-50/50 dark:bg-zinc-900/50 rounded-b-lg">
             <Button 
               variant="ghost" 
               className="w-full text-red-500 font-bold hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
               onClick={leaveGroup}
             >
                <LogOut className="w-4 h-4 mr-2" /> Leave Group
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Input */}
      <div className={cn(
        "p-3 pb-20 backdrop-blur-md border-t safe-area-bottom shrink-0 z-10",
        isLovePinkTheme 
          ? "bg-pink-300/90 border-pink-400" 
          : "bg-background/80 dark:border-zinc-800"
      )}>
        <form 
          onSubmit={sendMessage}
          className="flex items-center gap-2 max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-1 shrink-0">
             <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-full transition-colors h-10 w-10",
                  isLovePinkTheme 
                    ? "text-pink-700 hover:text-pink-900 hover:bg-pink-200" 
                    : "text-foreground/70 hover:text-primary"
                )}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <IndianSpinner size="sm" /> : <Camera className="w-6 h-6" />}
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
              />
          </div>

          <div className={cn(
            "flex-1 relative flex items-center rounded-3xl border px-3 py-1 group focus-within:border-primary transition-all",
            isLovePinkTheme 
              ? "bg-pink-200/60 border-pink-300" 
              : "bg-muted/40 dark:bg-zinc-900/40 dark:border-zinc-800"
          )}>
            {selectedGif && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-background border rounded-2xl shadow-xl animate-in slide-in-from-bottom-2 duration-300 z-50">
                <div className="relative group/gif">
                  <img src={selectedGif} alt="Selected GIF" className="max-h-32 w-auto rounded-lg object-contain" />
                  <button 
                    onClick={() => setSelectedGif(null)}
                    className="absolute -top-2 -right-2 p-1 bg-black/60 rounded-full border border-white/20 hover:bg-black/90 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            )}
            {/* Voice Preview Bar */}
            {voicePreviewBlob && voicePreviewUrl && (
              <div className="flex-1 flex flex-col gap-1.5 px-1 py-1">
                <div className="flex-1 flex items-center gap-2">
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {/* Waveform preview card */}
                  <div className="flex-1 flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-2xl px-3 py-1.5 min-w-0">
                    <Volume2 className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex items-end gap-[2px] flex-1">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-primary/60 rounded-full w-[3px] shrink-0"
                          style={{ height: `${6 + Math.sin(i * 0.9) * 5 + Math.random() * 6}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-primary font-bold shrink-0">{formatTime(recordingTime)}</span>
                  </div>
                  {/* Send */}
                  <button
                    type="button"
                    onClick={sendVoicePreview}
                    disabled={uploading}
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 transition-all shadow-md disabled:opacity-60"
                  >
                    {uploading
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send className="w-4 h-4" />}
                  </button>
                </div>
                {translatedTextPreview && (
                  <div className="text-[10px] text-primary font-bold px-3 py-1 bg-primary/5 rounded-xl border border-primary/10 select-all text-left truncate w-full animate-in fade-in duration-200">
                    📝 Translation: "{translatedTextPreview}"
                  </div>
                )}
              </div>
            )}
            {/* Active Recording Bar */}
            {isRecording && !voicePreviewBlob ? (
              <div className="flex-1 flex items-center gap-2 px-2 h-10">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <div className="flex items-end gap-[2px] flex-1">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-red-400/70 rounded-full w-[3px] animate-pulse"
                      style={{
                        height: `${8 + Math.sin(i * 1.2 + Date.now() / 200) * 6}px`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-black text-red-500 shrink-0">{formatTime(recordingTime)}</span>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="text-zinc-400 hover:text-red-400 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : !voicePreviewBlob ? (
              <>
              <Input 
                placeholder="Type a message..." 
                className={cn(
                  "border-none h-10 shadow-none focus-visible:ring-0 px-1 text-sm font-medium flex-1",
                  isLovePinkTheme 
                    ? "bg-transparent text-pink-900 placeholder:text-pink-500" 
                    : "bg-transparent"
                )}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              </>
            ) : null}
            
            {!content.trim() && !isRecording && !selectedGif && !voicePreviewBlob && (
              <div className="flex items-center gap-2 pr-1 relative">
                  <GifSelector 
                    onSelect={(url) => setSelectedGif(url)} 
                    trigger={ 
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-8 w-8 transition-colors",
                          isLovePinkTheme 
                            ? "text-pink-600 hover:text-pink-800 hover:bg-pink-200" 
                            : "text-foreground/60 hover:text-primary"
                        )}
                        onClick={() => {}}
                      > 
                         <Smile className="w-5 h-5" /> 
                      </Button> 
                    } 
                  />
                 {!isGroup && (
                   <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className={cn(
                       "h-8 w-8 transition-colors",
                       isLovePinkTheme
                         ? "text-pink-600 hover:text-pink-800 hover:bg-pink-200"
                         : "text-foreground/60 hover:text-[#ff007f]"
                     )}
                     onClick={() => setShowGiftSheet(true)}
                   >
                     <Gift className="w-5 h-5" />
                   </Button>
                 )}
              </div>
            )}
          </div>

          <div className="shrink-0 flex items-center">
            {voicePreviewBlob ? null : content.trim() || selectedGif ? (
              <Button 
                type="submit" 
                variant="ghost" 
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full transition-all active:scale-90",
                  isLovePinkTheme 
                    ? "text-pink-600 hover:bg-pink-200" 
                    : "text-primary hover:bg-primary/10"
                )}
              >
                <Send className="w-6 h-6" />
              </Button>
            ) : (
              <button
                type="button"
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all select-none touch-none",
                  isRecording
                    ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/40"
                    : isLovePinkTheme
                      ? "text-pink-600 hover:bg-pink-200 active:scale-90"
                      : "text-primary hover:bg-primary/10 active:scale-90"
                )}
                onMouseDown={handleMicPressStart}
                onMouseUp={handleMicPressEnd}
                onMouseLeave={handleMicPressEnd}
                onTouchStart={handleMicPressStart}
                onTouchEnd={handleMicPressEnd}
              >
                {isRecording
                  ? <div className="w-3 h-3 bg-white rounded-sm" />
                  : <Volume2 className="w-6 h-6" />}
              </button>
            )}
          </div>
        </form>
      </div>
      <FullScreenImage 
        src={profile?.profile_photo_url} 
        isOpen={showFullScreenProfile} 
        onClose={() => setShowFullScreenProfile(false)} 
      />
    </div>
    </>
  );
}

function VoicePlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          drawWaveform();
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 30;
    const barWidth = 3;
    const spacing = 2;
    const progress = currentTime / duration;

    for (let i = 0; i < bars; i++) {
      const height = 5 + Math.sin(i * 0.5) * 15;
      const x = i * (barWidth + spacing);
      const y = (canvas.height - height) / 2;
      
      ctx.fillStyle = i / bars <= progress ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, barWidth, height);
    }
  };

  useEffect(() => {
    drawWaveform();
  }, [duration, currentTime]);

  return (
    <div className="flex items-center gap-3 bg-black/20 dark:bg-white/10 p-2 pr-4 rounded-2xl w-full max-w-[280px]">
      <Button 
        variant="ghost" 
        size="icon" 
        className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shrink-0"
        onClick={togglePlay}
      >
        {isPlaying ? <X className="w-5 h-5" /> : <PlayCircle className="w-6 h-6" />}
      </Button>
      <div className="flex flex-col flex-1 gap-1 min-w-0">
        <canvas 
          ref={canvasRef} 
          width={150} 
          height={30} 
          className="w-full h-8 cursor-pointer"
          onClick={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect && audioRef.current) {
              const x = e.clientX - rect.left;
              const percent = x / rect.width;
              audioRef.current.currentTime = percent * duration;
            }
          }}
        />
        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <audio 
        ref={audioRef} 
        src={url} 
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

