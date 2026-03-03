-- Add spark support and impact score to studio milestones
DO $$ 
BEGIN
    -- 1. Add impact_score if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_milestones' AND column_name = 'impact_score') THEN
        ALTER TABLE studio_milestones ADD COLUMN impact_score INTEGER DEFAULT 5;
    END IF;

    -- 2. Add spark_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_milestones' AND column_name = 'spark_id') THEN
        ALTER TABLE studio_milestones ADD COLUMN spark_id UUID REFERENCES studio_sparks(id) ON DELETE CASCADE;
    END IF;

    -- 3. Make project_id nullable
    ALTER TABLE studio_milestones ALTER COLUMN project_id DROP NOT NULL;

    -- 4. Add constraint to ensure either project_id or spark_id is present
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'studio_milestones' AND constraint_name = 'milestone_target_check') THEN
        ALTER TABLE studio_milestones ADD CONSTRAINT milestone_target_check CHECK (
            (project_id IS NOT NULL AND spark_id IS NULL) OR 
            (project_id IS NULL AND spark_id IS NOT NULL) OR
            (project_id IS NOT NULL AND spark_id IS NOT NULL)
        );
    END IF;

END $$;
