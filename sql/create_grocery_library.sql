-- Table for storing unique grocery items from receipts
CREATE TABLE IF NOT EXISTS grocery_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Optional depending on auth setup, but good for future
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    store TEXT NOT NULL,
    last_bought_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, store)
);

-- Add price column to fin_tasks for current shopping list totaling
ALTER TABLE fin_tasks ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- RLS for internal library
ALTER TABLE grocery_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon" ON grocery_library FOR ALL USING (true);
