const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTokens() {
    const { data: tokenData, error: tokenError } = await supabase
        .from('sys_auth_tokens')
        .select('*')
        .eq('user_id', 'karr')
        .single();

    if (tokenError) {
        console.error('Error fetching tokens:', tokenError);
        return;
    }

    console.log('Token Data Found:');
    console.log('User ID:', tokenData.user_id);
    console.log('Scope:', tokenData.scope);
    console.log('Access Token exists:', !!tokenData.access_token);
    console.log('Refresh Token exists:', !!tokenData.refresh_token);
    console.log('Expiry:', new Date(tokenData.expiry_date).toLocaleString());
}

checkTokens();
