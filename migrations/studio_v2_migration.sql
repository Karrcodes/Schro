-- Schrö Studio Enhancement Migration (v2)
-- Execute this in your Supabase SQL Editor to align with recent Studio features.

-- 1. Ensure studio_drafts table exists for Articles
CREATE TABLE IF NOT EXISTS studio_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
    content_id UUID REFERENCES studio_content(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Article',
    body TEXT NOT NULL DEFAULT '',
    node_references JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'revision', 'completed', 'published')),
    published_at TIMESTAMPTZ,
    published_url TEXT,
    is_archived BOOLEAN DEFAULT false,
    pinned BOOLEAN DEFAULT false,
    last_snapshot_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add published metadata if table already exists
DO $$ 
BEGIN 
    IF (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_drafts')) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_drafts' AND column_name='published_at') THEN
            ALTER TABLE studio_drafts ADD COLUMN published_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_drafts' AND column_name='published_url') THEN
            ALTER TABLE studio_drafts ADD COLUMN published_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_drafts' AND column_name='node_references') THEN
            ALTER TABLE studio_drafts ADD COLUMN node_references JSONB DEFAULT '[]'::jsonb;
        END IF;
    END IF;
END $$;

-- 3. Align studio_projects with GTV and Focus Map features
DO $$ 
BEGIN 
    IF (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_projects')) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_projects' AND column_name='cover_url') THEN
            ALTER TABLE studio_projects ADD COLUMN cover_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_projects' AND column_name='gtv_featured') THEN
            ALTER TABLE studio_projects ADD COLUMN gtv_featured BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_projects' AND column_name='impact_score') THEN
            ALTER TABLE studio_projects ADD COLUMN impact_score INTEGER DEFAULT 5;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_projects' AND column_name='ai_position_x') THEN
            ALTER TABLE studio_projects ADD COLUMN ai_position_x FLOAT;
            ALTER TABLE studio_projects ADD COLUMN ai_position_y FLOAT;
        END IF;
    END IF;
END $$;

-- 4. Align studio_content with new pipeline features
DO $$ 
BEGIN 
    IF (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_content')) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_content' AND column_name='cover_url') THEN
            ALTER TABLE studio_content ADD COLUMN cover_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_content' AND column_name='impact_score') THEN
            ALTER TABLE studio_content ADD COLUMN impact_score INTEGER DEFAULT 5;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_content' AND column_name='platforms') THEN
            ALTER TABLE studio_content ADD COLUMN platforms TEXT[] DEFAULT '{}';
        END IF;
    END IF;
END $$;

-- 5. Align studio_press with GTV Portfolio features
DO $$ 
BEGIN 
    IF (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_press')) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_press' AND column_name='gtv_category') THEN
            ALTER TABLE studio_press ADD COLUMN gtv_category TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_press' AND column_name='project_id') THEN
            ALTER TABLE studio_press ADD COLUMN project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 6. Enable RLS (Recommended)
ALTER TABLE IF EXISTS studio_drafts ENABLE ROW LEVEL SECURITY;

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON studio_drafts;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON studio_drafts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
