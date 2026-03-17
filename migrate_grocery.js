const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function migrate() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const sql = fs.readFileSync(path.join(__dirname, 'sql/create_grocery_library.sql'), 'utf8');

    console.log('Running migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        // If exec_sql RPC doesn't exist, we might have to try another way or just hope it exists.
        // Some supabase setups have a custom exec_sql function.
        console.error('Error running migration via RPC:', error);
        console.log('You might need to run the SQL manually in the Supabase Dashboard.');
    } else {
        console.log('Migration successful!');
    }
}

migrate();
