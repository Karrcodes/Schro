-- Add is_pinned column to sys_intelligence_sessions
ALTER TABLE sys_intelligence_sessions
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Add a comment for documentation
COMMENT ON COLUMN sys_intelligence_sessions.is_pinned IS 'Allows the user to pin important conversations to the top of their history sidebar';
