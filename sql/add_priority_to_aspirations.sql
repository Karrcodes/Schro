-- Migration: Add priority settings to the Dreams (sys_aspirations) table
-- Created: 2026-04-04

-- Add priority column with default 'mid'
ALTER TABLE sys_aspirations 
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('super', 'high', 'mid', 'low')) DEFAULT 'mid';

-- Backfill existing aspirations to 'mid' if necessary
UPDATE sys_aspirations SET priority = 'mid' WHERE priority IS NULL;
