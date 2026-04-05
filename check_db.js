const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('sys_auth_tokens')
        .select('*');
    
    if (error) {
        console.error('Error fetching data:', error);
    } else {
        console.log('Current sys_auth_tokens rows:');
        console.log(JSON.stringify(data, null, 2));
    }
}

check();
