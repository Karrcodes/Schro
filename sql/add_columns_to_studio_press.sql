-- Add is_archived and is_pinned columns to studio_press
ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
