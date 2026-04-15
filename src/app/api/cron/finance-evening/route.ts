export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/push-server'
import { daysUntilNextPayday, formatGBP } from '@/lib/rota-utils'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/cron/finance-evening
 * 
 * Evening spend review. Summarises what was spent today vs the daily target 
 * and gives personalised feedback.
 * 
 * Scheduled at 9pm UTC daily (same for work days and off days).
 */
export async function GET(req: Request) {
    try {
        const now = new Date()
        const todayStart = new Date(now)
        todayStart.setUTCHours(0, 0, 0, 0)

        // 1. Today's spending from fin_transactions
        // Exclude: transfers (pot movements), bills (rent/standing orders), savings
        const { data: transactions } = await supabase
            .from('fin_transactions')
            .select('amount, description, category')
            .eq('type', 'spend')
            .eq('profile', 'personal')
            .gte('date', todayStart.toISOString())
            .not('category', 'in', '("transfers","bills","savings")')

        const todaySpend = (transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0)

        // 2. Pocket balances for context
        const { data: pockets } = await supabase
            .from('fin_pockets')
            .select('name, balance')
            .eq('profile', 'personal')
            .in('name', ['Daily Essentials 🍔', 'Fun 🛍️'])

        const dailyEssentials = pockets?.find(p => p.name === 'Daily Essentials 🍔')
        const essBalance = dailyEssentials?.balance ?? 0

        // 3. Daily target: balance / days to payday
        const { days: daysLeft } = daysUntilNextPayday(now)
        const dailyTarget = daysLeft > 0 ? essBalance / daysLeft : essBalance

        // 4. Build message with personalised tone
        let title: string
        let body: string

        if (todaySpend === 0) {
            title = '🙌 No-spend day!'
            body = `You didn't spend anything from your pockets today. ${formatGBP(essBalance)} still in Daily Essentials — great discipline!`
        } else if (todaySpend <= dailyTarget) {
            const saved = dailyTarget - todaySpend
            title = `✅ Good day — ${formatGBP(todaySpend)} spent`
            body = `You came in ${formatGBP(saved)} under your ${formatGBP(dailyTarget)} daily target with ${daysLeft} days to payday. Keep it up!`
        } else {
            const over = todaySpend - dailyTarget
            // Recalculate tomorrow's target based on remaining balance
            const remainingBalance = essBalance  // Balance already reflects today's spend via Monzo
            const newTarget = daysLeft > 1 ? remainingBalance / (daysLeft - 1) : remainingBalance
            title = `⚠️ ${formatGBP(todaySpend)} spent today`
            body = `You went ${formatGBP(over)} over today's target of ${formatGBP(dailyTarget)}. Aim for under ${formatGBP(newTarget)} tomorrow to stay on track.`
        }

        await sendPushNotification(title, body, '/finances/transactions')

        // Log it
        await supabase.from('sys_notification_logs').insert({
            title,
            body
        })

        return NextResponse.json({ success: true, title, body, todaySpend, dailyTarget })
    } catch (err: any) {
        console.error('[finance-evening] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
