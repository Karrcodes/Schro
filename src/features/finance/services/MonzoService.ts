import { createClient } from '@supabase/supabase-js'
import { notifyMonzoTransaction } from '../utils/monzo-notifications'

export interface MonzoToken {
    access_token: string
    refresh_token: string
    expires_at: number
    user_id: string
}

export class MonzoService {
    private static CLIENT_ID = process.env.NEXT_PUBLIC_MONZO_CLIENT_ID
    private static CLIENT_SECRET = process.env.MONZO_CLIENT_SECRET
    private static REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/finance/monzo/callback`

    private static getServerSupabase() {
        return createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
    }

    private static mapMonzoCategory(monzoCategory: string): string {
        const mapping: Record<string, string> = {
            'bills': 'bills',
            'charity': 'charity',
            'eating_out': 'eating_out',
            'entertainment': 'entertainment',
            'expenses': 'expenses',
            'family': 'family',
            'finances': 'finances',
            'general': 'general',
            'mondo': 'general',
            'gifts': 'gifts',
            'groceries': 'groceries',
            'holidays': 'holidays',
            'income': 'income',
            'personal_care': 'personal_care',
            'savings': 'savings',
            'shopping': 'shopping',
            'transfers': 'transfers',
            'p2p': 'transfers',
            'transport': 'transport',
            'cash': 'general',
            'other': 'other'
        }
        return mapping[monzoCategory.toLowerCase()] || mapping['other']
    }

    static async getAuthUrl(state: string) {
        const clientId = process.env.NEXT_PUBLIC_MONZO_CLIENT_ID
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/finance/monzo/callback`
        // Explicitly requesting scopes can help with permission issues on some account types
        return `https://auth.monzo.com/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}&scope=read:accounts`
    }

    static async exchangeCode(code: string) {
        const response = await fetch('https://api.monzo.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: this.CLIENT_ID!,
                client_secret: this.CLIENT_SECRET!,
                redirect_uri: this.REDIRECT_URI,
                code
            })
        })

        if (!response.ok) throw new Error('Failed to exchange Monzo code')
        return response.json()
    }

    static async saveToken(userId: string, tokenData: any) {
        const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in
        const supabase = this.getServerSupabase()
        const { error } = await supabase
            .from('fin_secrets')
            .upsert({
                user_id: userId,
                service: 'monzo',
                secret_data: {
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expires_at: expiresAt,
                    account_id: tokenData.account_id
                }
            }, { onConflict: 'user_id,service' })

        if (error) throw error
    }

    static async getValidToken(userId: string) {
        const supabase = this.getServerSupabase()
        const { data, error } = await supabase
            .from('fin_secrets')
            .select('secret_data')
            .eq('user_id', userId)
            .eq('service', 'monzo')
            .single()

        if (error || !data) return null

        const token = data.secret_data
        if (Date.now() / 1000 < token.expires_at - 60) {
            return token.access_token
        }

        // Refresh token if expired
        return this.refreshToken(userId, token.refresh_token)
    }


    private static async refreshToken(userId: string, refreshToken: string) {
        const response = await fetch('https://api.monzo.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: this.CLIENT_ID!,
                client_secret: this.CLIENT_SECRET!,
                refresh_token: refreshToken
            })
        })

        if (!response.ok) throw new Error('Failed to refresh Monzo token')
        const data = await response.json()
        await this.saveToken(userId, data)
        return data.access_token
    }

    static async syncPots(userId: string) {
        console.log(`[MonzoService] SyncPots called for userId: ${userId}`)
        const token = await this.getValidToken(userId)

        if (!token) {
            console.error(`[MonzoService] No valid token found for userId: ${userId}`)
            throw new Error('No Monzo connection found in database. Please log in again.')
        }

        console.log(`[MonzoService] Valid token retrieved. Fetching accounts...`)

        // 1. Get ALL accounts (Personal, Joint, Business)
        const accountsRes = await fetch('https://api.monzo.com/accounts', {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (!accountsRes.ok) {
            const errBody = await accountsRes.text()
            console.error('Monzo accounts fetch failed:', accountsRes.status, errBody)
            throw new Error(`Monzo API error: ${accountsRes.status}`)
        }

        const accountsData = await accountsRes.json()
        const accounts = accountsData.accounts || []

        const activeAccounts = accounts.filter((a: any) => !a.closed)
        console.log(`Syncing ${activeAccounts.length} Monzo accounts...`)

        const supabase = this.getServerSupabase()

        // 2. Fetch all existing Schrö pots to help with matching and cleanup
        const { data: existingKarrPots } = await supabase
            .from('fin_pockets')
            .select('*')

        const syncedMonzoIds = new Set<string>()

        await Promise.all(activeAccounts.map(async (account: any) => {
            try {
                // Determine which profile this belongs to
                const profile = account.type === 'uk_business' ? 'business' : 'personal'

                // A. Sync the MAIN account balance to the "General" pot
                console.log(`Fetching balance for account: ${account.id} (${account.type})`)
                const balancerRes = await fetch(`https://api.monzo.com/balance?account_id=${account.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (balancerRes.ok) {
                    const balanceData = await balancerRes.json()
                    const mainBalance = balanceData.balance / 100

                    // Find or ensure the "General" pot for this profile
                    const { data: generalPot } = await supabase
                        .from('fin_pockets')
                        .select('id')
                        .eq('profile', profile)
                        .ilike('name', 'General')
                        .single()

                    if (generalPot) {
                        await supabase
                            .from('fin_pockets')
                            .update({
                                monzo_id: account.id, // Store account ID for webhook routing
                                balance: mainBalance,
                                current_balance: mainBalance,
                                last_synced_at: new Date().toISOString()
                            })
                            .eq('id', generalPot.id)
                        console.log(`Synced Main ${profile} Balance: £${mainBalance} (Mapped to account: ${account.id})`)
                    }
                }

                // B. Sync Pots
                console.log(`Fetching pots for account: ${account.id}`)
                const potsRes = await fetch(`https://api.monzo.com/pots?current_account_id=${account.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (!potsRes.ok) {
                    const err = await potsRes.text()
                    console.error(`[MonzoService] Pots fetch failed for account ${account.id}:`, potsRes.status, err)
                    return
                }

                const potsData = await potsRes.json()
                const pots = potsData.pots || []

                await Promise.all(pots.map(async (pot: any) => {
                    if (pot.deleted) return
                    syncedMonzoIds.add(pot.id)

                    // Determine which profile this belongs to
                    const profile = account.type === 'uk_business' ? 'business' : 'personal'

                    // Smart Matching:
                    // 1. Try to find by monzo_id
                    // 2. Fallback: Try to find by name within the same profile (that isn't linked yet)
                    const existing = existingKarrPots?.find(p => p.monzo_id === pot.id) ||
                        existingKarrPots?.find(p => p.name === pot.name && p.profile === profile && !p.monzo_id)

                    const pocketData: any = {
                        monzo_id: pot.id,
                        name: pot.name,
                        balance: pot.balance / 100,
                        current_balance: pot.balance / 100,
                        target_budget: existing?.target_budget || 0, // Preserve manual weekly allocation
                        target_amount: (pot.goal_amount || 0) / 100, // Actual savings goal from Monzo
                        last_synced_at: new Date().toISOString(),
                        type: (
                            pot.type?.toLowerCase().includes('savings') ||
                            pot.type?.toLowerCase().includes('interest') ||
                            pot.type?.toLowerCase().includes('challenge') ||
                            pot.savings_account_id ||
                            pot.name.toLowerCase().includes('savings') ||
                            pot.name.toLowerCase().includes('challenge')
                        ) ? 'savings' : 'general',
                        profile: profile
                    }

                    if (existing?.id) {
                        pocketData.id = existing.id
                    }

                    // If we have an ID (linking by name or existing sync), default upsert uses ID (PK)
                    // If we don't have an ID, we use onConflict: 'monzo_id' to avoid duplicates
                    const { error } = await supabase
                        .from('fin_pockets')
                        .upsert(pocketData, existing?.id ? {} : { onConflict: 'monzo_id' })

                    if (error) {
                        console.error(`Failed to sync Pot ${pot.name}:`, error)
                    } else {
                        console.log(`Synced Pot: ${pot.name} (£${pot.balance / 100}) to profile: ${profile}`)
                    }
                }))
            } catch (accError) {
                console.error(`Failed to sync account ${account.id}:`, accError)
            }
        }))

        // 3. Source of Truth Cleanup: Delete Schrö pots that weren't in the Monzo response
        // We skip pots that don't have a monzo_id IF they are protected (General/Liabilities)
        const potsToDelete = existingKarrPots?.filter(p => {
            // Never delete protected system pots
            const nameLower = p.name.toLowerCase()
            if (nameLower.includes('general') || nameLower.includes('liabilities')) return false

            // If it has a monzo_id but that ID wasn't in the latest sync, it's been deleted in Monzo
            if (p.monzo_id && !syncedMonzoIds.has(p.monzo_id)) {
                console.log(`[MonzoService] Marking pot for deletion (Monzo ID not found in sync): ${p.name} (ID: ${p.id}, Monzo ID: ${p.monzo_id})`)
                return true
            }

            // If it doesn't have a monzo_id, it's a local-only pot that we now want to remove
            // to ensure Monzo is the absolute source of truth
            if (!p.monzo_id) {
                console.log(`[MonzoService] Marking pot for deletion (no Monzo ID, local-only): ${p.name} (ID: ${p.id})`)
                return true
            }

            return false
        }) || []

        if (potsToDelete.length > 0) {
            console.log(`[MonzoService] Preparing to delete ${potsToDelete.length} orphaned pots:`, potsToDelete.map(p => p.name).join(', '))

            // 1. Re-assign dependencies to "General" to avoid FK errors
            for (const pot of potsToDelete) {
                // Find the "General" pot for this profile
                const generalPot = existingKarrPots?.find(p =>
                    p.profile === pot.profile &&
                    p.name.toLowerCase().includes('general')
                )

                if (generalPot && generalPot.id !== pot.id) {
                    console.log(`[MonzoService] Re-assigning deps from ${pot.name} to ${generalPot.name}...`)
                    // Transactions
                    const { error: txError } = await supabase
                        .from('fin_transactions')
                        .update({ pocket_id: generalPot.id })
                        .eq('pocket_id', pot.id)

                    if (txError) console.error(`[MonzoService] Failed to re-assign transactions for ${pot.name}:`, txError)

                    // Income
                    const { error: incomeError } = await supabase
                        .from('fin_income')
                        .update({ pocket_id: generalPot.id })
                        .eq('pocket_id', pot.id)

                    if (incomeError) console.error(`[MonzoService] Failed to re-assign income for ${pot.name}:`, incomeError)
                }
            }

            // 2. Now attempt to delete
            console.log(`[MonzoService] Deleting ${potsToDelete.length} orphaned pots...`)
            const { error: deleteError } = await supabase
                .from('fin_pockets')
                .delete()
                .in('id', potsToDelete.map(p => p.id))

            if (deleteError) {
                console.error('[MonzoService] Failed to cleanup orphaned pots:', deleteError)
            } else {
                console.log('[MonzoService] Cleanup successful.')
            }
        } else {
            console.log('[MonzoService] No orphaned pots to delete.')
        }

        // 4. Sync Transactions for all active accounts
        await this.syncTransactions(userId)
    }

    static async registerWebhooks(userId: string) {
        const token = await this.getValidToken(userId)
        if (!token) throw new Error('No Monzo connection found')

        const accountsRes = await fetch('https://api.monzo.com/accounts', {
            headers: { Authorization: `Bearer ${token}` }
        })
        const accountsData = await accountsRes.json()
        const accounts = accountsData.accounts || []

        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/finance/monzo/webhook`

        for (const account of accounts) {
            if (account.closed) continue

            // 1. Delete ALL existing webhooks for this account first
            const existingRes = await fetch(`https://api.monzo.com/webhooks?account_id=${account.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const existingData = await existingRes.json()
            const existing = existingData.webhooks || []

            for (const wh of existing) {
                await fetch(`https://api.monzo.com/webhooks/${wh.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                })
                console.log(`[MonzoService] Deleted old webhook: ${wh.id}`)
            }

            // 2. Register exactly ONE new webhook
            console.log(`[MonzoService] Registering webhook for account ${account.id}...`)
            const regRes = await fetch('https://api.monzo.com/webhooks', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    account_id: account.id,
                    url: webhookUrl
                })
            })
            const regData = await regRes.json()
            console.log(`[MonzoService] Registered webhook: ${regData.webhook?.id}`)
        }
        return { success: true }
    }

    static async syncTransactions(userId: string) {
        const token = await this.getValidToken(userId)
        if (!token) throw new Error('No Monzo connection found')

        const accountsRes = await fetch('https://api.monzo.com/accounts', {
            headers: { Authorization: `Bearer ${token}` }
        })
        const accountsData = await accountsRes.json()
        const accounts = accountsData.accounts || []

        const supabase = this.getServerSupabase()

        await Promise.all(accounts.map(async (account: any) => {
            if (account.closed) return

            console.log(`[MonzoService] Syncing transactions for account ${account.id}...`)
            const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
            const txRes = await fetch(`https://api.monzo.com/transactions?account_id=${account.id}&since=${since}&limit=100&expand[]=merchant`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (!txRes.ok) return
            const txData = await txRes.json()
            const transactions = txData.transactions || []

            const profile: 'personal' | 'business' = account.type === 'uk_business' ? 'business' : 'personal'

            // PRE-FILTER: Avoid hundreds of redundant slow RPC calls on every sync
            const txIds = transactions.map((t: any) => t.id)

            const { data: existingTxs } = await supabase
                .from('fin_transactions')
                .select('provider_tx_id')
                .in('provider_tx_id', txIds)

            const existingIds = new Set(existingTxs?.map(t => t.provider_tx_id) || [])
            const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000)

            const txsToProcess = transactions.filter((tx: any) => {
                const isRecent = new Date(tx.created).getTime() > twoDaysAgo
                // Process if it doesn't exist yet OR if it's very recent (to catch settlements)
                return !existingIds.has(tx.id) || isRecent
            })

            console.log(`[MonzoService] Account ${account.id}: Found ${transactions.length} txs. Processing ${txsToProcess.length} (skipped ${transactions.length - txsToProcess.length} existing).`)

            for (const tx of txsToProcess) {
                if (tx.decline_reason) continue

                const amount = Math.abs(tx.amount / 100)
                const isSpend = tx.amount < 0
                const potId = tx.metadata?.pot_id
                const isTransfer = tx.category === 'p2p' || !!potId || tx.description?.startsWith('pot_')
                const targetMonzoId = potId || account.id

                // Find pocket to get name and ID
                const { data: pocket } = await supabase
                    .from('fin_pockets')
                    .select('id, name')
                    .eq('monzo_id', targetMonzoId)
                    .single()

                // Improve description for transfers/pots
                let description = tx.merchant?.name || tx.description
                if (description?.startsWith('pot_') && pocket) {
                    description = isSpend ? `Transfer to ${pocket.name}` : `Top up from ${pocket.name}`
                } else if (tx.category === 'p2p' && tx.counterparty?.name) {
                    description = tx.counterparty.name
                }

                // Determine type: transfer vs spend vs income
                let txType: 'spend' | 'income' | 'transfer'
                if (isTransfer) {
                    txType = 'transfer'
                } else if (isSpend) {
                    txType = 'spend'
                } else {
                    txType = 'income'
                }

                // Use the atomic RPC to ensure consistency with the webhook
                const { data: rpcStatus, error: rpcError } = await supabase.rpc('process_monzo_transaction', {
                    p_provider_tx_id: tx.id,
                    p_description: description,
                    p_amount: amount,
                    p_type: txType,
                    p_category: this.mapMonzoCategory(tx.category || 'other'),
                    p_pocket_id: pocket?.id,
                    p_profile: profile,
                    p_date: tx.created
                })

                if (rpcError) {
                    console.error(`[MonzoService] RPC Error syncing ${tx.id}:`, rpcError)
                    continue
                }

                if (rpcStatus === 'INSERTED') {
                    const isTransfer = tx.category === 'p2p' || !!tx.metadata?.pot_id
                    const shouldNotify = !isTransfer || isSpend

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
                }

                console.log(`[MonzoService] Synced tx ${tx.id}: ${rpcStatus}`)
            }
        }))
    }
}
