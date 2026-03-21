-- Create storage bucket for studio assets (covers, project images, etc.)
-- Run this in the Supabase SQL Editor

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('studio-assets', 'studio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Clear out any old/conflicting policies for this bucket
DROP POLICY IF EXISTS "Studio Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Studio Public Full Access" ON storage.objects;

-- 3. Public Read Access
CREATE POLICY "Studio Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'studio-assets' );

-- 4. Full Access for ALL Users (Public/Anonymous)
-- This matches the pattern in create_goal_images_bucket.sql
CREATE POLICY "Studio Public Full Access"
ON storage.objects FOR ALL
TO public
USING ( bucket_id = 'studio-assets' )
WITH CHECK ( bucket_id = 'studio-assets' );
