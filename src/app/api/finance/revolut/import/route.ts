export const dynamic = 'force-dynamic'
i < lines.length; i++) {
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
