-- Add is_independent flag to canvas entries
-- This allows items to exist on a mind map without appearing in the main notes board
-- They can be "converted" into notes later by setting this to false

ALTER TABLE studio_canvas_entries 
ADD COLUMN IF NOT EXISTS is_independent BOOLEAN DEFAULT FALSE;

-- Optional: Index for filtering in the board view
CREATE INDEX IF NOT EXISTS idx_canvas_entries_independent ON studio_canvas_entries(is_independent);
