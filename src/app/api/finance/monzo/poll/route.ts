import { NextResponse } from 'next/server'
import { MonzoService } from '@/features/finance/services/MonzoService'
import { notifyMonzoTransaction } from '@/features/finance/utils/monzo-notifications'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/finance/monzo/poll
 * 
 * Polls Monzo for recent transactions that may have been missed by webhooks.
 * Designed to be called by a cron job (e.g. every 5 minutes via Vercel Cron).
 * Also used as a manual fallback when card payment webhooks don't fire.
 */
export async function GET(request: Request) {
    // Allow manual calls with an auth header, or from Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const userId = 'karr'
        const token = await MonzoService.getValidToken(userId)
        if (!token) return NextResponse.json({ error: 'No Monzo token' }, { status: 400 })

        const accountsRes = await fetch('https://api.monzo.com/accounts', {
            headers: { Authorization: `Bearer ${token}` }
        })
        const accountsData = await accountsRes.json()
        const accounts = (accountsData.accounts || []).filter((a: any) => !a.closed)

        // Poll last 2 hours to catch any missed card payment webhooks
        const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

        let inserted = 0
        let skipped = 0

        await Promise.all(accounts.map(async (account: any) => {
            const profile: 'personal' | 'business' = account.type === 'uk_business' ? 'business' : 'personal'
            const url = `https://api.monzo.com/transactions?account_id=${account.id}&since=${since}&limit=100&expand[]=merchant`

            const txRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            if (!txRes.ok) return

            const txData = await txRes.json()
            const transactions = txData.transactions || []

            for (const tx of transactions) {
                if (tx.decline_reason) continue

                const amount = Math.abs(tx.amount / 100)
                const isSpend = tx.amount < 0
                const potId = tx.metadata?.pot_id
                const isTransfer = tx.category === 'p2p' || !!potId || (tx.description || '').startsWith('pot_')
                const targetMonzoId = potId || account.id

                const { data: pocket } = await supabase
                    .from('fin_pockets')
                    .select('id, name')
                    .eq('monzo_id', targetMonzoId)
                    .single()

                let description = tx.merchant?.name || tx.description
                if (description?.startsWith('pot_') && pocket) {
                    description = isSpend ? `Transfer to ${pocket.name}` : `Top up from ${pocket.name}`
                } else if (tx.category === 'p2p' && tx.counterparty?.name) {
                    description = tx.counterparty.name
                }

                const txType: 'spend' | 'income' | 'transfer' = isTransfer ? 'transfer' : (isSpend ? 'spend' : 'income')

                const { data: rpcStatus, error: rpcError } = await supabase.rpc('process_monzo_transaction', {
                    p_provider_tx_id: tx.id,
                    p_description: description,
                    p_amount: amount,
                    p_type: txType,
                    p_category: tx.category || 'other',
                    p_pocket_id: pocket?.id || null,
                    p_profile: profile,
                    p_date: tx.created
                })

                if (rpcError) continue

                if (rpcStatus === 'INSERTED') {
                    inserted++
                    // Only notify for non-transfer merchant spends (not pot movements)
                    const shouldNotify = !isTransfer
                    if (shouldNotify) {
                        await notifyMonzoTransaction({
                            amount,
                            description,
                            isSpend,
                            isTransfer,
                            pocketName: pocket?.name || 'Main Account',
                            pocketId: pocket?.id
                        })
                    }
                } else {
                    skipped++
                }
            }
        }))

        return NextResponse.json({ success: true, inserted, skipped, since })
    } catch (err: any) {
        console.error('[MonzoPoll] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
