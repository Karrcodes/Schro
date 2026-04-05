'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Payslip } from '../types/finance.types'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_FINANCE } from '@/lib/demoData'

export function usePayslips() {
    const [payslips, setPayslips] = useState<Payslip[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { activeProfile, refreshTrigger, globalRefresh, isLogging, setLogging } = useFinanceProfile()
    const { settings } = useSystemSettings()

    const fetchPayslips = async () => {
        if (settings.is_demo_mode) {
            setPayslips([{
                id: 'd-ps-1',
                date: new Date().toISOString().split('T')[0],
                gross_pay: MOCK_FINANCE.income.raw,
                net_pay: MOCK_FINANCE.income.net,
                employer: 'Work Portal',
                tax_paid: 0,
                pension_contributions: 0,
                student_loan: 0,
                created_at: new Date().toISOString(),
                profile: activeProfile as any
            }])
            setLoading(false)
            return
        }
        
        setLoading(true)
        const { data, error } = await supabase
            .from('fin_payslips')
            .select('*')
            .eq('profile', activeProfile)
            .order('date', { ascending: false })

        if (error) {
            setError(error.message)
        } else if (data) {
            setPayslips(data)
        }
        setLoading(false)
    }

    const logPayslip = async (payload: Omit<Payslip, 'id' | 'created_at' | 'profile'>, skipAllocation = true) => {
        setLogging(true)
        try {
            // 1. Log the payslip record
            const { data: psData, error: psError } = await supabase.from('fin_payslips').insert({ ...payload, profile: activeProfile }).select().single()
            if (psError) throw psError

            // 2. Automated routing to General pocket (if not skipped)
            if (!skipAllocation) {
                const { data: pocketData, error: pocketError } = await supabase
                    .from('fin_pockets')
                    .select('*')
                    .eq('profile', activeProfile)
                    .or(`type.eq.general,name.ilike.%General%`)
                    .limit(10)

                if (pocketError) {
                    console.error('Schrö Error: Failed to find General pocket for allocation:', pocketError)
                    return
                }

                let pocket = pocketData?.find((p: any) => p.name.toLowerCase() === 'general')
                    || pocketData?.find((p: any) => p.type === 'general')
                    || pocketData?.find((p: any) => p.name.toLowerCase().includes('general'))
                    || pocketData?.[0]

                if (!pocket) {
                    const { data: fbData } = await supabase
                        .from('fin_pockets')
                        .select('*')
                        .or(`type.eq.general,name.ilike.%General%`)
                        .limit(5)
                    pocket = fbData?.find((p: any) => p.type === 'general') || fbData?.[0]
                }

                if (pocket) {
                    await supabase.from('fin_pockets').update({
                        balance: (pocket.balance || 0) + payload.net_pay,
                        current_balance: (pocket.current_balance || 0) + payload.net_pay
                    }).eq('id', pocket.id)

                    await supabase.from('fin_transactions').insert({
                        type: 'income',
                        amount: payload.net_pay,
                        pocket_id: pocket.id,
                        description: `Payslip: ${payload.employer || 'Salary'}`,
                        date: payload.date,
                        category: 'income',
                        emoji: '💰',
                        profile: activeProfile
                    })
                }

                globalRefresh()
            } else {
                fetchPayslips()
            }
        } finally {
            setLogging(false)
        }
    }

    const deletePayslip = async (id: string) => {
        const { data: ps } = await supabase.from('fin_payslips').select('*').eq('id', id).single()

        if (ps) {
            // Check if there was a transaction associated with this payslip
            const { data: txData } = await supabase.from('fin_transactions')
                .select('*')
                .eq('profile', activeProfile)
                .eq('amount', ps.net_pay)
                .eq('date', ps.date)
                .ilike('description', `Payslip: ${ps.employer || 'Salary'}`)
                .limit(1)

            if (txData && txData.length > 0) {
                const tx = txData[0]
                const pocketId = tx.pocket_id

                if (pocketId) {
                    const { data: pocket } = await supabase.from('fin_pockets').select('*').eq('id', pocketId).single()
                    if (pocket) {
                        await supabase.from('fin_pockets').update({
                            balance: (pocket.balance || 0) - ps.net_pay,
                            current_balance: (pocket.current_balance || 0) - ps.net_pay
                        }).eq('id', pocket.id)
                    }
                }

                // Delete the transaction
                await supabase.from('fin_transactions').delete().eq('id', tx.id)
            }
        }

        const { error } = await supabase.from('fin_payslips').delete().eq('id', id)
        if (error) throw error
        globalRefresh()
    }

    useEffect(() => { fetchPayslips() }, [activeProfile, refreshTrigger, settings.is_demo_mode])

    return { payslips, loading, isLogging, error, logPayslip, deletePayslip, refetch: fetchPayslips }
}
