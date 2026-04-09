export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextResponse } from 'next/server'
import { MonzoService } from '@/features/finance/services/MonzoService'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value },
                },
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id
        console.log(`[Sync Route] Starting sync for userId: ${userId}`)

        // Ensure webhooks are registered for real-time notifications
        try {
            await MonzoService.registerWebhooks(userId)
            console.log(`[Sync Route] Webhooks registered/checked for ${userId}`)
        } catch (webhookErr) {
            console.warn(`[Sync Route] Webhook registration failed (ignoring for now):`, webhookErr)
        }

        await MonzoService.syncPots(userId)

        console.log(`[Sync Route] Sync completed successfully for userId: ${userId}`)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[Sync Route] Monzo sync error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
