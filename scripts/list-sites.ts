
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listSites() {
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token'])
    const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
    if (!accessToken) return

    const url = `https://api.framer.com/cms/v1/sites`
    console.log(`Fetching sites from: ${url}`)
    
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        console.log(`Status: ${res.status}`)
        const data = await res.json()
        console.log('Sites Data:', JSON.stringify(data, null, 2))
    } catch (e) {
        console.log(`Error: ${e}`)
    }
}

listSites()
