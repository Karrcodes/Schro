export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — poll pending jobs (called by Framer Plugin)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    const { data, error } = await supabase
        .from('framer_sync_jobs')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: true })
        .limit(10)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const response = NextResponse.json(data || [])
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
}

// POST — create a new sync job (called by Studio UI)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { item_id, item_type, action, collection_name } = body

        if (!item_id || !item_type || !action || !collection_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Cancel any existing pending jobs for this item
        await supabase
            .from('framer_sync_jobs')
            .update({ status: 'cancelled' })
            .eq('item_id', item_id)
            .eq('status', 'pending')

        const { data, error } = await supabase
            .from('framer_sync_jobs')
            .insert({ item_id, item_type, action, collection_name, status: 'pending' })
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// PATCH — update job status (called by Framer Plugin after processing)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { job_id, status, framer_cms_id, error_msg } = body

        // Update the job
        const { error: jobError } = await supabase
            .from('framer_sync_jobs')
            .update({ status, framer_cms_id, error_msg, updated_at: new Date().toISOString() })
            .eq('id', job_id)

        if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 })

        // If successful, update the item's framer_cms_id in the correct table
        if (status === 'done' && framer_cms_id) {
            const { data: job } = await supabase
                .from('framer_sync_jobs')
                .select('item_id, item_type, action')
                .eq('id', job_id)
                .single()

            if (job) {
                const tableMap: Record<string, string> = {
                    project: 'studio_projects',
                    press: 'studio_press',
                    draft: 'studio_drafts',
                    content: 'studio_content'
                }
                const table = tableMap[job.item_type]
                if (table) {
                    const updateValue = job.action === 'hide' ? null : framer_cms_id
                    await supabase
                        .from(table)
                        .update({
                            framer_cms_id: updateValue,
                            framer_last_sync: new Date().toISOString()
                        })
                        .eq('id', job.item_id)
                }
            }
        }

        const response = NextResponse.json({ success: true })
        response.headers.set('Access-Control-Allow-Origin', '*')
        return response
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 })
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    return response
}
