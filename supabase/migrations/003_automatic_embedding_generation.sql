-- Migration: Automatic Embedding Generation
-- Description: Creates trigger to automatically generate embeddings when businesses are created/updated

-- ============================================================================
-- STEP 1: Create function to call Edge Function for embedding generation
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_embedding_for_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_text text;
    v_response jsonb;
    v_embedding vector(1536);
BEGIN
    -- Build business text for embedding
    v_business_text := '';

    IF NEW.business_name IS NOT NULL THEN
        v_business_text := v_business_text || 'Business Name: ' || NEW.business_name || E'\n';
    END IF;

    IF NEW.industry IS NOT NULL THEN
        v_business_text := v_business_text || 'Industry: ' || NEW.industry || E'\n';
    END IF;

    IF NEW.description IS NOT NULL THEN
        v_business_text := v_business_text || 'Description: ' || NEW.description || E'\n';
    END IF;

    IF NEW.coverage_type IS NOT NULL THEN
        v_business_text := v_business_text || 'Coverage: ' || NEW.coverage_type || E'\n';
    END IF;

    IF NEW.coverage_details IS NOT NULL THEN
        v_business_text := v_business_text || 'Coverage Details: ' || NEW.coverage_details || E'\n';
    END IF;

    -- Only generate embedding if we have meaningful text
    IF length(trim(v_business_text)) > 10 THEN
        -- Use pg_net extension to call Edge Function asynchronously
        -- This prevents blocking the INSERT/UPDATE operation
        BEGIN
            -- Queue the embedding generation request
            PERFORM net.http_post(
                url := current_setting('app.supabase_url') || '/functions/v1/generate_embeddings',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.supabase_service_key')
                ),
                body := jsonb_build_object(
                    'business_id', NEW.business_id,
                    'text', v_business_text
                )
            );

            RAISE NOTICE 'Queued embedding generation for business %', NEW.business_id;
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the insert/update
            RAISE WARNING 'Failed to queue embedding generation for business %: %', NEW.business_id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION generate_embedding_for_business IS 'Automatically queues embedding generation when business is created or updated';

-- ============================================================================
-- STEP 2: Create trigger for new businesses
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_generate_embedding_on_insert ON business_profiles;

CREATE TRIGGER trigger_generate_embedding_on_insert
    AFTER INSERT ON business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION generate_embedding_for_business();

COMMENT ON TRIGGER trigger_generate_embedding_on_insert ON business_profiles IS 'Generates embedding when new business is created';

-- ============================================================================
-- STEP 3: Create trigger for business updates
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_generate_embedding_on_update ON business_profiles;

CREATE TRIGGER trigger_generate_embedding_on_update
    AFTER UPDATE ON business_profiles
    FOR EACH ROW
    WHEN (
        -- Only trigger if relevant fields changed
        OLD.business_name IS DISTINCT FROM NEW.business_name OR
        OLD.industry IS DISTINCT FROM NEW.industry OR
        OLD.description IS DISTINCT FROM NEW.description OR
        OLD.coverage_type IS DISTINCT FROM NEW.coverage_type OR
        OLD.coverage_details IS DISTINCT FROM NEW.coverage_details
    )
    EXECUTE FUNCTION generate_embedding_for_business();

COMMENT ON TRIGGER trigger_generate_embedding_on_update ON business_profiles IS 'Regenerates embedding when business details are updated';

-- ============================================================================
-- STEP 4: Create configuration table for settings
-- ============================================================================

-- Store Supabase URL and service key as database settings
-- These will be set via ALTER DATABASE SET command or .env

-- Check if pg_net extension exists (required for async HTTP calls)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        RAISE NOTICE 'Installing pg_net extension for async HTTP calls...';
        CREATE EXTENSION IF NOT EXISTS pg_net;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Alternative approach using a queue table (fallback if pg_net fails)
-- ============================================================================

-- Create queue table for businesses needing embeddings
CREATE TABLE IF NOT EXISTS embedding_generation_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES business_profiles(business_id) ON DELETE CASCADE,
    business_text text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 3,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_generation_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_business ON embedding_generation_queue(business_id);

COMMENT ON TABLE embedding_generation_queue IS 'Queue for businesses that need embedding generation';

