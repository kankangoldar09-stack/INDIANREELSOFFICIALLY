import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Copy, Download, Share2, 
  MessageSquare, Send, Link as LinkIcon, Film, Search, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  url: string; // This is the link (e.g., indianreels.com/reels?id=...)
  mediaUrl?: string; // This is the actual file (e.g., .mp4 or .jpg file URL)
  title?: string;
  postId?: string;
  reelId?: string;
}

export function ShareSheet({ isOpen, onOpenChange, url, mediaUrl, title, postId, reelId }: ShareSheetProps) {
  const { profile } = useAuth();
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareData = {
    title: title || 'INDIANREELS',
    text: `Check this out on INDIANREELS: ${title || ''}`,
    url: url
  };

  useEffect(() => {
    if (isOpen && profile) {
      fetchFriends();
    }
  }, [isOpen, profile]);

  const fetchFriends = async () => {
    if (!profile) return;
    
    try {
      // Get users that current user follows (Mutual follow required by IndividualChat.tsx)
      const { data: followsData } = await (supabase as any)
        .from('follows')
        .select('*')
        .or(`follower_id.eq.${profile.id},following_id.eq.${profile.id}`);

      if (!followsData || followsData.length === 0) {
        setFriends([]);
        return;
      }

      // Find mutual follows
      const iFollowSet = new Set(followsData.filter((f: any) => f.follower_id === profile.id).map((f: any) => f.following_id));
      const theyFollowSet = new Set(followsData.filter((f: any) => f.following_id === profile.id).map((f: any) => f.follower_id));
      
      const mutualIds = Array.from(iFollowSet).filter(id => theyFollowSet.has(id));

      if (mutualIds.length === 0) {
        setFriends([]);
        return;
      }

      // Get profiles of mutual follows
      const { data: profilesData } = await (supabase as any)
        .from('profiles')
        .select('id, username, full_name, profile_photo_url')
        .in('id', mutualIds)
        .order('username');

      setFriends(profilesData || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleSendToFriend = async (friendId: string) => {
    if (!profile) return;
    
    setSending(friendId);
    try {
      const messageContent = `${shareData.text}\n${url}`;
      
      const { error } = await (supabase as any)
        .from('messages')
        .insert({
          sender_id: profile.id,
          receiver_id: friendId,
          content: messageContent,
          media_url: mediaUrl || (postId || reelId ? url : null)
        });

      if (error) throw error;
      
      toast.success('Sent to friend!');
    } catch (error: any) {
      toast.error('Failed to send message');
      console.error('Send error:', error);
    } finally {
      setSending(null);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success('Link copied to clipboard!', {
      icon: '🔗',
      duration: 2000,
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareToPlatform = (platform: string) => {
    let shareUrl = '';
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(shareData.text);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    switch (platform) {
      case 'whatsapp':
        if (isMobile) {
          shareUrl = `whatsapp://send?text=${encodedText}%20${encodedUrl}`;
        } else {
          shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        }
        break;
      case 'instagram':
        toast.info('Copying link for Instagram...');
        handleCopyLink();
        return;
      default:
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  };

  const downloadMedia = async () => {
    try {
      // Use mediaUrl if available, otherwise fall back to url
      const downloadUrl = mediaUrl || url;
      
      // Determine file extension
      const isVideo = downloadUrl.match(/\.(mp4|webm|mov)$/i);
      const extension = isVideo ? 'mp4' : 'jpg';
      
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `indianreels_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Media downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download media.');
    }
  };

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showFriendsList) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-3xl flex flex-col bg-background">
          <SheetHeader className="p-6 pb-2 shrink-0 border-none">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowFriendsList(false)}
                className="rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <SheetTitle className="font-bold text-xl">Send to Friends</SheetTitle>
            </div>
          </SheetHeader>
          
          <div className="px-6 py-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-muted/50 border-none rounded-2xl h-11"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-6">
            <div className="grid grid-cols-3 gap-y-6 gap-x-2 py-4 pb-10">
              {filteredFriends.map((friend) => (
                <div 
                  key={friend.id} 
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div className="relative group">
                    <Avatar className="w-20 h-20 border-2 border-transparent group-hover:border-primary transition-all">
                      <AvatarImage src={friend.profile_photo_url || ''} />
                      <AvatarFallback className="text-xl bg-muted">{friend.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button 
                      size="icon"
                      onClick={() => handleSendToFriend(friend.id)}
                      disabled={sending === friend.id}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary shadow-lg border-2 border-background"
                    >
                      {sending === friend.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                  <span className="text-xs font-medium max-w-[80px] truncate">{friend.username}</span>
                </div>
              ))}
            </div>
            {filteredFriends.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p>No friends found.</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto p-0 rounded-t-3xl bg-background border-none pb-10">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto my-4" />
        
        <div className="px-6 pb-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search" 
              className="pl-11 bg-muted/50 border-none rounded-2xl h-12 text-sm"
              onFocus={() => setShowFriendsList(true)}
            />
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide no-scrollbar -mx-2 px-2">
            {friends.slice(0, 10).map((friend) => (
              <button 
                key={friend.id} 
                className="flex flex-col items-center gap-2 shrink-0 group"
                onClick={() => handleSendToFriend(friend.id)}
              >
                <div className="p-1 rounded-full group-hover:bg-primary/20 transition-all">
                  <Avatar className="w-16 h-16 border-2 border-background group-hover:scale-105 transition-transform">
                    <AvatarImage src={friend.profile_photo_url || ''} />
                    <AvatarFallback className="bg-muted">{friend.username[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-[10px] font-medium max-w-[64px] truncate">{friend.username}</span>
              </button>
            ))}
            {friends.length > 0 && (
              <button 
                onClick={() => setShowFriendsList(true)}
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 transition-all">
                  <ChevronRight className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-[10px] font-medium">More</span>
              </button>
            )}
            {friends.length === 0 && (
              <div className="w-full text-center py-4 text-[10px] text-muted-foreground italic">
                Follow friends to see them here! 🇮🇳
              </div>
            )}
          </div>

          <div className="h-[1px] bg-muted w-full mb-6" />

          <div className="flex justify-between items-center gap-2 px-2">
            <PlatformOption 
              icon={<div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"><Download className="w-7 h-7 text-white" /></div>} 
              label="Download" 
              onClick={downloadMedia} 
            />
            <PlatformOption 
              icon={<div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg"><WhatsAppIcon className="w-7 h-7 text-white" /></div>} 
              label="WhatsApp" 
              onClick={() => shareToPlatform('whatsapp')} 
            />
            <PlatformOption 
              icon={<div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-lg"><Share2 className="w-7 h-7" /></div>} 
              label="Share" 
              onClick={handleNativeShare} 
            />
            <PlatformOption 
              icon={
                <motion.div 
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg relative overflow-visible"
                  style={{
                    background: linkCopied 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                      : 'rgb(228 228 231 / 1)'
                  }}
                  animate={linkCopied ? { 
                    scale: [1, 1.3, 1],
                    rotate: [0, 10, -10, 0]
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <AnimatePresence mode="wait">
                    {linkCopied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                      >
                        <Check className="w-8 h-8 text-white" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="link"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <LinkIcon className="w-7 h-7 text-foreground" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {linkCopied && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-green-500"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-green-400"
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                      />
                    </>
                  )}
                </motion.div>
              } 
              label="Copy Link" 
              onClick={handleCopyLink} 
            />
            <PlatformOption 
              icon={<div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"><SnapchatIcon className="w-7 h-7 text-white" /></div>} 
              label="Snapchat" 
              onClick={() => toast.info('Snapchat integration coming soon!')} 
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PlatformOption({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button className="flex flex-col items-center gap-2 active:scale-95 transition-transform" onClick={onClick}>
      {icon}
      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{label}</span>
    </button>
  );
}

function ChevronLeft(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

function WhatsAppIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.049a11.815 11.815 0 001.602 6.005L0 24l6.117-1.605a11.803 11.803 0 005.925 1.586h.005c6.637 0 12.05-5.414 12.053-12.052a11.81 11.81 0 00-3.628-8.522z" />
    </svg>
  );
}

function SnapchatIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2c-.93 0-1.85.12-2.73.35-.44.11-.87.27-1.28.46-.41.19-.79.43-1.14.71s-.66.6-.92.96c-.26.36-.47.76-.63 1.19-.16.43-.27.89-.33 1.37-.06.48-.09.98-.09 1.49 0 .5.03.99.09 1.47.06.48.17.94.33 1.38.16.43.37.84.63 1.2.26.36.57.69.92.97.35.28.73.53 1.14.72.41.19.84.35 1.28.46.88.23 1.8.35 2.73.35s1.85-.12 2.73-.35c.44-.11.87-.27 1.28-.46.41-.19.79-.43 1.14-.72.35-.28.66-.61.92-.97.26-.36.47-.77.63-1.2.16-.44.27-.9.33-1.38.06-.48.09-.97.09-1.47 0-.51-.03-1.01-.09-1.49-.06-.48-.17-.94-.33-1.37-.16-.43-.37-.83-.63-1.19-.26-.36-.57-.68-.92-.96s-.73-.52-1.14-.71c-.41-.19-.84-.35-1.28-.46-.88-.23-1.8-.35-2.73-.35z" />
    </svg>
  );
}

function FacebookIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function ChevronRight(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}
