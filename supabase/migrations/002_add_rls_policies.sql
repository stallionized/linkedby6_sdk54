-- Migration: Add Row Level Security (RLS) policies
-- Description: Configures RLS for search_history and business_profiles

-- ============================================================================
-- STEP 1: Enable RLS on search_history
-- ============================================================================
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: RLS Policies for search_history
-- ============================================================================

-- Policy: Users can view their own search history
CREATE POLICY "Users can view their own search history"
ON search_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own search history
CREATE POLICY "Users can insert their own search history"
ON search_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do anything (for Edge Functions)
CREATE POLICY "Service role has full access to search_history"
ON search_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Anonymous users can insert search history (without user_id)
CREATE POLICY "Anonymous users can log searches"
ON search_history
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- ============================================================================
-- STEP 3: RLS Policies for business_profiles (if not already enabled)
-- ============================================================================

-- Enable RLS if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'business_profiles'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Policy: Everyone can read business profiles
CREATE POLICY IF NOT EXISTS "Anyone can view business profiles"
ON business_profiles
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy: Only business owners can update their own profiles
-- Assumes business_profiles has an 'owner_id' column
-- If it doesn't exist, this will be skipped
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'business_profiles'
        AND column_name = 'owner_id'
    ) THEN
        EXECUTE '
        CREATE POLICY IF NOT EXISTS "Business owners can update their profiles"
        ON business_profiles
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = owner_id)
        WITH CHECK (auth.uid() = owner_id);
        ';
    END IF;
END $$;

-- Policy: Service role has full access (for embedding generation)
CREATE POLICY IF NOT EXISTS "Service role has full access to business_profiles"
ON business_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- STEP 4: Create function to safely log searches (handles auth state)
-- ============================================================================
CREATE OR REPLACE FUNCTION log_search(
    p_session_id text,
    p_query_text text,
    p_query_embedding vector(1536) DEFAULT NULL,
    p_filters jsonb DEFAULT '{}'::jsonb,
    p_is_clarification_needed boolean DEFAULT false,
    p_clarification_question text DEFAULT NULL,
    p_llm_response jsonb DEFAULT NULL,
    p_business_ids_returned uuid[] DEFAULT NULL,
    p_result_count integer DEFAULT 0,
    p_response_time_ms integer DEFAULT NULL,
    p_user_location jsonb DEFAULT NULL,
    p_device_info jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_search_id uuid;
BEGIN
    -- Get current user ID (will be NULL for anonymous users)
    v_user_id := auth.uid();

    -- Insert search log
    INSERT INTO search_history (
        session_id,
        user_id,
        query_text,
        query_embedding,
        filters,
        is_clarification_needed,
        clarification_question,
        llm_response,
        business_ids_returned,
        result_count,
        response_time_ms,
        user_location,
        device_info
    )
    VALUES (
        p_session_id,
        v_user_id,
        p_query_text,
        p_query_embedding,
        p_filters,
        p_is_clarification_needed,
        p_clarification_question,
        p_llm_response,
        p_business_ids_returned,
        p_result_count,
        p_response_time_ms,
        p_user_location,
        p_device_info
    )
    RETURNING id INTO v_search_id;

    RETURN v_search_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_search TO authenticated, anon, service_role;

COMMENT ON FUNCTION log_search IS 'Safely logs search queries handling both authenticated and anonymous users';
