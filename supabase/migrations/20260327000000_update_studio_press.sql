-- Migration: Add description and Framer sync columns to studio_press
-- This ensures the DB matches the StudioPress interface updated in the UI

ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false;
ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}';
ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS framer_cms_id TEXT;
ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS framer_collection_id TEXT;
ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS framer_last_sync TIMESTAMPTZ;

-- Maintain consistent naming with other studio tables
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename='studio_press') THEN
        COMMENT ON COLUMN studio_press.description IS 'Detailed description of the achievement, award or feature';
        COMMENT ON COLUMN studio_press.cover_url IS 'URL for the main visual representation (often auto-generated)';
    END IF;
END $$;
