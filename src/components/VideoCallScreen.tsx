import { useCallback } from 'react';
import {
  StreamCall,
  SpeakerLayout,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreamCall } from '@/hooks/useStreamCall';
import IndianSpinner from '@/components/ui/IndianSpinner';
import '@stream-io/video-react-sdk/dist/css/styles.css';

interface VideoCallScreenProps {
  roomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  recipientName: string;
  recipientAvatar?: string;
  onEndCall: () => void;
}

function CallUI({ recipientName, recipientAvatar, callDuration, formatDuration, onEndCall }: {
  recipientName: string;
  recipientAvatar?: string;
  callDuration: number;
  formatDuration: (s: number) => string;
  onEndCall: () => void;
}) {
  const call = useCall();
  const { useParticipants, useLocalParticipant } = useCallStateHooks();
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const { isMute: micMuted } = useMicrophoneState();
  const { isMute: camMuted } = useCameraState();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  const hasRemote = participants.some(p => !p.isLocalParticipant);

  const toggleMic = () => micMuted ? call?.microphone.enable() : call?.microphone.disable();
  const toggleCam = () => camMuted ? call?.camera.enable() : call?.camera.disable();

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        {hasRemote ? (
          <SpeakerLayout participantsBarPosition="bottom" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
              {recipientAvatar
                ? <img src={recipientAvatar} alt={recipientName} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-orange-500 to-green-600 flex items-center justify-center text-white text-4xl font-bold">{recipientName.charAt(0).toUpperCase()}</div>
              }
            </div>
            <p className="text-white text-xl font-semibold">{recipientName}</p>
            <p className="text-white/50 text-sm">Waiting to connect...</p>
            <IndianSpinner size="sm" />
          </div>
        )}

        {/* Top bar — duration */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-safe-top pt-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-sm font-mono">{formatDuration(callDuration)}</span>
          </div>
          <span className="text-white/70 text-sm">{recipientName}</span>
        </div>

        {/* Local PiP */}
        {localParticipant && (
          <div className="absolute top-14 right-3 w-24 h-32 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-zinc-900 z-10">
            {localParticipant.videoStream ? (
              <video
                autoPlay muted playsInline
                className="w-full h-full object-cover"
                ref={(el) => { if (el && localParticipant.videoStream) el.srcObject = localParticipant.videoStream; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/30 to-green-600/30">
                <span className="text-white text-lg font-bold">{localParticipant.name?.charAt(0).toUpperCase() || '?'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="pb-10 pt-4 px-8 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="flex items-center justify-center gap-5">
          {/* Mic */}
          <button
            onClick={toggleMic}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90',
              micMuted ? 'bg-red-500 shadow-lg shadow-red-500/40' : 'bg-white/15 border border-white/20'
            )}
          >
            {micMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>

          {/* End call */}
          <button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl shadow-red-500/50 active:scale-90 transition-all"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {/* Camera */}
          <button
            onClick={toggleCam}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90',
              camMuted ? 'bg-red-500 shadow-lg shadow-red-500/40' : 'bg-white/15 border border-white/20'
            )}
          >
            {camMuted ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoCallScreen({
  roomId, userId, userName, userAvatar,
  recipientName, recipientAvatar, onEndCall,
}: VideoCallScreenProps) {
  const { call, isConnecting, callDuration, handleEndCall, formatDuration } = useStreamCall({
    roomId, userId, userName, userImage: userAvatar, callType: 'video', onEndCall,
  });

  if (isConnecting || !call) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/20 mb-2">
          {recipientAvatar
            ? <img src={recipientAvatar} alt={recipientName} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-orange-500 to-green-600 flex items-center justify-center text-white text-3xl font-bold">{recipientName.charAt(0).toUpperCase()}</div>
          }
        </div>
        <IndianSpinner size="xl" />
        <div className="text-center space-y-1">
          <h2 className="text-white text-xl font-bold">{recipientName}</h2>
          <p className="text-white/50 text-sm">Connecting video call...</p>
        </div>
        <button onClick={onEndCall} className="mt-4 w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-xl active:scale-90">
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    );
  }

  return (
    <StreamCall call={call}>
      <CallUI
        recipientName={recipientName}
        recipientAvatar={recipientAvatar}
        callDuration={callDuration}
        formatDuration={formatDuration}
        onEndCall={handleEndCall}
      />
    </StreamCall>
  );
}
