import { useEffect, useRef, useState, useCallback } from 'react';
import { Call } from '@stream-io/video-react-sdk';
import { useStreamVideo } from '@/contexts/StreamVideoContext';
import { toast } from 'sonner';

interface UseStreamCallOptions {
  roomId: string;
  userId: string;
  userName: string;
  userImage?: string;
  callType: 'video' | 'voice';
  onEndCall: () => void;
}

export function useStreamCall({
  roomId,
  userId,
  userName,
  userImage,
  callType,
  onEndCall,
}: UseStreamCallOptions) {
  const { connectUser, disconnectUser, createOrJoinCall, leaveCall, isReady, isConnecting } = useStreamVideo();
  const [call, setLocalCall] = useState<Call | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(callType === 'video');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedRef = useRef(false);

  const hasEndedRef = useRef(false);

  const join = useCallback(async () => {
    if (joinedRef.current) return;
    joinedRef.current = true;

    try {
      await connectUser(userId, userName, userImage);
      const newCall = await createOrJoinCall(roomId, callType);
      setLocalCall(newCall);
      setIsJoining(false);
      toast.success('Call connected');
    } catch (err: any) {
      console.error('Stream call join error:', err?.message || err);
      const msg = err?.message || 'Failed to connect call';
      toast.error(msg);
      setTimeout(() => {
        joinedRef.current = false;
        onEndCall();
      }, 1500);
    }
  }, [connectUser, createOrJoinCall, roomId, userId, userName, userImage, callType, onEndCall]);

  useEffect(() => {
    hasEndedRef.current = false;
    join();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Only clean up Stream if call was NOT explicitly ended (e.g. component surprise unmount)
      // Explicit end is handled by handleEndCall — prevents double-disconnect
      if (!hasEndedRef.current) {
        leaveCall().catch(() => {});
      }
      joinedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isJoining && call) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isJoining, call]);

  const handleEndCall = useCallback(async () => {
    hasEndedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    await leaveCall().catch(() => {});
    await disconnectUser().catch(() => {});
    setLocalCall(null);
    joinedRef.current = false;
    onEndCall();
  }, [leaveCall, disconnectUser, onEndCall]);

  const toggleMute = useCallback(async () => {
    if (!call) return;
    try {
      if (isMuted) {
        await call.microphone.enable();
      } else {
        await call.microphone.disable();
      }
      setIsMuted(!isMuted);
    } catch {
      toast.error('Failed to toggle microphone');
    }
  }, [call, isMuted]);

  const toggleCamera = useCallback(async () => {
    if (!call || callType === 'voice') return;
    try {
      if (isCameraOn) {
        await call.camera.disable();
      } else {
        await call.camera.enable();
      }
      setIsCameraOn(!isCameraOn);
    } catch {
      toast.error('Failed to toggle camera');
    }
  }, [call, isCameraOn, callType]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    call,
    isConnecting: isConnecting || isJoining,
    callDuration,
    isMuted,
    isCameraOn,
    toggleMute,
    toggleCamera,
    handleEndCall,
    formatDuration,
  };
}
