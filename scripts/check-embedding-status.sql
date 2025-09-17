-- Script: Check Embedding Status
-- Description: Queries to monitor embedding generation progress and quality
-- Usage: Run these queries in Supabase SQL Editor

-- ============================================================================
-- 1. OVERALL EMBEDDING COVERAGE
-- ============================================================================

-- How many businesses have embeddings?
SELECT
    COUNT(*) as total_businesses,
    COUNT(embedding) as with_embeddings,
    COUNT(*) - COUNT(embedding) as without_embeddings,
    ROUND(
        COUNT(embedding)::numeric / NULLIF(COUNT(*), 0)::numeric * 100,
        2
    ) as coverage_percent
FROM business_profiles;

-- ============================================================================
-- 2. BUSINESSES NEEDING EMBEDDINGS
-- ============================================================================

-- List businesses without embeddings (oldest first)
SELECT
    business_id,
    business_name,
    industry,
    city,
    state,
    created_at
FROM business_profiles
WHERE embedding IS NULL
ORDER BY created_at ASC
LIMIT 20;

-- ============================================================================
-- 3. RECENTLY GENERATED EMBEDDINGS
-- ============================================================================

-- Show recently generated embeddings
SELECT
    business_id,
    business_name,
    industry,
    embedding_model,
    embedding_generated_at,
    EXTRACT(EPOCH FROM (NOW() - embedding_generated_at)) / 60 as minutes_ago
FROM business_profiles
WHERE embedding_generated_at IS NOT NULL
ORDER BY embedding_generated_at DESC
LIMIT 20;

-- ============================================================================
-- 4. EMBEDDING QUALITY CHECKS
-- ============================================================================

-- Check if embeddings have correct dimensions (should be 1536 for text-embedding-3-small)
SELECT
    business_id,
    business_name,
    array_length(embedding::float[], 1) as embedding_dimensions
FROM business_profiles
WHERE embedding IS NOT NULL
    AND array_length(embedding::float[], 1) != 1536
LIMIT 10;

-- ============================================================================
-- 5. FIND SIMILAR BUSINESSES
-- ============================================================================

-- Find businesses similar to a specific one (replace 'YOUR-BUSINESS-ID' with actual ID)
WITH target AS (
    SELECT
        business_id,
        business_name,
        embedding
    FROM business_profiles
    WHERE business_id = 'YOUR-BUSINESS-ID'
)
SELECT
    bp.business_id,
    bp.business_name,
    bp.industry,
    bp.city,
    bp.state,
    1 - (bp.embedding <=> target.embedding) as similarity
FROM business_profiles bp
CROSS JOIN target
WHERE bp.business_id != target.business_id
    AND bp.embedding IS NOT NULL
ORDER BY bp.embedding <=> target.embedding
LIMIT 10;

-- ============================================================================
-- 6. INDUSTRY CLUSTERING
-- ============================================================================

-- Find average similarity within each industry
SELECT
    a.industry,
    COUNT(*) as business_count,
    ROUND(AVG(1 - (a.embedding <=> b.embedding))::numeric, 3) as avg_similarity
FROM business_profiles a
JOIN business_profiles b ON a.industry = b.industry AND a.business_id != b.business_id
WHERE a.embedding IS NOT NULL
    AND b.embedding IS NOT NULL
GROUP BY a.industry
HAVING COUNT(*) >= 2
ORDER BY avg_similarity DESC;

-- ============================================================================
-- 7. STALE EMBEDDINGS
-- ============================================================================

-- Find businesses where data changed after embedding was generated
SELECT
    business_id,
    business_name,
    updated_at as last_data_update,
    embedding_generated_at,
    EXTRACT(EPOCH FROM (updated_at - embedding_generated_at)) / 3600 as hours_stale
FROM business_profiles
WHERE embedding IS NOT NULL
    AND updated_at > embedding_generated_at
    AND updated_at IS NOT NULL
ORDER BY hours_stale DESC
LIMIT 20;

-- ============================================================================
-- 8. EMBEDDING GENERATION PERFORMANCE
-- ============================================================================

