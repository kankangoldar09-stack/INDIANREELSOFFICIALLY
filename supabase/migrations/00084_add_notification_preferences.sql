
ALTER TABLE profiles
  ADD COLUMN likes_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN comments_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN follow_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN messages_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN reels_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN push_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN email_notifications boolean NOT NULL DEFAULT false;
