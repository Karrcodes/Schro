-- Update studio_projects to support multiple press items
ALTER TABLE studio_projects DROP COLUMN IF EXISTS press_id;
ALTER TABLE studio_projects ADD COLUMN IF NOT EXISTS press_ids uuid[] DEFAULT '{}';

-- Update studio_content to support multiple press items
ALTER TABLE studio_content DROP COLUMN IF EXISTS press_id;
ALTER TABLE studio_content ADD COLUMN IF NOT EXISTS press_ids uuid[] DEFAULT '{}';

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_studio_projects_press_ids ON studio_projects USING GIN (press_ids);
CREATE INDEX IF NOT EXISTS idx_studio_content_press_ids ON studio_content USING GIN (press_ids);
