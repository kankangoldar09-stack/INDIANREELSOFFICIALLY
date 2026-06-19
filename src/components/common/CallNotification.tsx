import React, { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

export const CallNotification: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [callerProfile, setCallerProfile] = useState<any>(null);

  // IndividualChat handles calls inline — suppress global notification on chat pages
  const isOnChatPage = location.pathname.startsWith('/chat/') || location.pathname.startsWith('/group-chat/');

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('video-calls-inbound')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_calls',
          filter: `receiver_id=eq.${profile.id}`,
        },
        async (payload: any) => {
          const call = payload.new;
          if (call.status === 'pending') {
            setIncomingCall(call);
            fetchCallerProfile(call.caller_id);
            // Only show global notification when NOT on a chat page
            if (!location.pathname.startsWith('/chat/') && !location.pathname.startsWith('/group-chat/')) {
              setIsOpen(true);
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
              audio.play().catch(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Close if user navigates to a chat page while dialog is open
  useEffect(() => {
    if (isOnChatPage && isOpen) {
      setIsOpen(false);
    }
  }, [isOnChatPage, isOpen]);

  const fetchCallerProfile = async (callerId: string) => {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', callerId)
      .maybeSingle();
    setCallerProfile(data);
  };

  const handleAccept = async () => {
    if (!incomingCall) return;

    try {
      await (supabase as any)
        .from('video_calls')
        .update({ status: 'accepted' })
        .eq('id', incomingCall.id);

      setIsOpen(false);
      setIncomingCall(null);
      navigate(`/call/${incomingCall.room_name}?type=${incomingCall.call_type || 'video'}`);
    } catch (error) {
      toast.error('Failed to accept call');
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;

    try {
      await (supabase as any)
        .from('video_calls')
        .update({ status: 'rejected' })
        .eq('id', incomingCall.id);
    } catch (error) {
      toast.error('Failed to decline call');
    } finally {
      setIsOpen(false);
      setIncomingCall(null);
      setCallerProfile(null);
    }
  };

  if (!incomingCall || !callerProfile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader className="items-center">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Video className="text-primary" /> Incoming Video Call
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-center">
            {callerProfile.full_name || callerProfile.username} is calling you...
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-primary">
              <AvatarImage src={callerProfile.profile_photo_url || ''} />
              <AvatarFallback>{callerProfile.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 border-4 border-zinc-900">
               <Video className="w-4 h-4 text-white" />
            </div>
          </div>
          <h2 className="mt-4 text-xl font-bold">{callerProfile.username}</h2>
        </div>

        <DialogFooter className="flex flex-row justify-center gap-6 sm:justify-center">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16 p-0"
            onClick={handleDecline}
          >
            <PhoneOff className="w-8 h-8" />
          </Button>
          <Button
            variant="default"
            size="lg"
            className="rounded-full w-16 h-16 p-0 bg-green-500 hover:bg-green-600"
            onClick={handleAccept}
          >
            <Phone className="w-8 h-8" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
