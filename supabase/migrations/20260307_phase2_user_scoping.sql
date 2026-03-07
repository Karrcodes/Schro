
-- ============================================================================
-- Phase 2: Data Isolation (Robust Version 5)
-- Safely drops DEFAULT constraints before altering column types.
-- ============================================================================

CREATE OR REPLACE FUNCTION set_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
    admin_uuid UUID;
    pol RECORD;
BEGIN
    SELECT id INTO admin_uuid FROM auth.users WHERE email = 'abduluk98@gmail.com' LIMIT 1;
    
    IF admin_uuid IS NULL THEN
        RAISE EXCEPTION 'Admin user (abduluk98@gmail.com) not found in auth.users.';
    END IF;

    -- Table: fin_authorized_devices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_authorized_devices' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_authorized_devices' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_authorized_devices';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_authorized_devices' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_authorized_devices ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_authorized_devices SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_authorized_devices ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_authorized_devices' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_authorized_devices ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_authorized_devices SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_authorized_devices ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_authorized_devices SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_authorized_devices';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_authorized_devices FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_authorized_devices ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_authorized_devices" ON public.fin_authorized_devices FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_authorized_devices" ON public.fin_authorized_devices FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_authorized_devices" ON public.fin_authorized_devices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_authorized_devices" ON public.fin_authorized_devices FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_day_planner_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_day_planner_settings' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_day_planner_settings' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_day_planner_settings';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_day_planner_settings' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_day_planner_settings ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_day_planner_settings SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_day_planner_settings ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_day_planner_settings' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_day_planner_settings ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_day_planner_settings SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_day_planner_settings ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_day_planner_settings SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_day_planner_settings';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_day_planner_settings FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_day_planner_settings ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_day_planner_settings" ON public.fin_day_planner_settings FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_day_planner_settings" ON public.fin_day_planner_settings FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_day_planner_settings" ON public.fin_day_planner_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_day_planner_settings" ON public.fin_day_planner_settings FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_goals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_goals' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_goals' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_goals';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_goals' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_goals ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_goals SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_goals ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_goals' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_goals ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_goals SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_goals ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_goals SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_goals';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_goals FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_goals ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_goals" ON public.fin_goals FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_goals" ON public.fin_goals FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_goals" ON public.fin_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_goals" ON public.fin_goals FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_income
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_income' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_income' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_income';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_income' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_income ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_income SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_income ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_income' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_income ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_income SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_income ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_income SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_income';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_income FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_income ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_income" ON public.fin_income FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_income" ON public.fin_income FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_income" ON public.fin_income FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_income" ON public.fin_income FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_payslips
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_payslips' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_payslips' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_payslips';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_payslips' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_payslips ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_payslips SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_payslips ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_payslips' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_payslips ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_payslips SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_payslips ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_payslips SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_payslips';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_payslips FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_payslips ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_payslips" ON public.fin_payslips FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_payslips" ON public.fin_payslips FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_payslips" ON public.fin_payslips FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_payslips" ON public.fin_payslips FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_planner_initializations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_planner_initializations' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_planner_initializations' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_planner_initializations';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_planner_initializations' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_planner_initializations ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_planner_initializations SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_planner_initializations ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_planner_initializations' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_planner_initializations ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_planner_initializations SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_planner_initializations ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_planner_initializations SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_planner_initializations';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_planner_initializations FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_planner_initializations ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_planner_initializations" ON public.fin_planner_initializations FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_planner_initializations" ON public.fin_planner_initializations FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_planner_initializations" ON public.fin_planner_initializations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_planner_initializations" ON public.fin_planner_initializations FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_pockets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_pockets' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_pockets' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_pockets';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_pockets' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_pockets ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_pockets SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_pockets ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_pockets' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_pockets ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_pockets SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_pockets ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_pockets SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_pockets';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_pockets FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_pockets ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_pockets" ON public.fin_pockets FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_pockets" ON public.fin_pockets FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_pockets" ON public.fin_pockets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_pockets" ON public.fin_pockets FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_recurring
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_recurring' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_recurring' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_recurring';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_recurring' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_recurring ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_recurring SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_recurring ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_recurring' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_recurring ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_recurring SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_recurring ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_recurring SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_recurring';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_recurring FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_recurring ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_recurring" ON public.fin_recurring FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_recurring" ON public.fin_recurring FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_recurring" ON public.fin_recurring FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_recurring" ON public.fin_recurring FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_rota_overrides
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_rota_overrides' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_rota_overrides' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_rota_overrides';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_rota_overrides' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_rota_overrides ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_rota_overrides SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_rota_overrides ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_rota_overrides' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_rota_overrides ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_rota_overrides SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_rota_overrides ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_rota_overrides SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_rota_overrides';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_rota_overrides FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_rota_overrides ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_rota_overrides" ON public.fin_rota_overrides FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_rota_overrides" ON public.fin_rota_overrides FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_rota_overrides" ON public.fin_rota_overrides FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_rota_overrides" ON public.fin_rota_overrides FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_secrets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_secrets' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_secrets' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_secrets';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_secrets' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_secrets ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_secrets SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_secrets ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_secrets' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_secrets ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_secrets SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_secrets ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_secrets SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_secrets';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_secrets FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_secrets ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_secrets" ON public.fin_secrets FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_secrets" ON public.fin_secrets FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_secrets" ON public.fin_secrets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_secrets" ON public.fin_secrets FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_settings' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_settings' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_settings';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_settings' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_settings ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_settings SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_settings ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_settings' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_settings ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_settings SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_settings ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_settings SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_settings';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_settings FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_settings ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_settings" ON public.fin_settings FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_settings" ON public.fin_settings FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_settings" ON public.fin_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_settings" ON public.fin_settings FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_task_templates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_task_templates' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_task_templates' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_task_templates';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_task_templates' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_task_templates ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_task_templates SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_task_templates ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_task_templates' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_task_templates ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_task_templates SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_task_templates ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_task_templates SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_task_templates';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_task_templates FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_task_templates ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_task_templates" ON public.fin_task_templates FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_task_templates" ON public.fin_task_templates FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_task_templates" ON public.fin_task_templates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_task_templates" ON public.fin_task_templates FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_tasks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_tasks' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_tasks' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_tasks';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_tasks' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_tasks ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_tasks SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_tasks ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_tasks' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_tasks ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_tasks SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_tasks ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_tasks SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_tasks';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_tasks FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_tasks ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_tasks" ON public.fin_tasks FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_tasks" ON public.fin_tasks FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_tasks" ON public.fin_tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_tasks" ON public.fin_tasks FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: fin_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fin_transactions' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fin_transactions' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.fin_transactions';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_transactions' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.fin_transactions ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.fin_transactions SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.fin_transactions ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fin_transactions' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.fin_transactions ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.fin_transactions SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.fin_transactions ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.fin_transactions SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.fin_transactions';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.fin_transactions FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own fin_transactions" ON public.fin_transactions FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own fin_transactions" ON public.fin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own fin_transactions" ON public.fin_transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own fin_transactions" ON public.fin_transactions FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: finance_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_settings' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'finance_settings' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.finance_settings';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_settings' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.finance_settings ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.finance_settings SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.finance_settings ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_settings' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.finance_settings ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.finance_settings SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.finance_settings ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.finance_settings SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.finance_settings';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.finance_settings FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own finance_settings" ON public.finance_settings FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own finance_settings" ON public.finance_settings FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own finance_settings" ON public.finance_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own finance_settings" ON public.finance_settings FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_canvas_connections
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_canvas_connections' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_canvas_connections' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_canvas_connections';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_canvas_connections' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_canvas_connections ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_canvas_connections SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_canvas_connections ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_canvas_connections' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_canvas_connections ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_canvas_connections SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_canvas_connections ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_canvas_connections SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_canvas_connections';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_canvas_connections FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_canvas_connections ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_canvas_connections" ON public.studio_canvas_connections FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_canvas_connections" ON public.studio_canvas_connections FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_canvas_connections" ON public.studio_canvas_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_canvas_connections" ON public.studio_canvas_connections FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_canvas_entries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_canvas_entries' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_canvas_entries' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_canvas_entries';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_canvas_entries' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_canvas_entries ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_canvas_entries SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_canvas_entries ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_canvas_entries' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_canvas_entries ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_canvas_entries SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_canvas_entries ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_canvas_entries SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_canvas_entries';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_canvas_entries FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_canvas_entries ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_canvas_entries" ON public.studio_canvas_entries FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_canvas_entries" ON public.studio_canvas_entries FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_canvas_entries" ON public.studio_canvas_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_canvas_entries" ON public.studio_canvas_entries FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_canvas_map_nodes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_canvas_map_nodes' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_canvas_map_nodes' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_canvas_map_nodes';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_canvas_map_nodes' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_canvas_map_nodes ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_canvas_map_nodes SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_canvas_map_nodes ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_canvas_map_nodes' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_canvas_map_nodes ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_canvas_map_nodes SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_canvas_map_nodes ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_canvas_map_nodes SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_canvas_map_nodes';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_canvas_map_nodes FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_canvas_map_nodes ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_canvas_map_nodes" ON public.studio_canvas_map_nodes FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_canvas_map_nodes" ON public.studio_canvas_map_nodes FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_canvas_map_nodes" ON public.studio_canvas_map_nodes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_canvas_map_nodes" ON public.studio_canvas_map_nodes FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_canvas_maps
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_canvas_maps' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_canvas_maps' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_canvas_maps';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_canvas_maps' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_canvas_maps ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_canvas_maps SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_canvas_maps ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_canvas_maps' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_canvas_maps ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_canvas_maps SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_canvas_maps ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_canvas_maps SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_canvas_maps';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_canvas_maps FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_canvas_maps ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_canvas_maps" ON public.studio_canvas_maps FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_canvas_maps" ON public.studio_canvas_maps FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_canvas_maps" ON public.studio_canvas_maps FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_canvas_maps" ON public.studio_canvas_maps FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_content
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_content' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_content' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_content';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_content' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_content ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_content SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_content ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_content' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_content ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_content SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_content ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_content SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_content';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_content FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_content ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_content" ON public.studio_content FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_content" ON public.studio_content FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_content" ON public.studio_content FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_content" ON public.studio_content FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_drafts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_drafts' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_drafts' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_drafts';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_drafts' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_drafts ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_drafts SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_drafts ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_drafts' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_drafts ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_drafts SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_drafts ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_drafts SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_drafts';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_drafts FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_drafts ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_drafts" ON public.studio_drafts FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_drafts" ON public.studio_drafts FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_drafts" ON public.studio_drafts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_drafts" ON public.studio_drafts FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_milestones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_milestones' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_milestones' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_milestones';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_milestones' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_milestones ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_milestones SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_milestones ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_milestones' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_milestones ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_milestones SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_milestones ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_milestones SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_milestones';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_milestones FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_milestones ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_milestones" ON public.studio_milestones FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_milestones" ON public.studio_milestones FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_milestones" ON public.studio_milestones FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_milestones" ON public.studio_milestones FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_networks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_networks' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_networks' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_networks';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_networks' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_networks ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_networks SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_networks ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_networks' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_networks ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_networks SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_networks ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_networks SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_networks';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_networks FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_networks ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_networks" ON public.studio_networks FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_networks" ON public.studio_networks FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_networks" ON public.studio_networks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_networks" ON public.studio_networks FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_press
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_press' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_press' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_press';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_press' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_press ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_press SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_press ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_press' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_press ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_press SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_press ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_press SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_press';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_press FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_press ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_press" ON public.studio_press FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_press" ON public.studio_press FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_press" ON public.studio_press FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_press" ON public.studio_press FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_projects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_projects' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_projects' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_projects';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_projects' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_projects ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_projects SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_projects ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_projects' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_projects ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_projects SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_projects ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_projects SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_projects';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_projects FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_projects" ON public.studio_projects FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_projects" ON public.studio_projects FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_projects" ON public.studio_projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_projects" ON public.studio_projects FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: studio_sparks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='studio_sparks' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'studio_sparks' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.studio_sparks';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_sparks' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.studio_sparks ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.studio_sparks SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.studio_sparks ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studio_sparks' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.studio_sparks ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.studio_sparks SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.studio_sparks ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.studio_sparks SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.studio_sparks';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.studio_sparks FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.studio_sparks ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own studio_sparks" ON public.studio_sparks FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own studio_sparks" ON public.studio_sparks FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own studio_sparks" ON public.studio_sparks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own studio_sparks" ON public.studio_sparks FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: sys_clipboard
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sys_clipboard' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sys_clipboard' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.sys_clipboard';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_clipboard' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.sys_clipboard ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.sys_clipboard SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.sys_clipboard ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_clipboard' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.sys_clipboard ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.sys_clipboard SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.sys_clipboard ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.sys_clipboard SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.sys_clipboard';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.sys_clipboard FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.sys_clipboard ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own sys_clipboard" ON public.sys_clipboard FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own sys_clipboard" ON public.sys_clipboard FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own sys_clipboard" ON public.sys_clipboard FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own sys_clipboard" ON public.sys_clipboard FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: sys_goals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sys_goals' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sys_goals' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.sys_goals';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_goals' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.sys_goals ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.sys_goals SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.sys_goals ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_goals' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.sys_goals ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.sys_goals SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.sys_goals ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.sys_goals SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.sys_goals';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.sys_goals FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.sys_goals ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own sys_goals" ON public.sys_goals FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own sys_goals" ON public.sys_goals FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own sys_goals" ON public.sys_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own sys_goals" ON public.sys_goals FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: sys_milestones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sys_milestones' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sys_milestones' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.sys_milestones';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_milestones' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.sys_milestones ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.sys_milestones SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.sys_milestones ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_milestones' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.sys_milestones ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.sys_milestones SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.sys_milestones ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.sys_milestones SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.sys_milestones';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.sys_milestones FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.sys_milestones ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own sys_milestones" ON public.sys_milestones FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own sys_milestones" ON public.sys_milestones FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own sys_milestones" ON public.sys_milestones FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own sys_milestones" ON public.sys_milestones FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: sys_push_subscriptions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sys_push_subscriptions' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sys_push_subscriptions' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.sys_push_subscriptions';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_push_subscriptions' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.sys_push_subscriptions ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.sys_push_subscriptions SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.sys_push_subscriptions ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_push_subscriptions' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.sys_push_subscriptions ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.sys_push_subscriptions SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.sys_push_subscriptions ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.sys_push_subscriptions SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.sys_push_subscriptions';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.sys_push_subscriptions FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.sys_push_subscriptions ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own sys_push_subscriptions" ON public.sys_push_subscriptions FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own sys_push_subscriptions" ON public.sys_push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own sys_push_subscriptions" ON public.sys_push_subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own sys_push_subscriptions" ON public.sys_push_subscriptions FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: sys_secrets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sys_secrets' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sys_secrets' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.sys_secrets';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_secrets' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.sys_secrets ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.sys_secrets SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.sys_secrets ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sys_secrets' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.sys_secrets ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.sys_secrets SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.sys_secrets ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.sys_secrets SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.sys_secrets';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.sys_secrets FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.sys_secrets ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own sys_secrets" ON public.sys_secrets FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own sys_secrets" ON public.sys_secrets FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own sys_secrets" ON public.sys_secrets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own sys_secrets" ON public.sys_secrets FOR DELETE USING (auth.uid() = user_id)';
    END IF;

    -- Table: vault_assets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vault_assets' AND table_type='BASE TABLE') THEN
        
        -- 0. Drop policies to free up the column
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vault_assets' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.vault_assets';
        END LOOP;

        -- 1. If user_id is text, sanitize it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vault_assets' AND column_name='user_id' AND data_type='text') THEN
            
            -- Drop any existing DEFAULT constraint (e.g. DEFAULT '') that prevents casting
            EXECUTE 'ALTER TABLE public.vault_assets ALTER COLUMN user_id DROP DEFAULT';
            
            -- Overwrite any existing value (e.g. "karr") with the valid Admin UUID string
            EXECUTE 'UPDATE public.vault_assets SET user_id = $1::text' USING admin_uuid;
            
            -- Now we can safely alter the column TYPE
            EXECUTE 'ALTER TABLE public.vault_assets ALTER COLUMN user_id TYPE UUID USING user_id::UUID';
        END IF;

        -- 2. If it doesn't exist at all, add it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vault_assets' AND column_name='user_id') THEN
            EXECUTE 'ALTER TABLE public.vault_assets ADD COLUMN user_id UUID REFERENCES auth.users(id)';
            EXECUTE 'UPDATE public.vault_assets SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;
            EXECUTE 'ALTER TABLE public.vault_assets ALTER COLUMN user_id SET NOT NULL';
        END IF;

        -- 3. In case we skipped the ADD COLUMN because it existed, but it had nulls, backfill it
        EXECUTE 'UPDATE public.vault_assets SET user_id = $1 WHERE user_id IS NULL' USING admin_uuid;

        -- 4. Triggers
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_user_id ON public.vault_assets';
        EXECUTE 'CREATE TRIGGER trigger_set_user_id BEFORE INSERT ON public.vault_assets FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert()';

        -- 5. RLS
        EXECUTE 'ALTER TABLE public.vault_assets ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'CREATE POLICY "Users can view their own vault_assets" ON public.vault_assets FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can insert their own vault_assets" ON public.vault_assets FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own vault_assets" ON public.vault_assets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can delete their own vault_assets" ON public.vault_assets FOR DELETE USING (auth.uid() = user_id)';
    END IF;

