-- Create Persona Alignment table
CREATE TABLE IF NOT EXISTS sys_user_persona (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demographics JSONB NOT NULL DEFAULT '{}'::jsonb,
    timeline JSONB NOT NULL DEFAULT '{}'::jsonb,
    citadel JSONB NOT NULL DEFAULT '{}'::jsonb,
    friction JSONB NOT NULL DEFAULT '{}'::jsonb,
    axioms JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: We assume a single-user system for the core persona profile. 
-- For multi-tenant, a user_id column with RLS would be added. 

-- Create an trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_persona_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_persona_modtime ON sys_user_persona;

CREATE TRIGGER update_user_persona_modtime
    BEFORE UPDATE ON sys_user_persona
    FOR EACH ROW
    EXECUTE FUNCTION update_persona_updated_at_column();

-- Add RLS Policies
ALTER TABLE sys_user_persona ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for public on persona" ON sys_user_persona
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Insert initial empty record if none exists
INSERT INTO sys_user_persona (id) 
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM sys_user_persona);
