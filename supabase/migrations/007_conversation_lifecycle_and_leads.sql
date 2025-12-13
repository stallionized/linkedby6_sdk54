-- Migration: Conversation Lifecycle and Lead Management System
-- Purpose: Add lead tracking, conversation status management, and analytics support
-- Date: 2024

-- ============================================================================
-- PART 1: Add lifecycle and lead fields to conversations table
-- ============================================================================

-- Consumer-side status (personal inbox management)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'active';

-- Business-side status (inbox management, separate from lead status)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS business_status TEXT DEFAULT 'active';

-- Lead tracking fields (business analytics)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_stage TEXT DEFAULT 'new';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_stage_updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_outcome_reason TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_notes TEXT;

-- Conversation closure (mutual visibility)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_by TEXT;

-- Organization (pinning)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_pinned_user BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_pinned_business BOOLEAN DEFAULT false;

-- ============================================================================
-- PART 2: Add check constraints
-- ============================================================================

-- User status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_status'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT chk_user_status
      CHECK (user_status IN ('active', 'archived', 'deleted'));
  END IF;
END $$;

-- Business status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_business_status'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT chk_business_status
      CHECK (business_status IN ('active', 'archived'));
  END IF;
END $$;

-- Lead stage constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_lead_stage'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT chk_lead_stage
      CHECK (lead_stage IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'no_response'));
  END IF;
END $$;

-- Closed by constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_closed_by'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT chk_closed_by
      CHECK (closed_by IS NULL OR closed_by IN ('user', 'business', 'system'));
  END IF;
END $$;

-- ============================================================================
-- PART 3: Add indexes for efficient filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_user_status
  ON conversations(user_id, user_status);

CREATE INDEX IF NOT EXISTS idx_conversations_business_status
  ON conversations(business_id, business_status);

CREATE INDEX IF NOT EXISTS idx_conversations_lead_stage
  ON conversations(business_id, lead_stage);

CREATE INDEX IF NOT EXISTS idx_conversations_is_pinned_user
  ON conversations(user_id, is_pinned_user) WHERE is_pinned_user = true;

CREATE INDEX IF NOT EXISTS idx_conversations_is_pinned_business
  ON conversations(business_id, is_pinned_business) WHERE is_pinned_business = true;

CREATE INDEX IF NOT EXISTS idx_conversations_lead_stage_updated
  ON conversations(lead_stage_updated_at);

-- ============================================================================
-- PART 4: Create lead history table for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  previous_stage TEXT,
  new_stage TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes to lead history
CREATE INDEX IF NOT EXISTS idx_lead_history_conversation
  ON conversation_lead_history(conversation_id);

CREATE INDEX IF NOT EXISTS idx_lead_history_created
  ON conversation_lead_history(created_at);

-- Add comment for documentation
COMMENT ON TABLE conversation_lead_history IS
  'Audit trail for lead stage changes - tracks all transitions for analytics and reporting';

-- ============================================================================
-- PART 5: Enable RLS on lead history table
-- ============================================================================

ALTER TABLE conversation_lead_history ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can view lead history for their conversations
CREATE POLICY "Business owners can view lead history" ON conversation_lead_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN business_profiles bp ON bp.business_id = c.business_id
      WHERE c.id = conversation_lead_history.conversation_id
      AND bp.user_id = auth.uid()
    )
  );

-- Policy: Business owners can insert lead history for their conversations
CREATE POLICY "Business owners can insert lead history" ON conversation_lead_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN business_profiles bp ON bp.business_id = c.business_id
      WHERE c.id = conversation_lead_history.conversation_id
      AND bp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 6: Trigger - Auto-update lead_stage to 'contacted' on first business reply
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lead_stage_on_business_reply()
RETURNS TRIGGER AS $$
DECLARE
  current_stage TEXT;
