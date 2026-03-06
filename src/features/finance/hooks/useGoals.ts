'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Goal } from '../types/finance.types'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_FINANCE } from '@/lib/demoData'

export function useGoals() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { activeProfile, refreshTrigger } = useFinanceProfile()
    const { settings } = useSystemSettings()

    const fetchGoals = async () => {
        if (settings.is_demo_mode) {
            setGoals(MOCK_FINANCE.goals as any)
            setLoading(false)
            return
        }
        if (goals.length === 0) setLoading(true)
        const { data, error } = await supabase
            .from('fin_goals')
            .select('*')
            .eq('profile', activeProfile)
            .order('created_at', { ascending: true })

        if (error) setError(error.message)
        else setGoals(data ?? [])
        setLoading(false)
    }

    const createGoal = async (goal: Omit<Goal, 'id' | 'created_at' | 'profile'>) => {
        const { error } = await supabase.from('fin_goals').insert({ ...goal, profile: activeProfile })
        if (error) throw error
        await fetchGoals()
    }

    const updateGoal = async (id: string, updates: Partial<Goal>) => {
        if (settings.is_demo_mode) {
            const currentGoals = [...goals]
            const index = currentGoals.findIndex(g => g.id === id)
            if (index !== -1) {
                currentGoals[index] = { ...currentGoals[index], ...updates }
                setGoals(currentGoals)
                // Persistence... (demoData is static so we rely on state for now, 
                // but usually we'd use sessionStorage if we wanted to survive reloads)
            }
            return
        }
        const { error } = await supabase.from('fin_goals').update(updates).eq('id', id)
        if (error) throw error
        await fetchGoals()
    }

    const deleteGoal = async (id: string) => {
        const { error } = await supabase.from('fin_goals').delete().eq('id', id)
        if (error) throw error
        await fetchGoals()
    }

    useEffect(() => { fetchGoals() }, [activeProfile, refreshTrigger, settings.is_demo_mode])

    return { goals, loading, error, createGoal, updateGoal, deleteGoal, refetch: fetchGoals }
}
