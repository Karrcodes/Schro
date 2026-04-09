export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function categoriseDescription(desc: string): string {
    const d = desc.toLowerCase()

    // Groceries
    if (d.includes('tesco') || d.includes('sainsbury') || d.includes('asda') || d.includes('morrisons') || d.includes('aldi') || d.includes('lidl') || d.includes('waitrose') || d.includes('co-op') || d.includes('marks & spencer') || d.includes('m&s') || d.includes('iceland') || d.includes('farmfoods') || d.includes('spar')) return 'groceries'

    // Food & Drink (Coffee, Takeaways, Dining, Restaurants)
    if (d.includes('deliveroo') || d.includes('uber eats') || d.includes('just eat') || d.includes('dominos') || d.includes('mcdonalds') || d.includes('kfc') || d.includes('burger king') || d.includes('greggs') || d.includes('papa john') || d.includes('subway') || d.includes('five guys') || d.includes('krispy kreme') ||
        d.includes('starbucks') || d.includes('costa') || d.includes('pret a manger') || d.includes('caffe nero') || d.includes('cafe') || d.includes('lavazza') || d.includes('blank street') || d.includes('gail') || d.includes('joe & the juice') ||
        d.includes('restaurant') || d.includes('pub') || d.includes('bar') || d.includes('nandos') || d.includes('wagamama') || d.includes('pizza express') || d.includes('leon') || d.includes('itsou') || d.includes('honest burgers')) return 'food_drink'

    // Transport
    if (d.includes('tfl') || d.includes('transport for london') || d.includes('trainline') || d.includes('northern rail') || d.includes('lner') || d.includes('gwr') || d.includes('crosscountry') || d.includes('avanti') || d.includes('scotrail') || d.includes('national express') || d.includes('megabus') || d.includes('stagecoach') || d.includes('first bus') || d.includes('arriva') ||
        d.includes('uber') || d.includes('bolt') || d.includes('free-now') || d.includes('kapten') || d.includes('ola') || d.includes('lime') || d.includes('tier') || d.includes('voi')) return 'transport'

    // Shopping
    if (d.includes('amazon') || d.includes('amzn') || d.includes('argos') || d.includes('john lewis') || d.includes('boots') || d.includes('superdrug') || d.includes('b&m') || d.includes('home bargains') || d.includes('poundland') || d.includes('wilko') || d.includes('ikea') ||
        d.includes('asos') || d.includes('zara') || d.includes('h&m') || d.includes('primark') || d.includes('next') || d.includes('uniqlo') || d.includes('urban outfitters') || d.includes('jd sports') || d.includes('sports direct') || d.includes('nike') || d.includes('adidas') ||
        d.includes('apple') || d.includes('currys') || d.includes('pc world') || d.includes('samsung') || d.includes('argos')) return 'shopping'

    // Entertainment & Subs
    if (d.includes('netflix') || d.includes('spotify') || d.includes('amazon prime') || d.includes('disney+') || d.includes('now tv') || d.includes('apple.com/bill') || d.includes('youtube') || d.includes('paramount') || d.includes('hulu') ||
        d.includes('cinema') || d.includes('odeon') || d.includes('vue') || d.includes('cineworld') || d.includes('everyman') || d.includes('picturehouse') ||
        d.includes('playstation') || d.includes('xbox') || d.includes('nintendo') || d.includes('steam') || d.includes('epic games') || d.includes('blizzard') || d.includes('ea ')) return 'entertainment'

    // Health
    if (d.includes('gym') || d.includes('puregym') || d.includes('david lloyd') || d.includes('fitness first') || d.includes('the gym group') || d.includes('nuffield') || d.includes('virgin active') || d.includes('bupa') || d.includes('pharmacy') || d.includes('specsavers') || d.includes('vision express') || d.includes('dentist')) return 'health'

    // Bills & Utilities
    if (d.includes('british gas') || d.includes('eon') || d.includes('e.on') || d.includes('edf') || d.includes('ovo') || d.includes('octopus') || d.includes('thames water') || d.includes('welsh water') || d.includes('severn trent') || d.includes('scottish water') ||
        d.includes('ee ') || d.includes('o2 ') || d.includes('vodafone') || d.includes('three') || d.includes('virgin media') || d.includes('bt ') || d.includes('sky ') || d.includes('talktalk') || d.includes('plusnet') || d.includes('giffgaff') || d.includes('smarty') || d.includes('lebara')) return 'bills'

    // Housing
    if (d.includes('council tax') || d.includes('rent') || d.includes('mortgage') || d.includes('tv licence')) return 'housing'

    // Travel
    if (d.includes('airbnb') || d.includes('booking.com') || d.includes('expedia') || d.includes('hotels.com') || d.includes('easyjet') || d.includes('ryanair') || d.includes('british airways') || d.includes('wizz air') || d.includes('virgin atlantic') || d.includes('premier inn') || d.includes('travelodge') || d.includes('holiday inn')) return 'travel'

    return 'other'
}

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
                .eq('provider', 'revolut_csv')
                .eq('user_id', userId)
        }

        const lines = csvText.split('\n')
        if (lines.length < 2) {
            return NextResponse.json({ error: 'Empty or invalid CSV' }, { status: 400 })
        }

        const header = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''))

        const colMap = {
            date: header.findIndex((h: string) => h.toLowerCase().includes('date') || h.toLowerCase() === 'started'),
            description: header.findIndex((h: string) => h.toLowerCase().includes('description')),
            amount: header.findIndex((h: string) => h.toLowerCase() === 'amount'),
            type: header.findIndex((h: string) => h.toLowerCase() === 'type')
        }

        if (colMap.amount === -1 || colMap.description === -1) {
            return NextResponse.json({ error: 'Could not identify required CSV columns (Amount, Description)' }, { status: 400 })
        }

        const parsed: any[] = []

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            const row = line.split(',').map((r: string) => r.trim().replace(/"/g, ''))

            const rawAmount = row[colMap.amount]
            if (!rawAmount) continue

            const amount = parseFloat(rawAmount)
            if (isNaN(amount)) continue

            const description = row[colMap.description] || 'Revolut Transaction'
            const date = row[colMap.date] || new Date().toISOString()
            const revolutType = (colMap.type >= 0 ? row[colMap.type] : '').toUpperCase().replace(/ /g, '_')
            const providerTxId = `rev_${Buffer.from(`${userId}${date}${amount}${description}`).toString('base64').substring(0, 32)}`

            if (revolutType === 'EXCHANGE') continue

            const isSalary = description.toLowerCase().includes('payment from u u k')

            let txType: 'spend' | 'income' | 'transfer'
            if (revolutType === 'CARD_PAYMENT' || revolutType === 'ATM' || revolutType === 'FEE') {
                txType = 'spend'
            } else if (isSalary) {
                txType = 'income'
            } else {
                txType = 'transfer'
            }

            parsed.push({
                user_id: userId,
                amount: Math.abs(amount),
                type: txType,
                description,
                date: date.replace(' ', 'T'),
                emoji: txType === 'spend' ? '💸' : txType === 'income' ? '💰' : '🔄',
                profile,
                provider: 'revolut_csv',
                provider_tx_id: providerTxId
            })

        }

        const transactions = parsed.map(p => ({
            ...p,
            category: p.type === 'spend' ? categoriseDescription(p.description) : 'other'
        }))

        const uniqueTransactions = transactions.filter((t, index, self) =>
            index === self.findIndex((tx) => tx.provider_tx_id === t.provider_tx_id)
        )

        const { error: insertError, data } = await supabase
            .from('fin_transactions')
            .upsert(uniqueTransactions, { onConflict: 'provider_tx_id' })
            .select()

        if (insertError) {
            console.error('Supabase Import Error:', insertError)
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            message: `Successfully imported ${data?.length || 0} transactions.`
        })

    } catch (error: any) {
        console.error('Revolut Import Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
