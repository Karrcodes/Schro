export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'


export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!authError && user) {
            const service = createServiceClient()
            
            // Check if profile exists
            const { data: existingProfile } = await service
                .from('user_profiles')
                .select('id, status')
                .eq('id', user.id)
                .single()

            if (!existingProfile) {
                const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()
                const userEmail = user.email?.toLowerCase()
                
                const status = (adminEmail && userEmail === adminEmail)
                    ? 'admin'
                    : 'waitlist'

                // Handle missing email (common with Twitter/X if not configured)
                const fallbackEmail = user.user_metadata?.email ?? user.email ?? `${user.id}@noemail.schro`
                const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.user_metadata?.user_name ?? user.email ?? 'Unknown User'

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
                    console.error('[Auth Callback] Profile Insert Error:', insertError)
                    return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`)
                }

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
