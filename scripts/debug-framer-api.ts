
import { connect } from 'framer-api'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugFramer() {
    console.log('--- DEEP DEBUG WITH FRAMER-API ---')
    
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token', 'framer_site_id'])
    const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
    // Use the 20-char ID we thought was correct
    const siteId = 'ybvHR8xck0Rwd2IVEVe7' 
    
    console.log(`Connecting to: ${siteId}`)
    
    try {
        const framer = await connect(siteId, accessToken!)
        console.log('✅ Connected successfully!')
        
        const info = await framer.getProjectInfo()
        console.log('Project Info:', JSON.stringify(info, null, 2))
        
        const collections = await framer.getCollections()
        console.log(`Found ${collections.length} collections.`)
        
        // Let's see if we can find the site ID used for CMS API
        // in case it's different.
        
        await framer.disconnect()
    } catch (e: any) {
        console.error('❌ Connection failed:', e.message)
    }
}

debugFramer()
