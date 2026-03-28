-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: sys_intelligence_sessions
CREATE TABLE IF NOT EXISTS sys_intelligence_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: sys_intelligence_messages
CREATE TABLE IF NOT EXISTS sys_intelligence_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sys_intelligence_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE sys_intelligence_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_intelligence_messages ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies for idempotency
DROP POLICY IF EXISTS "Allow all operations for anon on sessions" ON sys_intelligence_sessions;
DROP POLICY IF EXISTS "Allow all operations for anon on messages" ON sys_intelligence_messages;

CREATE POLICY "Allow all operations for anon on sessions" ON sys_intelligence_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon on messages" ON sys_intelligence_messages FOR ALL USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_intelligence_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sys_intelligence_sessions 
    SET updated_at = NOW() 
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cleanup for idempotency
DROP TRIGGER IF EXISTS update_session_timestamp_trigger ON sys_intelligence_messages;

CREATE TRIGGER update_session_timestamp_trigger
AFTER INSERT ON sys_intelligence_messages
FOR EACH ROW
EXECUTE FUNCTION update_intelligence_session_timestamp();
