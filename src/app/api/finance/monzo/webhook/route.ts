export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyMonzoTransaction } from '@/features/finance/utils/monzo-notifications'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, data } = body

        // Heartbeat log for debugging
        await supabase.from('sys_notification_logs').insert({
            title: 'DEBUG: Webhook Hit',
            body: JSON.stringify(body).slice(0, 1000) // Truncate if too long
        })

        if (type !== 'transaction.created' && type !== 'transaction.updated') {
            return NextResponse.json({ success: true, message: 'Ignored event type' })
        }

        const amount = Math.abs(data.amount / 100)
        const isSpend = data.amount < 0
        const isTransfer = data.category === 'p2p' || !!data.metadata?.pot_id
        const description = data.merchant?.name || data.description
        const monzoTxId = data.id
        const potId = data.metadata?.pot_id // Monzo Pot ID if applicable

        // 1. Find the pocket in Schrö
        // We look for any pocket where monzo_id matches either the pot_id or the account_id
        const targetMonzoId = potId || data.account_id
        let pocketId = null
        let pocketName = 'Main Account'
        let profile: 'personal' | 'business' = 'personal'

        const { data: pocket } = await supabase
            .from('fin_pockets')
            .select('id, name, profile')
            .eq('monzo_id', targetMonzoId)
            .single()

        if (pocket) {
            pocketId = pocket.id
            pocketName = pocket.name
            profile = pocket.profile as any
        } else {
            console.warn(`[MonzoWebhook] No pocket found for monzo_id: ${targetMonzoId}. Defaulting to personal General.`)
            const { data: genPot } = await supabase
                .from('fin_pockets')
                .select('id, profile')
                .ilike('name', 'General')
                .eq('profile', 'personal')
                .single()
            if (genPot) {
                pocketId = genPot.id
                profile = genPot.profile as any
            }
        }

        // 2. Improve description for transfers/pots
        let finalDescription = description
        if (isTransfer) {
            // Try to find the "partner" pocket name from notes or pot_id
            const notes = data.notes || ''
            const partnerMatch = notes.match(/Transfer (?:from|to) (.*?)(?:\s+🍔|\s+🛍️|\s+💰|$)/)
            const partnerName = partnerMatch ? partnerMatch[1].trim() : (isSpend ? 'Pockets' : 'Main Account')

            if (isSpend) {
                // Moving money INTO this pocket
                finalDescription = `Transferred into ${pocketName}`
                if (partnerName && partnerName !== pocketName) {
                    finalDescription = `Transferred from ${partnerName} to ${pocketName}`
                }
            } else {
                // Moving money OUT of this pocket
                finalDescription = `Transferred from ${pocketName}`
                if (partnerName && partnerName !== pocketName) {
                    finalDescription = `Transferred from ${pocketName} to ${partnerName}`
                }
            }
        }

        // 3. Process Transaction Atomically (Deduplication + Insert)
        const { data: rpcStatus, error: rpcError } = await supabase.rpc('process_monzo_transaction', {
            p_provider_tx_id: monzoTxId,
            p_description: finalDescription,
            p_amount: amount,
            p_type: isSpend ? 'spend' : 'income',
            p_category: data.category || 'other',
            p_pocket_id: pocketId,
            p_profile: profile,
            p_date: data.created
        })

        if (rpcError) {
            console.error('[MonzoWebhook] RPC Execution Error:', rpcError)
            return NextResponse.json({ error: 'Database processing error' }, { status: 500 })
        }

        console.log(`[MonzoWebhook] RPC Status for ${monzoTxId}: ${rpcStatus}`)

        if (rpcStatus !== 'INSERTED') {
            await supabase.from('sys_notification_logs').insert({
                title: 'DEBUG: RPC Skip/Error',
                body: `ID: ${monzoTxId}, Status: ${rpcStatus}`
            })
            return NextResponse.json({ success: true, message: `Skipped: ${rpcStatus}` })
        }

        // 4. Send Notification
        // Dedup: For internal transfers, only notify once (on the outgoing side)
        const shouldNotify = !isTransfer || isSpend

        let notificationStatus = 'skipped'
        if (shouldNotify) {
            const result: any = await notifyMonzoTransaction({
                amount,
                description: finalDescription,
                isSpend,
                isTransfer,
                pocketName,
                pocketId
            })
            notificationStatus = result.success
                ? (result.message || `sent (to ${result.subscriptionCount || 0} devices)`)
                : `failed: ${result.error || result.message}`
        }

        return NextResponse.json({
            success: true,
            rpcStatus,
            shouldNotify,
            notificationStatus
        })
    } catch (err: any) {
        console.error('[MonzoWebhook] Error:', err)
        await supabase.from('sys_notification_logs').insert({
            title: 'FATAL: Webhook Crash',
            body: err.message
        })
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
