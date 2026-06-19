
-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new update policy with proper WITH CHECK clause
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also ensure INSERT policy exists for new signups
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);
