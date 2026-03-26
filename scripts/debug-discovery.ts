
import { connect } from 'framer-api'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugDiscovery() {
    console.log('--- DEBUGGING DISCOVERY ---')
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token'])
    const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
    const siteUrl = 'https://framer.com/projects/Studio-Karrtesian--ybvHR8xck0Rwd2IVEVe7-8W7cX'
    
    if (!accessToken) return
    
    try {
        const framer = await connect(siteUrl, accessToken)
        console.log('Connected!')
        
        const info = await framer.getProjectInfo()
        console.log('Project Info:', JSON.stringify(info, null, 2))
        
        const publishInfo = await framer.getPublishInfo()
        console.log('Publish Info:', JSON.stringify(publishInfo, null, 2))
        
        await framer.disconnect()
    } catch (e) {
        console.error(e)
    }
}

debugDiscovery()
