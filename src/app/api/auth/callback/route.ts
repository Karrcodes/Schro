export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin: requestOrigin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = '/system/control-centre'
    const bridgeTarget = searchParams.get('bridge_target')

    // Determine the actual origin from headers to support local network IPs
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || (requestOrigin.startsWith('https') ? 'https' : 'http')
    const origin = host ? `${protocol}://${host}` : requestOrigin

    console.log('[Auth Callback] Request received')
    console.log('[Auth Callback] Origin (Detected):', origin)
    console.log('[Auth Callback] Next:', next)
    if (bridgeTarget) console.log('[Auth Callback] Bridge Target Detected:', bridgeTarget)

    // HANDLE BRIDGE REDIRECT:
    // If we have a bridge_target and we are currently on the production domain (schro.app),
    // we bounce the browser back to the local IP with the same code.
    // This bypasses Supabase's restriction on non-localhost HTTP redirects.
    if (bridgeTarget && code && (origin.includes('schro.app') || origin.includes('vercel.app'))) {
        console.log('[Auth Callback] BRIDGE ACTIVE: Bouncing to local target http://' + bridgeTarget)
        const localUrl = new URL(`http://${bridgeTarget}/api/auth/callback`)
        localUrl.searchParams.set('code', code)
        localUrl.searchParams.set('next', next)
        return NextResponse.redirect(localUrl.toString())
    }

    if (code) {
        // Use anon client to exchange code for session (sets cookies)
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('[Auth Callback] Code exchange error:', error)
            return NextResponse.redirect(`${origin}/login?error=auth_technical_failed&message=${encodeURIComponent(error.message)}`)
        }

        if (data.user) {
            const user = data.user
            console.log('[Auth Callback] User authenticated:', user.email)

            // Use service role client for DB reads/writes (bypasses RLS)
            const service = createServiceClient()

            // Check if user_profile exists, create if not
            const { data: existingProfile, error: profileError } = await service
                .from('user_profiles')
                .select('id, status')
                .eq('id', user.id)
                .single()

            if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "not found"
                console.error('[Auth Callback] Profile lookup error:', profileError)
                return NextResponse.redirect(`${origin}/login?error=auth_technical_failed&message=Profile lookup failed`)
            }

            if (!existingProfile) {
                // Determine initial status — check if this is the admin email
                const userEmail = user.email?.toLowerCase();
                const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
                console.log('[Auth Callback] New user detected. Email:', userEmail, 'Admin Target:', adminEmail)
                
                const status = adminEmail && userEmail === adminEmail
                    ? 'admin'
                    : 'waitlist'

                // Handle missing email (common with Twitter/X if not configured)
                const fallbackEmail = user.user_metadata?.email ?? userEmail ?? `${user.id}@noemail.schro`;
                const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.user_metadata?.user_name ?? user.email ?? 'Unknown User';

                console.log('[Auth Callback] Creating profile with status:', status)
                const { error: insertError } = await service.from('user_profiles').insert({
                    id: user.id,
                    email: fallbackEmail,
                    display_name: displayName,
                    avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
                    status,
                    modules_enabled: {
                        finance: status === 'admin',
                        studio: status === 'admin',
                        goals: status === 'admin',
                        vault: status === 'admin',
                        intelligence: status === 'admin',
                    },
                })

                if (insertError) {
                    console.error('[Auth Callback] Profile Insert Error:', insertError);
                    return NextResponse.redirect(`${origin}/login?error=profile_creation_failed&message=${encodeURIComponent(insertError.message)}`)
                }

                if (status === 'admin') {
                    return NextResponse.redirect(`${origin}${next}`)
                }
                return NextResponse.redirect(`${origin}/waitlist`)
            }

            // Profile exists — check approval status
            console.log('[Auth Callback] Existing user found. Status:', existingProfile.status)
            if (existingProfile.status === 'waitlist') {
                return NextResponse.redirect(`${origin}/waitlist`)
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Auth error — redirect to login with error flag
    console.error('[Auth Callback] Final fallthrough. Code present?', !!code)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
