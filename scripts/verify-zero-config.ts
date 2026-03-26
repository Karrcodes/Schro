
import fetch from 'node-fetch'

async function verify() {
    console.log('--- VERIFYING ZERO-CONFIG ---')
    
    // Call the new config endpoint which also triggers ID cleaning
    console.log('Calling API config endpoint...')
    const res = await fetch('http://localhost:3000/api/studio/framer-sync?endpoint=config')
    
    if (!res.ok) {
        console.error('❌ API Error:', res.status)
        const text = await res.text()
        console.error(text)
        return
    }
    
    const data: any = await res.json()
    console.log('\nResponse:')
    console.log(JSON.stringify(data, null, 2))
    
    if (data.connected && data.siteId && !data.siteId.includes('framer.com')) {
        console.log('\n✅ SUCCESS: Site ID was cleaned and config was discovered!')
    } else if (data.connected) {
        console.log('\n⚠️  WARNING: Connected but Site ID still looks like a URL.')
    } else {
        console.log('\n❌ FAILED: Not connected.')
    }
}

verify()
