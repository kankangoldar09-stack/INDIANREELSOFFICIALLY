# Splash Screen Video Setup

## How to Add Your Video URL

1. Open the file: `src/App.tsx`

2. Find this line (around line 88):
   ```typescript
   const SPLASH_VIDEO_URL = 'https://your-video-url-here.mp4';
   ```

3. Replace with your actual video URL

## ⚠️ Important: Google Drive Video Issues

**Google Drive links may not work reliably for video playback** because:
- Google Drive requires authentication for some files
- CORS (Cross-Origin) restrictions may block video loading
- Download limits may prevent video from loading

### ✅ Recommended Solutions:

#### Option 1: Upload to Supabase Storage (BEST)
1. Go to your Supabase project dashboard
2. Navigate to Storage
3. Create a bucket named `splash-videos` (make it public)
4. Upload your video file
5. Copy the public URL
6. Use that URL in `src/App.tsx`

#### Option 2: Use a CDN or Video Hosting Service
- **Cloudinary**: https://cloudinary.com (Free tier available)
- **Vimeo**: https://vimeo.com (Can get direct video URLs)
- **AWS S3**: https://aws.amazon.com/s3/ (With public access)
- **Bunny CDN**: https://bunny.net (Fast and affordable)

#### Option 3: Convert Google Drive Link (Current Setup)
If you must use Google Drive:
1. Make sure the file is set to "Anyone with the link can view"
2. Extract the file ID from your link
3. Use format: `https://drive.google.com/uc?export=download&id=YOUR_FILE_ID`

**Current Google Drive URL in use:**
```
https://drive.google.com/uc?export=download&id=19nq0Eq_BNUt2OG3TmTeY8c6AuR7xYlwo
```

## Video Requirements:
- **Format**: MP4 (H.264 codec) - BEST compatibility
- **Duration**: Any duration (will show for 8 seconds regardless)
- **Size**: Keep under 5MB for fast loading
- **Resolution**: 1080p or lower (higher = slower loading)
- **Aspect Ratio**: 9:16 (vertical) or 16:9 (horizontal)
- **URL**: Must be a direct video file URL

## Features:
- ✅ Shows loading spinner while video loads
- ✅ Shows for exactly 8 seconds after video loads
- ✅ Auto-plays with no sound (muted)
- ✅ Shows only once per browser session
- ✅ Has a "Skip" button in bottom-right corner
- ✅ Smooth fade in/out animations
- ✅ Full-screen video background
- ✅ If video fails to load, shows error message for 2 seconds then skips
- ✅ Preloads video for instant playback

## Testing:
1. Add your video URL in `src/App.tsx`
2. Clear browser cache or open in incognito mode
3. Refresh the app
4. You should see:
   - Loading spinner first
   - Then video plays for 8 seconds
   - Then app loads normally

## Troubleshooting:

### Video not showing?
1. Check browser console for errors (F12 → Console tab)
2. Verify the video URL works by pasting it directly in browser
3. Make sure video file is publicly accessible (no login required)
4. Try a different video hosting service (see recommendations above)

### Video loads but doesn't play?
1. Check if video format is MP4 with H.264 codec
2. Try reducing video file size
3. Check browser autoplay policies (video must be muted to autoplay)

### Loading takes too long?
1. Reduce video file size (compress it)
2. Use a CDN for faster delivery
3. Lower video resolution (720p instead of 1080p)

## To Disable Splash Screen:
If you want to temporarily disable the splash screen, comment out these lines in `src/App.tsx`:
```typescript
{showSplash && !hasShownSplash && (
  <SplashScreen
    videoUrl={SPLASH_VIDEO_URL}
    duration={8000}
    onComplete={handleSplashComplete}
  />
)}
```

## Notes:
- The splash screen uses `sessionStorage`, so it shows once per browser tab session
- Closing and reopening the tab will show the splash again
- The video plays muted to comply with browser autoplay policies
- Video is set to `object-cover` so it fills the entire screen
- Loading spinner appears while video is loading
- If video fails, error message shows for 2 seconds then app loads normally

