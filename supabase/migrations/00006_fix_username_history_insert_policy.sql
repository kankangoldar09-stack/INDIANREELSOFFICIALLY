
-- Add INSERT policy for username_history
CREATE POLICY "Users can insert own username history" ON username_history
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
