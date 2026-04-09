-- Create Waitlist Table
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (standard for API routes)
CREATE POLICY "Service role can manage waitlist" ON waitlist
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow public to INSERT but not SELECT/UPDATE (prevents email scraping)
CREATE POLICY "Public can join waitlist" ON waitlist
    FOR INSERT
    TO public
    WITH CHECK (true);
