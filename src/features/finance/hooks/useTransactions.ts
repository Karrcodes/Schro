'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '../types/finance.types'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_FINANCE, MOCK_BUSINESS } from '@/lib/demoData'
import { ProfileType } from '../types/finance.types'
import { isTauri } from '@/lib/utils'
import { LocalFinanceService } from '../services/localFinanceService'

export function useTransactions(profileOverride?: ProfileType | 'all') {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { activeProfile: contextProfile, refreshTrigger, globalRefresh } = useFinanceProfile()
    const activeProfile = profileOverride || contextProfile
    const { settings } = useSystemSettings()

    const fetchTransactions = async () => {
        if (settings.is_demo_mode) {
            const key = activeProfile === 'business' ? 'schrö_demo_finance_transactions_business_v1' : 'schrö_demo_finance_transactions_personal_v1'
            const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null

            if (stored) {
                setTransactions(JSON.parse(stored))
            } else {
                let mockData: any[] = []
                if (activeProfile === 'all') {
                    mockData = [
                        ...MOCK_FINANCE.transactions.map(t => ({ ...t, profile: 'personal' })),
                        ...MOCK_BUSINESS.transactions.map(t => ({ ...t, profile: 'business' }))
                    ]
                } else {
                    mockData = activeProfile === 'business'
                        ? MOCK_BUSINESS.transactions.map(t => ({ ...t, profile: 'business' }))
                        : MOCK_FINANCE.transactions.map(t => ({ ...t, profile: 'personal' }))
                }

                const refined = mockData.map(t => ({
                    ...t,
                    id: t.id,
                    created_at: new Date().toISOString(),
                    pocket_id: t.id.startsWith('d-tx-1') ? 'd-p-2' : (t.pocket_id || null)
                })) as Transaction[]

                setTransactions(refined)
                if (typeof window !== 'undefined' && activeProfile !== 'all') {
                    localStorage.setItem(key, JSON.stringify(refined))
                }
            }
            setLoading(false)
            return
        }
        // --- LOCAL FIRST STRATEGY (TAURI) ---
        if (isTauri()) {
            // 1. Immediately load what we have on Mac
            const localTxs = await LocalFinanceService.getTransactions()
            if (localTxs.length > 0) {
                setTransactions(localTxs)
            } else if (transactions.length === 0) {
                setLoading(true)
            }

            // 2. Background Sync
            let query = supabase.from('fin_transactions').select('*')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
            if (activeProfile !== 'all') {
                query = query.eq('profile', activeProfile)
            }
            const { data, error } = await query

            if (!error && data) {
                await LocalFinanceService.syncTransactions(data)
                setTransactions(data)
            }
            if (error) setError(error.message)
            setLoading(false)
            return
        }

        // --- STANDARD WEB STRATEGY ---
        // Only show loading spinner on initial load (when there's no data yet)
        if (transactions.length === 0) setLoading(true)
        let query = supabase
            .from('fin_transactions')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

        if (activeProfile !== 'all') {
            query = query.eq('profile', activeProfile)
        }

        const { data, error } = await query

        if (error) setError(error.message)
        else setTransactions(data ?? [])
        setLoading(false)
    }

    const clearTransactions = async () => {
        if (activeProfile === 'all') return // Safety
        setLoading(true)
        const { error } = await supabase
            .from('fin_transactions')
            .delete()
            .eq('profile', activeProfile)

        if (error) setError(error.message)
        else {
            setTransactions([])
            globalRefresh()
        }
        setLoading(false)
    }

        // Local Update (Instant)
        if (isTauri()) {
            const tx = transactions.find(t => t.id === id)
            if (tx) {
                await LocalFinanceService.saveTransactionLocally({ ...tx, ...updates })
            }
        }

        const { error } = await supabase
            .from('fin_transactions')
            .update(updates)
            .eq('id', id)

        if (error) {
            setError(error.message)
            fetchTransactions()
        } else {
            globalRefresh()
        }
    }

    const deleteTransaction = async (id: string) => {
        if (settings.is_demo_mode) {
            const updated = transactions.filter(t => t.id !== id)
            setTransactions(updated)
            const key = activeProfile === 'business' ? 'schrö_demo_finance_transactions_business_v1' : 'schrö_demo_finance_transactions_personal_v1'
            if (typeof window !== 'undefined' && activeProfile !== 'all') {
                localStorage.setItem(key, JSON.stringify(updated))
            }
            globalRefresh()
            return
        }

        // Local Delete (Instant)
        if (isTauri()) {
             setTransactions(prev => prev.filter(t => t.id !== id))
             // We can follow up with service deletion
        }

        const { error } = await supabase
            .from('fin_transactions')
            .delete()
            .eq('id', id)

        if (error) {
            setError(error.message)
            fetchTransactions()
        } else {
            globalRefresh()
        }
    }

    useEffect(() => { fetchTransactions() }, [activeProfile, refreshTrigger, settings.is_demo_mode])

    return { transactions, loading, error, refetch: fetchTransactions, updateTransaction, deleteTransaction, clearTransactions }
}
