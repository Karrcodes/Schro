
import dotenv from 'dotenv';
import { connect } from 'framer-api';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.FRAMER_API_TOKEN;
const projectUrl = "https://framer.com/projects/Studio-Karrtesian--ybvHR8xck0Rwd2IVEVe7-8W7cX";

async function main() {
    try {
        const framer = await connect(projectUrl, apiKey);
        const collections = await framer.getCollections();
        const tech = collections.find(c => c.name === 'Technology');
        if (tech) {
            const items = await tech.getItems();
            if (items.length > 0) {
                const item = items[0];
                console.log('--- Item Object Probe ---');
                console.log('Item Properties:', Object.keys(item));
                
                let currentObj = item;
                while (currentObj) {
                    console.log(`Methods on ${currentObj.constructor.name}:`, 
                        Object.getOwnPropertyNames(currentObj).filter(p => typeof currentObj[p] === 'function')
                    );
                    currentObj = Object.getPrototypeOf(currentObj);
                }
            }
        }
        await framer.disconnect();
    } catch (err) {
        console.error('Failed:', err.message);
    }
}

main();
