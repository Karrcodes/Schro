export const dynamic = 'force-static'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/push-server'

/**
 * Vercel Cron job to send lifestyle reminders.
 * Scheduled to run daily (configure in vercel.json)
 */
export async function GET(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch settings
        const { data: settingsData, error: fetchError } = await supabase
            .from('sys_settings')
            .select('*')
            .in('key', [
                'off_days',
                'last_reminder_sent',
                'schedule_type',
                'shift_on_days',
                'shift_off_days',
                'shift_start_date'
            ])

        if (fetchError) throw fetchError

        const settings: Record<string, string> = {}
        settingsData?.forEach(item => settings[item.key] = item.value)

        const scheduleType = settings.schedule_type || 'mon-fri'
        const offDays = JSON.parse(settings.off_days || '[]')
        const lastSent = settings.last_reminder_sent || ''

        // Pattern settings
        const shiftOn = parseInt(settings.shift_on_days || '3')
        const shiftOff = parseInt(settings.shift_off_days || '3')
        const shiftStart = settings.shift_start_date || ''

        // Get today's name (e.g., "Monday")
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
        const todayDate = new Date().toISOString().split('T')[0]

        console.log(`Cron checking: Today is ${todayName}. Mode: ${scheduleType}`)

        // 2. Determine if we should send a reminder
        let shouldSend = false

        if (scheduleType === 'mon-fri') {
            // Rule: If today is the FIRST day in the off_days array, it's the start of the weekend.
            shouldSend = offDays.length > 0 && offDays[0] === todayName
        } else if (scheduleType === 'shift' && shiftStart) {
            // Shift Pattern logic:
            // Calculate days elapsed since anchor
            const start = new Date(shiftStart)
            const today = new Date(todayDate)
            const diffTime = today.getTime() - start.getTime()
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays >= 0) {
                const cycleLength = shiftOn + shiftOff
                const dayInCycle = diffDays % cycleLength
                // Reminder on the FIRST day of "OFF" (which is index equal to shiftOn)
                shouldSend = dayInCycle === shiftOn
                console.log(`Shift calculation: Day ${diffDays} since anchor. Day ${dayInCycle} in ${cycleLength}-day cycle. Target: ${shiftOn}`)
            }
        }

        const alreadySentToday = lastSent === todayDate

        if (shouldSend && !alreadySentToday) {
            console.log('Target hit! Sending finance review reminder...')

            const { success, error } = await sendPushNotification(
                '🏝️ Weekend Hub',
                "Ready for your check-in? It's the first day of your off-days. Time to review your finances!",
                '/finances'
            )

            if (!success) {
                console.error('Failed to send cron push notification:', error)
                return NextResponse.json({ error: 'Push failed' }, { status: 500 })
            }

            // 3. Mark as sent to prevent duplicate triggers
            const { error: upsertError } = await supabase
                .from('sys_settings')
                .upsert({
                    key: 'last_reminder_sent',
                    value: todayDate,
                    updated_at: new Date().toISOString()
                })

            if (upsertError) console.error('Failed to update last_reminder_sent:', upsertError)

            // 4. Reset recurring tasks completion status
            // This ensures routines like "Gym" appear fresh the next day
            // We ignore tasks where recurrence_config->type is 'none'
            const { error: resetError } = await supabase
                .from('fin_tasks')
                .update({ is_completed: false })
                .not('recurrence_config', 'is', null)
                .neq('recurrence_config->>type', 'none')

            if (resetError) console.error('Failed to reset recurring tasks:', resetError)

            return NextResponse.json({ success: true, message: 'Reminder sent and tasks reset' })
        }

        // Even if we didn't send a reminder, we should still reset tasks daily
        // But only if we haven't already done it today (last_reminder_sent used as proxy or add new setting)
        if (!alreadySentToday) {
            await supabase
                .from('fin_tasks')
                .update({ is_completed: false })
                .not('recurrence_config', 'is', null)
                .neq('recurrence_config->>type', 'none')

            await supabase
                .from('sys_settings')
                .upsert({
                    key: 'last_reminder_sent',
                    value: todayDate,
                    updated_at: new Date().toISOString()
                })
        }

        return NextResponse.json({
            success: true,
            message: shouldSend ? 'Already sent today' : 'Not a reminder day, but tasks reset'
        })

    } catch (error: any) {
        console.error('CRON Route Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
