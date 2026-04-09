import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const { code } = await req.json()
        if (!code) return NextResponse.json({ error: 'Authorization code required.' }, { status: 400 })

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Neural identity unknown. Please sign in.' }, { status: 401 })

        const service = createServiceClient()

        // 1. Verify code
        const { data: invite, error: inviteError } = await service
            .from('beta_invites')
            .select('*')
            .eq('code', code.toUpperCase())
            .single()

        if (inviteError || !invite) {
            return NextResponse.json({ error: 'Invalid authorization code.' }, { status: 403 })
        }

        // 2. Check if already claimed by someone else (if single use)
        if (invite.max_claims === 1 && invite.claimed_by && invite.claimed_by !== user.id) {
            return NextResponse.json({ error: 'Authorization code already utilized.' }, { status: 403 })
        }

        // 3. Mark as claimed and update user status
        await service
            .from('beta_invites')
            .update({
                claimed_by: user.id,
                claimed_at: new Date().toISOString()
            })
            .eq('id', invite.id)

        const { error: updateError } = await service
            .from('user_profiles')
            .update({ 
                status: 'beta',
                modules_enabled: {
                    finance: true,
                    studio: true,
                    goals: true,
                    vault: true,
                    intelligence: true
                }
            })
            .eq('id', user.id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, message: 'Access granted.' })

    } catch (err: any) {
        console.error('[Invite API Error]:', err)
        return NextResponse.json({ error: 'System error during authorization.' }, { status: 500 })
    }
}
