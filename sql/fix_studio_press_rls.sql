-- Drop the existing restricted policy if it exists
DROP POLICY IF EXISTS "Enable all for authenticated users" ON studio_press;
DROP POLICY IF EXISTS "Enable all operations for all users" ON studio_press;

-- Create a new policy allowing all operations for the public role
CREATE POLICY "Enable all operations for all users" ON studio_press FOR ALL TO public USING (true) WITH CHECK (true);
