# Task: Enhance INDIANREELS with advanced Instagram-style features

## Plan
- [x] Database Schema Update
  - [x] Add `hide_views_pref` to `profiles`
  - [x] Add `hide_likes` and `hide_comments` to `posts` and `reels`
- [x] Update Types and DB API
  - [x] Update `Profile`, `Post`, `Reel` interfaces in `types/types.ts`
- [x] Implement Voice Guidance Hook
  - [x] Create `useVoiceGuidance` hook using SpeechSynthesis API
- [x] Multi-step Instagram-style Signup
  - [x] Step 1: Username & Password
  - [x] Step 2: Full Name & Info
  - [x] Step 3: Date of Birth & City
  - [x] Add "Next" / "Skip" logic and voice guidance
- [x] Enhanced Create Page with Real Camera
  - [x] Implement Camera capture using `getUserMedia`
  - [x] Add "Hide Likes" and "Hide Comments" toggles in the share step
  - [x] Update upload logic to save these settings
- [x] Views Visibility & Global Settings
  - [x] Add "Hide View Counts" toggle in Settings page
  - [x] Update Home Feed and Reels to show views
  - [x] Respect user and post-level visibility settings
- [x] Final UI Polish & Voice Integration
  - [x] Add voice cues to Home and Reels pages
  - [x] Ensure high-quality aesthetic look across all new features

## Notes
- Voice guidance will use Browser SpeechSynthesis for dynamic labels.
- Camera will use `video` element + `canvas` for capture to avoid heavy dependencies if possible, or `react-webcam` if needed.