-- ============================================================================
-- STEP 6: Simplified trigger function using queue table
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_embedding_generation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_text text;
BEGIN
    -- Build business text for embedding
    v_business_text := '';

    IF NEW.business_name IS NOT NULL THEN
        v_business_text := v_business_text || 'Business Name: ' || NEW.business_name || E'\n';
    END IF;

    IF NEW.industry IS NOT NULL THEN
        v_business_text := v_business_text || 'Industry: ' || NEW.industry || E'\n';
    END IF;

    IF NEW.description IS NOT NULL THEN
        v_business_text := v_business_text || 'Description: ' || NEW.description || E'\n';
    END IF;

    IF NEW.coverage_type IS NOT NULL THEN
        v_business_text := v_business_text || 'Coverage: ' || NEW.coverage_type || E'\n';
    END IF;

    IF NEW.coverage_details IS NOT NULL THEN
        v_business_text := v_business_text || 'Coverage Details: ' || NEW.coverage_details || E'\n';
    END IF;

    -- Only queue if we have meaningful text
    IF length(trim(v_business_text)) > 10 THEN
        -- Insert into queue (or update if already exists)
        INSERT INTO embedding_generation_queue (business_id, business_text, status)
        VALUES (NEW.business_id, v_business_text, 'pending')
        ON CONFLICT (business_id)
        DO UPDATE SET
            business_text = EXCLUDED.business_text,
            status = 'pending',
            attempts = 0,
            error_message = NULL,
            updated_at = now();

        RAISE NOTICE 'Queued embedding generation for business %', NEW.business_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Add unique constraint on business_id for the queue
CREATE UNIQUE INDEX IF NOT EXISTS idx_embedding_queue_business_unique ON embedding_generation_queue(business_id);

-- Replace triggers to use queue-based approach
DROP TRIGGER IF EXISTS trigger_generate_embedding_on_insert ON business_profiles;
DROP TRIGGER IF EXISTS trigger_generate_embedding_on_update ON business_profiles;

CREATE TRIGGER trigger_queue_embedding_on_insert
    AFTER INSERT ON business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION queue_embedding_generation();

CREATE TRIGGER trigger_queue_embedding_on_update
    AFTER UPDATE ON business_profiles
    FOR EACH ROW
    WHEN (
        OLD.business_name IS DISTINCT FROM NEW.business_name OR
        OLD.industry IS DISTINCT FROM NEW.industry OR
        OLD.description IS DISTINCT FROM NEW.description OR
        OLD.coverage_type IS DISTINCT FROM NEW.coverage_type OR
        OLD.coverage_details IS DISTINCT FROM NEW.coverage_details
    )
    EXECUTE FUNCTION queue_embedding_generation();

-- ============================================================================
-- STEP 7: Create function to process queue (called by Edge Function or cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_embeddings(batch_size integer DEFAULT 10)
RETURNS TABLE (
    id uuid,
    business_id uuid,
    business_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id,
        q.business_id,
        q.business_text
    FROM embedding_generation_queue q
    WHERE q.status = 'pending'
      AND q.attempts < q.max_attempts
    ORDER BY q.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;

    -- Mark as processing
    UPDATE embedding_generation_queue
    SET status = 'processing',
        updated_at = now(),
        attempts = attempts + 1
    WHERE id IN (
        SELECT q.id
        FROM embedding_generation_queue q
        WHERE q.status = 'pending'
          AND q.attempts < q.max_attempts
        ORDER BY q.created_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    );
END;
$$;

CREATE OR REPLACE FUNCTION mark_embedding_completed(queue_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE embedding_generation_queue
    SET status = 'completed',
        processed_at = now(),
        updated_at = now()
    WHERE id = queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_embedding_failed(queue_id uuid, error_msg text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE embedding_generation_queue
    SET status = CASE
            WHEN attempts >= max_attempts THEN 'failed'
            ELSE 'pending'
        END,
        error_message = error_msg,
        updated_at = now()
    WHERE id = queue_id;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON embedding_generation_queue TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_pending_embeddings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_embedding_completed TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_embedding_failed TO authenticated, service_role;

-- ============================================================================
-- STEP 8: Create a view to monitor queue status
-- ============================================================================

CREATE OR REPLACE VIEW embedding_queue_status AS
SELECT
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest_pending,
    MAX(created_at) as newest_pending
FROM embedding_generation_queue
GROUP BY status;

GRANT SELECT ON embedding_queue_status TO authenticated, service_role;

COMMENT ON VIEW embedding_queue_status IS 'Monitor embedding generation queue status';
