-- Migration: Add linked savings support to wishlist
ALTER TABLE sys_wishlist ADD COLUMN IF NOT EXISTS linked_savings_id TEXT;
ALTER TABLE sys_wishlist ADD COLUMN IF NOT EXISTS linked_savings_type TEXT;

-- Comment on columns for clarity
COMMENT ON COLUMN sys_wishlist.linked_savings_id IS 'ID of the linked finance goal or monzo pot';
COMMENT ON COLUMN sys_wishlist.linked_savings_type IS 'Type of the linked savings: manual or monzo';
