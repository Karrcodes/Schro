export const dynamic = 'force-static'

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { syncJobToFramer } from '@/lib/framer/sync';


export async function POST(req: NextRequest) {
    const supabase = createServiceClient();
    
    try {
        console.log('[SyncProcess] Manual trigger received.');
        
        // 1. Fetch all pending jobs
        const { data: jobs, error: jobsError } = await supabase
            .from('framer_sync_jobs')
            .select('id, item_type, collection_name')
            .eq('status', 'pending');
            
        if (jobsError) throw jobsError;
        
        if (!jobs || jobs.length === 0) {
            console.log('[SyncProcess] No pending jobs found.');
            return NextResponse.json({ success: true, message: 'No pending jobs found' });
        }

        console.log(`[SyncProcess] Starting remote sync for ${jobs.length} jobs:`, jobs.map(j => `${j.item_type} -> ${j.collection_name}`).join(', '));

        // 2. Process jobs one by one
        const results = [];
        for (const job of jobs) {
            try {
                const result = await syncJobToFramer(job.id);
                results.push({ jobId: job.id, ...result });
            } catch (jobErr: any) {
                console.error(`[SyncProcess] Job ${job.id} failed fundamentally:`, jobErr.message);
                results.push({ jobId: job.id, success: false, error: jobErr.message });
            }
        }

        return NextResponse.json({ 
            success: true, 
            processedCount: jobs.length,
            results 
        });

    } catch (err: any) {
        console.error('[SyncProcess] Fatal Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
