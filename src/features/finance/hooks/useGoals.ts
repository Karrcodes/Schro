'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Goal } from '../types/finance.types'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_FINANCE, MOCK_BUSINESS } from '@/lib/demoData'
import { ProfileType } from '../types/finance.types'
import { isTauri } from '@/lib/utils'
import { LocalGoalsService } from '@/features/goals/services/localGoalsService'

export function useGoals(profileOverride?: ProfileType) {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { activeProfile: contextProfile, refreshTrigger } = useFinanceProfile()
    const activeProfile = profileOverride || contextProfile
    const { settings } = useSystemSettings()

    const fetchGoals = async () => {
        if (settings.is_demo_mode) {
            const mockData = activeProfile === 'business' ? MOCK_BUSINESS.goals : MOCK_FINANCE.goals
            setGoals(mockData as any)
            setLoading(false)
            return
        }
        // --- LOCAL FIRST STRATEGY (TAURI) ---
        if (isTauri()) {
            const localGoals = await LocalGoalsService.getGoals()
            if (localGoals.length > 0) setGoals(localGoals)
            else if (goals.length === 0) setLoading(true)

            const { data, error } = await supabase
                .from('fin_goals')
                .select('*')
                .eq('profile', activeProfile)
                .order('created_at', { ascending: true })

            if (!error && data) {
                 await LocalGoalsService.syncGoals(data)
                 setGoals(data)
            }
            if (error) setError(error.message)
            setLoading(false)
            return
        }

        // --- STANDARD WEB STRATEGY ---
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
        if (settings.is_demo_mode) {
            const newGoal = { ...goal, id: `demo-g-${Date.now()}`, created_at: new Date().toISOString() } as Goal
            setGoals([newGoal, ...goals])
            return
        }

        const { data, error } = await supabase.from('fin_goals').insert({ ...goal, profile: activeProfile }).select().single()
        if (error) throw error
        if (isTauri() && data) {
            await LocalGoalsService.saveGoalLocally(data)
        }
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
        // Local Sync
        if (isTauri()) {
             const goal = goals.find(g => g.id === id)
             if (goal) await LocalGoalsService.saveGoalLocally({ ...goal, ...updates })
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
