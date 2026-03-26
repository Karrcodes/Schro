
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testNativeSync() {
    console.log('--- TESTING NATIVE SYNC FUNCTION ---')
    
    const projectId = '023a9ffb-67ea-4742-a664-470bcb57ea0e' // Karrtesian Studio Website
    
    // 1. Create a job
    const { data: job, error } = await supabase
        .from('framer_sync_jobs')
        .insert({
            item_id: projectId,
            item_type: 'project',
            action: 'push',
            collection_name: 'Technology',
            status: 'pending'
        })
        .select()
        .single()
        
    if (error || !job) {
        console.error('Failed to create job:', error)
        return
    }
    
    console.log(`Created Job ID: ${job.id}`)
    
    // 2. Call the sync function
    // We import it dynamically to avoid issues with ESM top-level imports in some environments
    console.log('Importing syncJobToFramer...')
    const { syncJobToFramer } = await import('../src/lib/framer/sync')
    
    console.log('Executing syncJobToFramer...')
    const result = await syncJobToFramer(job.id)
    
    console.log('Result:', JSON.stringify(result, null, 2))
    
    if (result.success) {
        console.log('✅ NATIVE SYNC SUCCESS!')
    } else {
        console.error('❌ NATIVE SYNC FAILED:', result.error)
    }
}

testNativeSync()
