import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Check, Play, Hash, AtSign, AlignLeft, AlignCenter, AlignRight, Keyboard, ExternalLink, Loader2, Tag, ShoppingBag } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { cn } from '@/lib/utils';
import { OVERLAY_FONTS, OVERLAY_ANIMATIONS } from '@/lib/overlayConstants';

export default function Create() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // State
  const [showMediaSelection, setShowMediaSelection] = useState(true);
  const [showPreviewScreen, setShowPreviewScreen] = useState(false);
  const [showPostScreen, setShowPostScreen] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hideComments, setHideComments] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);
  
  // Product tag state
  const [productLink, setProductLink] = useState('');
  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productPosition, setProductPosition] = useState({ x: 50, y: 50 });
  const [hasProduct, setHasProduct] = useState(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const [productSize, setProductSize] = useState<'sm' | 'md' | 'lg'>('md');
  
  // Auto-suggestion state
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  // Overlay states
  const [textOverlays, setTextOverlays] = useState<any[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [currentText, setCurrentText] = useState('');

  // Timeline state
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelinePlayhead, setTimelinePlayhead] = useState(0); // 0-100%
  const [videoDuration, setVideoDuration] = useState(0);       // real seconds
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameThumbnails, setFrameThumbnails] = useState<string[]>([]);
  const [trimStart, setTrimStart] = useState(0);   // 0-100%
  const [trimEnd, setTrimEnd] = useState(100);     // 0-100%
  const addMoreMediaRef = useRef<HTMLInputElement>(null);
  const audioPickerRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Image pan/zoom state
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale] = useState(1);
  const imgDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  // Text editor tab
  const [textEditorTab, setTextEditorTab] = useState<'font' | 'color' | 'anim'>('font');

  // More panel
  const [showMorePanel, setShowMorePanel] = useState(false);
  const [morePanelTab, setMorePanelTab] = useState<'effects'|'format'|'background'|'graphics'|'colors'>('effects');
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<string>('free'); // 'free' | '9:16' | '1:1' | '4:3' | '16:9'
  const [bgColor, setBgColor] = useState<string>('#000000');
  const [colorOverlay, setColorOverlay] = useState<string | null>(null); // hex color tint

  // Instagram-style inline text editor state
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [textFontSize, setTextFontSize] = useState(50);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textFont, setTextFont] = useState(0);
  const [textBgStyle, setTextBgStyle] = useState<'none' | 'box' | 'outline'>('none');
  const [textAnimation, setTextAnimation] = useState(0); // index into TEXT_ANIMATIONS
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inlineTextRef = useRef<HTMLTextAreaElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null!);

  // Auto-grant permission on component mount
  useEffect(() => {
    localStorage.setItem('media_permission_granted', 'true');
  }, []);

  // Extract video frames for timeline thumbnails
  useEffect(() => {
    if (previewUrls.length === 0) { setFrameThumbnails([]); return; }
    const url = previewUrls[selectedMediaIndex] || previewUrls[0];
    const file = mediaFiles[selectedMediaIndex] || mediaFiles[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      // For images just repeat the same thumbnail
      setFrameThumbnails(Array(8).fill(url));
      return;
    }

    // For videos: extract frames using hidden video + canvas
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    const frames: string[] = [];
    let extracted = 0;
    const TOTAL = 8;

    video.addEventListener('loadedmetadata', () => {
      const duration = video.duration || 10;
      const captureFrame = (i: number) => {
        video.currentTime = (i / (TOTAL - 1)) * duration * 0.95;
      };
      video.addEventListener('seeked', function onSeeked() {
        const canvas = document.createElement('canvas');
        canvas.width = 80; canvas.height = 80;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(video, 0, 0, 80, 80);
        frames.push(canvas.toDataURL('image/jpeg', 0.7));
        extracted++;
        if (extracted < TOTAL) {
          captureFrame(extracted);
        } else {
          video.removeEventListener('seeked', onSeeked);
          setFrameThumbnails([...frames]);
        }
      });
      captureFrame(0);
    });
    video.load();
  }, [previewUrls, selectedMediaIndex]);

  // Audio element lifecycle
  useEffect(() => {
    if (!audioUrl) { audioElRef.current = null; return; }
    const el = new Audio(audioUrl);
    el.loop = true;
    audioElRef.current = el;
    return () => { el.pause(); el.src = ''; };
  }, [audioUrl]);

  // Sync play/pause across video + audio
  const togglePlay = () => {
    const vid = previewVideoRef.current;
    const aud = audioElRef.current;
    if (isPlaying) {
      vid?.pause();
      aud?.pause();
      setIsPlaying(false);
    } else {
      if (vid) {
        vid.loop = false; // always manual-loop within trim range
        const startFrac = trimStart / 100;
        // Only seek if video is ready (readyState >= HAVE_CURRENT_DATA)
        if (vid.readyState >= 2 && vid.duration && isFinite(vid.duration)) {
          vid.currentTime = startFrac * vid.duration;
        }
        vid.play().catch(() => setIsPlaying(false));
      }
      if (aud) {
        aud.loop = false;
        if (aud.duration && isFinite(aud.duration)) {
          aud.currentTime = (trimStart / 100) * aud.duration;
        }
        aud.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  // Animate playhead exactly in sync with video.currentTime — RAF loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      // Don't override playhead while user is scrubbing
      if (isScrubbing.current) { rafId = requestAnimationFrame(tick); return; }

      const vid = previewVideoRef.current;
      // Use audio if present and playing, else use video directly
      const aud = audioElRef.current;
      const hasSyncAudio = aud && isFinite(aud.duration) && aud.duration > 0 && !aud.paused;
      const source = hasSyncAudio ? aud : vid;

      if (source && isFinite(source.duration) && source.duration > 0) {
        const pct = (source.currentTime / source.duration) * 100;

        // Manual loop: when playhead hits trimEnd, jump back to trimStart
        if (pct >= trimEnd - 0.1) {
          const startFrac = trimStart / 100;
          if (vid && isFinite(vid.duration)) vid.currentTime = startFrac * vid.duration;
          if (aud && isFinite(aud.duration)) aud.currentTime = startFrac * aud.duration;
          setTimelinePlayhead(trimStart);
          if (timelineScrollRef.current) timelineScrollRef.current.scrollLeft = 0;
          rafId = requestAnimationFrame(tick);
          return;
        }

        setTimelinePlayhead(pct);

        // Auto-scroll timeline to keep playhead visible
        if (timelineScrollRef.current) {
          const el = timelineScrollRef.current;
          const stripWidth = el.scrollWidth;
          const playheadPx = (pct / 100) * stripWidth;
          const visibleEnd = el.scrollLeft + el.clientWidth;
          if (playheadPx > visibleEnd - 40) {
            el.scrollLeft = playheadPx - el.clientWidth / 2;
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(rafId); };
  }, [isPlaying, trimStart, trimEnd]);

  // Seek audio/video when scrubber is dragged
  const isScrubbing = useRef(false);

  const handleScrub = (val: number) => {
    setTimelinePlayhead(val);
    const aud = audioElRef.current;
    const vid = previewVideoRef.current;
    if (vid && isFinite(vid.duration) && vid.duration > 0)
      vid.currentTime = (val / 100) * vid.duration;
    if (aud && isFinite(aud.duration) && aud.duration > 0)
      aud.currentTime = (val / 100) * aud.duration;
  };

  const onScrubStart = () => {
    isScrubbing.current = true;
    // Pause while scrubbing so RAF doesn't fight us
    previewVideoRef.current?.pause();
    audioElRef.current?.pause();
  };

  const onScrubEnd = () => {
    isScrubbing.current = false;
    // Resume if user had it playing
    if (isPlaying) {
      previewVideoRef.current?.play().catch(() => {});
      audioElRef.current?.play().catch(() => {});
    }
  };

  const handleFileSelect = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > 2 * 1024 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds 2GB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setMediaFiles(validFiles);
    const urls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    setSelectedMediaIndex(0);
    setVideoDuration(0);
    setTimelinePlayhead(0);
    setIsPlaying(false);
    // Show preview screen after file selection
    setShowMediaSelection(false);
    setShowPreviewScreen(true);
  };

  const handleNext = () => {
    if (mediaFiles.length === 0) {
      toast.error('Please select at least one photo or video');
      return;
    }
    setShowPreviewScreen(false);
    setShowPostScreen(true);
  };

  const handleBack = () => {
    if (showPostScreen) {
      setShowPostScreen(false);
      setShowPreviewScreen(true);
    } else if (showPreviewScreen) {
      setShowPreviewScreen(false);
      setShowMediaSelection(true);
    } else if (showMediaSelection) {
    } else {
      navigate(-1);
    }
  };

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

  const handleAddProduct = () => {
    if (!productLink || !productName) {
      toast.error('Please enter product link and name');
      return;
    }

    // Validate URL
    try {
      new URL(productLink);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setHasProduct(true);
    setShowProductDialog(false);
    toast.success('Product added successfully');
  };

  const handleRemoveProduct = () => {
    setHasProduct(false);
    setProductLink('');
    setProductName('');
    setProductImage('');
    setProductPrice('');
    setProductPosition({ x: 50, y: 50 });
    toast.success('Product removed');
  };

  const handleAutoFill = async () => {
    if (!productLink) { toast.error('Pehle URL daalo'); return; }
    try { new URL(productLink); } catch { toast.error('Valid URL daalo'); return; }
    setIsFetchingProduct(true);
    try {
      const { data, error } = await supabase.functions.invoke('product-scraper', { body: { url: productLink } });
      if (error) {
        const msg = await error?.context?.text?.();
        throw new Error(msg || error.message);
      }
      let filled = 0;
      if (data?.name)  { setProductName(data.name);   filled++; }
      if (data?.image) { setProductImage(data.image);  filled++; }
      if (data?.price) { setProductPrice(data.price);  filled++; }
      if (filled === 0) {
        toast.warning('Kuch fill nahi ho saka — naam/price manually type karo');
      } else if (filled === 3) {
        toast.success('Naam, image aur price sab fill ho gaya! ✅');
      } else {
        const missing: string[] = [];
        if (!data?.image) missing.push('image');
        if (!data?.price) missing.push('price');
        toast.success(`Fill ho gaya ✅ — ${missing.join(' aur ')} manually daalo`);
      }
    } catch (e: any) {
      const msg = (e.message || '').toLowerCase();
      if (msg.includes('non-2xx') || msg.includes('500') || msg.includes('failed')) {
        toast.error('Link se data nahi mila — naam aur price khud daalo');
      } else {
        toast.error('Auto-fill failed: ' + (e.message || 'Try again'));
      }
    } finally {
      setIsFetchingProduct(false);
    }
  };

  const handlePost = async () => {
    if (mediaFiles.length === 0 || !profile) {
      toast.error('Missing required data');
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      // 1. Upload stickers to Storage first (if any)
      const uploadedStickers = await Promise.all(stickers.map(async (sticker) => {
        try {
          const stickerResponse = await fetch(sticker.url);
          const stickerBlob = await stickerResponse.blob();
          const stickerFileName = `stickers/${profile.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
          
          const { error: sUploadError } = await supabase.storage
            .from('media')
            .upload(stickerFileName, stickerBlob, { 
              contentType: 'image/png',
              upsert: true 
            });
            
          if (sUploadError) throw sUploadError;
          
          const { data: { publicUrl: sPublicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(stickerFileName);
            
          return { ...sticker, url: sPublicUrl };
        } catch (err) {
          console.error('Sticker upload failed:', err);
          return sticker;
        }
      }));

      // 2. Upload main media files to Supabase Storage
      const uploadedMediaUrls = await Promise.all(mediaFiles.map(async (file, index) => {
        const fileName = `${profile.id}/${Date.now()}_${index}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        
        setProgress(10 + Math.floor((index + 1) / mediaFiles.length * 60));
        return publicUrl;
      }));

      const publicUrl = uploadedMediaUrls[0];
      const mediaGallery = uploadedMediaUrls;

      // Determine if it's a reel or post
      const isVideoFile = mediaFiles.some(file => 
        file.type.startsWith('video/') || 
        file.name.toLowerCase().match(/\.(mp4|mov|webm|ogg|mkv|3gp|avi)$/i)
      );
      
      const type = isVideoFile ? 'reel' : 'post';

      if (type === 'reel') {
        const reelData: any = {
          owner_id: profile.id,
          video_url: publicUrl,
          media_gallery: mediaGallery,
          title: title || null,
          caption: caption || '',
          hide_likes: hideLikes,
          hide_comments: hideComments,
          overlays: { text: textOverlays, stickers: uploadedStickers }
        };

        const { data: insertedReel, error } = await supabase
          .from('reels')
          .insert(reelData)
          .select()
          .single();
        if (error) throw error;

        // Insert product tag if exists
        if (hasProduct && insertedReel) {
          const { error: productError } = await supabase.from('product_tags').insert({
            reel_id: insertedReel.id,
            product_name: productName,
            product_image_url: productImage || null,
            product_link: productLink,
            product_price: productPrice || null,
            position_x: productPosition.x,
            position_y: productPosition.y
          });
          if (productError) console.error('Product tag error:', productError);
        }

        // ── Send video to Telegram channel ──────────────────────────
        try {
          const originalFile = mediaFiles.find(f =>
            f.type.startsWith('video/') ||
            f.name.toLowerCase().match(/\.(mp4|mov|webm|ogg|mkv|3gp|avi)$/i)
          );
          await supabase.functions.invoke('telegram-bot-upload', {
            body: {
              fileUrl: publicUrl,
              fileName: originalFile?.name || 'reel.mp4',
              fileSize: originalFile?.size || 0,
              mimeType: originalFile?.type || 'video/mp4',
              caption: caption
                ? `${caption}\n\n🎬 INDIANREELS`
                : '🎬 New Reel on INDIANREELS',
            },
          });
        } catch (tgErr) {
          // Non-blocking — reel is already saved, just log
          console.warn('Telegram send skipped:', tgErr);
        }
      } else {
        const postData: any = {
          owner_id: profile.id,
          media_url: publicUrl,
          media_gallery: mediaGallery,
          title: title || null,
          caption: caption || '',
          hide_likes: hideLikes,
          hide_comments: hideComments,
          overlays: { text: textOverlays, stickers: uploadedStickers }
        };

        const { data: insertedPost, error } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();
        if (error) throw error;

        // Insert product tag if exists
        if (hasProduct && insertedPost) {
          const { error: productError } = await supabase.from('product_tags').insert({
            post_id: insertedPost.id,
            product_name: productName,
            product_image_url: productImage || null,
            product_link: productLink,
            product_price: productPrice || null,
            position_x: productPosition.x,
            position_y: productPosition.y
          });
          if (productError) console.error('Product tag error:', productError);
        }
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

  // Media Selection Screen — Video Editor Style
  if (showMediaSelection) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-3 pt-4 pb-2 z-10">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => toast.info('Undo')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors"
            >
              {/* undo icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
              </svg>
            </button>
            <button
              onClick={() => toast.info('Redo')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors"
            >
              {/* redo icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.info('Fullscreen')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-5 rounded-full bg-white flex items-center gap-1.5 font-bold text-black text-sm active:scale-95 transition-transform shadow-lg"
            >
              SAVE
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── CENTER PREVIEW ── */}
        <div
          className="flex-1 flex items-center justify-center relative overflow-hidden cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Default brand placeholder */}
          <div className="w-[72vw] max-w-[320px] aspect-square rounded-[28px] overflow-hidden shadow-2xl border-2 border-white/10 relative bg-zinc-900 flex flex-col items-center justify-center gap-4">
            {/* Upload icon */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <span className="text-zinc-400 text-sm font-medium">Photo / Video</span>
            </div>
            {/* Tap to upload hint */}
            <div className="absolute inset-0 flex items-end justify-center pb-4">
              <span className="bg-black/60 text-white/80 text-xs px-4 py-1.5 rounded-full backdrop-blur-sm font-medium">
                Tap to select media
              </span>
            </div>
          </div>

          {/* hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) handleFileSelect(files);
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect([file]);
            }}
          />
        </div>

        {/* ── PLAYBACK BAR ── */}
        <div className="flex items-center gap-3 px-4 py-2">
          <button
            onClick={() => toast.info('Play')}
            className="w-9 h-9 flex items-center justify-center shrink-0"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          {/* Timeline track */}
          <div className="flex-1 h-1.5 bg-zinc-700 rounded-full relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-[4%] bg-white rounded-full" />
          </div>
          <button
            onClick={() => toast.info('Volume')}
            className="w-9 h-9 flex items-center justify-center shrink-0"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          </button>
        </div>

        {/* ── BOTTOM TOOLBAR ── */}
        <div className="bg-zinc-900 border-t border-zinc-800 pb-safe-bottom">
          <div className="flex items-stretch">
            {/* Timeline */}
            <button
              onClick={() => toast.info('Timeline')}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-zinc-400 active:bg-zinc-800 transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="7" width="4" height="10" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="17" y="9" width="4" height="8" rx="1"/>
              </svg>
              <span className="text-[10px] font-medium">Timeline</span>
            </button>

            {/* Media — highlighted / active */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-white bg-zinc-800 active:bg-zinc-700 transition-colors relative"
            >
              {/* top active indicator */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-white" />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              <span className="text-[10px] font-semibold">Media</span>
            </button>

            {/* Text */}
            <button
              onClick={() => { handleFileSelect([]); setTimeout(() => { setShowMediaSelection(false); setShowPreviewScreen(true); openInlineTextEditor(); }, 50); }}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-zinc-400 active:bg-zinc-800 transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
              </svg>
              <span className="text-[10px] font-medium">Text</span>
            </button>

            {/* Audio */}
            <button
              onClick={() => toast.info('Audio editing coming soon')}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-zinc-400 active:bg-zinc-800 transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
              <span className="text-[10px] font-medium">Audio</span>
            </button>

            {/* More */}
            <button
              onClick={() => toast.info('More options')}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-zinc-400 active:bg-zinc-800 transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    const currentPreviewUrl = previewUrls[selectedMediaIndex];
    if (!currentPreviewUrl) return;
    const currentFile = mediaFiles[selectedMediaIndex];
    const a = document.createElement('a');
    a.href = currentPreviewUrl;
    a.download = `INDIANREELS_${Date.now()}.${currentFile?.type.split('/')[1] || 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Downloading media...');
  };

  // Unified drag + pinch-to-resize handler
  const makeDragHandlers = (
    currentX: number,
    currentY: number,
    onUpdate: (x: number, y: number) => void,
    containerRef?: React.RefObject<HTMLDivElement>,
    currentSize?: number,
    onResize?: (size: number) => void
  ) => {
    const getContainerRect = () =>
      containerRef?.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    const getPinchDist = (t0: { clientX: number; clientY: number }, t1: { clientX: number; clientY: number }) => {
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      return Math.hypot(dx, dy);
    };

    const onMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = getContainerRect();
      const startClientX = e.clientX, startClientY = e.clientY;
      const startX = currentX, startY = currentY;
      const onMove = (mv: MouseEvent) => {
        const dx = ((mv.clientX - startClientX) / rect.width) * 100;
        const dy = ((mv.clientY - startClientY) / rect.height) * 100;
        onUpdate(
          Math.min(100, Math.max(0, startX + dx)),
          Math.min(100, Math.max(0, startY + dy))
        );
      };
      const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };

    const onTouchStart = (e: React.TouchEvent) => {
      e.preventDefault();
      const rect = getContainerRect();

      if (e.touches.length === 2 && onResize && currentSize !== undefined) {
        // ── Pinch to resize ──
        const t0 = e.touches[0], t1 = e.touches[1];
        const startDist = getPinchDist(t0, t1);
        const startSize = currentSize;
        const onMove = (mv: TouchEvent) => {
          if (mv.touches.length < 2) return;
          const dist = getPinchDist(mv.touches[0], mv.touches[1]);
          const newSize = Math.min(200, Math.max(8, (startSize * dist) / startDist));
          onResize(newSize);
        };
        const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
      } else {
        // ── 1-finger drag ──
        const touch = e.touches[0];
        const startClientX = touch.clientX, startClientY = touch.clientY;
        const startX = currentX, startY = currentY;
        const onMove = (mv: TouchEvent) => {
          if (mv.touches.length !== 1) return;
          const t = mv.touches[0];
          const dx = ((t.clientX - startClientX) / rect.width) * 100;
          const dy = ((t.clientY - startClientY) / rect.height) * 100;
          onUpdate(
            Math.min(100, Math.max(0, startX + dx)),
            Math.min(100, Math.max(0, startY + dy))
          );
        };
        const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
      }
    };

    return { onMouseDown, onTouchStart };
  };

  // Use shared overlay constants — keep displaySize for the font picker UI
  const FONTS = OVERLAY_FONTS.map((f, i) => ({
    ...f,
    displaySize: [70, 78, 76, 72, 80, 86, 90, 74, 100, 110, 120, 130, 140, 150][i] ?? 80,
  }));
  const TEXT_ANIMATIONS = OVERLAY_ANIMATIONS;

  const TEXT_COLORS = [
    '#ffffff','#000000','#ff0050','#fe2c55','#ffd700','#00ff88',
    '#00cfff','#ff69b4','#ff8c00','#a855f7','#ff4500','#00e5ff',
    '#39ff14','#ff1493','#ffec3d','#e040fb','#00bcd4','#ff6b35',
    '#c8ff00','#8b5cf6',
  ];

  const openInlineTextEditor = () => {
    setCurrentText('');
    setIsTextEditing(true);
    setTimeout(() => inlineTextRef.current?.focus(), 100);
  };

  const confirmTextOverlay = () => {
    if (currentText.trim()) {
      setTextOverlays([...textOverlays, {
        id: Date.now(),
        text: currentText.trim(),
        x: 50, y: 50,
        color: textColor,
        size: textFontSize,
        font: textFont,
        align: textAlign,
        bgStyle: textBgStyle,
        animation: textAnimation,
      }]);
    }
    setCurrentText('');
    setIsTextEditing(false);
    setShowColorPicker(false);
  };

  const addTextOverlay = () => {
    confirmTextOverlay();
  };

  const addSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setStickers([...stickers, {
        id: Date.now(),
        url,
        x: 60,
        y: 40,
        size: 100
      }]);
    }
  };

  // Preview/Editing Screen
  if (showPreviewScreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">

        {/* ── INLINE TEXT EDITOR MODE ── */}
        {isTextEditing && (
          <div className="absolute inset-0 z-50 flex flex-col">
            {/* Dimmed media bg */}
            <div className="absolute inset-0 bg-black/40" onClick={confirmTextOverlay} />

            {/* Top: checkmark */}
            <div className="relative z-10 flex items-center justify-end px-5 pt-safe-top pt-4">
              <button
                onClick={confirmTextOverlay}
                className="w-10 h-10 flex items-center justify-center"
              >
                <Check className="w-7 h-7 text-white drop-shadow" />
              </button>
            </div>

            {/* Center: inline text input */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-12">
              <textarea
                ref={inlineTextRef}
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder="Start typing..."
                rows={3}
                className={cn(
                  'w-full bg-transparent border-none outline-none resize-none text-center leading-tight placeholder:text-white/40',
                  FONTS[textFont].style,
                  TEXT_ANIMATIONS[textAnimation].cls
                )}
                style={{
                  fontSize: `${textFontSize}px`,
                  color: textColor,
                  textAlign: textAlign,
                  textShadow: textBgStyle === 'outline' ? '0 0 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1), 1px 1px 0 #000, -1px -1px 0 #000' : 'none',
                  backgroundColor: textBgStyle === 'box' ? 'rgba(0,0,0,0.55)' : 'transparent',
                  borderRadius: textBgStyle === 'box' ? '6px' : '0',
                  padding: textBgStyle === 'box' ? '4px 10px' : '0',
                  caretColor: textColor,
                }}
                autoFocus
              />
            </div>

            {/* Left: vertical font-size slider */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 h-48">
              <span className="text-white/60 text-xs">A</span>
              <div className="relative flex-1 flex items-center justify-center">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={textFontSize}
                  onChange={(e) => setTextFontSize(Number(e.target.value))}
                  className="appearance-none cursor-pointer"
                  style={{
                    writingMode: 'vertical-lr' as any,
                    direction: 'rtl' as any,
                    width: '28px',
                    height: '160px',
                    background: 'transparent',
                    accentColor: '#fff',
                  }}
                />
              </div>
              <span className="text-white text-sm font-bold">A</span>
            </div>

            {/* ── TAB SWITCHER ── */}
            <div className="relative z-20 flex border-b border-white/10">
              {(['font','color','anim'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setTextEditorTab(tab)}
                  className={cn(
                    'flex-1 py-2 text-xs font-semibold tracking-wide transition-colors',
                    textEditorTab === tab ? 'text-white border-b-2 border-white' : 'text-white/40'
                  )}
                >
                  {tab === 'font' ? '✏️ Font' : tab === 'color' ? '🎨 Color' : '✨ Animate'}
                </button>
              ))}
            </div>

            {/* ── FONT TAB ── */}
            {textEditorTab === 'font' && (
              <div className="relative z-20 overflow-x-auto scrollbar-hide">
                <div className="flex items-stretch gap-2 px-3 py-2 whitespace-nowrap">
                  {FONTS.map((f, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTextFont(idx)}
                      className={cn(
                        'shrink-0 flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl border transition-all active:scale-90',
                        textFont === idx
                          ? 'bg-white border-white'
                          : 'bg-white/10 border-white/20 hover:bg-white/20'
                      )}
                    >
                      <span
                        className={cn(f.style, textFont === idx ? 'text-black' : 'text-white')}
                        style={{ fontSize: '22px', lineHeight: 1 }}
                      >
                        Aa
                      </span>
                      <span className={cn('text-[9px]', textFont === idx ? 'text-black/60' : 'text-white/40')}>
                        {f.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── COLOR TAB ── */}
            {textEditorTab === 'color' && (
              <div className="relative z-20 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 px-3 py-2.5 whitespace-nowrap">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      className={cn(
                        'w-9 h-9 rounded-full shrink-0 border-[3px] transition-all active:scale-90',
                        textColor === c ? 'border-white scale-110 shadow-lg shadow-white/30' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── ANIMATION TAB ── */}
            {textEditorTab === 'anim' && (
              <div className="relative z-20 overflow-x-auto scrollbar-hide">
                <div className="flex items-stretch gap-2 px-3 py-2 whitespace-nowrap">
                  {TEXT_ANIMATIONS.map((anim, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTextAnimation(idx)}
                      className={cn(
                        'shrink-0 flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl border transition-all active:scale-90',
                        textAnimation === idx
                          ? 'bg-white border-white'
                          : 'bg-white/10 border-white/20 hover:bg-white/20'
                      )}
                    >
                      <span
                        className={cn(
                          FONTS[textFont].style,
                          anim.cls,
                          textAnimation === idx ? 'text-black' : 'text-white'
                        )}
                        style={{ fontSize: '18px', lineHeight: 1, color: textAnimation === idx ? '#000' : textColor }}
                      >
                        Aa
                      </span>
                      <span className={cn('text-[9px]', textAnimation === idx ? 'text-black/60' : 'text-white/40')}>
                        {anim.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom toolbar */}
            <div className="relative z-20 bg-zinc-900/95 border-t border-white/10 px-4 pt-3 pb-2">
              <div className="flex items-center justify-between">
                {/* Keyboard */}
                <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10"
                  onClick={() => inlineTextRef.current?.focus()}>
                  <Keyboard className="w-5 h-5 text-white" />
                </button>

                {/* dotted A — outline */}
                <button
                  className={cn('flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-all', textBgStyle === 'outline' ? 'bg-white/20' : '')}
                  onClick={() => setTextBgStyle(textBgStyle === 'outline' ? 'none' : 'outline')}
                >
                  <span className="text-base font-bold"
                    style={{ color: 'transparent', WebkitTextStroke: '1.5px white' }}>A</span>
                </button>

                {/* boxed A — bg box */}
                <button
                  className={cn('flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-all', textBgStyle === 'box' ? 'bg-white/20' : '')}
                  onClick={() => setTextBgStyle(textBgStyle === 'box' ? 'none' : 'box')}
                >
                  <span className="text-white text-sm font-bold border-2 border-white/70 px-1.5 py-0.5 rounded">A</span>
                </button>

                {/* Alignment */}
                <button
                  className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-all"
                  onClick={() => setTextAlign(a => a === 'left' ? 'center' : a === 'center' ? 'right' : 'left')}
                >
                  {textAlign === 'left' && <AlignLeft className="w-5 h-5 text-white" />}
                  {textAlign === 'center' && <AlignCenter className="w-5 h-5 text-white" />}
                  {textAlign === 'right' && <AlignRight className="w-5 h-5 text-white" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header (hidden when text editing) */}
        {!isTextEditing && (
          <div className="flex items-center justify-between px-3 pt-4 pb-2 z-20">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowPreviewScreen(false); setShowMediaSelection(true); }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => toast.info('Undo')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                </svg>
              </button>
              <button
                onClick={() => toast.info('Redo')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info('Fullscreen')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="h-10 px-5 rounded-full bg-white flex items-center gap-1.5 font-bold text-black text-sm active:scale-95 transition-transform shadow-lg"
              >
                SAVE
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Media area */}
        <div
          ref={mediaContainerRef}
          className={cn(
            "flex-1 relative flex items-center justify-center overflow-hidden",
            isTextEditing && 'absolute inset-0 z-40',
            activeEffect && `effect-${activeEffect}`
          )}
          style={{
            background: bgColor,
            ...(activeFormat === '9:16'  ? { aspectRatio: '9/16',  flex: 'none', maxHeight: '100%', margin: 'auto' } :
                activeFormat === '1:1'   ? { aspectRatio: '1/1',   flex: 'none', maxHeight: '100%', margin: 'auto' } :
                activeFormat === '4:3'   ? { aspectRatio: '4/3',   flex: 'none', maxHeight: '100%', margin: 'auto' } :
                activeFormat === '16:9'  ? { aspectRatio: '16/9',  flex: 'none', maxHeight: '100%', margin: 'auto' } :
                {}),
          }}
        >
          {mediaFiles[selectedMediaIndex]?.type.startsWith('video') ? (
            <video
              ref={previewVideoRef}
              key={previewUrls[selectedMediaIndex]}
              src={previewUrls[selectedMediaIndex] || ''}
              className="w-full h-full object-contain bg-black"
              playsInline
              onLoadedMetadata={(e) => {
                const dur = (e.target as HTMLVideoElement).duration;
                if (dur && isFinite(dur)) setVideoDuration(dur);
              }}
              onEnded={() => {
                // Video ended naturally (no audio track) → reset
                setIsPlaying(false);
                setTimelinePlayhead(0);
                if (previewVideoRef.current) previewVideoRef.current.currentTime = 0;
              }}
            />
          ) : (
            <img
              key={previewUrls[selectedMediaIndex]}
              src={previewUrls[selectedMediaIndex] || ''}
              alt="Preview"
              className="w-full h-full object-contain bg-black select-none touch-none"
              draggable={false}
              style={{
                transform: `translate(${imgOffset.x}px, ${imgOffset.y}px) scale(${imgScale})`,
                transition: imgDragRef.current ? 'none' : 'transform 0.15s ease',
                cursor: imgScale > 1 ? 'grab' : 'default',
              }}
              onMouseDown={(e) => {
                imgDragRef.current = { startX: e.clientX, startY: e.clientY, ox: imgOffset.x, oy: imgOffset.y };
                const onMove = (me: MouseEvent) => {
                  if (!imgDragRef.current) return;
                  setImgOffset({ x: imgDragRef.current.ox + me.clientX - imgDragRef.current.startX, y: imgDragRef.current.oy + me.clientY - imgDragRef.current.startY });
                };
                const onUp = () => { imgDragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  imgDragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, ox: imgOffset.x, oy: imgOffset.y };
                } else if (e.touches.length === 2) {
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  pinchRef.current = { dist: Math.hypot(dx, dy), scale: imgScale };
                }
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                if (e.touches.length === 1 && imgDragRef.current) {
                  setImgOffset({ x: imgDragRef.current.ox + e.touches[0].clientX - imgDragRef.current.startX, y: imgDragRef.current.oy + e.touches[0].clientY - imgDragRef.current.startY });
                } else if (e.touches.length === 2 && pinchRef.current) {
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  const newDist = Math.hypot(dx, dy);
                  const ratio = newDist / pinchRef.current.dist;
                  setImgScale(Math.min(4, Math.max(0.5, pinchRef.current.scale * ratio)));
                }
              }}
              onTouchEnd={() => { imgDragRef.current = null; pinchRef.current = null; }}
              onDoubleClick={() => { setImgOffset({ x: 0, y: 0 }); setImgScale(1); }}
            />
          )}

          {/* Media selector strip */}
          {!isTextEditing && mediaFiles.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 z-30 overflow-x-auto py-2 bg-black/40 backdrop-blur-sm scrollbar-hide">
              {mediaFiles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedMediaIndex(idx); setImgOffset({ x: 0, y: 0 }); setImgScale(1); }}
                  className={`w-14 h-14 rounded-lg border-2 shrink-0 overflow-hidden transition-all ${selectedMediaIndex === idx ? 'border-[#fe2c55] scale-110 shadow-lg' : 'border-white/20 opacity-60'}`}
                >
                  {mediaFiles[idx].type.startsWith('video') ? (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <img src={previewUrls[idx]} className="w-full h-full object-cover" alt="" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Text Overlays */}
          {textOverlays.map(overlay => {
            const { onMouseDown, onTouchStart } = makeDragHandlers(
              overlay.x, overlay.y,
              (x, y) => setTextOverlays(prev => prev.map(o => o.id === overlay.id ? { ...o, x, y } : o)),
              mediaContainerRef,
              overlay.size,
              (size) => setTextOverlays(prev => prev.map(o => o.id === overlay.id ? { ...o, size } : o))
            );
            return (
              <div
                key={overlay.id}
                className={cn('absolute select-none p-2 rounded touch-none',
                  FONTS[overlay.font ?? 0]?.style ?? '',
                  TEXT_ANIMATIONS[overlay.animation ?? 0]?.cls ?? ''
                )}
                style={{
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  fontSize: `${overlay.size}px`,
                  color: overlay.color,
                  textAlign: overlay.align ?? 'center',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 30,
                  cursor: 'move',
                  textShadow: overlay.bgStyle === 'outline' ? '0 0 8px rgba(0,0,0,0.9), 1px 1px 0 #000, -1px -1px 0 #000' : 'none',
                  backgroundColor: overlay.bgStyle === 'box' ? 'rgba(0,0,0,0.55)' : 'transparent',
                  borderRadius: overlay.bgStyle === 'box' ? '6px' : '0',
                  lineHeight: 1.1,
                }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -3 : 3;
                  setTextOverlays(prev => prev.map(o =>
                    o.id === overlay.id ? { ...o, size: Math.min(200, Math.max(8, o.size + delta)) } : o
                  ));
                }}
              >
                {overlay.text}
              </div>
            );
          })}

          {/* Stickers */}
          {stickers.map(sticker => {
            const { onMouseDown, onTouchStart } = makeDragHandlers(
              sticker.x, sticker.y,
              (x, y) => setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, x, y } : s)),
              mediaContainerRef
            );
            return (
              <div
                key={sticker.id}
                className="absolute select-none touch-none"
                style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, width: `${sticker.size}px`, transform: 'translate(-50%, -50%)', zIndex: 25, cursor: 'move' }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
              >
                <img src={sticker.url} alt="Sticker" className="w-full h-full object-contain pointer-events-none" />
              </div>
            );
          })}

          {/* Product Overlay */}
          {hasProduct && (
            <div className="absolute inset-0 pointer-events-none z-40">
              <ProductCard
                productName={productName}
                productImage={productImage}
                productPrice={productPrice}
                productLink={productLink}
                position={productPosition}
                onPositionChange={setProductPosition}
              />
            </div>
          )}

          {/* Color tint overlay */}
          {colorOverlay && (
            <div className="absolute inset-0 pointer-events-none z-8"
              style={{ backgroundColor: colorOverlay, opacity: 0.35, mixBlendMode: 'multiply' }} />
          )}

          {/* Effect overlay */}
          {activeEffect && (
            <div className={`absolute inset-0 pointer-events-none effect-${activeEffect}`} style={{ zIndex: 9 }} />
          )}
        </div>

        {/* ── TIMELINE PANEL (when open) ── */}
        {!isTextEditing && showTimeline && (
          <div className="z-20 bg-zinc-950 border-t border-zinc-800">
            {/* Playback control row */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800/70">
              <button
                onClick={togglePlay}
                className="w-9 h-9 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
              >
                {isPlaying ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
              </button>
              {/* Time display */}
              <span className="text-white/70 text-xs font-mono flex-1 tabular-nums">
                {(() => {
                  const dur = videoDuration || 0;
                  const curSec = (timelinePlayhead / 100) * dur;
                  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(Math.floor(s % 60)).padStart(2,'0')}.${String(Math.floor((s % 1) * 10))}`;
                  return <><span className="text-white">{fmt(curSec)}</span><span className="text-zinc-600"> / {fmt(dur)}</span></>;
                })()}
              </span>
              {/* Volume */}
              <button className="w-8 h-8 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              </button>
            </div>

            {/* Timeline tracks — shared column so ONE playhead covers all layers */}
            <div ref={timelineScrollRef} className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="px-3 pb-3 flex items-start gap-3" style={{ minWidth: '100%' }}>

                {/* ── SINGLE TRACK COLUMN ── ruler + strip + audio + scrubber all same width */}
                <div className="relative flex-1 min-w-[280px]">

                  {/* ONE playhead needle spanning ALL layers top→bottom */}
                  <div
                    className="absolute top-0 bottom-5 w-[2px] pointer-events-none z-30"
                    style={{
                      left: `${timelinePlayhead}%`,
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(to bottom, #f97316, #fb923c 80%, transparent)',
                      boxShadow: '0 0 5px rgba(249,115,22,0.6)',
                      transition: isPlaying ? 'left 0.08s linear' : 'none',
                    }}
                  />
                  {/* Playhead triangle tip */}
                  <div
                    className="absolute top-0 w-3 h-3 pointer-events-none z-30"
                    style={{
                      left: `${timelinePlayhead}%`,
                      transform: 'translateX(-50%)',
                      background: '#f97316',
                      clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                      transition: isPlaying ? 'left 0.08s linear' : 'none',
                    }}
                  />

                  {/* Time ruler — flex children fill equal width */}
                  <div className="flex items-end border-b border-zinc-700/60 mb-0.5" style={{ height: '22px' }}>
                    {Array.from({ length: 11 }).map((_, i) => {
                      const sec = videoDuration > 0 ? (videoDuration / 10) * i : i;
                      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
                      const ss = String(Math.floor(sec % 60)).padStart(2, '0');
                      return (
                        <div key={i} className="flex-1 flex flex-col justify-end min-w-0">
                          <div className="w-px h-2 bg-zinc-600 mb-[2px]" />
                          <span className="text-[9px] text-zinc-500 font-mono leading-none truncate">{mm}:{ss}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Thumbnail strip + trim handles */}
                  <div
                    className="relative flex items-stretch rounded-lg overflow-hidden border border-zinc-700 mb-1.5"
                    style={{ height: '54px' }}
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 overflow-hidden bg-zinc-800"
                        style={{ borderRight: i < 7 ? '1px solid rgba(0,0,0,0.4)' : 'none' }}
                      >
                        {frameThumbnails[i] ? (
                          <img src={frameThumbnails[i]} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" opacity="0.2">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Dim outside trim */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: `linear-gradient(to right,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.7) ${trimStart}%,transparent ${trimStart}%,transparent ${trimEnd}%,rgba(0,0,0,0.7) ${trimEnd}%,rgba(0,0,0,0.7) 100%)`
                    }} />
                    {/* Trim border */}
                    <div className="absolute top-0 bottom-0 pointer-events-none border-y-2 border-orange-500"
                      style={{ left: `${trimStart}%`, right: `${100 - trimEnd}%` }} />
                    {/* LEFT trim handle */}
                    <div
                      className="absolute top-0 bottom-0 w-5 flex items-center justify-center bg-orange-500 rounded-l-lg cursor-col-resize z-20 touch-none"
                      style={{ left: `calc(${trimStart}% - 10px)` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const strip = e.currentTarget.parentElement!;
                        const rect = strip.getBoundingClientRect();
                        const onMove = (me: MouseEvent) => { setTrimStart(Math.max(0, Math.min(trimEnd - 5, ((me.clientX - rect.left) / rect.width) * 100))); };
                        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const strip = e.currentTarget.parentElement!;
                        const rect = strip.getBoundingClientRect();
                        const onMove = (te: TouchEvent) => { setTrimStart(Math.max(0, Math.min(trimEnd - 5, ((te.touches[0].clientX - rect.left) / rect.width) * 100))); };
                        const onUp = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp); };
                        window.addEventListener('touchmove', onMove, { passive: true }); window.addEventListener('touchend', onUp);
                      }}
                    >
                      <svg width="8" height="18" viewBox="0 0 8 18" fill="none">
                        <line x1="2" y1="3" x2="2" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="5" y1="3" x2="5" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    {/* RIGHT trim handle */}
                    <div
                      className="absolute top-0 bottom-0 w-5 flex items-center justify-center bg-orange-500 rounded-r-lg cursor-col-resize z-20 touch-none"
                      style={{ left: `calc(${trimEnd}% - 10px)` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const strip = e.currentTarget.parentElement!;
                        const rect = strip.getBoundingClientRect();
                        const onMove = (me: MouseEvent) => { setTrimEnd(Math.max(trimStart + 5, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100))); };
                        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const strip = e.currentTarget.parentElement!;
                        const rect = strip.getBoundingClientRect();
                        const onMove = (te: TouchEvent) => { setTrimEnd(Math.max(trimStart + 5, Math.min(100, ((te.touches[0].clientX - rect.left) / rect.width) * 100))); };
                        const onUp = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp); };
                        window.addEventListener('touchmove', onMove, { passive: true }); window.addEventListener('touchend', onUp);
                      }}
                    >
                      <svg width="8" height="18" viewBox="0 0 8 18" fill="none">
                        <line x1="2" y1="3" x2="2" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="5" y1="3" x2="5" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Audio track */}
                  {hasAudioTrack && audioUrl && (
                    <div className="relative rounded-lg overflow-hidden bg-gradient-to-r from-orange-600 to-amber-500 mb-1.5" style={{ height: '34px' }}>
                      <div className="flex items-center gap-2 px-3 w-full h-full">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="white" className="shrink-0">
                          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                        </svg>
                        <div className="flex items-end gap-[2px] flex-1 overflow-hidden h-full py-1">
                          {Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} className="bg-white/70 rounded-full shrink-0"
                              style={{ width: '2px', height: `${5 + Math.abs(Math.sin(i * 0.65) * 13)}px` }} />
                          ))}
                        </div>
                        <button
                          onClick={() => { setHasAudioTrack(false); setAudioFile(null); setAudioUrl(null); audioElRef.current?.pause(); }}
                          className="shrink-0 w-5 h-5 rounded-full bg-black/30 flex items-center justify-center"
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scrubber — fills exact same width as ruler/strip */}
                  <div
                    className="w-full h-5 flex items-center cursor-pointer group"
                    onMouseDown={onScrubStart}
                    onMouseUp={onScrubEnd}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      handleScrub(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                    }}
                    onTouchStart={(e) => {
                      onScrubStart();
                      const rect = e.currentTarget.getBoundingClientRect();
                      handleScrub(Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100)));
                    }}
                    onTouchMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      handleScrub(Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100)));
                    }}
                    onTouchEnd={onScrubEnd}
                  >
                    <div className="w-full h-1.5 bg-zinc-700 rounded-full relative overflow-visible">
                      <div className="absolute left-0 top-0 h-full rounded-full"
                        style={{
                          width: `${timelinePlayhead}%`,
                          background: 'linear-gradient(to right, #f97316, #fb923c)',
                          transition: isPlaying ? 'width 0.08s linear' : 'none',
                        }}
                      />
                      <div className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-orange-400 border-2 border-white shadow-md group-hover:scale-125 transition-transform"
                        style={{
                          left: `${timelinePlayhead}%`,
                          transform: 'translate(-50%, -50%)',
                          transition: isPlaying ? 'left 0.08s linear' : 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Add media — outside track column, won't affect widths */}
                <button
                  onClick={() => addMoreMediaRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-400 flex items-center justify-center shadow-xl active:scale-90 transition-all shrink-0 mt-6"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Simple playback bar — only when timeline is CLOSED */}
        {!isTextEditing && !showTimeline && (
          <div className="flex items-center gap-3 px-4 py-2 z-20">
            <button
              onClick={togglePlay}
              className="w-9 h-9 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
            >
              {isPlaying ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>
            <div
              className="flex-1 h-5 flex items-center cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                handleScrub(pct);
              }}
              onTouchStart={(e) => {
                onScrubStart();
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
                handleScrub(pct);
              }}
              onTouchMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
                handleScrub(pct);
              }}
              onTouchEnd={onScrubEnd}
            >
              <div className="w-full h-1.5 bg-zinc-700 rounded-full relative overflow-visible">
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${timelinePlayhead}%`,
                    background: 'linear-gradient(to right, #f97316, #fb923c)',
                    transition: isPlaying ? 'width 0.08s linear' : 'none',
                  }}
                />
                <div
                  className="absolute top-1/2 w-3 h-3 rounded-full bg-orange-400 border-2 border-white shadow-md group-hover:scale-125 transition-transform"
                  style={{
                    left: `${timelinePlayhead}%`,
                    transform: 'translate(-50%, -50%)',
                    transition: isPlaying ? 'left 0.08s linear' : 'none',
                  }}
                />
              </div>
            </div>
            <button className="w-9 h-9 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            </button>
          </div>
        )}

        {/* Bottom Toolbar (hidden during text editing) */}
        {!isTextEditing && (
          <div className="bg-zinc-900 border-t border-zinc-800 pb-safe-bottom z-20">
            <div className="flex items-stretch">
              {/* Timeline */}
              <button
                onClick={() => setShowTimeline(v => !v)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors active:bg-zinc-800 relative ${showTimeline ? 'text-white bg-zinc-800' : 'text-zinc-400'}`}
              >
                {showTimeline && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-white" />}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="7" width="4" height="10" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="17" y="9" width="4" height="8" rx="1"/>
                </svg>
                <span className="text-[10px] font-medium">Timeline</span>
              </button>

              {/* Media — sticker upload */}
              <button
                onClick={() => document.getElementById('sticker-upload')?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-zinc-400 active:bg-zinc-800 transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
                <span className="text-[10px] font-medium">Media</span>
              </button>

              {/* Text — Aa */}
              <button
                onClick={openInlineTextEditor}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-white bg-zinc-800 active:bg-zinc-700 transition-colors relative"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-white" />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
                </svg>
                <span className="text-[10px] font-semibold">Text</span>
              </button>

              {/* Audio */}
              <button
                onClick={() => audioPickerRef.current?.click()}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors active:bg-zinc-800 ${hasAudioTrack ? 'text-cyan-400' : 'text-zinc-400'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                <span className="text-[10px] font-medium">Audio</span>
              </button>

              {/* Brand */}
              <button
                onClick={() => setShowProductDialog(true)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-zinc-400 active:bg-zinc-800 transition-colors"
              >
                <ShoppingBag className="w-[22px] h-[22px]" />
                <span className="text-[10px] font-medium">Brand</span>
              </button>

              {/* More — ⋯ */}
              <button
                onClick={() => { setShowMorePanel(v => !v); setMorePanelTab('effects'); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors active:bg-zinc-800 ${showMorePanel ? 'text-white' : 'text-zinc-400'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                </svg>
                <span className="text-[10px] font-medium">More</span>
              </button>
            </div>
          </div>
        )}

        {/* ── MORE PANEL ── */}
        {!isTextEditing && showMorePanel && (() => {
          const EFFECTS = [
            { id: 'tv',        label: 'TV',        emoji: '📺' },
            { id: 'vhs',       label: 'VHS',       emoji: '📼' },
            { id: 'glitch1',   label: 'Glitch I',  emoji: '⚡' },
            { id: 'glitch2',   label: 'Glitch II', emoji: '⚡' },
            { id: 'glitch3',   label: 'Glitch III',emoji: '⚡' },
            { id: 'glitch4',   label: 'Glitch IV', emoji: '⚡' },
            { id: 'glitch5',   label: 'Glitch V',  emoji: '⚡' },
            { id: 'scratches', label: 'Scratches', emoji: '🎞️' },
            { id: 'crosses',   label: 'Crosses',   emoji: '✨' },
            { id: 'glitter',   label: 'Glitter',   emoji: '💎' },
            { id: 'bokeh',     label: 'Bokeh',     emoji: '🔵' },
            { id: 'snow',      label: 'Snow',      emoji: '❄️' },
            { id: 'ice',       label: 'Ice',       emoji: '🧊' },
            { id: 'frost',     label: 'Frost',     emoji: '🌨️' },
            { id: 'smoke',     label: 'Smoke',     emoji: '💨' },
            { id: 'paper',     label: 'Paper',     emoji: '📄' },
            { id: 'concrete',  label: 'Concrete',  emoji: '🪨' },
            { id: 'bubble',    label: 'Bubble',    emoji: '🫧' },
            { id: 'oldmovie',  label: 'Old Movie', emoji: '🎬' },
            { id: 'grain',     label: 'Grain',     emoji: '🌾' },
          ];

          const BG_COLORS = [
            { hex: '#000000', label: 'Black' },
            { hex: '#1a1a2e', label: 'Deep Navy' },
            { hex: '#16213e', label: 'Midnight' },
            { hex: '#0f3460', label: 'Ocean' },
            { hex: '#533483', label: 'Violet' },
            { hex: '#e94560', label: 'Crimson' },
            { hex: '#f5a623', label: 'Amber' },
            { hex: '#ffffff', label: 'White' },
            { hex: '#2d5016', label: 'Forest' },
            { hex: '#7b2d8b', label: 'Purple' },
          ];
          const BG_GRADIENTS = [
            { value: 'linear-gradient(135deg,#f97316,#ec4899)', label: 'Sunset' },
            { value: 'linear-gradient(135deg,#6366f1,#8b5cf6)', label: 'Galaxy' },
            { value: 'linear-gradient(135deg,#10b981,#3b82f6)', label: 'Tropical' },
            { value: 'linear-gradient(135deg,#1e1e1e,#3d3d3d)', label: 'Charcoal' },
            { value: 'linear-gradient(135deg,#ffd700,#ff8c00)', label: 'Gold' },
          ];

          const COLOR_OVERLAYS = [
            { hex: null,      label: 'None',    bg: 'transparent', border: true },
            { hex: '#ff0050', label: 'Red',     bg: '#ff0050' },
            { hex: '#fe2c55', label: 'Pink',    bg: '#fe2c55' },
            { hex: '#ffd700', label: 'Gold',    bg: '#ffd700' },
            { hex: '#00ff88', label: 'Neon',    bg: '#00ff88' },
            { hex: '#00cfff', label: 'Cyan',    bg: '#00cfff' },
            { hex: '#a855f7', label: 'Purple',  bg: '#a855f7' },
            { hex: '#ff6b35', label: 'Orange',  bg: '#ff6b35' },
            { hex: '#e040fb', label: 'Magenta', bg: '#e040fb' },
            { hex: '#39ff14', label: 'Lime',    bg: '#39ff14' },
            { hex: '#ff1493', label: 'HotPink', bg: '#ff1493' },
            { hex: '#00bcd4', label: 'Teal',    bg: '#00bcd4' },
            { hex: '#8b5cf6', label: 'Indigo',  bg: '#8b5cf6' },
            { hex: '#c8ff00', label: 'Yellow',  bg: '#c8ff00' },
            { hex: '#ffffff', label: 'White',   bg: '#ffffff' },
          ];

          const FORMATS = [
            { id: 'free', label: 'Free',  icon: '⬜' },
            { id: '9:16', label: '9:16',  icon: '📱' },
            { id: '1:1',  label: '1:1',   icon: '⬛' },
            { id: '4:3',  label: '4:3',   icon: '🖥' },
            { id: '16:9', label: '16:9',  icon: '🎬' },
          ];

          const GRAPHIC_EMOJIS = [
            '⭐','❤️','🔥','💫','🌈','🎵','🎉','💎','🌸','⚡',
            '🦋','🌊','🌙','☀️','🍀','🦄','👑','💖','🎯','🏆',
            '🎨','🌺','🦊','💥','🌟','🎪','🍭','🎭','🦁','🐉',
          ];

          return (
            <div className="z-30 bg-zinc-950 border-t border-zinc-800">
              {/* Tab bar */}
              <div className="flex border-b border-zinc-800 overflow-x-auto scrollbar-hide">
                {(['effects','format','background','graphics','colors'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setMorePanelTab(tab)}
                    className={cn(
                      'flex-1 min-w-max px-3 py-2.5 text-xs font-semibold capitalize whitespace-nowrap transition-colors',
                      morePanelTab === tab ? 'text-white border-b-2 border-orange-500' : 'text-zinc-500'
                    )}
                  >
                    {tab === 'effects'    ? '✨ Effects'
                     : tab === 'format'  ? '📐 Format'
                     : tab === 'background' ? '🎨 BG'
                     : tab === 'graphics' ? '🖼️ Graphics'
                     : '🌈 Color'}
                  </button>
                ))}
              </div>

              {/* ── EFFECTS tab ── */}
              {morePanelTab === 'effects' && (
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex gap-2 px-3 py-3">
                    {/* None */}
                    <button
                      onClick={() => setActiveEffect(null)}
                      className={cn(
                        'shrink-0 flex flex-col items-center justify-center gap-1 w-[72px] h-[72px] rounded-xl border-2 transition-all active:scale-90',
                        activeEffect === null ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-700 bg-zinc-900'
                      )}
                    >
                      <span className="text-xl">🚫</span>
                      <span className="text-[10px] text-zinc-400 font-medium">None</span>
                    </button>
                    {EFFECTS.map(fx => (
                      <button
                        key={fx.id}
                        onClick={() => setActiveEffect(activeEffect === fx.id ? null : fx.id)}
                        className={cn(
                          'shrink-0 flex flex-col items-center justify-center gap-1 w-[72px] h-[72px] rounded-xl border-2 transition-all active:scale-90 relative overflow-hidden',
                          activeEffect === fx.id ? 'border-orange-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900'
                        )}
                      >
                        {previewUrls[0] && (
                          <div className={`absolute inset-0 effect-${fx.id}`}>
                            {mediaFiles[0]?.type.startsWith('video') ? (
                              <video src={previewUrls[0]} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                            ) : (
                              <img src={previewUrls[0]} className="w-full h-full object-cover" alt="" />
                            )}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-end pb-1.5">
                          <span className="text-white text-[10px] font-bold drop-shadow">{fx.label}</span>
                        </div>
                        {activeEffect === fx.id && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="white"><polyline points="1 5 4 8 9 2" strokeWidth="1.5" stroke="white" fill="none" strokeLinecap="round"/></svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── FORMAT tab ── fully wired */}
              {morePanelTab === 'format' && (
                <div className="px-3 py-3">
                  <p className="text-[10px] text-zinc-500 mb-2 px-1">Select aspect ratio for your reel</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {FORMATS.map(f => {
                      const active = activeFormat === f.id;
                      const previewStyle: React.CSSProperties =
                        f.id === '9:16' ? { width: 28, height: 50 } :
                        f.id === '1:1'  ? { width: 40, height: 40 } :
                        f.id === '4:3'  ? { width: 50, height: 38 } :
                        f.id === '16:9' ? { width: 56, height: 32 } :
                                          { width: 40, height: 44 };
                      return (
                        <button
                          key={f.id}
                          onClick={() => setActiveFormat(f.id)}
                          className={cn(
                            'shrink-0 flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all active:scale-95 min-w-[72px]',
                            active ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-700 bg-zinc-900'
                          )}
                        >
                          <div
                            className={cn('rounded border-2', active ? 'border-orange-500 bg-orange-500/20' : 'border-zinc-500 bg-zinc-700')}
                            style={previewStyle}
                          />
                          <span className={cn('text-xs font-semibold', active ? 'text-orange-400' : 'text-zinc-300')}>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {activeFormat !== 'free' && (
                    <p className="text-[10px] text-orange-400/80 mt-2 px-1">
                      Preview locked to {activeFormat} — pinch/zoom to adjust content
                    </p>
                  )}
                </div>
              )}

              {/* ── BACKGROUND tab ── fully wired */}
              {morePanelTab === 'background' && (
                <div className="px-3 py-3">
                  <p className="text-[10px] text-zinc-500 mb-2 px-1">Solid colors</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {BG_COLORS.map(c => (
                      <button
                        key={c.hex}
                        onClick={() => setBgColor(c.hex)}
                        className={cn(
                          'w-11 h-11 rounded-xl border-2 shrink-0 active:scale-90 transition-all relative',
                          bgColor === c.hex ? 'border-orange-500 scale-110' : 'border-zinc-600'
                        )}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {bgColor === c.hex && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <polyline points="2 7 5.5 10.5 12 3.5" stroke={c.hex === '#ffffff' ? '#000' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2 mb-2 px-1">Gradients</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {BG_GRADIENTS.map(g => (
                      <button
                        key={g.label}
                        onClick={() => setBgColor(g.value)}
                        className={cn(
                          'w-11 h-11 rounded-xl border-2 shrink-0 active:scale-90 transition-all',
                          bgColor === g.value ? 'border-orange-500 scale-110' : 'border-zinc-600'
                        )}
                        style={{ background: g.value }}
                        title={g.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── GRAPHICS tab ── adds emoji stickers as draggable overlays */}
              {morePanelTab === 'graphics' && (
                <div className="px-3 py-3">
                  <p className="text-[10px] text-zinc-500 mb-2 px-1">Tap to add sticker to canvas</p>
                  <div className="grid grid-cols-10 gap-1.5">
                    {GRAPHIC_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          // Add as a text overlay so existing drag system handles it
                          setTextOverlays(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            text: emoji,
                            x: 30 + Math.random() * 40,
                            y: 30 + Math.random() * 40,
                            size: 48,
                            color: 'transparent',
                            font: 0,
                            align: 'center' as const,
                            bgStyle: 'none' as const,
                            animation: 0,
                          }]);
                          toast.success(`${emoji} added! Drag to reposition`);
                        }}
                        className="w-10 h-10 text-2xl flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {textOverlays.filter(o => /\p{Emoji}/u.test(o.text)).length > 0 && (
                    <button
                      onClick={() => setTextOverlays(prev => prev.filter(o => !/\p{Emoji}/u.test(o.text)))}
                      className="mt-3 w-full py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs active:bg-zinc-700 transition-all"
                    >
                      🗑️ Clear all stickers
                    </button>
                  )}
                </div>
              )}

              {/* ── COLORS tab ── color tint overlay, fully wired */}
              {morePanelTab === 'colors' && (
                <div className="px-3 py-3">
                  <p className="text-[10px] text-zinc-500 mb-2 px-1">Color tint overlay on your media</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OVERLAYS.map(c => (
                      <button
                        key={c.label}
                        onClick={() => setColorOverlay(c.hex)}
                        className={cn(
                          'w-11 h-11 rounded-full border-2 shrink-0 active:scale-90 transition-all relative flex items-center justify-center',
                          colorOverlay === c.hex ? 'border-orange-500 scale-115' : 'border-zinc-600'
                        )}
                        style={c.hex ? { backgroundColor: c.hex } : { background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }}
                        title={c.label}
                      >
                        {colorOverlay === c.hex && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <polyline points="2 7 5.5 10.5 12 3.5" stroke={c.hex && c.hex !== '#ffffff' && c.hex !== '#ffd700' && c.hex !== '#c8ff00' && c.hex !== '#39ff14' ? '#fff' : '#000'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  {colorOverlay && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border border-zinc-600" style={{ backgroundColor: colorOverlay }} />
                      <span className="text-xs text-zinc-400 flex-1">Tint active: {COLOR_OVERLAYS.find(c => c.hex === colorOverlay)?.label}</span>
                      <button onClick={() => setColorOverlay(null)} className="text-xs text-orange-400 active:opacity-70">Remove</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        <input id="sticker-upload" type="file" accept="image/*" className="hidden" onChange={addSticker} />
        {/* Add more media clips */}
        <input
          ref={addMoreMediaRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const newFiles = Array.from(e.target.files || []);
            if (newFiles.length === 0) return;
            const newUrls = newFiles.map(f => URL.createObjectURL(f));
            setMediaFiles(prev => [...prev, ...newFiles]);
            setPreviewUrls(prev => [...prev, ...newUrls]);
            toast.success(`${newFiles.length} clip${newFiles.length > 1 ? 's' : ''} added to timeline ✂️`);
          }}
        />
        {/* Audio file picker — phone music */}
        <input
          ref={audioPickerRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            setAudioFile(file);
            setAudioUrl(url);
            setHasAudioTrack(true);
            setShowTimeline(true);
            toast.success(`🎵 "${file.name}" added to timeline`);
          }}
        />

        {/* Product Dialog — upgraded with auto-fill & size selector */}
        <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
          <DialogContent className="bg-black/95 border-white/20 text-white max-w-[calc(100%-2rem)] md:max-w-lg p-0 overflow-hidden rounded-3xl">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FE2C55] to-[#ff7043] flex items-center justify-center shadow-lg">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight">Tag Brand / Product</h2>
                  <p className="text-[11px] text-zinc-400">Flipkart, Amazon, Meesho, Myntra, Ajio</p>
                </div>
              </div>

              {/* Supported platforms */}
              <div className="flex gap-2 flex-wrap">
                {['🛒 Flipkart', '📦 Amazon', '👗 Meesho', '👟 Myntra', '🧴 Ajio'].map(p => (
                  <span key={p} className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-zinc-300 font-medium">{p}</span>
                ))}
              </div>

              <div className="space-y-3">
                {/* URL + Auto-fill row */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Product URL paste karo..."
                    value={productLink}
                    onChange={(e) => setProductLink(e.target.value)}
                    className="bg-white/10 border-white/20 h-11 rounded-xl flex-1 text-sm"
                  />
                  <button
                    onClick={handleAutoFill}
                    disabled={isFetchingProduct}
                    className="h-11 px-3 rounded-xl bg-gradient-to-r from-[#FE2C55] to-[#ff7043] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-60 active:scale-95 transition-all"
                  >
                    {isFetchingProduct
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <ExternalLink className="w-4 h-4" />}
                    {isFetchingProduct ? 'Fetching...' : 'Auto Fill'}
                  </button>
                </div>

                <Input
                  placeholder="Product Name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="bg-white/10 border-white/20 h-11 rounded-xl text-sm"
                />
                <Input
                  placeholder="Product Image URL"
                  value={productImage}
                  onChange={(e) => setProductImage(e.target.value)}
                  className="bg-white/10 border-white/20 h-11 rounded-xl text-sm"
                />
                <Input
                  placeholder="Price (e.g. ₹999)"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  className="bg-white/10 border-white/20 h-11 rounded-xl text-sm"
                />

                {/* Brand card size selector */}
                <div>
                  <p className="text-xs text-zinc-400 font-medium mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Card Size
                  </p>
                  <div className="flex gap-2">
                    {(['sm', 'md', 'lg'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setProductSize(s)}
                        className={cn(
                          'flex-1 h-9 rounded-xl text-sm font-bold border transition-all active:scale-95',
                          productSize === s
                            ? 'bg-gradient-to-r from-[#FE2C55] to-[#ff7043] border-transparent text-white'
                            : 'bg-white/10 border-white/20 text-zinc-400'
                        )}
                      >
                        {s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 h-11 rounded-xl text-white hover:bg-white/10" onClick={() => setShowProductDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!productName) { toast.error('Product name zaroori hai'); return; }
                    setHasProduct(true);
                    setShowProductDialog(false);
                    toast.success('Brand tag add ho gaya! 🛒');
                  }}
                  className="flex-1 h-11 bg-gradient-to-r from-[#FE2C55] to-[#ff7043] rounded-xl font-bold border-none"
                >
                  Add Brand
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Post Screen
  if (showPostScreen) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold">
            {mediaFiles.some(f => f.type.startsWith('video')) ? 'New Reel' : 'New Post'}
          </h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Full-Screen Preview */}
          <div className="relative w-full aspect-square bg-black overflow-hidden">
            {mediaFiles[selectedMediaIndex]?.type.startsWith('video') ? (
              <video
                key={previewUrls[selectedMediaIndex]}
                src={previewUrls[selectedMediaIndex] || ''}
                className="w-full h-full object-contain bg-black"
                autoPlay
                loop
                playsInline
              />
            ) : (
              <img
                key={previewUrls[selectedMediaIndex]}
                src={previewUrls[selectedMediaIndex] || ''}
                alt="Preview"
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Media selector strip */}
            {mediaFiles.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 px-3 z-30 overflow-x-auto py-1.5 bg-black/30 backdrop-blur-sm scrollbar-hide">
                {mediaFiles.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedMediaIndex(idx)}
                    className={`w-10 h-10 rounded-md border shrink-0 overflow-hidden transition-all ${selectedMediaIndex === idx ? 'border-primary scale-105' : 'border-white/20 opacity-60'}`}
                  >
                    {mediaFiles[idx].type.startsWith('video') ? (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <Play className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <img src={previewUrls[idx]} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {/* Product Card Overlay */}
            {hasProduct && (
              <ProductCard
                productName={productName}
                productImage={productImage}
                productPrice={productPrice}
                productLink={productLink}
                position={productPosition}
                onPositionChange={setProductPosition}
                onRemove={handleRemoveProduct}
                isEditable={true}
              />
            )}

            {/* Overlays (Text and Stickers) */}
            {textOverlays.map(overlay => (
              <div
                key={overlay.id}
                className={cn(
                  'absolute select-none p-2 rounded',
                  FONTS[overlay.font ?? 0]?.style ?? '',
                  TEXT_ANIMATIONS[overlay.animation ?? 0]?.cls ?? ''
                )}
                style={{
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  fontSize: `${overlay.size}px`,
                  color: overlay.color,
                  textAlign: overlay.align ?? 'center',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 30,
                  lineHeight: 1.1,
                  textShadow: overlay.bgStyle === 'outline'
                    ? '0 0 8px rgba(0,0,0,0.9), 1px 1px 0 #000, -1px -1px 0 #000'
                    : 'none',
                  backgroundColor: overlay.bgStyle === 'box' ? 'rgba(0,0,0,0.55)' : 'transparent',
                  borderRadius: overlay.bgStyle === 'box' ? '6px' : '0',
                }}
              >
                {overlay.text}
              </div>
            ))}
            {stickers.map(sticker => (
              <div
                key={sticker.id}
                className="absolute"
                style={{
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  width: `${sticker.size}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 25
                }}
              >
                <img src={sticker.url} alt="Sticker" className="w-full h-full object-contain pointer-events-none" />
              </div>
            ))}
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
