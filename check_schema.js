const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Try to query the table definition if possible
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'sys_auth_tokens' });
    if (error) {
        console.error('RPC get_table_info failed (normal if not defined).');
        // Fallback: check if we can insert two different rows
        console.log('Testing multiple rows insert...');
        const res1 = await supabase.from('sys_auth_tokens').upsert({
            user_id: 'test_user',
            token_type: 'type1',
            access_token: 'val1'
        });
        const res2 = await supabase.from('sys_auth_tokens').upsert({
            user_id: 'test_user',
            token_type: 'type2',
            access_token: 'val2'
        });
        
        const final = await supabase.from('sys_auth_tokens').select('*').eq('user_id', 'test_user');
        console.log('Rows for test_user:', final.data);
        
        // Cleanup
        await supabase.from('sys_auth_tokens').delete().eq('user_id', 'test_user');
    } else {
        console.log('Table info:', data);
    }
}

check();
