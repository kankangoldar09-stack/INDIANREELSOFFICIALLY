export type UserRole = 'user' | 'admin';
export type FollowStatus = 'pending' | 'accepted';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface ProductTag {
  id: string;
  post_id?: string;
  reel_id?: string;
  product_name: string;
  product_image_url?: string;
  product_link: string;
  product_price?: string;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface Profile {
  id: string;
  main_token_id?: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  city: string | null;
  dob: string | null;
  role: UserRole;
  is_verified: boolean;
  is_private: boolean;
  font_size: string;
  default_video_quality: string;
  data_saver_mode: boolean;
  autoplay_limit: number;
  profile_color: string | null;
  hide_views_pref: boolean;
  qr_style: string;
  qr_color: string;
  qr_bg_color: string;
  chat_background_url: string | null;
  chat_background_style: string | null;
  read_receipts_enabled: boolean;
  privacy_shutter_enabled: boolean;
  user_face_registered: boolean;
  theme_color: string;
  proximity_enabled: boolean;
  ai_auto_pilot: boolean;
  screenshot_protection: boolean;
  auto_download_media: boolean;
  notification_sounds: boolean;
  show_online_status: boolean;
  likes_notifications: boolean;
  comments_notifications: boolean;
  follow_notifications: boolean;
  messages_notifications: boolean;
  reels_notifications: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  activity_status: boolean;
  copyright_strikes: number;
  is_banned: boolean;
  ban_reason: string | null;
  profile_music_enabled?: boolean;
  profile_music_track_id?: string | null;
  profile_music_custom_url?: string | null;
  profile_music_title?: string | null;
  profile_music_artist?: string | null;
  profile_music_thumbnail_url?: string | null;
  profile_music_play_count?: number;
  created_at: string;
}

export interface Feedback {
  id: string;
  main_token_id?: string;
  user_id: string;
  subject: string;
  message: string;
  screenshot_url: string | null;
  status: 'pending' | 'resolved' | 'closed';
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Post {
  id: string;
  main_token_id?: string;
  owner_id: string;
  media_url: string;
  thumbnail_url?: string | null;
  caption: string | null;
  location: string | null;
  hide_likes: boolean;
  hide_comments: boolean;
  created_at: string;
  profiles?: Profile;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  is_hidden?: boolean;
  shares_count?: number;
  saves_count?: number;
  dubbed_audio_url?: string | null;
  source_language?: string | null;
  is_dubbing_active?: boolean;
  captions?: {
    en: { start: number; end: number; text: string }[];
    hi: { start: number; end: number; text: string }[];
    source_language: string;
  } | null;
  is_chunked?: boolean;
  chunk_urls?: string[];
  overlays?: {
    text: { id: number; text: string; x: number; y: number; color: string; size: number }[];
    stickers: { id: number; url: string; x: number; y: number; size: number }[];
  } | null;
  product_tags?: ProductTag[];
  media_gallery?: string[];
}

export interface Reel {
  id: string;
  main_token_id?: string;
  owner_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  quality_pref: string;
  hide_likes: boolean;
  hide_comments: boolean;
  created_at: string;
  profiles?: Profile;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  shares_count?: number;
  saves_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  is_hidden?: boolean;
  dubbed_audio_url?: string | null;
  source_language?: string | null;
  is_dubbing_active?: boolean;
  audio_source_id?: string | null;
  audio_title?: string | null;
  audio_url?: string | null;
  audio_start_time?: number;
  source?: {
    id: string;
    audio_title: string | null;
    profiles: {
      username: string;
      profile_photo_url: string | null;
    }
  } | null;
  captions?: {
    en: { start: number; end: number; text: string }[];
    hi: { start: number; end: number; text: string }[];
    source_language: string;
  } | null;
  is_chunked?: boolean;
  chunk_urls?: string[];
  overlays?: {
    text: { id: number; text: string; x: number; y: number; color: string; size: number }[];
    stickers: { id: number; url: string; x: number; y: number; size: number }[];
  } | null;
  product_tags?: ProductTag[];
  media_gallery?: string[];
}

export interface Story {
  id: string;
  main_token_id?: string;
  owner_id: string;
  media_url: string;
  expires_at: string;
  created_at: string;
  profiles?: Profile;
}

export interface Comment {
  id: string;
  main_token_id?: string;
  post_id: string | null;
  reel_id: string | null;
  user_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  parent_id: string | null;
  is_ai_reply?: boolean;
  profiles?: Profile;
  replies?: Comment[];
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: FollowStatus;
  created_at: string;
}

export interface Message {
  id: string;
  main_token_id?: string;
  sender_id: string;
  receiver_id: string | null;
  group_id: string | null;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  is_ai_reply?: boolean;
  gift_type?: string | null;
  gift_emoji?: string | null;
  gift_name?: string | null;
  coins_spent?: number | null;
  created_at: string;
  profiles?: Profile; // Sender profile usually
}

export interface Notification {
  id: string;
  main_token_id?: string;
  user_id: string;
  actor_id: string;
  type: string;
  target_id: string;
  post_id?: string;
  reel_id?: string;
  comment_id?: string;
  is_read: boolean;
  created_at: string;
  actor_profile?: Profile;
}

export interface SavedItem {
  id: string;
  user_id: string;
  post_id: string | null;
  reel_id: string | null;
  created_at: string;
}

export interface WatchHistory {
  id: string;
  user_id: string;
  post_id: string | null;
  reel_id: string | null;
  watched_at: string;
  posts?: Post;
  reels?: Reel;
}

export interface UsernameHistory {
  id: string;
  user_id: string;
  username: string;
  changed_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  status: VerificationStatus;
  created_at: string;
  profiles?: Profile;
}

export interface VaultSettings {
  user_id: string;
  pin_hash: string;
  created_at: string;
}

export interface VaultItem {
  id: string;
  user_id: string;
  type: 'image' | 'video';
  media_url: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface VaultNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  main_token_id?: string;
  name: string;
  description: string | null;
  created_by: string;
  avatar_url: string | null;
  created_at: string;
}

export interface MusicTrack {
  id: string;
  song_name: string;
  artist_name: string;
  telegram_file_id: string;
  image_url: string | null;
  created_at: string;
}

export interface MusicFavorite {
  id: string;
  user_id: string;
  track_id: string;
  title: string;
  artist: string;
  thumbnail: string;
  audio_url: string;
  preview_url: string | null;
  created_at: string;
}

export interface Voucher {
  id: string;
  title: string;
  description: string | null;
  logo_url: string | null;
  expiration_date: string | null;
  max_claims: number;
  current_claims: number;
  is_active: boolean;
  created_at: string;
}

export interface UserVoucher {
  id: string;
  user_id: string;
  voucher_id: string;
  claimed_at: string;
  status: string;
  vouchers?: Voucher;
}

