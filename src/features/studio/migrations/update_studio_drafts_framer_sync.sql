-- Migration: Add Framer Sync Columns to Studio Drafts
-- This fix resolves the "column not found" error during the unsync process.

ALTER TABLE studio_drafts 
ADD COLUMN IF NOT EXISTS framer_cms_id TEXT,
ADD COLUMN IF NOT EXISTS framer_collection_id TEXT,
ADD COLUMN IF NOT EXISTS framer_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_studio_drafts_framer_cms_id ON studio_drafts(framer_cms_id);
CREATE INDEX IF NOT EXISTS idx_studio_drafts_is_staged ON studio_drafts(is_staged);
