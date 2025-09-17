-- Migration: 005_profile_interview_system
-- Description: AI-powered business profile interview and enrichment system
-- Created: 2025-11-11

-- ============================================================================
-- Table: profile_interview_sessions
-- Purpose: Track interview conversations and store partial progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_interview_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES business_profiles(business_id) ON DELETE CASCADE,
    session_id text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),

    -- Conversation tracking
    conversation_history jsonb DEFAULT '[]'::jsonb,
    current_phase text DEFAULT 'basic_info' CHECK (current_phase IN ('basic_info', 'coverage', 'enrichment', 'review')),
    completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

    -- Collected data (partial or complete)
    collected_data jsonb DEFAULT '{}'::jsonb,

    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    completed_at timestamptz,

    -- Indexes
    CONSTRAINT valid_completed_at CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    )
);

CREATE INDEX idx_interview_sessions_business_id ON profile_interview_sessions(business_id);
CREATE INDEX idx_interview_sessions_session_id ON profile_interview_sessions(session_id);
CREATE INDEX idx_interview_sessions_status ON profile_interview_sessions(status);
CREATE INDEX idx_interview_sessions_updated_at ON profile_interview_sessions(updated_at);

-- ============================================================================
-- Table: business_profile_enrichment
-- Purpose: Store semantic variations and geographic expansions for better search
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_profile_enrichment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES business_profiles(business_id) ON DELETE CASCADE UNIQUE,

    -- Semantic variations
    industry_variations text[] DEFAULT ARRAY[]::text[],
    business_name_variations text[] DEFAULT ARRAY[]::text[],
    description_keywords text[] DEFAULT ARRAY[]::text[],

    -- Geographic enrichment
    zip_codes text[] DEFAULT ARRAY[]::text[],
    counties text[] DEFAULT ARRAY[]::text[],
    nearby_cities text[] DEFAULT ARRAY[]::text[],
    nearby_towns text[] DEFAULT ARRAY[]::text[],
    service_areas text[] DEFAULT ARRAY[]::text[],

    -- Coverage expansion
    expanded_coverage_details jsonb DEFAULT '{}'::jsonb,

    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    enriched_by text DEFAULT 'ai_interview',
    enrichment_version integer DEFAULT 1
);

CREATE INDEX idx_enrichment_business_id ON business_profile_enrichment(business_id);
CREATE INDEX idx_enrichment_updated_at ON business_profile_enrichment(updated_at);
CREATE INDEX idx_enrichment_industry_variations ON business_profile_enrichment USING GIN(industry_variations);
CREATE INDEX idx_enrichment_zip_codes ON business_profile_enrichment USING GIN(zip_codes);

-- ============================================================================
-- Function: update_interview_session_timestamp
-- Purpose: Automatically update updated_at on row changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_interview_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger: Update timestamp on profile_interview_sessions
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_interview_session_timestamp ON profile_interview_sessions;

CREATE TRIGGER trigger_update_interview_session_timestamp
    BEFORE UPDATE ON profile_interview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_interview_session_timestamp();

-- ============================================================================
-- Trigger: Update timestamp on business_profile_enrichment
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_enrichment_timestamp ON business_profile_enrichment;

CREATE TRIGGER trigger_update_enrichment_timestamp
    BEFORE UPDATE ON business_profile_enrichment
    FOR EACH ROW
    EXECUTE FUNCTION update_interview_session_timestamp();

-- ============================================================================
-- Function: create_interview_session
-- Purpose: Initialize a new interview session
-- ============================================================================

