-- Migration: Add linked savings support and milestone weighting
ALTER TABLE sys_goals ADD COLUMN IF NOT EXISTS linked_savings_id TEXT;
ALTER TABLE sys_goals ADD COLUMN IF NOT EXISTS linked_savings_type TEXT;

-- Add impact_score to milestones
ALTER TABLE sys_milestones ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 5;

-- (Optional) Comment on columns for clarity
COMMENT ON COLUMN sys_goals.linked_savings_id IS 'ID of the linked finance goal or monzo pot';
COMMENT ON COLUMN sys_goals.linked_savings_type IS 'Type of the linked savings: manual or monzo';
COMMENT ON COLUMN sys_milestones.impact_score IS 'Relative importance of this milestone (1-10)';
