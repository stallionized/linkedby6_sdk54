-- ============================================================================
-- Migration: Add logo_dominant_color field to business_profiles
-- Description: Stores the dominant background color extracted from business logos
--              to be used for logo display backgrounds
-- ============================================================================

-- Add logo_dominant_color column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'business_profiles'
        AND column_name = 'logo_dominant_color'
    ) THEN
        ALTER TABLE business_profiles
        ADD COLUMN logo_dominant_color text;

        COMMENT ON COLUMN business_profiles.logo_dominant_color IS 'Hex color code of the dominant background color in the business logo (e.g., #FFFFFF)';
    END IF;
END $$;