CREATE OR REPLACE FUNCTION create_interview_session(
    p_business_id uuid,
    p_session_id text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_session_id uuid;
BEGIN
    -- Check if session already exists
    SELECT id INTO v_session_id
    FROM profile_interview_sessions
    WHERE session_id = p_session_id;

    IF v_session_id IS NOT NULL THEN
        -- Return existing session
        RETURN v_session_id;
    END IF;

    -- Create new session
    INSERT INTO profile_interview_sessions (
        business_id,
        session_id,
        status,
        current_phase,
        completion_percentage
    ) VALUES (
        p_business_id,
        p_session_id,
        'in_progress',
        'basic_info',
        0
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$;

-- ============================================================================
-- Function: update_interview_session
-- Purpose: Update interview session with new conversation data
-- ============================================================================

CREATE OR REPLACE FUNCTION update_interview_session(
    p_session_id text,
    p_conversation_history jsonb,
    p_current_phase text,
    p_completion_percentage integer,
    p_collected_data jsonb,
    p_status text DEFAULT 'in_progress'
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_completed_at timestamptz;
BEGIN
    -- Set completed_at if status is completed
    IF p_status = 'completed' THEN
        v_completed_at := now();
    ELSE
        v_completed_at := NULL;
    END IF;

    UPDATE profile_interview_sessions
    SET
        conversation_history = p_conversation_history,
        current_phase = p_current_phase,
        completion_percentage = p_completion_percentage,
        collected_data = p_collected_data,
        status = p_status,
        completed_at = COALESCE(completed_at, v_completed_at)
    WHERE session_id = p_session_id;

    RETURN FOUND;
END;
$$;

-- ============================================================================
-- Function: get_interview_session
-- Purpose: Retrieve interview session by session_id
-- ============================================================================

CREATE OR REPLACE FUNCTION get_interview_session(p_session_id text)
RETURNS TABLE (
    id uuid,
    business_id uuid,
    session_id text,
    status text,
    conversation_history jsonb,
    current_phase text,
    completion_percentage integer,
    collected_data jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    completed_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.business_id,
        s.session_id,
        s.status,
        s.conversation_history,
        s.current_phase,
        s.completion_percentage,
        s.collected_data,
        s.created_at,
        s.updated_at,
        s.completed_at
    FROM profile_interview_sessions s
    WHERE s.session_id = p_session_id;
END;
$$;

-- ============================================================================
-- Function: save_business_enrichment
-- Purpose: Save enrichment data for a business profile
-- ============================================================================

CREATE OR REPLACE FUNCTION save_business_enrichment(
    p_business_id uuid,
    p_industry_variations text[],
    p_business_name_variations text[],
    p_description_keywords text[],
    p_zip_codes text[],
    p_counties text[],
    p_nearby_cities text[],
    p_nearby_towns text[],
    p_service_areas text[],
    p_expanded_coverage_details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_enrichment_id uuid;
BEGIN
    -- Upsert enrichment data
    INSERT INTO business_profile_enrichment (
        business_id,
        industry_variations,
        business_name_variations,
        description_keywords,
        zip_codes,
        counties,
        nearby_cities,
        nearby_towns,
        service_areas,
        expanded_coverage_details,
        enriched_by,
        enrichment_version
    ) VALUES (
        p_business_id,
        p_industry_variations,
        p_business_name_variations,
        p_description_keywords,
        p_zip_codes,
        p_counties,
        p_nearby_cities,
        p_nearby_towns,
        p_service_areas,
        p_expanded_coverage_details,
        'ai_interview',
        1
    )
    ON CONFLICT (business_id) DO UPDATE
    SET
        industry_variations = EXCLUDED.industry_variations,
        business_name_variations = EXCLUDED.business_name_variations,
        description_keywords = EXCLUDED.description_keywords,
        zip_codes = EXCLUDED.zip_codes,
        counties = EXCLUDED.counties,
        nearby_cities = EXCLUDED.nearby_cities,
        nearby_towns = EXCLUDED.nearby_towns,
        service_areas = EXCLUDED.service_areas,
        expanded_coverage_details = EXCLUDED.expanded_coverage_details,
        enrichment_version = business_profile_enrichment.enrichment_version + 1,
        updated_at = now()
    RETURNING id INTO v_enrichment_id;

    RETURN v_enrichment_id;
END;
$$;

-- ============================================================================
-- Function: get_business_enrichment
-- Purpose: Get enrichment data for a business
-- ============================================================================

CREATE OR REPLACE FUNCTION get_business_enrichment(p_business_id uuid)
RETURNS TABLE (
    business_id uuid,
    industry_variations text[],
    business_name_variations text[],
    description_keywords text[],
    zip_codes text[],
    counties text[],
    nearby_cities text[],
    nearby_towns text[],
    service_areas text[],
    expanded_coverage_details jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.business_id,
        e.industry_variations,
        e.business_name_variations,
        e.description_keywords,
        e.zip_codes,
        e.counties,
        e.nearby_cities,
        e.nearby_towns,
        e.service_areas,
        e.expanded_coverage_details
    FROM business_profile_enrichment e
    WHERE e.business_id = p_business_id;
END;
$$;

-- ============================================================================
-- View: interview_session_summary
-- Purpose: Quick overview of all interview sessions
-- ============================================================================

CREATE OR REPLACE VIEW interview_session_summary AS
SELECT
    s.id,
    s.business_id,
    bp.business_name,
    s.session_id,
    s.status,
    s.current_phase,
    s.completion_percentage,
    jsonb_array_length(s.conversation_history) as message_count,
    s.created_at,
    s.updated_at,
    s.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(s.completed_at, now()) - s.created_at)) / 60 as duration_minutes
FROM profile_interview_sessions s
LEFT JOIN business_profiles bp ON s.business_id = bp.business_id
ORDER BY s.updated_at DESC;

-- ============================================================================
-- Grant permissions (adjust based on your RLS policies)
-- ============================================================================

-- Allow authenticated users to access their own sessions
ALTER TABLE profile_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile_enrichment ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view/edit sessions for businesses they own
CREATE POLICY interview_sessions_owner_policy ON profile_interview_sessions
    FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM business_profiles
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can view/edit enrichment for businesses they own
CREATE POLICY enrichment_owner_policy ON business_profile_enrichment
    FOR ALL
    USING (
        business_id IN (
            SELECT business_id FROM business_profiles
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE profile_interview_sessions IS 'Tracks AI interview conversations for business profile creation/updates';
COMMENT ON TABLE business_profile_enrichment IS 'Stores semantic variations and geographic enrichment for enhanced search discoverability';
COMMENT ON FUNCTION create_interview_session IS 'Initialize a new interview session for a business';
COMMENT ON FUNCTION update_interview_session IS 'Update interview session with conversation progress';
COMMENT ON FUNCTION save_business_enrichment IS 'Save or update enrichment data for better search results';
COMMENT ON VIEW interview_session_summary IS 'Overview of all interview sessions with key metrics';
