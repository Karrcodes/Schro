
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
    console.log('--- DEEP SYNC DIAGNOSTICS ---')
    
    // 1. Get Framer Config
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token', 'framer_site_id'])
    const token = settings?.find(s => s.key === 'framer_access_token')?.value
    const siteId = settings?.find(s => s.key === 'framer_site_id')?.value
    
    if (!token || !siteId) {
        console.error('❌ Framer credentials missing in Supabase')
        return
    }
    console.log(`✅ Site ID: ${siteId}`)

    // 2. Fetch all collections for this site
    console.log('\nFetching all collections from Framer...')
    try {
        const cRes = await fetch(`https://api.framer.com/cms/v1/sites/${siteId}/collections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!cRes.ok) throw new Error(`Collections API Error: ${cRes.status}`)
        const cData: any = await cRes.json()
        console.log(`Found ${cData.collections?.length || 0} collections:`)
        cData.collections?.forEach((c: any) => console.log(`- ${c.name} (ID: ${c.id}, slug: ${c.slug})`))

        // 3. Get Project data
        const { data: projects } = await supabase.from('studio_projects').select('id, title, framer_cms_id, framer_collection_id')
        const liveProjects = projects?.filter(p => p.framer_cms_id) || []
        console.log(`\nLocal projects with CMS IDs: ${liveProjects.length}`)
        
        for (const c of cData.collections) {
            console.log(`\n--- Items for Collection: ${c.name} ---`)
            const iRes = await fetch(`https://api.framer.com/cms/v1/sites/${siteId}/collections/${c.id}/items`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!iRes.ok) {
                console.log(`❌ Failed to fetch items: ${iRes.status}`)
                continue
            }
            const iData: any = await iRes.json()
            const remoteItems = iData.items || []
            console.log(`Remote items: ${remoteItems.length}`)
            remoteItems.forEach((it: any) => console.log(`  - [${it.id}] ${it.slug} "${it.fieldData.title}"`))

            // Check if any local projects are OR SHOULD BE in this collection
            projects?.forEach(p => {
                const isLinked = p.framer_cms_id && p.framer_collection_id === c.id
                const existsRemotely = remoteItems.find((it: any) => it.id === p.framer_cms_id || it.slug === p.title.toLowerCase().replace(/ /g, '-'))
                
                if (isLinked && !existsRemotely) {
                    console.log(`  ⚠️  LOST LINK: "${p.title}" (ID: ${p.framer_cms_id}) not found!`)
                } else if (!isLinked && existsRemotely) {
                    console.log(`  ✨  DISCOVERY: "${p.title}" found in CMS as [${existsRemotely.id}]! Needs reconciliation.`)
                }
            })
        }
    } catch (e: any) {
        console.error('❌ Error:', e.message)
    }
}

debug()
