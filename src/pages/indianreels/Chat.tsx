import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import IndianReelsLayout from '@/components/layouts/IndianReelsLayout';

const TEAL = '#00BFA5';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function IRChat() {
  const { profile: me } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) { setLoading(false); return; }
    loadChats();
  }, [me]);

  const loadChats = async () => {
    setLoading(true);
    try {
      // Get conversations where current user is participant
      const { data } = await (supabase as any)
        .from('chats')
        .select(`
          id, updated_at,
          chat_participants!inner(user_id, profiles(username, full_name, profile_photo_url)),
          messages(content, created_at, sender_id)
        `)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (data) {
        const processed = data.map((chat: any) => {
          // Find the other participant (not me)
          const others = (chat.chat_participants || []).filter((cp: any) => cp.user_id !== me?.id);
          const other = others[0]?.profiles;
          const lastMsg = chat.messages?.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          return { id: chat.id, other, lastMsg, updated_at: chat.updated_at };
        }).filter((c: any) => c.other);
        setChats(processed);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <IndianReelsLayout>
      <div className="bg-white min-h-full">
        {/* Header within content */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <span className="text-[16px] font-black text-zinc-800">Messages</span>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100"
            onClick={() => navigate('/messages')}
          >
            <Edit className="w-5 h-5" style={{ color: TEAL }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-zinc-100">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-full px-4 h-9">
            <Search className="w-4 h-4 shrink-0" style={{ color: TEAL }} />
            <span className="text-[13px] text-zinc-400">Search messages...</span>
          </div>
        </div>

        {/* Chat list */}
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-50">
              <Skeleton className="w-12 h-12 rounded-full bg-zinc-100" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="w-28 h-3 rounded bg-zinc-100" />
                <Skeleton className="w-40 h-2.5 rounded bg-zinc-100" />
              </div>
              <Skeleton className="w-8 h-2.5 rounded bg-zinc-100" />
            </div>
          ))
          : chats.length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `${TEAL}20` }}>
                  <Edit className="w-9 h-9" style={{ color: TEAL }} />
                </div>
                <p className="text-zinc-400 text-sm text-center px-8">
                  Koi message nahi. Naya message start karo!
                </p>
                <button
                  onClick={() => navigate('/messages')}
                  className="px-6 h-10 rounded-full font-semibold text-sm text-white"
                  style={{ background: TEAL }}
                >
                  Message karo
                </button>
              </div>
            )
            : chats.map(chat => (
              <button
                key={chat.id}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-50 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                onClick={() => navigate(`/messages/${chat.other?.username}`)}
              >
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarImage src={chat.other?.profile_photo_url || ''} className="object-cover" />
                  <AvatarFallback style={{ background: TEAL, color: 'white' }} className="font-bold">
                    {(chat.other?.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[14px] font-semibold text-zinc-800 leading-tight truncate">
                    {chat.other?.full_name || chat.other?.username}
                  </p>
                  <p className="text-[12px] text-zinc-400 truncate mt-0.5">
                    {chat.lastMsg?.content || 'Start a conversation'}
                  </p>
                </div>
                <span className="text-[11px] text-zinc-400 shrink-0">
                  {chat.lastMsg ? timeAgo(chat.lastMsg.created_at) : ''}
                </span>
              </button>
            ))
        }
      </div>
    </IndianReelsLayout>
  );
}
