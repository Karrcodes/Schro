-- Comprehensive Sync Migration for Portfolio Hub
-- This script ensures all tables have the necessary columns for Framer CMS synchronization.
-- Tables affected: studio_projects, studio_press, studio_content, studio_drafts

-- 1. Studio Projects
ALTER TABLE studio_projects 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS framer_cms_id TEXT,
ADD COLUMN IF NOT EXISTS framer_collection_id TEXT,
ADD COLUMN IF NOT EXISTS framer_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}'::jsonb;

-- 2. Studio Press
ALTER TABLE studio_press 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS framer_cms_id TEXT,
ADD COLUMN IF NOT EXISTS framer_collection_id TEXT,
ADD COLUMN IF NOT EXISTS framer_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}'::jsonb;

-- 3. Studio Content (Media)
ALTER TABLE studio_content 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS framer_cms_id TEXT,
ADD COLUMN IF NOT EXISTS framer_collection_id TEXT,
ADD COLUMN IF NOT EXISTS framer_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}'::jsonb;

-- 4. Studio Drafts (Articles)
ALTER TABLE studio_drafts 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS framer_cms_id TEXT,
ADD COLUMN IF NOT EXISTS framer_collection_id TEXT,
ADD COLUMN IF NOT EXISTS framer_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_studio_projects_framer_cms_id ON studio_projects(framer_cms_id);
CREATE INDEX IF NOT EXISTS idx_studio_press_framer_cms_id ON studio_press(framer_cms_id);
CREATE INDEX IF NOT EXISTS idx_studio_content_framer_cms_id ON studio_content(framer_cms_id);
CREATE INDEX IF NOT EXISTS idx_studio_drafts_framer_cms_id ON studio_drafts(framer_cms_id);

CREATE INDEX IF NOT EXISTS idx_studio_projects_is_staged ON studio_projects(is_staged);
CREATE INDEX IF NOT EXISTS idx_studio_press_is_staged ON studio_press(is_staged);
CREATE INDEX IF NOT EXISTS idx_studio_content_is_staged ON studio_content(is_staged);
CREATE INDEX IF NOT EXISTS idx_studio_drafts_is_staged ON studio_drafts(is_staged);
