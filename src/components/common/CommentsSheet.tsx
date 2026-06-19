import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, Trash2, X, Heart, Smile, Gift } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GifSelector } from './GifSelector';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Comment } from '@/types';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w`;
  return `${Math.floor(diffInSeconds / 2592000)}mo`;
};

interface CommentsSheetProps {
  postId?: string;
  reelId?: string;
  trigger?: React.ReactNode;
  onCountChange?: (count: number) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommentsSheet({ postId, reelId, trigger, onCountChange, open: controlledOpen, onOpenChange: setControlledOpen }: CommentsSheetProps) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [selectedCommentForGift, setSelectedCommentForGift] = useState<Comment | null>(null);
  const [giftAmount, setGiftAmount] = useState('');
  const [sendingGift, setSendingGift] = useState(false);
  const [paymentId, setPaymentId] = useState('8474947203@ptys');

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  const targetId = postId || reelId;
  const targetType = postId ? 'post_id' : 'reel_id';

  useEffect(() => {
    if (isOpen && targetId) {
      fetchComments();
    }
  }, [isOpen, targetId]);

  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number, liked: boolean }>>({});

  const fetchCommentLikes = async (commentIds: string[]) => {
    if (commentIds.length === 0) return;
    try {
      const { data: likesCountData } = await (supabase as any)
        .from('likes')
        .select('comment_id, count:count()', { count: 'exact', head: true })
        .in('comment_id', commentIds);
      
      const counts: Record<string, number> = {};
      const { data: userLikesData } = await (supabase as any)
        .from('likes')
        .select('comment_id')
        .in('comment_id', commentIds)
        .eq('user_id', profile?.id);

      const userLikes = new Set(userLikesData?.map((l: any) => l.comment_id) || []);

      // Get accurate counts
      const countsPromises = commentIds.map(async id => {
        const { count } = await (supabase as any).from('likes').select('id', { count: 'exact', head: true }).eq('comment_id', id);
        return { id, count: count || 0 };
      });
      const resolvedCounts = await Promise.all(countsPromises);
      
      const likesState: Record<string, { count: number, liked: boolean }> = {};
      resolvedCounts.forEach(({ id, count }) => {
        likesState[id] = { count, liked: userLikes.has(id) };
      });
      setCommentLikes(likesState);
    } catch (error) {
      console.error('Error fetching comment likes:', error);
    }
  };

  useEffect(() => {
    if (comments.length > 0) {
      fetchCommentLikes(comments.map(c => c.id));
    }
  }, [comments, profile?.id]);

  const toggleCommentLike = async (commentId: string) => {
    if (!profile) return;
    const isLiked = commentLikes[commentId]?.liked;
    const currentCount = commentLikes[commentId]?.count || 0;

    // Optimistic update
    setCommentLikes(prev => ({
      ...prev,
      [commentId]: { count: isLiked ? currentCount - 1 : currentCount + 1, liked: !isLiked }
    }));

    try {
      if (isLiked) {
        await (supabase as any).from('likes').delete().eq('comment_id', commentId).eq('user_id', profile.id);
      } else {
        await (supabase as any).from('likes').insert({ comment_id: commentId, user_id: profile.id });
      }
    } catch (error) {
      // Revert on error
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: { count: currentCount, liked: isLiked }
      }));
      toast.error('Failed to update like');
    }
  };

  useEffect(() => {
    fetchPaymentId();
  }, []);

  const fetchPaymentId = async () => {
    try {
      const { data } = await supabase
        .from('payment_settings')
        .select('payment_id')
        .maybeSingle();
      
      if (data) {
        setPaymentId((data as any).payment_id);
      }
    } catch (error) {
      console.error('Error fetching payment ID:', error);
    }
  };

  const handleSendGift = async () => {
    if (!profile?.id || !selectedCommentForGift) return;
    
    const amount = parseFloat(giftAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSendingGift(true);

    try {
      const { error } = await supabase.from('payment_gifts').insert([{
        from_user_id: profile.id,
        to_user_id: selectedCommentForGift.user_id,
        comment_id: selectedCommentForGift.id,
        amount
      }] as any);

      if (error) throw error;

      toast.success(`Gift of ₹${amount} sent successfully!`);
      setShowGiftDialog(false);
      setGiftAmount('');
      setSelectedCommentForGift(null);
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error('Failed to send gift');
    } finally {
      setSendingGift(false);
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('comments')
        .select('*, profiles(*), replies:comments!parent_id(*, profiles(*))')
        .eq(targetType, targetId as string)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
      onCountChange?.(data?.length || 0);
    } catch (error: any) {
      toast.error(`Error loading comments: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e?: React.FormEvent, parentId?: string) => {
    e?.preventDefault();
    if ((!newComment.trim() && !selectedGif) || !profile) return;

    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
        .from('comments')
        .insert({
          [targetType]: targetId,
          user_id: profile.id,
          content: newComment.trim() || null,
          media_url: selectedGif,
          parent_id: parentId || null
        })
        .select('*, profiles(*)')
        .single();

      if (error) throw error;

      if (parentId) {
        // Add reply to parent comment
        setComments(prev => prev.map(c => 
          c.id === parentId 
            ? { ...c, replies: [data, ...(c.replies || [])] }
            : c
        ));
      } else {
        const updatedComments = [data, ...comments];
        setComments(updatedComments);
        onCountChange?.(updatedComments.length);
      }
      
      setNewComment('');
      setSelectedGif(null);
      setReplyingTo(null);
      toast.success(parentId ? 'Reply posted' : 'Comment posted');
    } catch (error: any) {
      toast.error(`Failed to post comment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      const newComments = comments.filter(c => c.id !== commentId);
      setComments(newComments);
      onCountChange?.(newComments.length);
      toast.success('Comment deleted');
    } catch (error: any) {
      toast.error(`Failed to delete comment: ${error.message}`);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0 rounded-t-xl">
        <SheetHeader className="p-4 border-b flex flex-row items-center justify-between sticky top-0 bg-background z-10">
          <SheetTitle className="text-center w-full">Comments</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <IndianSpinner size="lg" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-6 pb-32 pt-4">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* Main Comment */}
                  <div className="flex gap-3 group">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={comment.profiles?.profile_photo_url || ''} />
                      <AvatarFallback>{comment.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">{comment.profiles?.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(new Date(comment.created_at))}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        UPI: {paymentId}
                      </div>
                      {comment.content && (
                        <p className="text-sm mt-0.5 break-words leading-relaxed">{comment.content}</p>
                      )}
                      {comment.media_url && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-zinc-800 w-fit max-w-[200px]">
                          <img 
                            src={comment.media_url} 
                            alt="Comment GIF" 
                            className="w-full h-auto object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
                        >
                          Reply
                        </button>
                        {comment.replies && comment.replies.length > 0 && (
                          <button
                            onClick={() => {
                              setExpandedReplies(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(comment.id)) {
                                  newSet.delete(comment.id);
                                } else {
                                  newSet.add(comment.id);
                                }
                                return newSet;
                              });
                            }}
                            className="text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
                          >
                            {expandedReplies.has(comment.id) 
                              ? `Hide ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
                              : `View ${comment.replies.length} more ${comment.replies.length === 1 ? 'reply' : 'replies'}`
                            }
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => toggleCommentLike(comment.id)}
                          className={cn(
                            "transition-colors",
                            commentLikes[comment.id]?.liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                          )}
                        >
                          <Heart className={cn("w-5 h-5", commentLikes[comment.id]?.liked && "fill-current")} />
                        </button>
                        {commentLikes[comment.id]?.count > 0 && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {commentLikes[comment.id]?.count.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {profile?.id !== comment.user_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedCommentForGift(comment);
                            setShowGiftDialog(true);
                          }}
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                        >
                          <Gift className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    {(profile?.id === comment.user_id || profile?.role === 'admin') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Replies */}
                  {expandedReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                    <div className="ml-12 space-y-3 border-l-2 border-zinc-800 pl-4">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="flex gap-3 group">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={reply.profiles?.profile_photo_url || ''} />
                            <AvatarFallback>{reply.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-sm">{reply.profiles?.username}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(new Date(reply.created_at))}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              UPI: {paymentId}
                            </div>
                            {reply.content && (
                              <p className="text-sm mt-0.5 break-words leading-relaxed">{reply.content}</p>
                            )}
                            {reply.media_url && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-zinc-800 w-fit max-w-[150px]">
                                <img 
                                  src={reply.media_url} 
                                  alt="Reply GIF" 
                                  className="w-full h-auto object-contain"
                                  loading="lazy"
                                />
                              </div>
                            )}
                            <button
                              onClick={() => setReplyingTo(comment.id)}
                              className="text-xs font-semibold text-muted-foreground hover:text-white transition-colors mt-2"
                            >
                              Reply
                            </button>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => toggleCommentLike(reply.id)}
                                className={cn(
                                  "transition-colors",
                                  commentLikes[reply.id]?.liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                                )}
                              >
                                <Heart className={cn("w-4 h-4", commentLikes[reply.id]?.liked && "fill-current")} />
                              </button>
                              {commentLikes[reply.id]?.count > 0 && (
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {commentLikes[reply.id]?.count.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {profile?.id !== reply.user_id && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCommentForGift(reply);
                                  setShowGiftDialog(true);
                                }}
                                className="text-muted-foreground hover:text-primary transition-colors p-1"
                              >
                                <Gift className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {(profile?.id === reply.user_id || profile?.role === 'admin') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteComment(reply.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No comments yet.</p>
              <p className="text-sm">Start the conversation.</p>
            </div>
          )}
        </ScrollArea>

        {/* Quick Emoji Reactions */}
        <div className="px-4 py-2 border-t bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-around">
            {['❤️', '😂', '😍', '🔥', '👏'].map((emoji, idx) => (
              <button
                key={`${emoji}-${idx}`}
                onClick={() => {
                  setNewComment(prev => prev + emoji);
                }}
                className="text-3xl hover:scale-110 active:scale-95 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Comment Input */}
        <div className="px-4 pb-4 bg-background">
          {replyingTo && (
            <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
              <span>Replying to {comments.find(c => c.id === replyingTo)?.profiles?.username}</span>
              <button onClick={() => setReplyingTo(null)} className="text-primary hover:underline">
                Cancel
              </button>
            </div>
          )}
          {selectedGif && (
            <div className="relative mb-3 w-fit">
              <div className="rounded-lg overflow-hidden border border-zinc-800">
                <img src={selectedGif} alt="Selected GIF" className="h-24 w-auto object-contain" />
              </div>
              <button
                onClick={() => setSelectedGif(null)}
                className="absolute -top-2 -right-2 p-1 bg-black/60 rounded-full border border-white/20 hover:bg-black/90 transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          )}
          <form onSubmit={(e) => handleAddComment(e, replyingTo || undefined)} className="flex gap-2 items-center">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={profile?.profile_photo_url || ''} />
              <AvatarFallback>{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2 items-center bg-muted/30 rounded-full px-4 py-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Join the conversation..."
                className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto"
                disabled={submitting}
              />
              <GifSelector onSelect={(url) => setSelectedGif(url)} />
              <button type="button" className="text-muted-foreground hover:text-white transition-colors">
                <Gift className="w-5 h-5" />
              </button>
            </div>
            <Button 
              type="submit" 
              size="icon" 
              disabled={(!newComment.trim() && !selectedGif) || submitting}
              className="shrink-0 rounded-full"
            >
              {submitting ? (
                <IndianSpinner size="sm" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>

      {/* Payment Gift Dialog */}
      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Send Gift to @{selectedCommentForGift?.profiles?.username}
            </DialogTitle>
            <DialogDescription>
              Send a monetary gift to support this creator
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payment UPI ID</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentId);
                    toast.success('UPI ID copied to clipboard');
                  }}
                  className="h-auto py-1 px-2 text-xs"
                >
                  Copy
                </Button>
              </div>
              <p className="text-lg font-mono font-bold text-primary">{paymentId}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Gift Amount (₹)</label>
              <Input
                type="number"
                placeholder="Enter amount (minimum ₹1)"
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
                min="1"
                step="1"
                className="text-lg"
              />
              {giftAmount && parseFloat(giftAmount) > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  You are sending ₹{parseFloat(giftAmount).toFixed(2)} to @{selectedCommentForGift?.profiles?.username}
                </p>
              )}
            </div>

            <div className="bg-muted/50 border border-border p-4 rounded-lg space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                Complete Payment
              </h4>
              <p className="text-sm text-muted-foreground pl-7">
                Send ₹{giftAmount || '___'} to the UPI ID above using any UPI app (Google Pay, PhonePe, Paytm, etc.)
              </p>
              
              <h4 className="text-sm font-semibold flex items-center gap-2 pt-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                Confirm Gift
              </h4>
              <p className="text-sm text-muted-foreground pl-7">
                After completing the payment, click "Confirm Gift" below to record your gift
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
              <p className="text-xs text-blue-400">
                💡 The recipient can withdraw their balance from Settings → Payment Gift. A 5% tax will be deducted during withdrawal.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowGiftDialog(false);
                setGiftAmount('');
                setSelectedCommentForGift(null);
              }}
              disabled={sendingGift}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendGift}
              disabled={sendingGift || !giftAmount || parseFloat(giftAmount) <= 0}
              className="gap-2"
            >
              {sendingGift ? (
                <>
                  <IndianSpinner size="sm" />
                  Confirming...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Confirm Gift
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
