import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ArrowLeft, Music, Hash, AtSign } from 'lucide-react';
import TikTokCamera from '@/components/TikTokCamera';
import { stopAllMediaStreams } from '@/lib/utils';

export default function Create() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const audioId = searchParams.get('audioId');
  const audioTitleParam = searchParams.get('audioTitle');

  // State
  const [showCamera, setShowCamera] = useState(true);
  const [showPostScreen, setShowPostScreen] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSound, setSelectedSound] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hideComments, setHideComments] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);
  
  // Auto-suggestion state
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Cleanup all media streams when component unmounts
  useEffect(() => {
    return () => {
      // Stop all active camera/microphone streams
      stopAllMediaStreams();
      console.log('CreateWithCamera: Cleaned up all media streams');
    };
  }, []);

  // Sync audio with video preview
  useEffect(() => {
    if (previewUrl && selectedSound && showPostScreen && mediaFile?.type.startsWith('video')) {
      if (!audioRef.current) {
        const playableUrl = selectedSound.previewUrl || (selectedSound.audioUrl?.startsWith('http') && !selectedSound.audioUrl?.includes('t.me/') ? selectedSound.audioUrl : '');
        if (playableUrl) {
          audioRef.current = new Audio(playableUrl);
          audioRef.current.loop = true;
          audioRef.current.preload = "auto";
        }
      }
      
      const audio = audioRef.current;
      const video = document.querySelector('video') as HTMLVideoElement;
      
      if (video && audio) {
        video.muted = true;
        audio.currentTime = selectedSound.startTime || 0;

        const handlePlay = () => audio.play().catch(console.error);
        const handlePause = () => audio.pause();

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          audio.pause();
          audioRef.current = null;
        };
      }
    }
  }, [previewUrl, selectedSound, showPostScreen, mediaFile]);

  // Auto-suggestion logic
  const handleDescriptionChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setCaption(value);
    setCursorPosition(cursorPos);

    // Get the word at cursor position
    const textBeforeCursor = value.substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s/);
    const currentWord = words[words.length - 1];

    // Check for hashtag
    if (currentWord.startsWith('#') && currentWord.length > 1) {
      const searchTerm = currentWord.substring(1).toLowerCase();
      setShowHashtagSuggestions(true);
      setShowUserSuggestions(false);
      
      // Fetch trending hashtags and filter
      const trendingHashtags = [
        'viral', 'trending', 'fyp', 'foryou', 'explore', 
        'reels', 'india', 'love', 'music', 'dance',
        'comedy', 'fashion', 'food', 'travel', 'fitness'
      ];
      
      const filtered = trendingHashtags
        .filter(tag => tag.toLowerCase().includes(searchTerm))
        .map(tag => `#${tag}`)
        .slice(0, 10);
      
      setHashtagSuggestions(filtered);
    }
    // Check for user mention
    else if (currentWord.startsWith('@') && currentWord.length > 1) {
      const searchTerm = currentWord.substring(1).toLowerCase();
      setShowUserSuggestions(true);
      setShowHashtagSuggestions(false);
      
      // Fetch users from database
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .ilike('username', `%${searchTerm}%`)
          .limit(10);
        
        if (!error && data) {
          setUserSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    } else {
      setShowHashtagSuggestions(false);
      setShowUserSuggestions(false);
    }
  };

  const insertSuggestion = (suggestion: string) => {
    const textBeforeCursor = caption.substring(0, cursorPosition);
    const textAfterCursor = caption.substring(cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    words[words.length - 1] = suggestion;
    const newText = words.join(' ') + ' ' + textAfterCursor;
    setCaption(newText);
    setShowHashtagSuggestions(false);
    setShowUserSuggestions(false);
    
    // Focus back on textarea
    setTimeout(() => {
      if (descriptionRef.current) {
        const newCursorPos = words.join(' ').length + 1;
        descriptionRef.current.focus();
        descriptionRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handlePost = async () => {
    if (!mediaFile || !profile) {
      toast.error('Missing required data');
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      // Upload media to Supabase Storage
      const fileName = `${profile.id}/${Date.now()}_${mediaFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, mediaFile);

      if (uploadError) throw uploadError;

      setProgress(50);

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      setProgress(70);

      // Determine if it's a reel or post
      const isVideo = mediaFile.type.startsWith('video');
      const type = isVideo ? 'reel' : 'post';

      if (type === 'reel') {
        const reelData: any = {
          owner_id: profile.id,
          video_url: publicUrl,
          title: title || null,
          caption: caption || '',
          hide_likes: hideLikes,
          hide_comments: hideComments,
          audio_source_id: selectedSound?.id || null,
          audio_title: selectedSound?.title || null,
          audio_url: selectedSound?.previewUrl || null,
          audio_start_time: selectedSound?.startTime || 0
        };

        const { error } = await supabase.from('reels').insert(reelData);
        if (error) throw error;
      } else {
        const postData: any = {
          owner_id: profile.id,
          media_url: publicUrl,
          title: title || null,
          caption: caption || '',
          hide_likes: hideLikes,
          hide_comments: hideComments
        };

        const { error } = await supabase.from('posts').insert(postData);
        if (error) throw error;
      }

      setProgress(100);
      toast.success(`${type === 'reel' ? 'Reel' : 'Post'} uploaded successfully!`);
      
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Camera Screen
  if (showCamera) {
    return (
      <TikTokCamera
        onClose={() => {
          stopAllMediaStreams();
          navigate(-1);
        }}
        onCapture={(file, sound) => {
          console.log('📹 Video captured from camera:', file.name, file.size, file.type);
          setMediaFile(file);
          setSelectedSound(sound);
          setPreviewUrl(URL.createObjectURL(file));
          setShowCamera(false);
          setShowPostScreen(true);
          toast.success('Video captured! Add details and post.');
        }}
        preselectedAudioId={audioId}
        preselectedAudioTitle={audioTitleParam}
      />
    );
  }

  // Post Screen
  if (showPostScreen) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              setShowPostScreen(false);
              setShowCamera(true);
            }}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold">
            {mediaFile?.type.startsWith('video') ? 'New Reel' : 'New Post'}
          </h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Full-Screen Preview */}
          <div className="relative w-full aspect-square bg-black">
            {mediaFile?.type.startsWith('video') ? (
              <video
                src={previewUrl || ''}
                className="w-full h-full object-contain"
                autoPlay
                loop
                playsInline
              />
            ) : (
              <img
                src={previewUrl || ''}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Form Fields */}
          <div className="p-4 space-y-4">
            {/* Title Field */}
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                placeholder="Add title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {title.length}/100
              </p>
            </div>

            {/* Description Field with Auto-suggestions */}
            <div className="relative">
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                ref={descriptionRef}
                placeholder="Describe your video... Use # for hashtags and @ to mention users"
                value={caption}
                onChange={handleDescriptionChange}
                className="min-h-[100px]"
                maxLength={2200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {caption.length}/2200
              </p>
              
              {/* Hashtag Suggestions */}
              {showHashtagSuggestions && hashtagSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {hashtagSuggestions.map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => insertSuggestion(tag)}
                      className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-2"
                    >
                      <Hash className="w-4 h-4 text-primary" />
                      <span className="text-sm">{tag}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* User Suggestions */}
              {showUserSuggestions && userSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {userSuggestions.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => insertSuggestion(`@${user.username}`)}
                      className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">@{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.full_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSound && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Music className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedSound.title}</p>
                  <p className="text-xs text-muted-foreground">Music</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Allow Comments</span>
                <Switch
                  checked={!hideComments}
                  onCheckedChange={(checked) => setHideComments(!checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Show Likes</span>
                <Switch
                  checked={!hideLikes}
                  onCheckedChange={(checked) => setHideLikes(!checked)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Post Button */}
        <div className="p-4 border-t">
          {loading && (
            <Progress value={progress} className="mb-4" />
          )}
          <Button 
            className="w-full h-14 text-lg font-bold"
            disabled={loading}
            onClick={handlePost}
          >
            {loading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
