export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!supabase) return NextResponse.json({ error: 'System Offline' }, { status: 500 })

    const { id } = await params
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (!isValidUUID) {
        return NextResponse.json({ error: 'Invalid Session ID' }, { status: 400 })
    }

    try {
        const body = await req.json()
        const updates: any = {}
        if (body.title !== undefined) updates.title = body.title
        if (body.is_pinned !== undefined) updates.is_pinned = body.is_pinned

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
        }

        const { data: session, error } = await supabase
            .from('sys_intelligence_sessions')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('[Session PATCH Error]', error)
            return NextResponse.json({ error: `${error.code}: ${error.message}` }, { status: 500 })
        }
        return NextResponse.json({ session })
    } catch (err: any) {
        console.error('[Session PATCH Catch]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
