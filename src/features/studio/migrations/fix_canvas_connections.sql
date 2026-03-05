-- Migration to allow connections between different types of nodes (Entries, Projects, Content)
-- The current studio_canvas_connections table likely has foreign keys to studio_canvas_entries.
-- We need to remove these to allow polymorphic connections.

-- 1. Remove the existing foreign key constraints on from_id and to_id
-- You may need to verify the exact constraint names using:
-- SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'studio_canvas_connections' AND constraint_type = 'FOREIGN KEY';

ALTER TABLE studio_canvas_connections DROP CONSTRAINT IF EXISTS studio_canvas_connections_from_id_fkey;
ALTER TABLE studio_canvas_connections DROP CONSTRAINT IF EXISTS studio_canvas_connections_to_id_fkey;

-- 2. Optional: Add a 'type' column if you want to track node types explicitly, 
-- but since IDs are UUIDs, we can just let them be loose for now to keep the schema simple.

-- 3. Ensure the columns remain UUIDs and are mandatory
ALTER TABLE studio_canvas_connections ALTER COLUMN from_id SET NOT NULL;
ALTER TABLE studio_canvas_connections ALTER COLUMN to_id SET NOT NULL;

-- 4. Re-verify connectivity is working in the app.
