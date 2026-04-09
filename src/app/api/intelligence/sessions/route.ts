export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

export async function GET(req: NextRequest) {
    if (!supabase) return NextResponse.json({ error: 'System Offline' }, { status: 500 })

    try {
        const { data: sessions, error } = await supabase
            .from('sys_intelligence_sessions')
            .select('*')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('[Sessions GET Error]', error)
            return NextResponse.json({ error: `${error.code}: ${error.message}` }, { status: 500 })
        }
        return NextResponse.json({ sessions })
    } catch (err: any) {
        console.error('[Sessions GET Catch]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    if (!supabase) return NextResponse.json({ error: 'System Offline' }, { status: 500 })

    try {
        const { title } = await req.json()
        const { data: session, error } = await supabase
            .from('sys_intelligence_sessions')
            .insert({ title: title || 'New Conversation' })
            .select()
            .single()

        if (error) {
            console.error('[Sessions POST Error]', error)
            return NextResponse.json({ error: `${error.code}: ${error.message}` }, { status: 500 })
        }
        return NextResponse.json({ session })
    } catch (err: any) {
        console.error('[Sessions POST Catch]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    if (!supabase) return NextResponse.json({ error: 'System Offline' }, { status: 500 })

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        const { error } = await supabase
            .from('sys_intelligence_sessions')
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
