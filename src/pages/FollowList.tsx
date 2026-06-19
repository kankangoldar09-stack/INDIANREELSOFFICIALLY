import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Search } from 'lucide-react';
import { VerificationBadge } from '@/components/VerificationBadge';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function FollowList({ type: initialType }: { type: 'followers' | 'following' }) {
  const { username } = useParams<{ username: string }>();
  const { profile: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialType);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, [username, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (!username) return;

      const targetUsername = username.replace(/^@/, '').trim();

      // First get the target profile's ID
      const { data: profileData, error: profileError }: any = await (supabase as any)
        .from('profiles')
        .select('*')
        .ilike('username', targetUsername)
        .limit(1)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        toast.error('Profile not found');
        return;
      }
      setTargetProfile(profileData);

      let query;
      if (activeTab === 'followers') {
        query = (supabase as any)
          .from('follows')
          .select('profiles:follower_id (*)')
          .eq('following_id', profileData.id);
      } else {
        query = (supabase as any)
          .from('follows')
          .select('profiles:following_id (*)')
          .eq('follower_id', profileData.id);
      }

      const { data, error }: any = await query;
      if (error) throw error;
      
      const userList = (data || []).map((item: any) => item.profiles).filter(Boolean);
      setUsers(userList);
    } catch (error: any) {
      toast.error(`Error loading users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20 no-scrollbar">
      {/* TikTok Style Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-zinc-900 h-14 flex items-center px-4">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-zinc-800 rounded-full">
           <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="flex-1 text-center font-bold text-lg">
           {targetProfile?.username || username}
        </div>
        <button className="p-1 hover:bg-zinc-800 rounded-full">
           <Search className="w-6 h-6" />
        </button>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="w-full bg-black border-b border-zinc-900 rounded-none h-12 p-0 flex">
          <TabsTrigger value="following" className="flex-1 data-[state=active]:bg-transparent rounded-none border-none relative h-full">
            <span className={cn("font-bold transition-colors", activeTab === 'following' ? "text-white" : "text-zinc-500")}>Following</span>
            <div className={cn("absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-white transition-transform duration-300", activeTab === 'following' ? "scale-x-100" : "scale-x-0")} />
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex-1 data-[state=active]:bg-transparent rounded-none border-none relative h-full">
            <span className={cn("font-bold transition-colors", activeTab === 'followers' ? "text-white" : "text-zinc-500")}>Followers</span>
            <div className={cn("absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-white transition-transform duration-300", activeTab === 'followers' ? "scale-x-100" : "scale-x-0")} />
          </TabsTrigger>
        </TabsList>

        <div className="p-2">
          {loading ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-14 h-14 rounded-full bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-32 h-4 bg-zinc-800" />
                  <Skeleton className="w-48 h-3 bg-zinc-800 opacity-50" />
                </div>
                <Skeleton className="w-24 h-9 bg-zinc-800 rounded-md" />
              </div>
            ))
          ) : users.length > 0 ? (
            <div className="space-y-1">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-zinc-900/50 rounded-xl transition-all active:scale-[0.98]">
                  <div 
                    className="flex items-center gap-4 cursor-pointer flex-1 min-w-0"
                    onClick={() => navigate(`/profile/${user.username}`)}
                  >
                    <Avatar className="w-14 h-14 border border-zinc-800">
                      <AvatarImage src={user.profile_photo_url || ''} className="object-cover" />
                      <AvatarFallback className="bg-zinc-800">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm truncate">{user.username}</span>
                        {user.is_verified && <VerificationBadge size={25} />}
                      </div>
                      <span className="text-xs text-zinc-500 truncate">{user.full_name}</span>
                    </div>
                  </div>
                  
                  {currentUser?.id !== user.id && (
                    <Button 
                      variant={activeTab === 'following' ? "secondary" : "default"} 
                      size="sm" 
                      className={cn(
                        "h-9 px-6 font-bold text-xs rounded-md",
                        activeTab === 'following' ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-[#fe2c55] hover:bg-[#ef2950] text-white"
                      )} 
                      onClick={() => navigate(`/profile/${user.username}`)}
                    >
                      {activeTab === 'following' ? 'Following' : 'View'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-500 gap-4">
              <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-dashed border-zinc-800">
                <span className="text-4xl opacity-50">👥</span>
              </div>
              <div className="text-center">
                <h3 className="text-white font-bold">No {activeTab} yet</h3>
                <p className="text-xs mt-1">When users follow this profile, they will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
