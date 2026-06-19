import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Notification, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Notifications() {
  const { profile: currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    markAllAsRead(); // Mark all as read when opening the page
    const subscription = subscribeToNotifications();
    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*, actor_profile:profiles!actor_id(*)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast.error(`Error loading notifications: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);
      
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const subscribeToNotifications = () => {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser?.id}`,
        },
        (payload) => {
          // Fetch the full actor profile for the new notification
          supabase
            .from('profiles' as any)
            .select('*')
            .eq('id', payload.new.actor_id)
            .single()
            .then(({ data }) => {
              setNotifications((prev) => [
                { ...payload.new, actor_profile: data } as unknown as Notification,
                ...prev,
              ]);
            });
        }
      )
      .subscribe();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Centered Brand Logo */}
      <div className="flex justify-center items-center py-4 border-b md:border-none">
        <h1 className="text-2xl brand-text">INDIANREELS</h1>
      </div>

      <div className="flex justify-between items-center px-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some(n => !n.is_read) && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-primary text-xs font-bold">
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-4 divide-y dark:divide-zinc-800">
        {loading ? (
          Array(10).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 px-2">
              <Skeleton className="w-12 h-12 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <Skeleton className="w-48 h-4 bg-muted" />
                <Skeleton className="w-12 h-3 bg-muted" />
              </div>
            </div>
          ))
        ) : notifications.length > 0 ? (
          notifications.map((notif) => (
            <div 
              key={notif.id} 
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={cn(
                "flex items-center gap-4 py-4 px-2 hover:bg-muted/50 transition-colors cursor-pointer relative",
                !notif.is_read && "bg-primary/5"
              )}
            >
              {!notif.is_read && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}
              <Link to={`/profile/${notif.actor_profile?.username}`} onClick={(e) => e.stopPropagation()}>
                <Avatar className="w-12 h-12 border">
                  <AvatarImage src={notif.actor_profile?.profile_photo_url || ''} />
                  <AvatarFallback>{notif.actor_profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <Link to={`/profile/${notif.actor_profile?.username}`} className="font-bold hover:underline">
                    {notif.actor_profile?.username}
                  </Link>{' '}
                  {getNotificationText(notif.type)}
                </p>
                <span className="text-xs text-muted-foreground">{new Date(notif.created_at).toLocaleTimeString()}</span>
              </div>
              {notif.type === 'follow' && (
                <FollowButton targetId={notif.actor_id} />
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            No notifications yet. When people interact with you, you'll see it here.
          </div>
        )}
      </div>
    </div>
  );
}

function FollowButton({ targetId }: { targetId: string }) {
  const { profile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (profile && targetId) {
      checkFollowStatus();
    }
  }, [profile, targetId]);

  const checkFollowStatus = async () => {
    const { data } = await (supabase as any)
      .from('follows')
      .select('id')
      .eq('follower_id', profile?.id)
      .eq('following_id', targetId)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      if (isFollowing) {
        await (supabase as any).from('follows').delete().eq('follower_id', profile.id).eq('following_id', targetId);
        setIsFollowing(false);
      } else {
        await (supabase as any).from('follows').insert({ follower_id: profile.id, following_id: targetId });
        setIsFollowing(true);
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  return (
    <Button 
      onClick={handleFollow} 
      size="sm" 
      className={cn(
        "h-8 font-semibold",
        isFollowing ? "bg-muted text-foreground hover:bg-muted/80" : "bg-[#0095f6] hover:bg-[#1877f2] text-white"
      )}
    >
      {isFollowing ? 'Following' : 'Follow Back'}
    </Button>
  );
}

function getNotificationText(type: string) {
  switch (type) {
    case 'like':
    case 'like_post': return 'liked your post.';
    case 'like_reel': return 'liked your reel.';
    case 'like_comment': return 'liked your comment.';
    case 'comment':
    case 'comment_post': return 'commented on your post.';
    case 'comment_reel': return 'commented on your reel.';
    case 'follow': return 'started following you.';
    case 'new_post': return 'shared a new post.';
    case 'new_reel': return 'shared a new reel.';
    default: return 'sent you a notification.';
  }
}
