-- Migration: Add 'essential' to fin_tasks category CHECK constraint
-- Also adds it to fin_task_templates for consistency.

-- First, for fin_tasks (if it has a check constraint, we need to drop and recreate it)
-- Note: Checking if a constraint exists is simplified here.
DO $$ 
BEGIN 
    ALTER TABLE fin_tasks DROP CONSTRAINT IF EXISTS fin_tasks_category_check;
    ALTER TABLE fin_tasks ADD CONSTRAINT fin_tasks_category_check CHECK (category IN ('todo', 'grocery', 'reminder', 'essential'));
EXCEPTION WHEN undefined_object THEN
    -- If no constraint existed, just add it
    ALTER TABLE fin_tasks ADD CONSTRAINT fin_tasks_category_check CHECK (category IN ('todo', 'grocery', 'reminder', 'essential'));
END $$;

-- Same for fin_task_templates
DO $$ 
BEGIN 
    ALTER TABLE fin_task_templates DROP CONSTRAINT IF EXISTS fin_task_templates_category_check;
    ALTER TABLE fin_task_templates ADD CONSTRAINT fin_task_templates_category_check CHECK (category IN ('todo', 'grocery', 'reminder', 'essential'));
EXCEPTION WHEN undefined_object THEN
    ALTER TABLE fin_task_templates ADD CONSTRAINT fin_task_templates_category_check CHECK (category IN ('todo', 'grocery', 'reminder', 'essential'));
END $$;
