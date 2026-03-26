
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const token = process.env.FRAMER_API_TOKEN;
const projectId = process.env.FRAMER_PROJECT_ID;

async function probe() {
  const prefixes = ['Bearer', 'token'];
  const testUrl = 'https://api.framer.com/v1/projects';

  for (const prefix of prefixes) {
    try {
      const res = await fetch(testUrl, {
        headers: { 
            'Authorization': `${prefix} ${token}`,
            'User-Agent': 'SchroSync/1.0',
            'Accept': 'application/json'
        }
      });
      console.log(`[${res.status}] ${prefix} Prefix: ${testUrl}`);
      const text = await res.text();
      console.log(`   Response: ${text.substring(0, 100)}`);
    } catch (e) {
      console.log(`[ERR] ${prefix} Prefix: ${e.message}`);
    }
  }
}

probe();
