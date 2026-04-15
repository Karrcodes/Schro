export const dynamic = 'force-static'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'Invalid invite code.' }, { status: 400 })
    }

    // Verify the current user's session with anon client
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    // Use service role for all DB reads/writes (bypasses RLS)
    const service = createServiceClient()

    // Find the invite code
    const { data: invite, error: inviteError } = await service
        .from('beta_invites')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .single()

    if (inviteError || !invite) {
        return NextResponse.json({ error: 'Invalid invite code. Please check and try again.' }, { status: 404 })
    }

    // Check if code is already fully claimed
    const { count } = await service
        .from('beta_invites')
        .select('claimed_by', { count: 'exact' })
        .eq('code', code.trim().toUpperCase())
        .not('claimed_by', 'is', null)

    if ((count ?? 0) >= (invite.max_claims ?? 1)) {
        return NextResponse.json({ error: 'This invite code has already been used.' }, { status: 409 })
    }

    // Check if email-restricted code matches this user
    if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
        return NextResponse.json({ error: 'This invite code is not valid for your account.' }, { status: 403 })
    }

    // Claim the invite and upgrade user status
    const now = new Date().toISOString()

    await service
        .from('beta_invites')
        .update({ claimed_by: user.id, claimed_at: now })
        .eq('id', invite.id)

    await service
        .from('user_profiles')
        .update({
            status: 'beta',
            modules_enabled: {
                finance: true,
                studio: true,
                goals: true,
                vault: true,
                intelligence: true,
            },
        })
        .eq('id', user.id)

    return NextResponse.json({ success: true })
}
