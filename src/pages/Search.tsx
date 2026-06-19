import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Profile, Reel, Post } from '@/types';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, X, UserPlus } from 'lucide-react';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Search() {
  const { profile: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [users, setUsers] = useState<Profile[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch();
    } else {
      setUsers([]);
      setReels([]);
    }
  }, [debouncedQuery]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Search Users
      const { data: userData, error: userError }: any = await supabase
        .from('profiles' as any)
        .select('*')
        .or(`username.ilike.%${debouncedQuery}%,full_name.ilike.%${debouncedQuery}%,bio.ilike.%${debouncedQuery}%`)
        .limit(20);

      if (userError) throw userError;
      setUsers(userData || []);

      // Check following/follower status
      if (currentUser && userData?.length > 0) {
        const userIds = userData.map((u: any) => u.id);
        const [{ data: followData }, { data: followerData }]: any[] = await Promise.all([
          supabase
            .from('follows' as any)
            .select('following_id')
            .eq('follower_id', currentUser.id)
            .in('following_id', userIds),
          supabase
            .from('follows' as any)
            .select('follower_id')
            .eq('following_id', currentUser.id)
            .in('follower_id', userIds)
        ]);
        
        const followed = new Set<string>(followData?.map((f: any) => f.following_id as string) || []);
        const followers = new Set<string>(followerData?.map((f: any) => f.follower_id as string) || []);
        setFollowingIds(followed);
        setFollowerIds(followers);
      }

      // Search Reels/Videos
      const { data: reelData, error: reelError } = await supabase
        .from('reels' as any)
        .select('*, profiles(*)')
        .ilike('caption', `%${debouncedQuery}%`)
        .limit(20);

      if (reelError) throw reelError;
      setReels(reelData || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return toast.error('Please login to follow');
    
    const isFollowing = followingIds.has(targetId);
    try {
      if (isFollowing) {
        await (supabase as any).from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      } else {
        await (supabase as any).from('follows').insert({ follower_id: currentUser.id, following_id: targetId } as any);
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.add(targetId);
          return next;
        });
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Centered Brand Logo */}
      <div className="flex justify-center items-center py-4 border-b md:border-none">
        <h1 className="text-2xl brand-text">INDIANREELS</h1>
      </div>

      <div className="relative px-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search for users or videos..."
          className="pl-10 pr-10 bg-muted border-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button 
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setQuery('')}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
          <TabsTrigger value="users" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            Users
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 px-2">
                <Skeleton className="w-12 h-12 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="w-24 h-4 bg-muted" />
                  <Skeleton className="w-48 h-3 bg-muted" />
                </div>
              </div>
            ))
          ) : users.length > 0 ? (
            <div className="divide-y">
              {users.map((user) => (
                <Link 
                  key={user.id} 
                  to={`/profile/${user.username}`}
                  className="flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border">
                      <AvatarImage src={user.profile_photo_url || ''} />
                      <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm">{user.username}</span>
                        {user.is_verified && <VerificationBadge />}
                      </div>
                      <span className="text-sm text-muted-foreground">{user.full_name}</span>
                    </div>
                  </div>
                  {currentUser?.id !== user.id && (
                    <Button 
                      onClick={(e) => handleFollow(e, user.id)}
                      variant={followingIds.has(user.id) ? "secondary" : "default"} 
                      size="sm" 
                      className={cn(
                        "font-bold h-8 px-5 rounded-lg text-xs",
                        followingIds.has(user.id) 
                          ? "bg-zinc-100 text-black hover:bg-zinc-200" 
                          : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                      )}
                    >
                      {followingIds.has(user.id) ? 'Following' : followerIds.has(user.id) ? 'Follow Back' : 'Follow'}
                    </Button>
                  )}
                </Link>
              ))}
            </div>
          ) : query && !loading ? (
            <div className="text-center py-20 text-muted-foreground">
              No users found for "{query}"
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              Search for your favorite creators
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-3 gap-1">
              {Array(9).fill(0).map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] bg-muted" />
              ))}
            </div>
          ) : reels.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {reels.map((reel) => (
                <Link 
                  key={reel.id} 
                  to={`/?id=${reel.id}`} 
                  className="relative aspect-[9/16] overflow-hidden group bg-muted"
                >
                  <video 
                    src={reel.video_url} 
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{reel.profiles?.username}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : query && !loading ? (
            <div className="text-center py-20 text-muted-foreground">
              No videos found for "{query}"
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              Discover amazing content
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
