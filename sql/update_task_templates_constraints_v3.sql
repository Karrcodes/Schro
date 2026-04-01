-- Migration to expand fin_task_templates check constraints for Business and Super Priority
-- Standardizing on ('super', 'high', 'mid', 'low') and including business strategic categories
-- Adding Engagement Mode (Work Type) support

DO $$ 
BEGIN
    -- 1. Update fin_task_templates Priority Constraint
    ALTER TABLE public.fin_task_templates DROP CONSTRAINT IF EXISTS fin_task_templates_priority_check;
    UPDATE public.fin_task_templates SET priority = 'super' WHERE priority = 'urgent';
    ALTER TABLE public.fin_task_templates ADD CONSTRAINT fin_task_templates_priority_check 
        CHECK (priority IN ('super', 'high', 'mid', 'low'));

    -- 2. Update fin_task_templates Strategic Category Constraint
    ALTER TABLE public.fin_task_templates DROP CONSTRAINT IF EXISTS fin_task_templates_strategic_category_check;
    ALTER TABLE public.fin_task_templates ADD CONSTRAINT fin_task_templates_strategic_category_check 
        CHECK (strategic_category IN ('finance', 'career', 'health', 'personal', 'rnd', 'production', 'media', 'growth', 'general'));

    -- 3. Update fin_task_templates Due Date Mode Constraint
    ALTER TABLE public.fin_task_templates DROP CONSTRAINT IF EXISTS fin_task_templates_due_date_mode_check;
    ALTER TABLE public.fin_task_templates ADD CONSTRAINT fin_task_templates_due_date_mode_check 
        CHECK (due_date_mode IN ('on', 'before', 'range', 'none'));

    -- 4. Add Engagement Mode Support
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_task_templates' AND column_name = 'work_type') THEN
        ALTER TABLE public.fin_task_templates ADD COLUMN work_type text DEFAULT 'light';
        ALTER TABLE public.fin_task_templates ADD CONSTRAINT fin_task_templates_work_type_check CHECK (work_type IN ('light', 'deep'));
    END IF;

    -- 5. Ensure fin_tasks aligns as well
    ALTER TABLE public.fin_tasks DROP CONSTRAINT IF EXISTS valid_priority;
    ALTER TABLE public.fin_tasks ADD CONSTRAINT valid_priority 
        CHECK (priority IN ('super', 'high', 'mid', 'low'));

END $$;
