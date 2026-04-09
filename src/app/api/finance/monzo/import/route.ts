export const dynamic = 'force-dynamic'
i < lines.length; i++) {
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
