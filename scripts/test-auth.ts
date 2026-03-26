
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testAuth() {
    console.log('--- TESTING FRAMER AUTH ---')
    
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token', 'framer_site_id'])
    const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
    const siteId = settings?.find(s => s.key === 'framer_site_id')?.value
    
    console.log(`Site ID: ${siteId}`)
    console.log(`Access Token: ${accessToken ? 'PRESENT' : 'MISSING'}`)
    
    if (!accessToken || !siteId) return
    
    const url = `https://api.framer.com/cms/v1/sites/${siteId}/collections`
    console.log(`Fetching: ${url}`)
    
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    console.log(`Status: ${res.status}`)
    const text = await res.text()
    console.log(`Response: ${text.substring(0, 200)}`)
}

testAuth()
