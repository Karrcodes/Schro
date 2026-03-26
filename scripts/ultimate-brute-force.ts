
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ultimateBruteForce() {
    console.log('--- ULTIMATE BRUTE FORCE ---')
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token'])
    const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
    if (!accessToken) return

    const siteIds = [
        'ybvHR8xck0Rwd2IVEVe7',
        'ybvHR8xck0Rwd2IVEVe7-8W7cX',
        'ebb7e339c7097c29a2c8f7f9223168e6cebeec28b71f393c4473c655637eb8d2'
    ]
    const auths = ['Bearer', 'Token']
    const endpoints = [
        (id: string) => `https://api.framer.com/cms/v1/sites/${id}/collections`,
        (id: string) => `https://api.framer.com/cms/v1/sites/${id}/collections/NTCFxAlOe/items`
    ]

    for (const id of siteIds) {
        for (const auth of auths) {
            for (const getUrl of endpoints) {
                const url = getUrl(id)
                process.stdout.write(`Testing: ${auth} | ${id.substring(0, 10)}... | ${url.split('/').pop()} `)
                try {
                    const res = await fetch(url, {
                        headers: { 'Authorization': `${auth} ${accessToken}` }
                    })
                    console.log(`-> ${res.status}`)
                    if (res.status === 200) {
                        console.log(`\n✅ SUCCESS!`)
                        console.log(`Auth: ${auth}`)
                        console.log(`ID: ${id}`)
                        console.log(`URL: ${url}`)
                        return
                    }
                } catch (e) {
                    console.log(`-> Error`)
                }
            }
        }
    }
}

ultimateBruteForce()
