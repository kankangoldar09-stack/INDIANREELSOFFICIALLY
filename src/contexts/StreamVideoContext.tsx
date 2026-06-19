import { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  StreamVideoClient,
  Call,
  StreamVideo as StreamVideoProviderSDK,
} from '@stream-io/video-react-sdk';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface StreamVideoContextType {
  client: StreamVideoClient | null;
  call: Call | null;
  isReady: boolean;
  isConnecting: boolean;
  connectUser: (userId: string, name: string, image?: string) => Promise<void>;
  disconnectUser: () => Promise<void>;
  createOrJoinCall: (callId: string, callType?: 'video' | 'voice') => Promise<Call | null>;
  leaveCall: () => Promise<void>;
}

const StreamVideoContext = createContext<StreamVideoContextType | undefined>(undefined);

export function StreamVideoProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const clientRef = useRef<StreamVideoClient | null>(null);

  const connectUser = useCallback(async (userId: string, name: string, image?: string) => {
    // Already connected — skip
    if (clientRef.current) return;

    try {
      setIsConnecting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to use calls');
      }

      const { data, error } = await supabase.functions.invoke('stream-token', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        const errMsg = await error?.context?.text?.();
        throw new Error(errMsg || error.message || 'Failed to get Stream token');
      }

      if (!data?.token || !data?.apiKey) {
        throw new Error('Invalid Stream token response');
      }

      const streamUser = { id: userId, name, image: image || undefined };
      const newClient = new StreamVideoClient({ apiKey: data.apiKey });
      await newClient.connectUser(streamUser, data.token);

      clientRef.current = newClient;
      setClient(newClient);
      setIsReady(true);
    } catch (err: any) {
      console.error('Stream connect error:', err?.message || err);
      clientRef.current = null;
      setIsConnecting(false);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectUser = useCallback(async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.disconnectUser();
      }
    } catch {
      // ignore disconnect errors
    } finally {
      clientRef.current = null;
      setClient(null);
      setCall(null);
      setIsReady(false);
    }
  }, []);

  const createOrJoinCall = useCallback(async (callId: string, callType: 'video' | 'voice' = 'video') => {
    if (!clientRef.current) {
      toast.error('Call service not connected');
      return null;
    }

    try {
      // 'default' supports both video and audio; 'audio_only' for voice-only calls
      const streamCallType = callType === 'video' ? 'default' : 'audio_only';
      const newCall = clientRef.current.call(streamCallType, callId);
      await newCall.join({ create: true });
      setCall(newCall);
      return newCall;
    } catch (err: any) {
      console.error('Join call error:', err?.message || err);
      // Re-throw so useStreamCall can handle toasts — avoid double toast
      throw err;
    }
  }, []);

  const leaveCall = useCallback(async () => {
    if (call) {
      await call.leave();
      setCall(null);
    }
  }, [call]);

  const value: StreamVideoContextType = {
    client,
    call,
    isReady,
    isConnecting,
    connectUser,
    disconnectUser,
    createOrJoinCall,
    leaveCall,
  };

  const content = (
    <StreamVideoContext.Provider value={value}>
      {children}
    </StreamVideoContext.Provider>
  );

  if (!client) return content;

  return (
    <StreamVideoProviderSDK client={client}>
      {content}
    </StreamVideoProviderSDK>
  );
}

export function useStreamVideo() {
  const ctx = useContext(StreamVideoContext);
  if (!ctx) throw new Error('useStreamVideo must be used within StreamVideoProvider');
  return ctx;
}
