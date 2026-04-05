-- Strategic Parity Migration: Enable Categories and Milestones for Aspirations

-- 1. Add category support to sys_aspirations
ALTER TABLE sys_aspirations ADD COLUMN IF NOT EXISTS category TEXT;
-- Recommended: Add check constraint if you want strict enforcement
-- ALTER TABLE sys_aspirations ADD CONSTRAINT check_aspiration_category CHECK (category IN ('finance', 'health', 'career', 'personal'));

-- 2. Add milestone support to sys_aspirations
ALTER TABLE sys_milestones ADD COLUMN IF NOT EXISTS aspiration_id UUID REFERENCES sys_aspirations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_milestones_aspiration_id ON sys_milestones(aspiration_id);

COMMENT ON COLUMN sys_aspirations.category IS 'The strategic category this visionary vector belongs to (finance, health, career, etc).';
COMMENT ON COLUMN sys_milestones.aspiration_id IS 'Link to the Aspiration (Visionary Vector) this milestone belongs to.';
