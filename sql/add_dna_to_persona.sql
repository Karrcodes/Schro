-- Add identity_dna column to sys_user_persona if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_user_persona' AND column_name='identity_dna') THEN
        ALTER TABLE sys_user_persona ADD COLUMN identity_dna JSONB DEFAULT '{
            "anya": {"voice": "nova", "directives": ""},
            "vance": {"voice": "onyx", "directives": ""},
            "kael": {"voice": "alloy", "directives": ""}
        }'::jsonb;
    END IF;
END $$;
