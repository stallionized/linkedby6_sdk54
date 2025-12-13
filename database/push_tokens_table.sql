-- Push Tokens Table for storing Expo push notification tokens
-- Run this migration to enable push notifications

-- Create push_tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one token per user (can be extended to support multiple devices)
  CONSTRAINT unique_user_token UNIQUE (user_id)
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own push tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own push tokens
CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own push tokens
CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own push tokens
CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can access all tokens (for sending notifications)
CREATE POLICY "Service role can access all tokens"
  ON push_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS push_tokens_updated_at ON push_tokens;
CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- Function to get push token for a user (used by edge functions)
CREATE OR REPLACE FUNCTION get_user_push_token(target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_token TEXT;
BEGIN
  SELECT token INTO user_token
  FROM push_tokens
  WHERE user_id = target_user_id
    AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  RETURN user_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get push tokens for business owner (for incoming business calls)
CREATE OR REPLACE FUNCTION get_business_owner_push_token(target_business_id UUID)
RETURNS TEXT AS $$
DECLARE
  owner_token TEXT;
BEGIN
  SELECT pt.token INTO owner_token
  FROM push_tokens pt
  INNER JOIN business_profiles bp ON bp.user_id = pt.user_id
  WHERE bp.business_id = target_business_id
    AND pt.is_active = true
  ORDER BY pt.updated_at DESC
  LIMIT 1;

  RETURN owner_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_push_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_owner_push_token(UUID) TO authenticated;
