-- Migration: Add posture column to sys_intelligence_messages
ALTER TABLE sys_intelligence_messages ADD COLUMN IF NOT EXISTS posture TEXT;

-- Update existing messages to 'vance' (default strategist) if helpful
UPDATE sys_intelligence_messages SET posture = 'vance' WHERE posture IS NULL AND role = 'assistant';
