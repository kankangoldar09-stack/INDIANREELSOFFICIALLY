CREATE TABLE IF NOT EXISTS telegram_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only admins can manage config
ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage telegram_config" ON telegram_config
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.username = 'jeetyt09')
  )
);

-- Initial keys if needed (optional)
INSERT INTO telegram_config (key, value)
VALUES 
('bot_token', ''),
('chat_id', ''),
('api_id', ''),
('api_hash', ''),
('session_string', '')
ON CONFLICT (key) DO NOTHING;
