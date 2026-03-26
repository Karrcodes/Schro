import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
    const supabase = createServiceClient()
    try {
        // Fetch projects, press, and content items for sync
        const [projectsRes, pressRes, contentRes] = await Promise.all([
            supabase.from('studio_projects').select('*').eq('is_archived', false),
            supabase.from('studio_press').select('*').eq('is_archived', false),
            supabase.from('studio_content').select('*').eq('is_archived', false)
        ])

        if (projectsRes.error) throw projectsRes.error
        if (pressRes.error) throw pressRes.error
        if (contentRes.error) throw contentRes.error

        const response = NextResponse.json({
            projects: projectsRes.data || [],
            press: pressRes.data || [],
            content: contentRes.data || []
        })

        // Add CORS headers for local plugin access
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        
        return response
    } catch (err: any) {
        console.error('Sync Data Fetch Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 })
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response
}
