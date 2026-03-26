
import { connect } from 'framer-api'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugLibraryPush() {
    console.log('--- DEBUGGING LIBRARY PUSH ---')
    
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token', 'framer_site_id'])
    const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
    const siteUrl = 'https://framer.com/projects/Studio-Karrtesian--ybvHR8xck0Rwd2IVEVe7-8W7cX'
    
    if (!accessToken) return
    
    try {
        console.log('Connecting to Framer via library...')
        const framer = await connect(siteUrl, accessToken)
        console.log('Connected!')
        
        const collections = await framer.getCollections()
        const technology = collections.find(c => c.name === 'Technology')
        
        if (!technology) {
            console.log('Technology collection not found')
            return
        }
        
        console.log(`Using collection: ${technology.name} (${technology.id})`)
        
        // Try to add an item
        console.log('Adding test item...')
        await technology.addItems([{
            fieldData: {
                "Title": "Library Test Item " + Date.now(),
                "Slug": "library-test-" + Date.now()
            }
        } as any])
        
        console.log('✅ Success: Test item added via library!')
        
    } catch (e) {
        console.error('❌ Library Push Failed!')
        console.error(e)
    }
}

debugLibraryPush()
