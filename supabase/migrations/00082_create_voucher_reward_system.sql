-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  logo_url text,
  expiration_date timestamptz,
  max_claims integer DEFAULT 0,
  current_claims integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_vouchers table
CREATE TABLE IF NOT EXISTS user_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  claimed_at timestamptz DEFAULT now(),
  status text DEFAULT 'claimed',
  UNIQUE(user_id, voucher_id)
);

-- Enable RLS
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vouchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vouchers
CREATE POLICY "Anyone can view active vouchers"
  ON vouchers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage vouchers"
  ON vouchers FOR ALL
  TO authenticated
  USING (auth.uid() = '20bdb204-fe88-42c0-9787-728275517d07'::uuid OR auth.uid() = '9c962c72-af1e-47f6-a8bf-b664492fe533'::uuid);

-- RLS Policies for user_vouchers
CREATE POLICY "Users can view their own claimed vouchers"
  ON user_vouchers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can claim vouchers"
  ON user_vouchers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert sample Stream account vouchers
INSERT INTO vouchers (title, description, max_claims, is_active)
VALUES 
  ('Stream Premium Account', 'Get access to Stream Premium with unlimited streaming. Account credentials will be provided after claiming.', 100, true),
  ('Stream VIP Access', 'Exclusive VIP access to Stream platform with premium features and ad-free experience.', 50, true);