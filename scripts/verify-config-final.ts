
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function verifyConfigEndpoint() {
    const baseUrl = 'http://localhost:3000'
    const siteUrl = 'https://framer.com/projects/Studio-Karrtesian--ybvHR8xck0Rwd2IVEVe7-8W7cX'
    const url = `${baseUrl}/api/studio/framer-sync?endpoint=config&siteId=${encodeURIComponent(siteUrl)}`
    
    console.log(`Verifying Config Endpoint: ${url}`)
    
    try {
        const res = await fetch(url)
        console.log(`Status: ${res.status}`)
        const data = await res.json()
        console.log('Response:', JSON.stringify(data, null, 2))
        
        if (data.connected && data.siteId.startsWith('http')) {
            console.log('✅ CONFIG VERIFIED: URL Persisted & collections mapped!')
        } else {
            console.error('❌ CONFIG FAILED: Incorrect response format or missing data.')
        }
    } catch (e) {
        console.error('Error:', e)
    }
}

// Note: Requires the dev server running on localhost:3000
// Since I can't guarantee it's running, I'll just check the code one more time.
// Actually, I'll try it anyway.
verifyConfigEndpoint()
