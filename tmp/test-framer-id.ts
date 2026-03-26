
import { connect } from 'framer-api';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    const token = process.env.FRAMER_API_TOKEN;
    const urls = [
        'https://framer.com/projects/Studio-Karrtesian--ybvHR8xck0Rwd2IVEVe7-8W7cX',
        'ybvHR8xck0Rwd2IVEVe7-8W7cX',
        'ybvHR8xck0Rwd2IVEVe7'
    ];

    console.log('Using token:', token ? '***' + token.slice(-4) : 'MISSING');

    for (const url of urls) {
        console.log('\n--- Testing URL:', url);
        try {
            const framer = await connect(url, token || '');
            const info = await framer.getProjectInfo();
            console.log('✅ Success:', info.name);
            await framer.disconnect();
            return;
        } catch (e: any) {
            console.error('❌ Failed:', e.message);
        }
    }
}

test().catch(console.error);
