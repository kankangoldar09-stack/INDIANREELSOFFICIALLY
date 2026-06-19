// @ts-nocheck
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface ProximityContextType {
  isEnabled: boolean;
  isSyncing: boolean;
  syncedFriend: {
    id: string;
    username: string;
    profile_photo_url: string | null;
    theme_color: string;
  } | null;
  myThemeColor: string;
  gradientColors: [string, string] | null;
  toggleProximity: () => Promise<void>;
}

const ProximityContext = createContext<ProximityContextType | undefined>(undefined);

export const useProximity = () => {
  const context = useContext(ProximityContext);
  if (!context) {
    throw new Error('useProximity must be used within ProximityProvider');
  }
  return context;
};

interface ProximityProviderProps {
  children: ReactNode;
}

export const ProximityProvider = ({ children }: ProximityProviderProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedFriend, setSyncedFriend] = useState<any>(null);
  const [myThemeColor, setMyThemeColor] = useState('#8B5CF6');
  const [gradientColors, setGradientColors] = useState<[string, string] | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID and theme color
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Fetch user's theme color
        const { data } = await supabase
          .from('profiles')
          .select('theme_color, proximity_enabled')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data) {
          setMyThemeColor(data.theme_color || '#8B5CF6');
          setIsEnabled(data.proximity_enabled || false);
        }
      }
    };
    getUser();
  }, []);

  // Haversine formula to calculate distance between two coordinates (in meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Check if two users are mutual followers
  const checkMutualFollow = async (friendId: string): Promise<boolean> => {
    if (!userId) return false;

    const { data, error } = await supabase
      .from('follows')
      .select('is_mutual')
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
      .or(`follower_id.eq.${friendId},following_id.eq.${friendId}`)
      .maybeSingle();

    if (error) {
      console.error('Error checking mutual follow:', error);
      return false;
    }

    return data?.is_mutual === true;
  };

  // Start location tracking
  const startLocationTracking = () => {
    if (!userId || !navigator.geolocation) {
      toast.error('Location Error', {
        description: 'Location services उपलब्ध नहीं हैं।'
      });
      return;
    }

    // Request high accuracy location
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Update user's presence in Supabase
        const updateData: any = {
          user_id: userId,
          latitude,
          longitude,
          is_online: true,
          last_updated: new Date().toISOString()
        };

        await supabase
          .from('user_presence')
          .upsert(updateData, { onConflict: 'user_id' });

        // Check for nearby mutual followers
        await checkNearbyFriends(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Location Error', {
          description: 'Location access denied। कृपया permissions check करें।'
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Mark user as offline
    if (userId) {
      supabase
        .from('user_presence')
        .update({ is_online: false })
        .eq('user_id', userId)
        .then(() => {});
    }
  };

  // Check for nearby mutual followers
  const checkNearbyFriends = async (myLat: number, myLon: number) => {
    if (!userId) return;

    // Fetch all online users' presence
    const { data: presences, error } = await supabase
      .from('user_presence')
      .select('user_id, latitude, longitude')
      .eq('is_online', true)
      .neq('user_id', userId);

    if (error || !presences) return;

    // Check each user's distance
    for (const presence of presences) {
      const distance = calculateDistance(
        myLat,
        myLon,
        presence.latitude,
        presence.longitude
      );

      // If within 5 meters
      if (distance <= 5) {
        // Check if mutual follower
        const isMutual = await checkMutualFollow(presence.user_id);

        if (isMutual) {
          // Fetch friend's profile
          const { data: friendProfile } = await supabase
            .from('profiles')
            .select('id, username, profile_photo_url, theme_color')
            .eq('id', presence.user_id)
            .maybeSingle();

          if (friendProfile) {
            // Trigger sync
            await triggerSync(friendProfile);
            break; // Only sync with one friend at a time
          }
        }
      }
    }
  };

  // Trigger sync with a friend
  const triggerSync = async (friend: any) => {
    if (isSyncing) return; // Already syncing

    setIsSyncing(true);
    setSyncedFriend(friend);

    // Create gradient from both theme colors
    const gradient: [string, string] = [myThemeColor, friend.theme_color];
    setGradientColors(gradient);

    // Vibrate phone
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Setup Broadcast channel for real-time color exchange
    const channel = supabase.channel(`proximity-sync-${userId}-${friend.id}`);
    
    channel
      .on('broadcast', { event: 'color-exchange' }, (payload) => {
        console.log('Received color from friend:', payload);
        // Update gradient if friend's color changes
        if (payload.theme_color) {
          setGradientColors([myThemeColor, payload.theme_color]);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Send my theme color to friend
          await channel.send({
            type: 'broadcast',
            event: 'color-exchange',
            payload: {
              user_id: userId,
              theme_color: myThemeColor
            }
          });
        }
      });

    channelRef.current = channel;

    toast.success('🎉 Dosti Sync!', {
      description: `${friend.username} के साथ connected!`
    });

    // Auto-disconnect after 30 seconds
    setTimeout(() => {
      disconnectSync();
    }, 30000);
  };

  // Disconnect sync
  const disconnectSync = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setIsSyncing(false);
    setSyncedFriend(null);
    setGradientColors(null);
  };

  // Toggle proximity feature
  const toggleProximity = async () => {
    if (!userId) return;

    const newState = !isEnabled;

    // Save to Supabase
    const updateData: any = { proximity_enabled: newState };
    await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    setIsEnabled(newState);

    if (newState) {
      startLocationTracking();
      toast.success('Dosti ki Doori ON', {
        description: 'Location tracking शुरू हो गई।'
      });
    } else {
      stopLocationTracking();
      disconnectSync();
      toast.info('Dosti ki Doori OFF', {
        description: 'Location tracking बंद हो गई।'
      });
    }
  };

  // Start/Stop tracking based on isEnabled
  useEffect(() => {
    if (isEnabled && userId) {
      startLocationTracking();
    } else {
      stopLocationTracking();
      disconnectSync();
    }

    return () => {
      stopLocationTracking();
      disconnectSync();
    };
  }, [isEnabled, userId]);

  return (
    <ProximityContext.Provider
      value={{
        isEnabled,
        isSyncing,
        syncedFriend,
        myThemeColor,
        gradientColors,
        toggleProximity
      }}
    >
      {children}
    </ProximityContext.Provider>
  );
};
