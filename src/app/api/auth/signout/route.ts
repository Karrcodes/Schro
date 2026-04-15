export const dynamic = 'force-static'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const { origin } = new URL(request.url)
    const supabase = await createClient()

    // 1. Sign out on the server - this clears any session state in the Supabase client
    await supabase.auth.signOut()

    // 2. Prepare the redirect response to the login page
    const response = NextResponse.redirect(`${origin}/login`, {
        status: 302,
    })

    // 3. FORCE-CLEAR COOKIES
    // Even if supabase.auth.signOut() clears some cookies, we explicitly nuke common auth cookie patterns
    // to ensure the middleware doesn't see a stale session.
    const cookiesToPurge = [
        'sb-hvkoeyxgvvtkcrxnurot-auth-token', // The specific project auth token
        'supabase-auth-token',
    ]

    cookiesToPurge.forEach(name => {
        response.cookies.set(name, '', {
            path: '/',
            expires: new Date(0),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        })
    })

    return response
}
