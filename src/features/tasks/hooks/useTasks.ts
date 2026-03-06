'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '../types/tasks.types'
import { useTasksProfile } from '@/features/tasks/contexts/TasksProfileContext'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_TASKS } from '@/lib/demoData'

const LOCAL_STORAGE_KEY = 'schrö_demo_tasks'

export function useTasks(category: 'todo' | 'grocery' | 'reminder', profileOverride?: string) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { activeProfile: contextProfile } = useTasksProfile()
    const activeProfile = profileOverride || contextProfile
    const { settings } = useSystemSettings()

    const getSessionTasks = useCallback(() => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
            if (stored) {
                const allTasks = JSON.parse(stored)
                return allTasks[category] || null
            }
        } catch (e) {
            console.error('Failed to load tasks from local storage', e)
        }
        return null
    }, [category])

    const saveSessionTasks = useCallback((newTasks: Task[]) => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
            const allTasks = stored ? JSON.parse(stored) : {}
            allTasks[category] = newTasks
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allTasks))
        } catch (e) {
            console.error('Failed to save tasks to local storage', e)
        }
    }, [category])

    const fetchTasks = useCallback(async () => {
        if (settings.is_demo_mode) {
            let allTasks = getSessionTasks()
            if (allTasks) {
                // If the user has old demo tasks missing the 'profile' field, clear them to force update
                const isStale = allTasks.some((t: any) => !t.profile)
                if (isStale) {
                    localStorage.removeItem(LOCAL_STORAGE_KEY)
                    allTasks = null
                }
            }

            if (!allTasks) {
                const initial = (MOCK_TASKS[category] as any).map((t: any) => ({
                    ...t,
                    amount: t.amount || null,
                    position: t.position || Date.now()
                }))
                saveSessionTasks(initial)
                allTasks = initial
            }
            const filtered = activeProfile === 'all'
                ? allTasks
                : allTasks.filter((t: Task) => t.profile === activeProfile)
            setTasks(filtered)
            setLoading(false)
            return
        }
        setLoading(true)
        let query = supabase
            .from('fin_tasks')
            .select('*')
            .eq('category', category)
            .order('position', { ascending: false })

        if (activeProfile !== 'all') {
            query = query.eq('profile', activeProfile)
        }

        const { data, error } = await query

        if (error) setError(error.message)
        else setTasks(data ?? [])
        setLoading(false)
    }, [activeProfile, category, settings.is_demo_mode, getSessionTasks, saveSessionTasks])

    const createTask = async (taskData: Partial<Task>) => {
        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks() || []
            const newTask: Task = {
                id: `demo-${Date.now()}`,
                title: taskData.title || 'Untitled',
                priority: taskData.priority || 'low',
                due_date: taskData.due_date,
                due_date_mode: taskData.due_date_mode || 'on',
                end_date: taskData.end_date,
                recurrence_config: taskData.recurrence_config || null,
                amount: taskData.amount,
                notes: taskData.notes,
                strategic_category: taskData.strategic_category,
                estimated_duration: taskData.estimated_duration,
                impact_score: taskData.impact_score,
                travel_to_duration: taskData.travel_to_duration,
                travel_from_duration: taskData.travel_from_duration,
                start_time: taskData.start_time,
                location: taskData.location,
                origin_location: taskData.origin_location,
                is_completed: false,
                category,
                profile: activeProfile as any,
                created_at: new Date().toISOString(),
                position: allTasks.length > 0 ? Math.max(...allTasks.map((t: Task) => t.position || 0)) + 1000 : Date.now()
            }
            const updated = [newTask, ...allTasks]
            saveSessionTasks(updated)
            await fetchTasks()
            return
        }

        const { error } = await supabase.from('fin_tasks').insert({
            ...taskData,
            category,
            profile: activeProfile,
            position: tasks.length > 0 ? Math.max(...tasks.map((t: Task) => t.position || 0)) + 1000 : Date.now(),
        })
        if (error) throw error
        await fetchTasks()
    }

    const updateTaskPositions = async (orderedTasks: Task[]) => {
        // Calculate new positions: ensure descending order (higher position at index 0)
        const updatedOrdered = orderedTasks.map((t, idx) => ({
            ...t,
            position: (orderedTasks.length - idx) * 1000
        }))

        // Update local state immediately for snappy UI
        setTasks(updatedOrdered)

        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks() || []
            // Merge updated ordered tasks back into the full list
            const fullUpdated = allTasks.map((t: Task) => {
                const found = updatedOrdered.find(o => o.id === t.id)
                return found ? found : t
            })
            saveSessionTasks(fullUpdated)
            return
        }

        try {
            for (const t of updatedOrdered) {
                await supabase.from('fin_tasks').update({ position: t.position }).eq('id', t.id)
            }
        } catch (err) {
            console.error('Failed to persist task positions', err)
            await fetchTasks()
        }
    }

    const toggleTask = async (id: string, is_completed: boolean) => {
        // Optimistic UI update - immediately reflect the change
        setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed } : t))

        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks() || []
            const updated = allTasks.map((t: Task) => t.id === id ? { ...t, is_completed } : t)
            saveSessionTasks(updated)
            return
        }
        const { error } = await supabase.from('fin_tasks').update({ is_completed }).eq('id', id)
        if (error) {
            // Revert on error
            setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: !is_completed } : t))
            throw error
        }
    }

    const editTask = async (id: string, updates: Partial<Task>) => {
        // Optimistic UI update - immediately reflect the change
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))

        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks() || []
            const updated = allTasks.map((t: Task) => t.id === id ? { ...t, ...updates } : t)
            saveSessionTasks(updated)
            // fetchTasks usually not strictly needed with optimistic update but good for consistency
            await fetchTasks()
            return
        }
        const { error } = await supabase.from('fin_tasks').update(updates).eq('id', id)
        if (error) {
            // Revert on error
            await fetchTasks()
            throw error
        }
        // Still fetch in background to ensure sync
        fetchTasks()
    }

    const deleteTask = async (id: string) => {
        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks() || []
            const updated = allTasks.filter((t: Task) => t.id !== id)
            saveSessionTasks(updated)
            await fetchTasks()
            return
        }
        const { error } = await supabase.from('fin_tasks').delete().eq('id', id)
        if (error) throw error
        await fetchTasks()
    }

    const clearAllTasks = async () => {
        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks() || []
            const remaining = allTasks.filter((t: Task) => t.profile !== activeProfile)
            saveSessionTasks(remaining)
            await fetchTasks()
            return
        }
        const { error } = await supabase.from('fin_tasks')
            .delete()
            .eq('profile', activeProfile)
            .eq('category', category)
        if (error) throw error
        await fetchTasks()
    }

    const clearCompletedTasks = async () => {
        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks() || []
            const updated = allTasks.filter((t: Task) => !(t.profile === activeProfile && t.is_completed))
            saveSessionTasks(updated)
            await fetchTasks()
            return
        }
        const { error } = await supabase.from('fin_tasks')
            .delete()
            .eq('profile', activeProfile)
            .eq('category', category)
            .eq('is_completed', true)
        if (error) throw error
        await fetchTasks()
    }

    useEffect(() => {
        fetchTasks()

        if (settings.is_demo_mode) return

        // Real-time subscription
        const channel = supabase
            .channel('tasks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'fin_tasks',
                    filter: `category=eq.${category}`
                },
                () => {
                    fetchTasks()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchTasks, category, settings.is_demo_mode])

    return {
        tasks,
        loading,
        error,
        createTask,
        toggleTask,
        deleteTask,
        clearAllTasks,
        clearCompletedTasks,
        editTask,
        updateTaskPositions,
        refetch: fetchTasks
    }
}
