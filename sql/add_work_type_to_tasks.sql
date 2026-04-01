-- Add work_type column to fin_tasks
ALTER TABLE fin_tasks 
ADD COLUMN IF NOT EXISTS work_type text DEFAULT 'light' CHECK (work_type IN ('light', 'deep'));

-- Comment for clarity
COMMENT ON COLUMN fin_tasks.work_type IS 'Segregates tasks into "light" (routine/chores) and "deep" (high-concentration business tasks).';
