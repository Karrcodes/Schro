
import dotenv from 'dotenv';
import { connect } from 'framer-api';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.FRAMER_API_TOKEN;
const projectUrl = "https://framer.com/projects/Studio-Karrtesian--ybvHR8xck0Rwd2IVEVe7-8W7cX";

async function main() {
    console.log('--- Framer Server API Validation ---');
    console.log('Project URL:', projectUrl);
    console.log('API Key (masked):', apiKey?.substring(0, 5) + '...');

    try {
        console.log('Attempting to connect...');
        const framer = await connect(projectUrl, apiKey);
        
        console.log('Successfully connected!');
        
        const projectInfo = await framer.getProjectInfo();
        console.log(`Project Name: ${projectInfo.name}`);
        
        // Check for CMS access if possible via this API
        console.log('Testing CMS access...');
        // The Server API has limited CMS support in some versions, but let's see what's available
        const changes = await framer.getChangedPaths();
        console.log('Changed paths:', changes);

        await framer.disconnect();
        console.log('Disconnected.');
    } catch (err) {
        console.error('Connection Failed:', err.message);
        if (err.stack) console.error(err.stack);
    }
}

main();
