'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RecurringObligation } from '../types/finance.types'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_FINANCE, MOCK_BUSINESS } from '@/lib/demoData'

export function useRecurring() {
    const [obligations, setObligations] = useState<RecurringObligation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { activeProfile, refreshTrigger, globalRefresh } = useFinanceProfile()
    const { settings } = useSystemSettings()

    const fetchObligations = useCallback(async () => {
        if (settings.is_demo_mode) {
            const storageKey = `karr_os_demo_obligations_${activeProfile}`
            const stored = localStorage.getItem(storageKey)

            if (stored) {
                const parsed = JSON.parse(stored)
                // If the user has the old "Student Loan" with 108 payments (high debt), clear it to force update
                const hasHighDebt = parsed.some((o: any) => o.payments_left && o.payments_left > 100)
                if (hasHighDebt) {
                    localStorage.removeItem(storageKey)
                    fetchObligations()
                    return
                }
                setObligations(parsed)
            } else {
                const mockData = activeProfile === 'business' ? MOCK_BUSINESS.obligations : MOCK_FINANCE.obligations
                const obligations = mockData.map(o => ({
                    ...o,
                    id: o.id,
                    created_at: new Date().toISOString(),
                    profile: activeProfile,
                    next_due_date: new Date(new Date().getFullYear(), new Date().getMonth(), (o as any).due_day || 1).toISOString().split('T')[0],
                    frequency: 'monthly',
                    is_active: true
                })) as any
                setObligations(obligations)
                localStorage.setItem(storageKey, JSON.stringify(obligations))
            }
            setLoading(false)
            return
        }
        // Only show loading spinner on initial load (when there's no data yet)
        if (obligations.length === 0) setLoading(true)
        const { data, error } = await supabase
            .from('fin_recurring')
            .select('*')
            .eq('profile', activeProfile)
            .order('next_due_date', { ascending: true })

        if (error) setError(error.message)
        else setObligations(data ?? [])
        setLoading(false)
    }, [activeProfile, refreshTrigger, settings.is_demo_mode])

    const createObligation = async (obligation: Omit<RecurringObligation, 'id' | 'created_at' | 'profile'>) => {
        if (settings.is_demo_mode) {
            const storageKey = `karr_os_demo_obligations_${activeProfile}`
            const newObligation = {
                ...obligation,
                id: Math.random().toString(36).substr(2, 9),
                created_at: new Date().toISOString(),
                profile: activeProfile,
                is_active: true
            } as RecurringObligation
            const updated = [...obligations, newObligation]
            localStorage.setItem(storageKey, JSON.stringify(updated))
            globalRefresh()
            return
        }
        const { error } = await supabase.from('fin_recurring').insert({ ...obligation, profile: activeProfile })
        if (error) throw error
        globalRefresh()
    }

    const updateObligation = async (id: string, updates: Partial<RecurringObligation>) => {
        if (settings.is_demo_mode) {
            const storageKey = `karr_os_demo_obligations_${activeProfile}`
            const updated = obligations.map(o => o.id === id ? { ...o, ...updates } : o)
            localStorage.setItem(storageKey, JSON.stringify(updated))
            globalRefresh()
            return
        }
        const { error } = await supabase.from('fin_recurring').update(updates).eq('id', id)
        if (error) throw error
        globalRefresh()
    }

    const deleteObligation = async (id: string) => {
        if (settings.is_demo_mode) {
            const storageKey = `karr_os_demo_obligations_${activeProfile}`
            const updated = obligations.filter(o => o.id !== id)
            localStorage.setItem(storageKey, JSON.stringify(updated))
            globalRefresh()
            return
        }
        const { error } = await supabase.from('fin_recurring').delete().eq('id', id)
        if (error) throw error
        globalRefresh()
    }

    const markObligationAsPaid = async (obligation: RecurringObligation) => {
        // 1. Logic for Liability Pot subtraction and Transaction logging
        const { data: potData } = await supabase
            .from('fin_pockets')
            .select('*')
            .eq('profile', activeProfile)
            .or(`name.ilike.%Liabilities%,type.eq.buffer`)
            .limit(1)

        const pot = potData?.[0]

        if (pot) {
            console.log(`Schrö: Found Liabilities pot "${pot.name}" (ID: ${pot.id}, Balance: ${pot.balance}). Deducting £${obligation.amount}.`)
            // Deduct from pot (Liabilities pot can go negative)
            await supabase.from('fin_pockets').update({
                balance: (pot.balance || 0) - obligation.amount,
                current_balance: (pot.current_balance || 0) - obligation.amount
            }).eq('id', pot.id)

            // Create tracking transaction
            await supabase.from('fin_transactions').insert({
                type: 'spend',
                amount: obligation.amount,
                pocket_id: pot.id,
                description: `[Liability] ${obligation.name}`,
                date: new Date().toISOString().split('T')[0],
                category: obligation.category || 'bills',
                emoji: obligation.emoji || '💸',
                profile: activeProfile
            })
        }

        if (obligation.payments_left === 1) {
            await deleteObligation(obligation.id)
            return
        }

        const currentNextDue = new Date(obligation.next_due_date)
        let newNextDue = new Date(currentNextDue)
        if (obligation.frequency === 'monthly') {
            const targetMonth = newNextDue.getMonth() + 1
            newNextDue.setMonth(targetMonth)
            if (newNextDue.getMonth() !== ((targetMonth % 12) + 12) % 12) newNextDue.setDate(0)
        } else if (obligation.frequency === 'weekly') {
            newNextDue.setDate(newNextDue.getDate() + 7)
        } else if (obligation.frequency === 'bi-weekly') {
            newNextDue.setDate(newNextDue.getDate() + 14)
        } else if (obligation.frequency === 'yearly') {
            const targetMonth = newNextDue.getMonth() + 12
            newNextDue.setMonth(targetMonth)
            if (newNextDue.getMonth() !== ((targetMonth % 12) + 12) % 12) newNextDue.setDate(0)
        }

        const updates: Partial<RecurringObligation> = {
            next_due_date: newNextDue.toISOString().split('T')[0]
        }

        if (obligation.payments_left != null && obligation.payments_left > 1) {
            updates.payments_left = obligation.payments_left - 1
        }

        await updateObligation(obligation.id, updates)
    }

    useEffect(() => {
        fetchObligations()
    }, [fetchObligations, activeProfile, refreshTrigger])

    return {
        obligations,
        loading,
        error,
        createObligation,
        updateObligation,
        deleteObligation,
        markObligationAsPaid,
        refetch: fetchObligations
    }
}
