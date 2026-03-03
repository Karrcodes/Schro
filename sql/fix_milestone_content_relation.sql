-- Add content_id to studio_milestones and update target constraint
DO $$ 
BEGIN
    -- 1. Add content_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_milestones' AND column_name = 'content_id') THEN
        ALTER TABLE studio_milestones ADD COLUMN content_id UUID REFERENCES studio_content(id) ON DELETE CASCADE;
    END IF;

    -- 2. Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'studio_milestones' AND constraint_name = 'milestone_target_check') THEN
        ALTER TABLE studio_milestones DROP CONSTRAINT milestone_target_check;
    END IF;

    -- 3. Add updated constraint to ensure at least one of project_id, spark_id, or content_id is present
    ALTER TABLE studio_milestones ADD CONSTRAINT milestone_target_check CHECK (
        (project_id IS NOT NULL) OR 
        (spark_id IS NOT NULL) OR
        (content_id IS NOT NULL)
    );

    -- 4. Add index for performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'studio_milestones' AND indexname = 'idx_studio_milestones_content_id') THEN
        CREATE INDEX idx_studio_milestones_content_id ON studio_milestones(content_id);
    END IF;

END $$;
