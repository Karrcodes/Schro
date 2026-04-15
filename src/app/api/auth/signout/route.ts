export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'


export async function POST(req: Request) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    
    const { origin } = new URL(req.url)
    return NextResponse.redirect(`${origin}/login`, {
        status: 303 // Use 303 to ensure the browser doesn't cache the redirect
    })
}

export async function GET(req: Request) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    
    const { origin } = new URL(req.url)
    return NextResponse.redirect(`${origin}/login`)
}
