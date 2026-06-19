-- Create payment_settings table
CREATE TABLE IF NOT EXISTS payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL DEFAULT '8474947203@ptys',
  updated_at timestamptz DEFAULT now()
);

-- Insert default payment ID
INSERT INTO payment_settings (payment_id) VALUES ('8474947203@ptys');

-- Create payment_gifts table
CREATE TABLE IF NOT EXISTS payment_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id uuid,
  amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  tax_amount decimal(10,2) NOT NULL,
  net_amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_gifts_to_user ON payment_gifts(to_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_gifts_from_user ON payment_gifts(from_user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_settings
CREATE POLICY "Anyone can view payment settings"
  ON payment_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update payment settings"
  ON payment_settings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE id = '20bdb204-fe88-42c0-9787-728275517d07'::uuid 
      OR id = '9c962c72-af1e-47f6-a8bf-b664492fe533'::uuid
    )
  );

-- RLS Policies for payment_gifts
CREATE POLICY "Users can view their own payment gifts"
  ON payment_gifts FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

CREATE POLICY "Users can create payment gifts"
  ON payment_gifts FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- RLS Policies for withdrawals
CREATE POLICY "Users can view their own withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create withdrawal requests"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE id = '20bdb204-fe88-42c0-9787-728275517d07'::uuid 
      OR id = '9c962c72-af1e-47f6-a8bf-b664492fe533'::uuid
    )
  );

CREATE POLICY "Admins can update withdrawals"
  ON withdrawals FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE id = '20bdb204-fe88-42c0-9787-728275517d07'::uuid 
      OR id = '9c962c72-af1e-47f6-a8bf-b664492fe533'::uuid
    )
  );

-- Create function to get user's payment gift balance
CREATE OR REPLACE FUNCTION get_payment_gift_balance(user_uuid uuid)
RETURNS decimal AS $$
DECLARE
  total_received decimal;
  total_withdrawn decimal;
  balance decimal;
BEGIN
  -- Get total received
  SELECT COALESCE(SUM(amount), 0) INTO total_received
  FROM payment_gifts
  WHERE to_user_id = user_uuid;
  
  -- Get total withdrawn (successful withdrawals only)
  SELECT COALESCE(SUM(amount), 0) INTO total_withdrawn
  FROM withdrawals
  WHERE user_id = user_uuid AND status = 'successful';
  
  balance := total_received - total_withdrawn;
  RETURN balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;