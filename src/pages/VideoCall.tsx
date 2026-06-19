import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StreamCall, SpeakerLayout, useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStreamCall } from '@/hooks/useStreamCall';
import IndianSpinner from '@/components/ui/IndianSpinner';
import '@stream-io/video-react-sdk/dist/css/styles.css';

function CallUI({ onEnd }: { onEnd: () => void }) {
  const { useParticipants, useLocalParticipant } = useCallStateHooks();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  const [dominantSpeaker] = participants;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {dominantSpeaker ? (
          <div className="w-full h-full">
            <SpeakerLayout participantsBarPosition="bottom" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white gap-4">
            <IndianSpinner size="lg" />
            <p className="text-lg font-semibold">Waiting for others to join...</p>
          </div>
        )}

        {localParticipant && (
          <div className="absolute top-4 right-4 w-28 h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black z-10">
            <div className="w-full h-full flex items-center justify-center">
              {localParticipant.videoStream ? (
                <video
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(el) => {
                    if (el && localParticipant.videoStream) {
                      el.srcObject = localParticipant.videoStream;
                    }
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/50 flex items-center justify-center text-white text-lg font-bold">
                  {localParticipant.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-8 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-center gap-5">
          <ToggleAudioButton />
          <ToggleVideoButton />
          <Button
            size="lg"
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
            onClick={onEnd}
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleAudioButton() {
  const call = useCall();
  const { useMicrophoneState } = useCallStateHooks();
  const { isMute } = useMicrophoneState();

  const toggle = () => {
    if (isMute) {
      call?.microphone.enable();
    } else {
      call?.microphone.disable();
    }
  };

  return (
    <Button
      size="lg"
      variant="outline"
      className={cn(
        'w-14 h-14 rounded-full border-2 backdrop-blur-sm',
        isMute
          ? 'bg-red-500 border-red-500 hover:bg-red-600'
          : 'bg-white/10 border-white/30 hover:bg-white/20'
      )}
      onClick={toggle}
    >
      {isMute ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
    </Button>
  );
}

function ToggleVideoButton() {
  const call = useCall();
  const { useCameraState } = useCallStateHooks();
  const { isMute } = useCameraState();

  const toggle = () => {
    if (isMute) {
      call?.camera.enable();
    } else {
      call?.camera.disable();
    }
  };

  return (
    <Button
      size="lg"
      variant="outline"
      className={cn(
        'w-14 h-14 rounded-full border-2 backdrop-blur-sm',
        isMute
          ? 'bg-red-500 border-red-500 hover:bg-red-600'
          : 'bg-white/10 border-white/30 hover:bg-white/20'
      )}
      onClick={toggle}
    >
      {isMute ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
    </Button>
  );
}

export default function VideoCall() {
  const { roomName } = useParams<{ roomName: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const callType = (queryParams.get('type') || 'video') as 'video' | 'voice';

  const { call, isConnecting, handleEndCall } = useStreamCall({
    roomId: roomName || `call_${Date.now()}`,
    userId: user?.id || 'anonymous',
    userName: profile?.full_name || profile?.username || 'User',
    userImage: profile?.profile_photo_url || undefined,
    callType,
    onEndCall: () => navigate('/'),
  });

  if (isConnecting || !call) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-6">
        <IndianSpinner size="xl" />
        <div className="text-center space-y-3">
          <h2 className="text-white text-2xl font-black uppercase italic tracking-tighter">
            Connecting Call...
          </h2>
          <div className="flex gap-2 justify-center">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <StreamCall call={call}>
      <CallUI onEnd={handleEndCall} />
    </StreamCall>
  );
}
