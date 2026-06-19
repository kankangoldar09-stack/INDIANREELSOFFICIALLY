-- Allow admins to delete any post
CREATE POLICY "Admins can delete any post" ON "public"."posts"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to delete any reel
CREATE POLICY "Admins can delete any reel" ON "public"."reels"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to delete any profile
CREATE POLICY "Admins can delete any profile" ON "public"."profiles"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Also allow owners to delete their own content (if they couldn't before)
CREATE POLICY "Owners can delete own posts" ON "public"."posts"
FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own reels" ON "public"."reels"
FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own profile" ON "public"."profiles"
FOR DELETE USING (auth.uid() = id);
