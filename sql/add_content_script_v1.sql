-- Add script column to studio_content for the Script & Brainstorm workspace
ALTER TABLE studio_content ADD COLUMN IF NOT EXISTS script TEXT;
