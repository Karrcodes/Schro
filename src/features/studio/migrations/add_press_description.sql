-- Migration to add description field to studio_press
ALTER TABLE studio_press ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing records to use notes as description if empty
UPDATE studio_press SET description = notes WHERE description IS NULL AND notes IS NOT NULL;