BEGIN
  -- Only process business messages
  IF NEW.sender_role = 'business' THEN
    -- Get current lead stage
    SELECT lead_stage INTO current_stage
    FROM conversations
    WHERE id = NEW.conversation_id;

    -- Only update if currently 'new'
    IF current_stage = 'new' THEN
      -- Update the conversation
      UPDATE conversations
      SET
        lead_stage = 'contacted',
        lead_stage_updated_at = now()
      WHERE id = NEW.conversation_id;

      -- Log to history
      INSERT INTO conversation_lead_history (
        conversation_id,
        previous_stage,
        new_stage,
        changed_by,
        reason
      ) VALUES (
        NEW.conversation_id,
        'new',
        'contacted',
        NEW.sender_id,
        'auto: first business reply'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_lead_stage_on_reply ON messages;

CREATE TRIGGER trigger_update_lead_stage_on_reply
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_stage_on_business_reply();

-- ============================================================================
-- PART 7: Trigger - Auto-reopen conversation when new message sent
-- ============================================================================

CREATE OR REPLACE FUNCTION reopen_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- If conversation was closed, reopen it
  UPDATE conversations
  SET
    is_closed = false,
    closed_at = NULL,
    closed_by = NULL
  WHERE id = NEW.conversation_id
  AND is_closed = true;

  -- If user sends message, move from deleted/archived back to active
  IF NEW.sender_role IN ('standard_user', 'user_and_business') THEN
    UPDATE conversations
    SET user_status = 'active'
    WHERE id = NEW.conversation_id
    AND user_status IN ('archived', 'deleted');
  END IF;

  -- If business sends message, move from archived back to active
  IF NEW.sender_role = 'business' THEN
    UPDATE conversations
    SET business_status = 'active'
    WHERE id = NEW.conversation_id
    AND business_status = 'archived';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_reopen_conversation_on_message ON messages;

CREATE TRIGGER trigger_reopen_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION reopen_conversation_on_new_message();

-- ============================================================================
-- PART 8: Function to update lead stage with history logging
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lead_stage(
  p_conversation_id UUID,
  p_new_stage TEXT,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stage TEXT;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Verify user owns the business for this conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    JOIN business_profiles bp ON bp.business_id = c.business_id
    WHERE c.id = p_conversation_id
    AND bp.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this conversation';
  END IF;

  -- Get current stage
  SELECT lead_stage INTO v_current_stage
  FROM conversations
  WHERE id = p_conversation_id;

  -- Don't update if same stage
  IF v_current_stage = p_new_stage THEN
    RETURN false;
  END IF;

  -- Update the conversation
  UPDATE conversations
  SET
    lead_stage = p_new_stage,
    lead_stage_updated_at = now(),
    lead_outcome_reason = CASE
      WHEN p_new_stage IN ('won', 'lost') THEN p_reason
      ELSE lead_outcome_reason
    END,
    lead_notes = COALESCE(p_notes, lead_notes)
  WHERE id = p_conversation_id;

  -- Log to history
  INSERT INTO conversation_lead_history (
    conversation_id,
    previous_stage,
    new_stage,
    changed_by,
    reason,
    notes
  ) VALUES (
    p_conversation_id,
    v_current_stage,
    p_new_stage,
    v_user_id,
    p_reason,
    p_notes
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 9: Function to archive/unarchive conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION update_conversation_status(
  p_conversation_id UUID,
  p_status TEXT,
  p_is_business_mode BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF p_is_business_mode THEN
    -- Business mode: verify ownership and update business_status
    IF NOT EXISTS (
      SELECT 1 FROM conversations c
      JOIN business_profiles bp ON bp.business_id = c.business_id
      WHERE c.id = p_conversation_id
      AND bp.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not authorized to update this conversation';
    END IF;

    UPDATE conversations
    SET business_status = p_status
    WHERE id = p_conversation_id;
  ELSE
    -- User mode: verify ownership and update user_status
    IF NOT EXISTS (
      SELECT 1 FROM conversations
      WHERE id = p_conversation_id
      AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not authorized to update this conversation';
    END IF;

    UPDATE conversations
    SET user_status = p_status
    WHERE id = p_conversation_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 10: Function to pin/unpin conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION toggle_conversation_pin(
  p_conversation_id UUID,
  p_is_pinned BOOLEAN,
  p_is_business_mode BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF p_is_business_mode THEN
    -- Business mode
    IF NOT EXISTS (
      SELECT 1 FROM conversations c
      JOIN business_profiles bp ON bp.business_id = c.business_id
      WHERE c.id = p_conversation_id
      AND bp.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;

    UPDATE conversations
    SET is_pinned_business = p_is_pinned
    WHERE id = p_conversation_id;
  ELSE
    -- User mode
    IF NOT EXISTS (
      SELECT 1 FROM conversations
      WHERE id = p_conversation_id
      AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;

    UPDATE conversations
    SET is_pinned_user = p_is_pinned
    WHERE id = p_conversation_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 11: Function to close conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION close_conversation(
  p_conversation_id UUID,
  p_is_business_mode BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_closed_by TEXT;
BEGIN
  v_user_id := auth.uid();
  v_closed_by := CASE WHEN p_is_business_mode THEN 'business' ELSE 'user' END;

  -- Verify authorization
  IF p_is_business_mode THEN
    IF NOT EXISTS (
      SELECT 1 FROM conversations c
      JOIN business_profiles bp ON bp.business_id = c.business_id
      WHERE c.id = p_conversation_id
      AND bp.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM conversations
      WHERE id = p_conversation_id
      AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  UPDATE conversations
  SET
    is_closed = true,
    closed_at = now(),
    closed_by = v_closed_by
  WHERE id = p_conversation_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 12: Analytics views for lead funnel
-- ============================================================================

-- Lead funnel metrics by business
CREATE OR REPLACE VIEW lead_funnel_analytics AS
SELECT
  business_id,
  lead_stage,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (lead_stage_updated_at - created_at))/86400)::numeric(10,2) as avg_days_to_stage
FROM conversations
WHERE lead_stage IS NOT NULL
GROUP BY business_id, lead_stage;

-- Lead conversion metrics by business
CREATE OR REPLACE VIEW lead_conversion_analytics AS
SELECT
  business_id,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE lead_stage = 'won') as won_count,
  COUNT(*) FILTER (WHERE lead_stage = 'lost') as lost_count,
  COUNT(*) FILTER (WHERE lead_stage = 'no_response') as no_response_count,
  COUNT(*) FILTER (WHERE lead_stage IN ('won', 'lost', 'no_response')) as total_closed,
  ROUND(
    COUNT(*) FILTER (WHERE lead_stage = 'won')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE lead_stage IN ('won', 'lost')), 0) * 100, 2
  ) as conversion_rate
FROM conversations
GROUP BY business_id;

-- Lost lead reasons breakdown
CREATE OR REPLACE VIEW lost_lead_reasons_analytics AS
SELECT
  business_id,
  lead_outcome_reason,
  COUNT(*) as count
FROM conversations
WHERE lead_stage = 'lost'
AND lead_outcome_reason IS NOT NULL
GROUP BY business_id, lead_outcome_reason;

-- Response time metrics (average time to first business reply)
CREATE OR REPLACE VIEW response_time_analytics AS
SELECT
  c.business_id,
  AVG(EXTRACT(EPOCH FROM (first_reply.created_at - c.created_at))/3600)::numeric(10,2) as avg_first_response_hours,
  COUNT(*) as conversations_with_reply
FROM conversations c
INNER JOIN LATERAL (
  SELECT created_at
  FROM messages m
  WHERE m.conversation_id = c.id
  AND m.sender_role = 'business'
  ORDER BY m.created_at ASC
  LIMIT 1
) first_reply ON true
GROUP BY c.business_id;

-- Grant access to analytics views for authenticated users
GRANT SELECT ON lead_funnel_analytics TO authenticated;
GRANT SELECT ON lead_conversion_analytics TO authenticated;
GRANT SELECT ON lost_lead_reasons_analytics TO authenticated;
GRANT SELECT ON response_time_analytics TO authenticated;

-- ============================================================================
-- PART 13: Update existing conversations with default values
-- ============================================================================

-- Set defaults for any existing conversations
UPDATE conversations
SET
  user_status = COALESCE(user_status, 'active'),
  business_status = COALESCE(business_status, 'active'),
  lead_stage = COALESCE(lead_stage, 'new'),
  lead_stage_updated_at = COALESCE(lead_stage_updated_at, created_at),
  is_closed = COALESCE(is_closed, false),
  is_pinned_user = COALESCE(is_pinned_user, false),
  is_pinned_business = COALESCE(is_pinned_business, false)
WHERE user_status IS NULL
   OR business_status IS NULL
   OR lead_stage IS NULL;

-- For existing conversations that have business replies, mark as 'contacted'
UPDATE conversations c
SET
  lead_stage = 'contacted',
  lead_stage_updated_at = (
    SELECT MIN(m.created_at)
    FROM messages m
    WHERE m.conversation_id = c.id
    AND m.sender_role = 'business'
  )
WHERE lead_stage = 'new'
AND EXISTS (
  SELECT 1 FROM messages m
  WHERE m.conversation_id = c.id
  AND m.sender_role = 'business'
);

-- ============================================================================
-- Migration complete
-- ============================================================================

COMMENT ON COLUMN conversations.user_status IS 'Consumer inbox status: active, archived, deleted';
COMMENT ON COLUMN conversations.business_status IS 'Business inbox status: active, archived';
COMMENT ON COLUMN conversations.lead_stage IS 'Lead funnel stage: new, contacted, qualified, proposal, won, lost, no_response';
COMMENT ON COLUMN conversations.lead_stage_updated_at IS 'Timestamp of last lead stage change';
COMMENT ON COLUMN conversations.lead_outcome_reason IS 'Reason code when lead is won or lost';
COMMENT ON COLUMN conversations.lead_notes IS 'Private notes about the lead (business only)';
COMMENT ON COLUMN conversations.is_closed IS 'Whether conversation has been closed by either party';
COMMENT ON COLUMN conversations.closed_at IS 'Timestamp when conversation was closed';
COMMENT ON COLUMN conversations.closed_by IS 'Who closed the conversation: user, business, or system';
COMMENT ON COLUMN conversations.is_pinned_user IS 'Whether consumer has pinned this conversation';
COMMENT ON COLUMN conversations.is_pinned_business IS 'Whether business has pinned this conversation';
