-- Migration: Add sys_aspirations table for open-ended visionary goals
-- Created: 2026-04-04

CREATE TABLE IF NOT EXISTS sys_aspirations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    vision_image_url TEXT,
    horizon TEXT CHECK (horizon IN ('short', 'medium', 'long', 'legacy')),
    status TEXT CHECK (status IN ('active', 'integrated', 'archived')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE sys_aspirations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Users can manage their own aspirations" ON sys_aspirations;
CREATE POLICY "Users can manage their own aspirations"
ON sys_aspirations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_aspirations_user_id ON sys_aspirations(user_id);
CREATE INDEX IF NOT EXISTS idx_aspirations_status ON sys_aspirations(status);