END $$;

-- ============================================================================
-- Phase 2.5: Update Monzo Webhook RPC to inherit user_id
-- ============================================================================

CREATE OR REPLACE FUNCTION process_monzo_transaction(
    p_provider_tx_id TEXT,
    p_description TEXT,
    p_amount NUMERIC,
    p_type TEXT,
    p_category TEXT,
    p_pocket_id UUID,
    p_profile TEXT,
    p_date TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
    v_exists BOOLEAN;
    v_user_id UUID;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM fin_transactions 
        WHERE provider_tx_id = p_provider_tx_id 
        AND provider = 'monzo'
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN 'EXISTS';
    END IF;

    SELECT user_id INTO v_user_id FROM fin_pockets WHERE id = p_pocket_id;

    BEGIN
        INSERT INTO fin_transactions (
            provider_tx_id, description, amount, type, category, 
            pocket_id, profile, date, provider, user_id
        ) VALUES (
            p_provider_tx_id, p_description, p_amount, p_type, p_category, 
            p_pocket_id, p_profile, p_date, 'monzo', v_user_id
        ) ON CONFLICT (provider, provider_tx_id) DO NOTHING;
        
        IF FOUND THEN
            RETURN 'INSERTED';
        ELSE
            RETURN 'CONFLICT';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
