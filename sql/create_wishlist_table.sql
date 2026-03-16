-- Manifest Wishlist Table
CREATE TABLE IF NOT EXISTS public.sys_wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12, 2),
    url TEXT,
    image_url TEXT,
    category TEXT DEFAULT 'personal', -- matches GoalCategory
    priority TEXT DEFAULT 'mid', -- high, mid, low
    status TEXT DEFAULT 'wanted', -- wanted, acquired, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.sys_wishlist ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own wishlist' AND tablename = 'sys_wishlist') THEN
        CREATE POLICY "Users can view their own wishlist" ON public.sys_wishlist FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own wishlist' AND tablename = 'sys_wishlist') THEN
        CREATE POLICY "Users can insert their own wishlist" ON public.sys_wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own wishlist' AND tablename = 'sys_wishlist') THEN
        CREATE POLICY "Users can update their own wishlist" ON public.sys_wishlist FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own wishlist' AND tablename = 'sys_wishlist') THEN
        CREATE POLICY "Users can delete their own wishlist" ON public.sys_wishlist FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
