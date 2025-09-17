-- Migration: Setup pgvector extension and search infrastructure
-- Description: Creates vector extension, updates business_profiles with embeddings,
--              creates search_history table, and sets up vector similarity search functions

-- ============================================================================
-- STEP 1: Enable pgvector Extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- STEP 2: Update business_profiles table to include embedding column
-- ============================================================================
-- Add embedding column if it doesn't exist (using OpenAI's text-embedding-3-small: 1536 dimensions)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'business_profiles'
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE business_profiles
        ADD COLUMN embedding vector(1536);
    END IF;
END $$;

-- Add metadata columns for embedding management
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'business_profiles'
        AND column_name = 'embedding_generated_at'
    ) THEN
        ALTER TABLE business_profiles
        ADD COLUMN embedding_generated_at timestamptz;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'business_profiles'
        AND column_name = 'embedding_model'
    ) THEN
        ALTER TABLE business_profiles
        ADD COLUMN embedding_model text DEFAULT 'text-embedding-3-small';
    END IF;
END $$;

-- Create index for vector similarity search (using HNSW for fast approximate search)
CREATE INDEX IF NOT EXISTS business_profiles_embedding_idx
ON business_profiles
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- STEP 3: Create search_history table for logging and analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    query_text text NOT NULL,
    query_embedding vector(1536),
    filters jsonb DEFAULT '{}'::jsonb,
    is_clarification_needed boolean DEFAULT false,
    clarification_question text,
    llm_response jsonb,
    business_ids_returned uuid[],
    result_count integer DEFAULT 0,
    response_time_ms integer,
    created_at timestamptz DEFAULT now(),

    -- Analytics columns
    user_location jsonb,
    device_info jsonb,

    -- Indexes for common queries
    INDEX idx_search_history_session_id (session_id),
    INDEX idx_search_history_user_id (user_id),
    INDEX idx_search_history_created_at (created_at DESC)
);

-- Add index for vector similarity on search history (for finding similar past searches)
CREATE INDEX IF NOT EXISTS search_history_embedding_idx
ON search_history
USING hnsw (query_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- STEP 4: Create vector similarity search function
-- ============================================================================
CREATE OR REPLACE FUNCTION search_businesses_by_vector(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    filter_category text DEFAULT NULL,
    filter_location text DEFAULT NULL,
    filter_coverage_type text DEFAULT NULL
)
RETURNS TABLE (
    business_id uuid,
    business_name text,
    description text,
    industry text,
    city text,
    state text,
    zip_code text,
    image_url text,
    coverage_type text,
    coverage_details jsonb,
    coverage_radius integer,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bp.business_id,
        bp.business_name,
        bp.description,
        bp.industry,
        bp.city,
        bp.state,
        bp.zip_code,
        bp.image_url,
        bp.coverage_type,
        bp.coverage_details,
        bp.coverage_radius,
        1 - (bp.embedding <=> query_embedding) AS similarity
    FROM business_profiles bp
    WHERE bp.embedding IS NOT NULL
        AND (1 - (bp.embedding <=> query_embedding)) > match_threshold
        AND (filter_category IS NULL OR bp.industry ILIKE '%' || filter_category || '%')
        AND (filter_location IS NULL OR bp.city ILIKE '%' || filter_location || '%' OR bp.state ILIKE '%' || filter_location || '%')
        AND (filter_coverage_type IS NULL OR bp.coverage_type = filter_coverage_type)
    ORDER BY bp.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- STEP 5: Create function to find similar past searches
-- ============================================================================
CREATE OR REPLACE FUNCTION find_similar_searches(
    query_embedding vector(1536),
    similarity_threshold float DEFAULT 0.85,
    max_results int DEFAULT 5,
    time_window_hours int DEFAULT 168 -- 1 week default
)
RETURNS TABLE (
    search_id uuid,
    query_text text,
    business_ids_returned uuid[],
    result_count integer,
    similarity float,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sh.id,
        sh.query_text,
        sh.business_ids_returned,
        sh.result_count,
        1 - (sh.query_embedding <=> query_embedding) AS similarity,
        sh.created_at
    FROM search_history sh
    WHERE sh.query_embedding IS NOT NULL
        AND (1 - (sh.query_embedding <=> query_embedding)) > similarity_threshold
        AND sh.created_at > (now() - (time_window_hours || ' hours')::interval)
        AND sh.result_count > 0
    ORDER BY sh.query_embedding <=> query_embedding
    LIMIT max_results;
END;
$$;

-- ============================================================================
-- STEP 6: Create trigger to auto-invalidate embeddings when business data changes
-- ============================================================================
CREATE OR REPLACE FUNCTION invalidate_business_embedding()
RETURNS TRIGGER AS $$
BEGIN
    -- If business_name or description changes, mark embedding as outdated
    IF (TG_OP = 'UPDATE' AND (
        OLD.business_name IS DISTINCT FROM NEW.business_name OR
        OLD.description IS DISTINCT FROM NEW.description OR
        OLD.industry IS DISTINCT FROM NEW.industry
    )) THEN
        NEW.embedding := NULL;
        NEW.embedding_generated_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invalidate_business_embedding
    BEFORE UPDATE ON business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_business_embedding();

-- ============================================================================
-- STEP 7: Create helper function to get businesses needing embeddings
-- ============================================================================
CREATE OR REPLACE FUNCTION get_businesses_needing_embeddings(
    batch_size int DEFAULT 100
)
RETURNS TABLE (
    business_id uuid,
    business_name text,
    description text,
    industry text
)
LANGUAGE sql
AS $$
    SELECT
        business_id,
        business_name,
        description,
        industry
    FROM business_profiles
    WHERE embedding IS NULL
        AND business_name IS NOT NULL
    ORDER BY created_at DESC
    LIMIT batch_size;
$$;

-- ============================================================================
-- STEP 8: Create analytics view for search insights
-- ============================================================================
CREATE OR REPLACE VIEW search_analytics AS
SELECT
    DATE_TRUNC('day', created_at) AS search_date,
    COUNT(*) AS total_searches,
    COUNT(DISTINCT session_id) AS unique_sessions,
    COUNT(DISTINCT user_id) AS unique_users,
    AVG(result_count) AS avg_results_per_search,
    AVG(response_time_ms) AS avg_response_time_ms,
    COUNT(*) FILTER (WHERE is_clarification_needed = true) AS clarification_requests,
    COUNT(*) FILTER (WHERE result_count = 0) AS zero_result_searches
FROM search_history
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY search_date DESC;

-- ============================================================================
-- STEP 9: Grant necessary permissions
-- ============================================================================
-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION search_businesses_by_vector TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_similar_searches TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_businesses_needing_embeddings TO authenticated;

-- Grant access to search_analytics view
GRANT SELECT ON search_analytics TO authenticated;

COMMENT ON TABLE search_history IS 'Logs all search queries for analytics and UX improvements';
COMMENT ON FUNCTION search_businesses_by_vector IS 'Performs vector similarity search on business_profiles with optional filters';
COMMENT ON FUNCTION find_similar_searches IS 'Finds similar past searches to potentially reuse results';
COMMENT ON VIEW search_analytics IS 'Provides daily aggregated search analytics';
