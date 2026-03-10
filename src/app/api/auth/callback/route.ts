import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin: requestOrigin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/system/control-centre'

    // Determine the actual origin from headers to support local network IPs
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || (requestOrigin.startsWith('https') ? 'https' : 'http')
    const origin = host ? `${protocol}://${host}` : requestOrigin

    console.log('[Auth Callback] Request received')
    console.log('[Auth Callback] Origin (Detected):', origin)
    console.log('[Auth Callback] Next:', next)

    if (code) {
        // Use anon client to exchange code for session (sets cookies)
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.user) {
            const user = data.user

            // Use service role client for DB reads/writes (bypasses RLS)
            const service = createServiceClient()

            // Check if user_profile exists, create if not
            const { data: existingProfile } = await service
                .from('user_profiles')
                .select('id, status')
                .eq('id', user.id)
                .single()

            if (!existingProfile) {
                // Determine initial status — check if this is the admin email
                const adminEmail = process.env.ADMIN_EMAIL
                const status = adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()
                    ? 'admin'
                    : 'waitlist'

                await service.from('user_profiles').insert({
                    id: user.id,
                    email: user.email,
                    display_name: user.user_metadata?.full_name ?? user.email,
                    avatar_url: user.user_metadata?.avatar_url ?? null,
                    status,
                    modules_enabled: {
                        finance: status === 'admin',
                        studio: status === 'admin',
                        goals: status === 'admin',
                        vault: status === 'admin',
                        intelligence: status === 'admin',
                    },
                })

                if (status === 'admin') {
                    return NextResponse.redirect(`${origin}${next}`)
                }
                return NextResponse.redirect(`${origin}/waitlist`)
            }

            // Profile exists — check approval status
            if (existingProfile.status === 'waitlist') {
                return NextResponse.redirect(`${origin}/waitlist`)
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Auth error — redirect to login with error flag
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
