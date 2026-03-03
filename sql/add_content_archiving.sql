-- Add is_archived to studio_content
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_content' AND column_name = 'is_archived') THEN
        ALTER TABLE studio_content ADD COLUMN is_archived BOOLEAN DEFAULT false;
    END IF;
END $$;
