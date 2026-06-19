-- Add screenshot protection and other useful settings to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS screenshot_protection boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_download_media boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sounds boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_online_status boolean DEFAULT true;