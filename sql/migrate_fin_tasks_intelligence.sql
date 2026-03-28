-- Migration: Evolve fin_tasks to support full Neural Task model
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'low';
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS due_date_mode TEXT DEFAULT 'on';
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS notes JSONB;
-- If already exists as text, you may need: ALTER TABLE fin_tasks ALTER COLUMN notes TYPE JSONB USING notes::jsonb;
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS position BIGINT;
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS user_id UUID;
-- If already exists with reference: ALTER TABLE fin_tasks DROP CONSTRAINT IF EXISTS fin_tasks_user_id_fkey;

-- Add missing columns from TasksContext.tsx
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS strategic_category TEXT;
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS impact_score INTEGER;
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS amount DECIMAL;
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS location TEXT;
