'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '../types/tasks.types'
import { useTasksProfile } from './TasksProfileContext'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_TASKS } from '@/lib/demoData'

interface TasksContextType {
    tasks: Record<string, Task[]>
    loading: Record<string, boolean>
    errors: Record<string, string | null>
    fetchTasks: (category: string) => Promise<void>
    createTask: (category: string, taskData: Partial<Task>, activeProfile: string) => Promise<void>
    createTasks: (category: string, tasksData: Partial<Task>[], activeProfile: string) => Promise<void>
    toggleTask: (category: string, id: string, is_completed: boolean) => Promise<void>
    editTask: (category: string, id: string, updates: Partial<Task>) => Promise<void>
    deleteTask: (category: string, id: string) => Promise<void>
    clearAllTasks: (category: string, activeProfile: string) => Promise<void>
    clearCompletedTasks: (category: string, activeProfile: string) => Promise<void>
    updateTaskPositions: (category: string, orderedTasks: Task[]) => Promise<void>
}

const TasksContext = createContext<TasksContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = 'schrö_demo_tasks'

export function TasksProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useSystemSettings()
    const [tasks, setTasks] = useState<Record<string, Task[]>>({})
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const [errors, setErrors] = useState<Record<string, string | null>>({})

    const getSessionTasks = useCallback((category: string) => {
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
    }, [])

    const saveSessionTasks = useCallback((category: string, newTasks: Task[]) => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
            const allTasks = stored ? JSON.parse(stored) : {}
            allTasks[category] = newTasks
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allTasks))
        } catch (e) {
            console.error('Failed to save tasks to local storage', e)
        }
    }, [])

    const fetchTasks = useCallback(async (category: string) => {
        if (settings.is_demo_mode) {
            let allTasks = getSessionTasks(category)
            if (allTasks) {
                const isStale = allTasks.some((t: any) => !t.profile)
                if (isStale) {
                    localStorage.removeItem(LOCAL_STORAGE_KEY)
                    allTasks = null
                }
            }

            if (!allTasks) {
                const initial = (MOCK_TASKS[category as keyof typeof MOCK_TASKS] || []).map((t: any) => ({
                    ...t,
                    amount: t.amount || null,
                    position: t.position || Date.now()
                }))
                saveSessionTasks(category, initial)
                allTasks = initial
            }
            setTasks(prev => ({ ...prev, [category]: allTasks }))
            setLoading(prev => ({ ...prev, [category]: false }))
            return
        }

        setLoading(prev => ({ ...prev, [category]: true }))
        const { data, error } = await supabase
            .from('fin_tasks')
            .select('*')
            .eq('category', category)
            .order('position', { ascending: false })

        if (error) setErrors(prev => ({ ...prev, [category]: error.message }))
        else setTasks(prev => ({ ...prev, [category]: data ?? [] }))
        setLoading(prev => ({ ...prev, [category]: false }))
    }, [settings.is_demo_mode, getSessionTasks, saveSessionTasks])

    const createTask = async (category: string, taskData: Partial<Task>, activeProfile: string) => {
        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks(category) || []
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
                category: category as any,
                profile: activeProfile as any,
                created_at: new Date().toISOString(),
                position: allTasks.length > 0 ? Math.max(...allTasks.map((t: Task) => t.position || 0)) + 1000 : Date.now()
            }
            const updated = [newTask, ...allTasks]
            saveSessionTasks(category, updated)
            await fetchTasks(category)
            return
        }

        const currentTasks = tasks[category] || []
        const { error } = await supabase.from('fin_tasks').insert({
            ...taskData,
            category,
            profile: activeProfile,
            position: currentTasks.length > 0 ? Math.max(...currentTasks.map((t: Task) => t.position || 0)) + 1000 : Date.now(),
        })
        if (error) throw error
        await fetchTasks(category)
    }

    const createTasks = async (category: string, tasksData: Partial<Task>[], activeProfile: string) => {
        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks(category) || []
            let lastPosition = allTasks.length > 0 ? Math.max(...allTasks.map((t: Task) => t.position || 0)) : Date.now()

            const newTasks: Task[] = tasksData.map((taskData, idx) => ({
                id: `demo-${Date.now()}-${idx}`,
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
                price: taskData.price,
                is_completed: false,
                category: category as any,
                profile: activeProfile as any,
                created_at: new Date().toISOString(),
                position: lastPosition + (idx + 1) * 1000
            }))

            const updated = [...newTasks, ...allTasks]
            saveSessionTasks(category, updated)
            await fetchTasks(category)
            return
        }

        const currentTasks = tasks[category] || []
        let lastPosition = currentTasks.length > 0 ? Math.max(...currentTasks.map((t: Task) => t.position || 0)) : Date.now()

        const finalTasks = tasksData.map((taskData, idx) => ({
            ...taskData,
            category,
            profile: activeProfile,
            position: lastPosition + (idx + 1) * 1000,
            is_completed: false,
        }))

        const { error } = await supabase.from('fin_tasks').insert(finalTasks)
        if (error) throw error
        await fetchTasks(category)
    }

    const toggleTask = async (category: string, id: string, is_completed: boolean) => {
        setTasks(prev => ({
            ...prev,
            [category]: prev[category].map(t => t.id === id ? { ...t, is_completed } : t)
        }))

        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks(category) || []
            const updated = allTasks.map((t: Task) => t.id === id ? { ...t, is_completed } : t)
            saveSessionTasks(category, updated)
            return
        }
        const { error } = await supabase.from('fin_tasks').update({ is_completed }).eq('id', id)
        if (error) {
            await fetchTasks(category)
            throw error
        }
    }

    const editTask = async (category: string, id: string, updates: Partial<Task>) => {
        setTasks(prev => ({
            ...prev,
            [category]: prev[category].map(t => t.id === id ? { ...t, ...updates } : t)
        }))

        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks(category) || []
            const updated = allTasks.map((t: Task) => t.id === id ? { ...t, ...updates } : t)
            saveSessionTasks(category, updated)
            return
        }
        const { error } = await supabase.from('fin_tasks').update(updates).eq('id', id)
        if (error) {
            await fetchTasks(category)
            throw error
        }
        fetchTasks(category)
    }

    const deleteTask = async (category: string, id: string) => {
        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks(category) || []
            const updated = allTasks.filter((t: Task) => t.id !== id)
            saveSessionTasks(category, updated)
            await fetchTasks(category)
            return
        }
        const { error } = await supabase.from('fin_tasks').delete().eq('id', id)
        if (error) throw error
        await fetchTasks(category)
    }

    const clearAllTasks = async (category: string, activeProfile: string) => {
        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks(category) || []
            const remaining = allTasks.filter((t: Task) => t.profile !== activeProfile)
            saveSessionTasks(category, remaining)
            await fetchTasks(category)
            return
        }
        const { error } = await supabase.from('fin_tasks')
            .delete()
            .eq('profile', activeProfile)
            .eq('category', category)
        if (error) throw error
        await fetchTasks(category)
    }

    const clearCompletedTasks = async (category: string, activeProfile: string) => {
        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks(category) || []
            const updated = allTasks.filter((t: Task) => !(t.profile === activeProfile && t.is_completed))
            saveSessionTasks(category, updated)
            await fetchTasks(category)
            return
        }
        const { error } = await supabase.from('fin_tasks')
            .delete()
            .eq('profile', activeProfile)
            .eq('category', category)
            .eq('is_completed', true)
        if (error) throw error
        await fetchTasks(category)
    }

    const updateTaskPositions = async (category: string, orderedTasks: Task[]) => {
        const updatedOrdered = orderedTasks.map((t, idx) => ({
            ...t,
            position: (orderedTasks.length - idx) * 1000
        }))

        setTasks(prev => ({ ...prev, [category]: updatedOrdered }))

        if (settings.is_demo_mode) {
            const allTasks = getSessionTasks(category) || []
            const fullUpdated = allTasks.map((t: Task) => {
                const found = updatedOrdered.find(o => o.id === t.id)
                return found ? found : t
            })
            saveSessionTasks(category, fullUpdated)
            return
        }

        try {
            for (const t of updatedOrdered) {
                await supabase.from('fin_tasks').update({ position: t.position }).eq('id', t.id)
            }
        } catch (err) {
            console.error('Failed to persist task positions', err)
            await fetchTasks(category)
        }
    }

    useEffect(() => {
        if (settings.is_demo_mode) return

        const channel = supabase
            .channel('tasks-global-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'fin_tasks'
                },
                (payload) => {
                    const cat = (payload.new as any)?.category || (payload.old as any)?.category
                    if (cat) fetchTasks(cat)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchTasks, settings.is_demo_mode])

    return (
        <TasksContext.Provider value={{
            tasks,
            loading,
            errors,
            fetchTasks,
            createTask,
            createTasks,
            toggleTask,
            editTask,
            deleteTask,
            clearAllTasks,
            clearCompletedTasks,
            updateTaskPositions
        }}>
            {children}
        </TasksContext.Provider>
    )
}

export function useTasksContext() {
    const context = useContext(TasksContext)
    if (context === undefined) {
        throw new Error('useTasksContext must be used within a TasksProvider')
    }
    return context
}
