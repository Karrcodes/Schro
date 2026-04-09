export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!supabase) return NextResponse.json({ error: 'System Offline' }, { status: 500 })

    const { id } = await params
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (!isValidUUID) {
        return NextResponse.json({ error: `Invalid Session ID: '${id}'` }, { status: 400 })
    }

    try {
        const { data: messages, error } = await supabase
            .from('sys_intelligence_messages')
            .select('*')
            .eq('session_id', id)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('[Session Messages API Error]', error)
            return NextResponse.json({ error: `${error.code}: ${error.message}` }, { status: 500 })
        }
        return NextResponse.json({ messages })
    } catch (err: any) {
        console.error('[Session Messages API Catch]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
