import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Profile, Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronLeft, ChevronDown, Plus, Users, X, Check, MessageSquare, Bot, Sparkles } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatPreview {
  id: string; // Other user ID OR Group ID
  username?: string;
  name?: string;
  full_name?: string | null;
  photo_url?: string | null;
  last_message?: string;
  last_message_at?: string;
  is_online?: boolean;
  type: 'individual' | 'group';
}

export default function ChatList() {
  const { profile: currentUser } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      fetchChats();
      fetchFriends();
    }
  }, [currentUser]);

  const fetchFriends = async () => {
    if (!currentUser) return;
    try {
      // Get mutual follows
      const { data: followsData } = await (supabase as any)
        .from('follows')
        .select('*')
        .or(`follower_id.eq.${currentUser.id},following_id.eq.${currentUser.id}`);

      if (!followsData) return;

      const iFollowSet = new Set(followsData.filter((f: any) => f.follower_id === currentUser.id).map((f: any) => f.following_id));
      const theyFollowSet = new Set(followsData.filter((f: any) => f.following_id === currentUser.id).map((f: any) => f.follower_id));
      const mutualIds = Array.from(iFollowSet).filter(id => theyFollowSet.has(id));

      if (mutualIds.length === 0) return;

      const { data: profilesData } = await (supabase as any)
        .from('profiles')
        .select('*')
        .in('id', mutualIds);

      setFriends(profilesData || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchChats = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Fetch ALL Individual messages (Grouped by other user)
      const { data: messagesData, error: messagesError } = await (supabase as any)
        .from('messages')
        .select('sender_id, receiver_id, content, created_at')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .is('group_id', null)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      const otherIds = new Set<string>();
      const individualChatMap = new Map<string, any>();
      (messagesData || []).forEach((msg: any) => {
        const otherId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
        if (otherId && !individualChatMap.has(otherId)) {
          otherIds.add(otherId);
          individualChatMap.set(otherId, msg);
        }
      });

      // Fetch all unique profiles in one batch
      let profiles: Profile[] = [];
      if (otherIds.size > 0) {
        const { data: profilesData } = await (supabase as any)
          .from('profiles')
          .select('*')
          .in('id', Array.from(otherIds));
        profiles = profilesData || [];
      }

      const individualChats: ChatPreview[] = profiles.map(p => {
        const lastMsg = individualChatMap.get(p.id);
        return {
          id: p.id,
          type: 'individual',
          username: p.username,
          full_name: p.full_name,
          photo_url: p.profile_photo_url,
          last_message: lastMsg?.content || 'Say Hi!',
          last_message_at: lastMsg?.created_at
        };
      });

      // 2. Fetch Group Chats (Groups user is member of)
      const { data: membersData, error: membersError } = await (supabase as any)
        .from('group_members')
        .select('group_id, groups:groups!group_id(*)')
        .eq('user_id', currentUser.id);
      
      if (membersError) {
        console.error('Group members error:', membersError);
        throw membersError;
      }
      
      const groupChats: ChatPreview[] = (membersData || [])
        .filter((gm: any) => gm.groups) // Only if group details exist
        .map((gm: any) => ({
          id: gm.groups.id,
          type: 'group',
          name: gm.groups.name,
          photo_url: gm.groups.avatar_url,
          last_message: 'Group Chat',
          last_message_at: gm.groups.created_at
        }));

      // 3. Add Mutual Friends who haven't chatted yet
      const chattedIds = new Set(individualChats.map(c => c.id));
      const newChats: ChatPreview[] = friends
        .filter(f => !chattedIds.has(f.id))
        .map(f => ({
          id: f.id,
          type: 'individual',
          username: f.username,
          full_name: f.full_name,
          photo_url: f.profile_photo_url,
          last_message: 'Mutual Friend - Say Hi! 👋',
          last_message_at: f.created_at // Use created_at as fallback
        }));

      const combined = [...individualChats, ...groupChats, ...newChats].sort((a, b) => 
        new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
      );

      setChats(combined);
    } catch (error: any) {
      console.error('Fetch chats error:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedFriends.length === 0 || !currentUser) {
       toast.error('Group name and at least one friend required');
       return;
    }

    setCreatingGroup(true);
    try {
      // 1. Create Group
      const { data: groupData, error: groupError } = await (supabase as any)
        .from('groups')
        .insert({
          name: newGroupName,
          creator_id: currentUser.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Add Members (including creator)
      const members = [currentUser.id, ...selectedFriends].map(uid => ({
        group_id: groupData.id,
        user_id: uid
      }));

      const { error: membersError } = await (supabase as any)
        .from('group_members')
        .insert(members);

      if (membersError) throw membersError;

      toast.success('Group created successfully!');
      setIsCreateGroupOpen(false);
      fetchChats();
      navigate(`/messages/group/${groupData.id}`);
    } catch (error: any) {
      toast.error('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleFriendSelection = (id: string) => {
    setSelectedFriends(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const filteredChats = chats.filter(chat => 
    (chat.username?.toLowerCase() || chat.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full md:h-screen bg-background relative overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-background flex flex-col gap-3 shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-accent/50 rounded-full -ml-2">
               <ChevronLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-1.5 tracking-tight">
               {currentUser?.username}
               <ChevronDown className="w-4 h-4 opacity-60" />
            </h1>
          </div>
          
          <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-accent/50">
                 <Plus className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
               <DialogHeader className="p-6 pb-0">
                 <DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary">Create Group</DialogTitle>
                 <div className="mt-4 space-y-4">
                    <Input 
                      placeholder="Group Name" 
                      value={newGroupName} 
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="rounded-xl h-12 border-2 focus-visible:ring-primary"
                    />
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Select Friends ({selectedFriends.length})</p>
                 </div>
               </DialogHeader>
               
               <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                 {friends.map(friend => (
                   <div 
                     key={friend.id} 
                     onClick={() => toggleFriendSelection(friend.id)}
                     className={cn(
                       "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border-2",
                       selectedFriends.includes(friend.id) 
                         ? "bg-primary/5 border-primary shadow-sm" 
                         : "bg-zinc-50 dark:bg-zinc-900 border-transparent"
                     )}
                   >
                     <div className="flex items-center gap-3">
                       <Avatar className="w-10 h-10 border shadow-sm">
                         <AvatarImage src={friend.profile_photo_url || ''} />
                         <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                       </Avatar>
                       <div>
                         <p className="text-sm font-bold">{friend.username}</p>
                         <p className="text-[10px] text-muted-foreground">{friend.full_name}</p>
                       </div>
                     </div>
                     <div className={cn(
                       "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                       selectedFriends.includes(friend.id) ? "bg-primary text-white" : "bg-zinc-200 dark:bg-zinc-800"
                     )}>
                        {selectedFriends.includes(friend.id) && <Check className="w-4 h-4" />}
                     </div>
                   </div>
                 ))}
                 {friends.length === 0 && (
                   <div className="text-center py-10">
                     <p className="text-sm text-muted-foreground font-bold italic">Follow more people to add them to groups!</p>
                   </div>
                 )}
               </div>

               <DialogFooter className="p-6 pt-0 mt-auto">
                 <Button 
                   className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                   onClick={handleCreateGroup}
                   disabled={creatingGroup || !newGroupName.trim() || selectedFriends.length === 0}
                 >
                   {creatingGroup ? <IndianSpinner size="sm" /> : 'Create Group Chat'}
                 </Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search" 
            className="pl-10 h-10 rounded-xl bg-muted/50 border-none shadow-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* AI Chat Bot - Always at top */}
        <div 
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 cursor-pointer active:scale-[0.98] transition-all border-b border-purple-500/20"
          onClick={() => navigate('/messages/ai-chat')}
        >
          <div className="relative">
            <Avatar className="w-14 h-14 border-2 border-primary shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500">
                <Bot className="w-8 h-8 text-white" />
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm flex items-center gap-1">
                INDIANREELS AI
                <Sparkles className="w-3 h-3 text-primary" />
              </p>
              <span className="text-[10px] text-primary font-bold">ACTIVE</span>
            </div>
            <p className="text-xs text-muted-foreground truncate font-medium">
              Your AI assistant is ready to help! 🤖
            </p>
          </div>
        </div>

        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="w-14 h-14 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <Skeleton className="w-32 h-4 bg-muted" />
                <Skeleton className="w-full h-3 bg-muted" />
              </div>
            </div>
          ))
        ) : filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <div 
              key={chat.id} 
              className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer active:scale-[0.98] transition-all"
              onClick={() => navigate(`/messages/${chat.type === 'group' ? 'group/' : ''}${chat.type === 'group' ? chat.id : chat.username}`)}
            >
              <div className="relative">
                <Avatar className="w-14 h-14 border shadow-sm">
                  <AvatarImage src={chat.photo_url || ''} />
                  <AvatarFallback className={chat.type === 'group' ? "bg-primary text-white" : ""}>
                    {chat.type === 'group' ? <Users className="w-6 h-6" /> : (chat.username?.[0].toUpperCase())}
                  </AvatarFallback>
                </Avatar>
                {chat.type === 'individual' && chat.is_online && (
                  <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-sm truncate">
                    {chat.type === 'group' ? chat.name : chat.username}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {chat.last_message_at ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: false }) : ''}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate font-medium">
                  {chat.last_message || (chat.type === 'group' ? 'Tap to start group chat' : 'Say Hi!')}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-40">
            <MessageSquare className="w-20 h-20 mb-4" />
            <h2 className="text-xl font-black uppercase tracking-widest">No Messages</h2>
            <p className="text-xs font-bold mt-2">Start a conversation with a friend!</p>
          </div>
        )}
      </div>
    </div>
  );
}
