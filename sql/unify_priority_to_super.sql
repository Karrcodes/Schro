-- Migration to unify priority levels and fix missing columns/constraints
-- Standardizing on ('super', 'high', 'mid', 'low')

DO $$ 
BEGIN
    -- 1. Update fin_tasks Priority
    ALTER TABLE fin_tasks DROP CONSTRAINT IF EXISTS valid_priority;
    UPDATE fin_tasks SET priority = 'super' WHERE priority = 'urgent';
    ALTER TABLE fin_tasks ADD CONSTRAINT valid_priority CHECK (priority IN ('super', 'high', 'mid', 'low'));

    -- 2. Update fin_tasks due_date_mode (Frontend sends 'none')
    ALTER TABLE fin_tasks DROP CONSTRAINT IF EXISTS fin_tasks_due_date_mode_check;
    ALTER TABLE fin_tasks ADD CONSTRAINT fin_tasks_due_date_mode_check CHECK (due_date_mode IN ('on', 'before', 'range', 'none'));

    -- 3. Update sys_goals Priority
    UPDATE sys_goals SET priority = 'super' WHERE priority = 'urgent';

    -- 4. Update fin_task_templates
    ALTER TABLE fin_task_templates DROP CONSTRAINT IF EXISTS fin_task_templates_priority_check;
    UPDATE fin_task_templates SET priority = 'super' WHERE priority = 'urgent';
    ALTER TABLE fin_task_templates ADD CONSTRAINT fin_task_templates_priority_check CHECK (priority IN ('super', 'high', 'mid', 'low'));

    -- Expand strategic_category in templates
    ALTER TABLE fin_task_templates DROP CONSTRAINT IF EXISTS fin_task_templates_strategic_category_check;
    ALTER TABLE fin_task_templates ADD CONSTRAINT fin_task_templates_strategic_category_check 
        CHECK (strategic_category IN ('finance', 'career', 'health', 'personal', 'rnd', 'production', 'media', 'growth', 'general'));

    -- Expand due_date_mode in templates
    ALTER TABLE fin_task_templates DROP CONSTRAINT IF EXISTS fin_task_templates_due_date_mode_check;
    ALTER TABLE fin_task_templates ADD CONSTRAINT fin_task_templates_due_date_mode_check CHECK (due_date_mode IN ('on', 'before', 'range', 'none'));

    -- 5. Update Studio Projects
    UPDATE studio_projects SET priority = 'super' WHERE priority = 'urgent';

    -- 6. Update Studio Content
    UPDATE studio_content SET priority = 'super' WHERE priority = 'urgent';

    -- 7. Fix Studio Milestones
    -- Add priority column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_milestones' AND column_name = 'priority') THEN
        ALTER TABLE studio_milestones ADD COLUMN priority TEXT DEFAULT 'mid';
    END IF;
    
    -- Update existing values
    UPDATE studio_milestones SET priority = 'super' WHERE priority = 'urgent';

END $$;
