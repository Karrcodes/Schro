
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function bruteForceId() {
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token'])
    const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
    if (!accessToken) return

    const candidates = [
        'ybvHR8xck0Rwd2IVEVe7',
        'ybvHR8xck0Rwd2IVEVe7-8W7cX',
        'ebb7e339c7097c29a2c8f7f9223168e6cebeec28b71f393c4473c655637eb8d2',
        'Studio-Karrtesian--ybvHR8xck0Rwd2IVEVe7-8W7cX'
    ]

    for (const id of candidates) {
        const url = `https://api.framer.com/cms/v1/sites/${id}/collections`
        console.log(`Testing ID: ${id}`)
        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            console.log(`Status: ${res.status}`)
            if (res.status === 200) {
                console.log(`✅ FOUND CORRECT ID: ${id}`)
                return
            }
        } catch (e) {
            console.log(`Error: ${e}`)
        }
    }
}

bruteForceId()
