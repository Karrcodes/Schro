-- Migration: Dynamic Task Presets & Cross-Device Vault
-- Fixes missing columns in fin_task_templates and fin_tasks
-- Adds vault settings to user_profiles for cross-device locking

DO $$ 
BEGIN
    -- 1. Ensure fin_task_templates has all required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_task_templates' AND column_name = 'dynamic_params') THEN
        ALTER TABLE public.fin_task_templates ADD COLUMN dynamic_params text[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_task_templates' AND column_name = 'work_type') THEN
        ALTER TABLE public.fin_task_templates ADD COLUMN work_type text DEFAULT 'light';
        -- Add constraint if not exists (using DO block for safety)
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fin_task_templates_work_type_check') THEN
            ALTER TABLE public.fin_task_templates ADD CONSTRAINT fin_task_templates_work_type_check CHECK (work_type IN ('light', 'deep'));
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_task_templates' AND column_name = 'project_id') THEN
        ALTER TABLE public.fin_task_templates ADD COLUMN project_id uuid REFERENCES public.studio_projects(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_task_templates' AND column_name = 'content_id') THEN
        ALTER TABLE public.fin_task_templates ADD COLUMN content_id uuid REFERENCES public.studio_content(id) ON DELETE SET NULL;
    END IF;

    -- 2. Ensure fin_tasks has all required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_tasks' AND column_name = 'work_type') THEN
        ALTER TABLE public.fin_tasks ADD COLUMN work_type text DEFAULT 'light';
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fin_tasks_work_type_check') THEN
            ALTER TABLE public.fin_tasks ADD CONSTRAINT fin_tasks_work_type_check CHECK (work_type IN ('light', 'deep'));
        END IF;
    END IF;

    -- 3. Add Vault Settings to user_profiles for cross-device support
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'vault_pin') THEN
        ALTER TABLE public.user_profiles ADD COLUMN vault_pin text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'vault_locked') THEN
        ALTER TABLE public.user_profiles ADD COLUMN vault_locked boolean DEFAULT false;
    END IF;

END $$;
