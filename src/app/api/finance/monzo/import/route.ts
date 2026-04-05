import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
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
        const { csvText, profile = 'personal', wipeExisting = false } = await req.json()

        if (!csvText) {
            return NextResponse.json({ error: 'No CSV data provided' }, { status: 400 })
        }

        if (wipeExisting) {
            await supabase
                .from('fin_transactions')
                .delete()
                .eq('profile', profile)
                .eq('provider', 'monzo_csv')
                .eq('user_id', userId)
        }

        const lines = csvText.trim().split('\n')
        if (lines.length < 2) {
            return NextResponse.json({ error: 'Empty or invalid CSV' }, { status: 400 })
        }

        const header = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''))

        const colMap = {
            id: header.findIndex((h: string) => h === 'Transaction ID'),
            date: header.findIndex((h: string) => h === 'Date'),
            time: header.findIndex((h: string) => h === 'Time'),
            type: header.findIndex((h: string) => h === 'Type'),
            name: header.findIndex((h: string) => h === 'Name'),
            category: header.findIndex((h: string) => h === 'Category'),
            amount: header.findIndex((h: string) => h === 'Amount'),
            notes: header.findIndex((h: string) => h === 'Notes and #tags'),
        }

        if (colMap.date === -1 || colMap.amount === -1) {
            return NextResponse.json({ error: 'Could not identify required CSV columns (Date, Amount)' }, { status: 400 })
        }

        const parsed: any[] = []

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            const row: string[] = []
            let inQuotes = false
            let current = ''
            for (let char of line) {
                if (char === '"') inQuotes = !inQuotes
                else if (char === ',' && !inQuotes) {
                    row.push(current.trim())
                    current = ''
                } else {
                    current += char
                }
            }
            row.push(current.trim())

            const rawDate = row[colMap.date]
            const rawTime = row[colMap.time] || '00:00:00'
            const rawAmount = row[colMap.amount]
            if (!rawDate || !rawAmount) continue

            const [day, month, year] = rawDate.split('/')
            if (!day || !month || !year) continue
            // Combine with time to avoid the "1:00" midnight offset
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${rawTime}`

            const amount = parseFloat(rawAmount)
            if (isNaN(amount)) continue

            const description = row[colMap.name] || row[colMap.notes] || 'Monzo Transaction'
            const monzoCategory = row[colMap.category]?.toLowerCase() || 'other'
            const monzoType = row[colMap.type]?.toLowerCase() || ''
            const providerTxId = row[colMap.id] || `monzo_${Buffer.from(`${userId}${formattedDate}${amount}${description}`).toString('base64').substring(0, 32)}`

            let txType: 'spend' | 'income' | 'transfer' = 'spend'
            if (amount > 0) txType = 'income'
            if (monzoCategory === 'transfers' || monzoType.includes('transfer') || monzoType.includes('monzo-to-monzo')) {
                txType = 'transfer'
            }

            const descLower = description.toLowerCase()
            if (descLower.includes('salary') || descLower.includes('payment from') || monzoCategory === 'income') {
                if (amount > 0) txType = 'income'
            }

            parsed.push({
                user_id: userId,
                amount: Math.abs(amount),
                type: txType,
                description,
                date: formattedDate,
                emoji: row[header.findIndex((h: string) => h === 'Emoji')] || (txType === 'spend' ? '💸' : txType === 'income' ? '💰' : '🔄'),
                profile,
                provider: 'monzo_csv',
                provider_tx_id: providerTxId,
                category: monzoCategory
            })
        }

        const uniqueTransactions = parsed.filter((t, index, self) =>
            index === self.findIndex((tx) => tx.provider_tx_id === t.provider_tx_id)
        )

        const { error: insertError, data } = await supabase
            .from('fin_transactions')
            .upsert(uniqueTransactions, { onConflict: 'provider_tx_id' })
            .select()

        if (insertError) {
            console.error('Monzo Import Error:', insertError)
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            message: `Successfully imported ${data?.length || 0} Monzo transactions.`
        })

    } catch (error: any) {
        console.error('Monzo API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
