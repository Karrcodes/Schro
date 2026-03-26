
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testRestApi() {
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token'])
    const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
    if (!accessToken) return

    const projectId = 'ybvHR8xck0Rwd2IVEVe7-8W7cX'
    const collectionId = 'NTCFxAlOe'

    const url = `https://api.framer.com/cms/v1/sites/${projectId}/collections/${collectionId}/items`
    console.log(`Testing REST API: ${url}`)
    
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        console.log(`Status: ${res.status}`)
        const text = await res.text()
        console.log(`Response: ${text.substring(0, 500)}`)
    } catch (e) {
        console.log(`Error: ${e}`)
    }
}

testRestApi()
