import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronLeft, ChevronRight, Pause, Play, Heart, Share2, MoreVertical, Eye, Bookmark, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Story {
  id: string;
  owner_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
  profiles?: {
    username: string;
    profile_photo_url: string;
    is_verified: boolean;
  };
}

export default function StoriesViewer() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [hasViewed, setHasViewed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userId) {
      fetchStories();
    }
  }, [userId]);

  const fetchStories = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stories' as any)
        .select('*, profiles(*)')
        .eq('owner_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('Fetched stories:', data);
      
      // Filter out stories with no media_url
      const validStories = (data || []).filter((s: any) => s.media_url);
      
      if (validStories.length === 0) {
        console.error('No valid stories found with media_url');
        navigate('/');
        return;
      }
      
      setStories(validStories);
    } catch (error: any) {
      console.error('Error fetching stories:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const currentStory = stories[currentIndex];
  
  // Use actual video duration or default durations
  const duration = currentStory?.media_type === 'video' 
    ? (videoDuration ? videoDuration * 1000 : 15000) // Use actual duration if available
    : 5000; // 5 seconds for images

  // Fetch story stats (likes, views)
  const fetchStoryStats = async (storyId: string) => {
    if (!profile) return;
    
    try {
      // Check if user liked this story
      const { data: likeData } = await supabase
        .from('story_likes' as any)
        .select('id')
        .eq('story_id', storyId)
        .eq('user_id', profile.id)
        .maybeSingle();
      
      setIsLiked(!!likeData);
      
      // Get likes count
      const { count: likesCount } = await supabase
        .from('story_likes' as any)
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);
      
      setLikesCount(likesCount || 0);
      
      // Get views count
      const { count: viewsCount } = await supabase
        .from('story_views' as any)
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);
      
      setViewsCount(viewsCount || 0);
      
      // Check if user already viewed
      const { data: viewData } = await supabase
        .from('story_views' as any)
        .select('id')
        .eq('story_id', storyId)
        .eq('viewer_id', profile.id)
        .maybeSingle();
      
      setHasViewed(!!viewData);
      
      // Record view if not already viewed
      if (!viewData) {
        await (supabase as any)
          .from('story_views')
          .insert({
            story_id: storyId,
            viewer_id: profile.id
          });
        setViewsCount((viewsCount || 0) + 1);
        setHasViewed(true);
      }
    } catch (error) {
      console.error('Error fetching story stats:', error);
    }
  };

  // Reset image error and fetch stats when story changes
  useEffect(() => {
    setImageError(false);
    setVideoDuration(null);
    if (currentStory) {
      fetchStoryStats(currentStory.id);
    }
  }, [currentIndex, currentStory?.id]);

  useEffect(() => {
    if (!currentStory || paused) return;

    setProgress(0);
    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        handleNext();
      }
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentIndex, paused, currentStory]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      navigate('/');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const togglePause = () => {
    setPaused(!paused);
    if (videoRef.current) {
      if (paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleLike = async () => {
    if (!profile || !currentStory) return;
    
    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('story_likes' as any)
          .delete()
          .eq('story_id', currentStory.id)
          .eq('user_id', profile.id);
        
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        toast.success('Like हटा दिया');
      } else {
        // Like
        await (supabase as any)
          .from('story_likes')
          .insert({
            story_id: currentStory.id,
            user_id: profile.id
          });
        
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        toast.success('Story को like किया!');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Like करने में error');
    }
  };

  const handleShare = async () => {
    if (!currentStory) return;
    
    const shareUrl = `https://app-af2z7g8d924h.appmedo.com/stories/${currentStory.owner_id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentStory.profiles?.username} की story`,
          text: `${currentStory.profiles?.username} की story देखें`,
          url: shareUrl
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    }
  };

  const handleAddToHighlights = async () => {
    if (!profile || !currentStory) return;
    
    // Check if user is the owner
    if (currentStory.owner_id !== profile.id) {
      toast.error('आप सिर्फ अपनी stories को highlights में add कर सकते हैं');
      return;
    }
    
    toast.info('Highlights feature coming soon!');
  };

  const handleDeleteStory = async () => {
    if (!profile || !currentStory) return;
    
    // Check if user is the owner
    if (currentStory.owner_id !== profile.id) {
      toast.error('आप सिर्फ अपनी stories को delete कर सकते हैं');
      return;
    }
    
    try {
      const { error } = await (supabase as any)
        .from('stories')
        .delete()
        .eq('id', currentStory.id);
      
      if (error) throw error;
      
      toast.success('Story delete हो गई!');
      
      // Remove from local state
      const updatedStories = stories.filter(s => s.id !== currentStory.id);
      
      if (updatedStories.length === 0) {
        // No more stories, go back home
        navigate('/');
      } else {
        // Move to next story or previous if this was the last
        setStories(updatedStories);
        if (currentIndex >= updatedStories.length) {
          setCurrentIndex(updatedStories.length - 1);
        }
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error('Story delete करने में error');
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      console.log('Video duration:', duration, 'seconds');
      setVideoDuration(duration);
    }
  };

  if (loading || !currentStory) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100]">
      {/* Story Content - Full Screen Behind Everything */}
      <div className="absolute inset-0 w-full h-full" onClick={togglePause}>
        {currentStory.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            className="w-full h-full object-cover"
            autoPlay
            muted={false}
            playsInline
            onEnded={handleNext}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onError={(e) => {
              console.error('Video load error:', e);
              console.error('Video URL:', currentStory.media_url);
              setImageError(true);
            }}
          />
        ) : (
          <>
            {!imageError ? (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Image load error:', e);
                  console.error('Image URL:', currentStory.media_url);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', currentStory.media_url);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 text-white/70 w-full h-full">
                <div className="text-6xl">📷</div>
                <p className="text-sm">Story media could not be loaded</p>
                <p className="text-xs text-white/50 max-w-xs text-center break-all px-4">
                  {currentStory.media_url || 'No media URL'}
                </p>
              </div>
            )}
          </>
        )}

        {paused && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="w-20 h-20 text-white/80" />
          </div>
        )}
      </div>
      
      {/* Progress Bars - Overlay on top */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header - Overlay on top */}
      <div className="absolute top-4 left-0 right-0 z-50 flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={currentStory.profiles?.profile_photo_url || ''} />
            <AvatarFallback>{currentStory.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-bold text-sm">{currentStory.profiles?.username}</p>
            <p className="text-white/70 text-xs">
              {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/90 border-white/20 text-white">
              {currentStory.owner_id === profile?.id && (
                <>
                  <DropdownMenuItem onClick={handleAddToHighlights} className="hover:bg-white/10">
                    <Bookmark className="w-4 h-4 mr-2" />
                    Highlight में add करें
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteStory} className="hover:bg-red-500/20 text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Story delete करें
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={handleShare} className="hover:bg-white/10">
                <Share2 className="w-4 h-4 mr-2" />
                Share करें
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Bottom Interaction Bar */}
      <div className="absolute bottom-6 left-0 right-0 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Views Count */}
          <div className="flex items-center gap-1 text-white">
            <Eye className="w-5 h-5" />
            <span className="text-sm font-medium">{viewsCount}</span>
          </div>
          
          {/* Likes Count */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            className="flex items-center gap-1 text-white transition-transform active:scale-90"
          >
            <Heart 
              className={cn(
                "w-6 h-6 transition-colors",
                isLiked ? "fill-red-500 text-red-500" : "text-white"
              )} 
            />
            <span className="text-sm font-medium">{likesCount}</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Navigation - Overlay on top */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none z-40">
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="p-3 rounded-full bg-black/40 hover:bg-black/60 transition-colors pointer-events-auto"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        <div className="flex-1" />
        {currentIndex < stories.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="p-3 rounded-full bg-black/40 hover:bg-black/60 transition-colors pointer-events-auto"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
