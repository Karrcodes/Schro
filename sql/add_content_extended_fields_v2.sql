-- Add cover_url and impact_score to studio_content for richer content creation
ALTER TABLE studio_content ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE studio_content ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 5;
ALTER TABLE studio_content ADD COLUMN IF NOT EXISTS deadline TEXT;
