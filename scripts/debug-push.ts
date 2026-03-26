
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugPush() {
    console.log('--- DEBUGGING CMS PUSH ---')
    
    // 1. Get a project to sync
    const { data: project } = await supabase.from('studio_projects').select('*').limit(1).single()
    if (!project) {
        console.error('No project found to test with')
        return
    }
    
    console.log(`Testing with project: ${project.title} (${project.id})`)
    
    // 2. Get config from sys_settings
    const { data: settings } = await supabase.from('sys_settings').select('*').in('key', ['framer_access_token', 'framer_site_id'])
    const siteId = settings?.find(s => s.key === 'framer_site_id')?.value
    const collectionId = 'NTCFxAlOe' // Technology collection from previous successful config
    
    console.log(`Site ID: ${siteId}`)
    console.log(`Collection ID: ${collectionId}`)
    
    // 3. Simulate POST request
    const payload = {
        siteId,
        collectionId,
        localId: project.id,
        type: 'project',
        data: {
            title: project.title,
            slug: (project.title || '').toLowerCase().replace(/ /g, '-'),
            tagline: project.tagline,
            description: project.description
        },
        mapping: {
            title: 'title',
            slug: 'slug'
        }
    }
    
    console.log('Pushing item...')
    const res = await fetch('http://localhost:3000/api/studio/framer-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    
    const result: any = await res.json()
    if (res.ok) {
        console.log('✅ Push Successful!')
        console.log(JSON.stringify(result, null, 2))
    } else {
        console.error('❌ Push Failed!')
        console.error(JSON.stringify(result, null, 2))
    }
}

debugPush()
