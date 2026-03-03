-- Upgrade Studio Projects: Add priority and positioning columns
DO $$ 
BEGIN
    -- 1. Add priority if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_projects' AND column_name = 'priority') THEN
        ALTER TABLE studio_projects ADD COLUMN priority TEXT DEFAULT 'mid';
    END IF;

    -- 2. Add ai_position_x if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_projects' AND column_name = 'ai_position_x') THEN
        ALTER TABLE studio_projects ADD COLUMN ai_position_x DOUBLE PRECISION;
    END IF;

    -- 3. Add ai_position_y if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_projects' AND column_name = 'ai_position_y') THEN
        ALTER TABLE studio_projects ADD COLUMN ai_position_y DOUBLE PRECISION;
    END IF;

    -- 4. Ensure studio_milestones has category if not already there (safety)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_milestones' AND column_name = 'category') THEN
        ALTER TABLE studio_milestones ADD COLUMN category TEXT DEFAULT 'rnd';
    END IF;

END $$;
