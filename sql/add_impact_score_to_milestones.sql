-- Add impact_score to sys_milestones
ALTER TABLE sys_milestones ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 5;
