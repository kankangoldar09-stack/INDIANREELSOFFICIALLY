import {
  StreamCall,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreamCall } from '@/hooks/useStreamCall';
import IndianSpinner from '@/components/ui/IndianSpinner';
import '@stream-io/video-react-sdk/dist/css/styles.css';

interface VoiceCallScreenProps {
  roomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  recipientName: string;
  recipientAvatar?: string;
  onEndCall: () => void;
}

function AudioCallUI({
  recipientName,
  recipientAvatar,
  callDuration,
  formatDuration,
  onEndCall,
}: {
  recipientName: string;
  recipientAvatar?: string;
  callDuration: number;
  formatDuration: (s: number) => string;
  onEndCall: () => void;
}) {
  const { useMicrophoneState } = useCallStateHooks();
  const { isMute } = useMicrophoneState();
  const call = useCall();

  const toggleMute = () => isMute ? call?.microphone.enable() : call?.microphone.disable();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 px-6 py-12">
      {/* Top — caller info */}
      <div className="flex flex-col items-center gap-4 mt-8">
        <p className="text-white/50 text-sm tracking-widest uppercase">Voice Call</p>
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
            {recipientAvatar ? (
              <img src={recipientAvatar} alt={recipientName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-green-600 flex items-center justify-center text-white text-5xl font-bold">
                {recipientName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
          <div className="absolute -inset-3 rounded-full border border-white/10 animate-ping" style={{ animationDelay: '0.3s' }} />
        </div>
        <h2 className="text-white text-2xl font-bold mt-2">{recipientName}</h2>
        <p className="text-white/60 font-mono text-lg">{formatDuration(callDuration)}</p>
      </div>

      {/* Middle — audio waveform */}
      <div className="flex items-end justify-center gap-1 h-16">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className={cn('w-1.5 rounded-full', isMute ? 'bg-white/20' : 'bg-orange-400/70 animate-pulse')}
            style={{
              height: `${Math.sin(i * 0.5) * 20 + 12}px`,
              animationDelay: `${i * 0.06}s`,
              animationDuration: `${0.6 + (i % 4) * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Bottom — controls */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <button
          onClick={toggleMute}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg',
            isMute ? 'bg-red-500 shadow-red-500/40' : 'bg-white/15 border border-white/20'
          )}
        >
          {isMute ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
        </button>

        <button
          onClick={onEndCall}
          className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-2xl shadow-red-500/50 active:scale-90 transition-all"
        >
          <PhoneOff className="w-8 h-8 text-white" />
        </button>

        <button className="w-16 h-16 rounded-full bg-white/15 border border-white/20 flex items-center justify-center active:scale-90 transition-all">
          <Volume2 className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
}

export default function VoiceCallScreen({
  roomId, userId, userName, userAvatar,
  recipientName, recipientAvatar, onEndCall,
}: VoiceCallScreenProps) {
  const { call, isConnecting, callDuration, handleEndCall, formatDuration } = useStreamCall({
    roomId, userId, userName, userImage: userAvatar, callType: 'voice', onEndCall,
  });

  if (isConnecting || !call) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-b from-zinc-900 to-zinc-800 flex flex-col items-center justify-center gap-5">
        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
          {recipientAvatar ? (
            <img src={recipientAvatar} alt={recipientName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-500 to-green-600 flex items-center justify-center text-white text-3xl font-bold">
              {recipientName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <IndianSpinner size="lg" />
        <div className="text-center space-y-1">
          <h2 className="text-white text-xl font-bold">{recipientName}</h2>
          <p className="text-white/50 text-sm">Connecting voice call...</p>
        </div>
        <button onClick={onEndCall} className="mt-2 w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-xl active:scale-90">
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    );
  }

  return (
    <StreamCall call={call}>
      <AudioCallUI
        recipientName={recipientName}
        recipientAvatar={recipientAvatar}
        callDuration={callDuration}
        formatDuration={formatDuration}
        onEndCall={handleEndCall}
      />
    </StreamCall>
  );
}