-- Embeddings generated per day (last 30 days)
SELECT
    DATE(embedding_generated_at) as generation_date,
    COUNT(*) as embeddings_generated,
    MIN(embedding_generated_at) as first_generated,
    MAX(embedding_generated_at) as last_generated
FROM business_profiles
WHERE embedding_generated_at IS NOT NULL
    AND embedding_generated_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(embedding_generated_at)
ORDER BY generation_date DESC;

-- ============================================================================
-- 9. BUSINESSES WITH INSUFFICIENT DATA
-- ============================================================================

-- Find businesses that may produce low-quality embeddings
SELECT
    business_id,
    business_name,
    description,
    industry,
    CASE
        WHEN business_name IS NULL THEN 'Missing name'
        WHEN description IS NULL OR description = '' THEN 'Missing description'
        WHEN LENGTH(description) < 20 THEN 'Description too short'
        WHEN industry IS NULL THEN 'Missing industry'
        ELSE 'OK'
    END as issue
FROM business_profiles
WHERE embedding IS NULL
    AND (
        business_name IS NULL OR
        description IS NULL OR
        description = '' OR
        LENGTH(description) < 20 OR
        industry IS NULL
    )
LIMIT 20;

-- ============================================================================
-- 10. SEARCH PERFORMANCE TEST
-- ============================================================================

-- Test vector search performance (uses EXPLAIN ANALYZE)
EXPLAIN ANALYZE
SELECT
    business_id,
    business_name,
    industry,
    1 - (embedding <=> (SELECT embedding FROM business_profiles WHERE embedding IS NOT NULL LIMIT 1)) as similarity
FROM business_profiles
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM business_profiles WHERE embedding IS NOT NULL LIMIT 1)
LIMIT 10;

-- ============================================================================
-- 11. INDEX HEALTH CHECK
-- ============================================================================

-- Check if HNSW index exists and is being used
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'business_profiles'
    AND indexname LIKE '%embedding%';

-- ============================================================================
-- 12. DAILY EMBEDDING GENERATION TARGET
-- ============================================================================

-- Calculate how many embeddings need to be generated per day to complete in X days
WITH stats AS (
    SELECT
        COUNT(*) FILTER (WHERE embedding IS NULL) as remaining,
        30 as target_days  -- Change this to your target number of days
)
SELECT
    remaining as total_remaining,
    target_days,
    CEIL(remaining::numeric / target_days) as per_day_needed,
    CEIL((remaining::numeric / target_days) / 24) as per_hour_needed
FROM stats;

-- ============================================================================
-- QUICK DASHBOARD VIEW
-- ============================================================================

-- Comprehensive overview in one query
SELECT
    'Total Businesses' as metric,
    COUNT(*)::text as value
FROM business_profiles

UNION ALL

SELECT
    'With Embeddings' as metric,
    COUNT(embedding)::text as value
FROM business_profiles

UNION ALL

SELECT
    'Coverage %' as metric,
    ROUND(
        COUNT(embedding)::numeric / NULLIF(COUNT(*), 0)::numeric * 100,
        2
    )::text || '%' as value
FROM business_profiles

UNION ALL

SELECT
    'Generated Today' as metric,
    COUNT(*)::text as value
FROM business_profiles
WHERE DATE(embedding_generated_at) = CURRENT_DATE

UNION ALL

SELECT
    'Generated This Week' as metric,
    COUNT(*)::text as value
FROM business_profiles
WHERE embedding_generated_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
    'Needs Regeneration' as metric,
    COUNT(*)::text as value
FROM business_profiles
WHERE embedding IS NOT NULL
    AND updated_at > embedding_generated_at
    AND updated_at IS NOT NULL;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Run these queries periodically to monitor progress
-- 2. Focus on "OVERALL EMBEDDING COVERAGE" first
-- 3. Use "BUSINESSES NEEDING EMBEDDINGS" to see what's left
-- 4. Check "EMBEDDING QUALITY CHECKS" to ensure no corrupted embeddings
-- 5. Use "SEARCH PERFORMANCE TEST" to verify indexes are working
