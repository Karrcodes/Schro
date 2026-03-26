-- Migration: Add Framer CMS sync fields to Studio tables
-- Run this in your Supabase SQL editor

-- ============================================
-- studio_projects: new fields
-- ============================================
ALTER TABLE studio_projects
  ADD COLUMN IF NOT EXISTS client TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_url TEXT,
  ADD COLUMN IF NOT EXISTS article_url TEXT,
  ADD COLUMN IF NOT EXISTS show_date BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS framer_cms_id TEXT,
  ADD COLUMN IF NOT EXISTS framer_collection_id TEXT,
  ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}';

-- ============================================
-- studio_press: new fields
-- ============================================
ALTER TABLE studio_press
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS framer_cms_id TEXT,
  ADD COLUMN IF NOT EXISTS framer_collection_id TEXT,
  ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}';

-- ============================================
-- studio_content: new fields
-- ============================================
ALTER TABLE studio_content
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS framer_cms_id TEXT,
  ADD COLUMN IF NOT EXISTS framer_collection_id TEXT,
  ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}';

-- ============================================
-- studio_drafts: new fields for Articles publishing
-- ============================================
ALTER TABLE studio_drafts
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS article_url TEXT,
  ADD COLUMN IF NOT EXISTS framer_cms_id TEXT,
  ADD COLUMN IF NOT EXISTS framer_last_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_staged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage_data JSONB DEFAULT '{}';

-- ============================================
-- framer_sync_jobs: job queue for cross-process sync
-- Studio creates jobs → Framer Plugin processes them
-- ============================================
CREATE TABLE IF NOT EXISTS framer_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL,          -- 'project' | 'press' | 'draft' | 'content'
  action TEXT NOT NULL,             -- 'publish' | 'hide'
  collection_name TEXT NOT NULL,    -- target Framer CMS collection name
  status TEXT DEFAULT 'pending',    -- 'pending' | 'processing' | 'done' | 'error'
  framer_cms_id TEXT,               -- filled by plugin after successful publish
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast pending job polling
CREATE INDEX IF NOT EXISTS framer_sync_jobs_status_idx ON framer_sync_jobs (status);
