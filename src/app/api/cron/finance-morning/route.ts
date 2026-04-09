export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/push-server'
import { isShiftDay, daysUntilNextPayday, formatGBP } from '@/lib/rota-utils'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/cron/finance-morning
 * 
 * Morning financial briefing. Tells the user their balance in spending pockets
 * and how much they can spend per day until the next payday.
 * 
 * Scheduled times (UTC):
 * - Work days (3-on rota): 3:30am UTC
 * - Off days: 8:00am UTC
 */
export async function GET(req: Request) {
    try {
        const now = new Date()

        // Fetch spending pockets: Daily Essentials and Fun
        const { data: pockets } = await supabase
            .from('fin_pockets')
            .select('name, balance')
            .eq('profile', 'personal')
            .in('name', ['Daily Essentials 🍔', 'Fun 🛍️'])

        if (!pockets || pockets.length === 0) {
            return NextResponse.json({ error: 'No pockets found' }, { status: 400 })
        }

        const dailyEssentials = pockets.find(p => p.name === 'Daily Essentials 🍔')
        const fun = pockets.find(p => p.name === 'Fun 🛍️')

        const essBalance = dailyEssentials?.balance ?? 0
        const funBalance = fun?.balance ?? 0

        const { days: daysLeft } = daysUntilNextPayday(now)
        const dayLabel = daysLeft === 1 ? '1 day' : `${daysLeft} days`

        // Daily spending targets
        const essTarget = daysLeft > 0 ? essBalance / daysLeft : essBalance

        // Build message
        const lines: string[] = []

        lines.push(`Daily Essentials: ${formatGBP(essBalance)} left`)
        if (daysLeft > 0) {
            lines.push(`Aim to spend under ${formatGBP(essTarget)}/day to reach payday (${dayLabel} away).`)
        }

        // Only mention Fun if balance > £5
        if (funBalance > 5) {
            lines.push(`Fun pocket: ${formatGBP(funBalance)} available.`)
        }

        const isWork = isShiftDay(now)
        const greeting = isWork ? 'Morning shift' : 'Good morning'
        const title = `${greeting} — here's your budget`
        const body = lines.join(' ')

        await sendPushNotification(title, body, '/finances')

        // Log it
        await supabase.from('sys_notification_logs').insert({
            title,
            body
        })

        return NextResponse.json({ success: true, title, body })
    } catch (err: any) {
        console.error('[finance-morning] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
