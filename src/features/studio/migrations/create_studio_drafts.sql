-- Create Studio Drafts Table
CREATE TABLE IF NOT EXISTS studio_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES studio_projects(id) ON DELETE CASCADE,
    content_id UUID REFERENCES studio_content(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    node_references JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft',
    last_snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_studio_drafts_project_id ON studio_drafts(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_drafts_content_id ON studio_drafts(content_id);

-- Enable RLS
ALTER TABLE studio_drafts ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy (Adjust based on your user_id column if applicable)
CREATE POLICY "Enable all for everyone" ON studio_drafts FOR ALL USING (true) WITH CHECK (true);
