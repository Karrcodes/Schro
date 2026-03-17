'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { useRota } from '@/features/finance/hooks/useRota'
import { isShiftDay } from '@/features/finance/utils/rotaUtils'
import { useTasks } from './useTasks'
import type { Task, DayPlannerSettings, PlannerInitialization, RoutineAnchor } from '../types/tasks.types'
import { addMinutes, timeToMinutes, minutesToTime, formatTime } from '@/lib/utils'

export interface PlannerItem {
    id: string
    title: string
    time: string
    end_time?: string
    duration: number
    type: 'routine' | 'task' | 'shift' | 'transit' | 'buffer' | 'sleep' | 'meal'
    class: 'A' | 'B' | 'C'
    is_completed?: boolean
    project_id?: string | null
    is_flow_active?: boolean
    is_open_ended?: boolean
    is_stalled?: boolean
    impact_score?: number
    is_active?: boolean
    is_current?: boolean
    sort_priority?: number
    location?: string
    profile?: string
    strategic_category?: string
    priority?: string
}

export interface FluidZone {
    id: string
    start_time: string
    end_time: string
    duration: number
    center_time: string
}

interface PlannerData {
    anchors: PlannerItem[]
    fluidTasks: PlannerItem[]
    zones: FluidZone[]
    reminders: Task[]
    items: PlannerItem[]
}

export function usePlannerEngine(date: Date = new Date()) {
    const [settings, setSettings] = useState<DayPlannerSettings | null>(null)
    const [initialization, setInitialization] = useState<PlannerInitialization | null>(null)
    const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('schrö_active_task_id')
        }
        return null
    })
    const [isFlowActive, setIsFlowActive] = useState(false)
    const [loading, setLoading] = useState(true)
    const { settings: systemSettings } = useSystemSettings()
    const { overrides } = useRota()
    const { tasks: allBusinessTasks, toggleTask: toggleBusinessTask, refetch: refetchBusiness } = useTasks('todo', 'business')
    const { tasks: allPersonalTasks, toggleTask: togglePersonalTask, refetch: refetchPersonal } = useTasks('todo', 'personal')

    // Recurring task IDs in the planner are suffixed with the date (e.g. "uuid-2026-02-26").
    // This strips that suffix to recover the base UUID for DB lookups.
    const getBaseId = (id: string) => {
        const uuidMatch = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
        return uuidMatch ? uuidMatch[0] : id
    }
    const dateStr = useMemo(() => {
        const d = new Date(date)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }, [date])

    // 1. Determine Final Work Status
    const isWorkDay = useMemo(() => {
        const baseIsWorkDay = isShiftDay(date)
        const dayOverride = overrides.find((o: any) => o.date === dateStr)

        if (dayOverride) {
            if (dayOverride.type === 'absence' || dayOverride.type === 'holiday') return false
            if (dayOverride.type === 'overtime') return true
        }
        return baseIsWorkDay
    }, [date, dateStr, overrides])

    // 2. Fetch Settings and Initialization
    const fetchData = useCallback(async () => {
        setLoading(true)
        const [settingsRes, initRes] = await Promise.all([
            supabase.from('fin_day_planner_settings').select('*').single(),
            supabase.from('fin_planner_initializations').select('*').eq('date', dateStr).single()
        ])

        if (settingsRes.data) {
            setSettings(settingsRes.data)
        } else if (settingsRes.error && settingsRes.error.code === 'PGRST116') {
            // No settings found, create default
            const defaultSettings: DayPlannerSettings = {
                profile: 'personal',
                wake_up_time_work: '03:30',
                wake_up_time_off: '09:00',
                bed_time_work: '21:30',
                bed_time_off: '23:30',
                meal_times: {
                    breakfast: '09:30',
                    lunch: '13:00',
                    dinner: '19:00'
                },
                workout_duration: 90,
                shower_duration: 15,
                meal_prep_duration: 45,
                routine_defaults: {
                    gym: { duration: 90, preferred_window: ['08:00', '12:00'] },
                    walk: { duration: 30, auto_inject: true },
                    meal_prep: { duration: 45, required: true }
                },
                evening_constraints: {
                    allowed_categories: ['personal', 'health'],
                    max_duration_minutes: 120
                },
                chill_mode_active: false
            }
            await supabase.from('fin_day_planner_settings').upsert(defaultSettings)
            setSettings(defaultSettings)
        }

        if (initRes.data) setInitialization(initRes.data)
        setLoading(false)
    }, [dateStr])

    useEffect(() => {
        fetchData()
        // Request Notification Permission
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }, [fetchData])


    // 3. Algorithm: The Engine
    const plannerData = useMemo<PlannerData>(() => {
        if (!settings) return { anchors: [], fluidTasks: [], zones: [], reminders: [], items: [] }

        // Filter tasks based on date and profile
        const personalTasks = allPersonalTasks.filter((t: Task) =>
            !t.is_completed && t.category !== 'reminder' &&
            (t.due_date_mode === 'on' ? t.due_date === dateStr : true)
        )
        const businessTasks = allBusinessTasks.filter((t: Task) =>
            !t.is_completed && t.category !== 'reminder' &&
            (t.due_date_mode === 'on' ? t.due_date === dateStr : true)
        )

        const reminders = [...allPersonalTasks, ...allBusinessTasks].filter(t =>
            !t.is_completed && t.category === 'reminder' &&
            (t.due_date === dateStr || !t.due_date) // Show for specific day or if undated
        ).sort((a, b) => {
            const weights = { super: 4, high: 3, mid: 2, low: 1 }
            if (weights[a.priority as keyof typeof weights] !== weights[b.priority as keyof typeof weights]) {
                return weights[b.priority as keyof typeof weights] - weights[a.priority as keyof typeof weights]
            }
            return (b.impact_score || 0) - (a.impact_score || 0)
        })

        const nowMins = timeToMinutes(formatTime(new Date()))
        const isCurrentItem = (timeStr: string, duration: number) => {
            const start = timeToMinutes(timeStr)
            return nowMins >= start && nowMins < start + duration
        }

        // A. Base Anchor Blocks (The Skeleton)
        const activeAnchors: RoutineAnchor[] = isWorkDay ? (settings.anchors_work || []) : (settings.anchors_off || [])

        const anchorItems: PlannerItem[] = activeAnchors.map(anchor => ({
            id: anchor.id,
            title: anchor.name,
            time: anchor.start_time,
            end_time: anchor.end_time,
            duration: timeToMinutes(anchor.end_time) < timeToMinutes(anchor.start_time)
                ? (timeToMinutes(anchor.end_time) + 24 * 60) - timeToMinutes(anchor.start_time)
                : timeToMinutes(anchor.end_time) - timeToMinutes(anchor.start_time),
            type: anchor.type as PlannerItem['type'],
            class: (anchor.is_flexible ? 'B' : 'A') as PlannerItem['class'],
            is_current: isCurrentItem(anchor.start_time, timeToMinutes(anchor.end_time) < timeToMinutes(anchor.start_time) ? (timeToMinutes(anchor.end_time) + 24 * 60) - timeToMinutes(anchor.start_time) : timeToMinutes(anchor.end_time) - timeToMinutes(anchor.start_time)),
            sort_priority: anchor.type === 'sleep' ? 999 : 0
        })).sort((a, b) => a.time.localeCompare(b.time))

        // B. Calculate Fluid Zones (Gaps between anchors)
        const zones: FluidZone[] = []
        for (let i = 0; i < anchorItems.length - 1; i++) {
            const current = anchorItems[i]
            const next = anchorItems[i + 1]

            const currentEndMins = timeToMinutes(current.end_time || addMinutes(current.time, current.duration))
            const nextStartMins = timeToMinutes(next.time)

            if (nextStartMins > currentEndMins + 15) { // Minimum 15 mins for a zone
                const duration = nextStartMins - currentEndMins
                zones.push({
                    id: `zone-${current.id}-${next.id}`,
                    start_time: minutesToTime(currentEndMins),
                    end_time: next.time,
                    duration,
                    center_time: minutesToTime(currentEndMins + Math.floor(duration / 2))
                })
            }
        }

        // C. Fluid Tasks (The River)
        const fluidTasks: PlannerItem[] = [...personalTasks, ...businessTasks].sort((a, b) => {
            const weights = { super: 4, high: 3, mid: 2, low: 1 }
            const weightA = weights[a.priority as keyof typeof weights] || 0
            const weightB = weights[b.priority as keyof typeof weights] || 0
            if (a.priority !== b.priority) return weightB - weightA
            return (b.impact_score || 0) - (a.impact_score || 0)
        }).map(task => ({
            id: task.id,
            title: task.title,
            time: '',
            duration: task.estimated_duration || 30,
            type: 'task',
            class: 'C',
            is_completed: task.is_completed,
            project_id: task.project_id,
            impact_score: task.impact_score,
            is_active: activeTaskId === task.id || activeTaskId === `${task.id}-${dateStr}`,
            location: task.location,
            profile: task.profile,
            strategic_category: task.strategic_category,
            priority: task.priority,
            sort_priority: 50
        }))

        // D. Consolidate for Timeline (Backward Compatibility)
        const items = [...anchorItems, ...fluidTasks].filter(i => i.time)

        return { anchors: anchorItems, fluidTasks, zones, reminders, items }
    }, [settings, initialization, isWorkDay, allPersonalTasks, allBusinessTasks, dateStr, isFlowActive, activeTaskId])

    const { anchors, fluidTasks, zones, reminders, items: plannerItems } = plannerData

    // 2.5 Watch for transitions
    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof window === 'undefined') return
            const now = formatTime(new Date())
            const nextTask = (plannerItems as any[]).find(item => item.time === now)

            if (nextTask && !isFlowActive) {
                new Notification(`Schrö: ${nextTask.title}`, {
                    body: `Time to start: ${nextTask.title} (${nextTask.duration}m)`,
                    icon: '/favicon.ico'
                })
            }
        }, 60000)
        return () => clearInterval(interval)
    }, [plannerItems, isFlowActive])

    const toggleFlow = useCallback(() => {
        setIsFlowActive((prev: boolean) => !prev)
    }, [])

    const initializeDay = async () => {
        const now = new Date()
        const { error } = await supabase.from('fin_planner_initializations').upsert({
            date: dateStr,
            t_zero: now.toISOString()
        })
        if (!error) fetchData()
    }

    const startTask = async (id: string) => {
        const baseId = getBaseId(id)
        console.log('Planner: Play/Pause task:', baseId)
        const newId = baseId === activeTaskId ? null : baseId
        setActiveTaskId(newId)
        if (newId) {
            localStorage.setItem('schrö_active_task_id', newId)
        } else {
            localStorage.removeItem('schrö_active_task_id')
        }
    }

    const completeTask = async (id: string) => {
        const baseId = getBaseId(id)
        console.log('Planner: Complete task:', baseId)
        // Try both profiles
        const task = [...allPersonalTasks, ...allBusinessTasks].find(t => t.id === baseId)
        if (!task) {
            console.warn('Task not found in local state, falling back to direct Supabase update. ID:', baseId)
            // Direct Supabase fallback — works for any task regardless of profile
            const { error } = await supabase.from('fin_tasks').update({ is_completed: true }).eq('id', baseId)
            if (error) {
                console.error('Direct complete failed:', error)
            } else {
                console.log('Direct complete succeeded for:', baseId)
            }
            await refetchBusiness()
            await refetchPersonal()
            await fetchData()
            return
        }

        if (task.profile === 'business') {
            await toggleBusinessTask(baseId, true)
            await refetchBusiness()
        } else {
            await togglePersonalTask(baseId, true)
            await refetchPersonal()
        }
        // Clear active task if we just completed it
        if (activeTaskId === baseId) {
            setActiveTaskId(null)
            localStorage.removeItem('schrö_active_task_id')
        }
        await fetchData()
    }

    const updateSettings = async (updates: Partial<DayPlannerSettings>) => {
        const { error } = await supabase.from('fin_day_planner_settings').update(updates).eq('profile', settings?.profile)
        if (!error) fetchData()
    }

    const reinitializeDay = async () => {
        const now = new Date()
        const { error } = await supabase.from('fin_planner_initializations').update({
            t_zero: now.toISOString()
        }).eq('date', dateStr)
        if (!error) fetchData()
    }

    const rescheduleTask = async (id: string, targetDate?: Date) => {
        const baseId = getBaseId(id)
        console.log('Planner: Reschedule task:', baseId)

        let target = targetDate
        if (!target) {
            target = new Date()
            target.setDate(target.getDate() + 1)
        }
        const newDateStr = target.toISOString().split('T')[0]

        const { error } = await supabase.from('fin_tasks').update({ due_date: newDateStr }).eq('id', baseId)
        if (error) {
            console.error('Direct reschedule failed:', error)
        } else {
            console.log('Direct reschedule succeeded for:', baseId)
        }

        // Clear active task if we just rescheduled it
        if (activeTaskId === baseId) {
            setActiveTaskId(null)
            localStorage.removeItem('schrö_active_task_id')
        }

        await refetchBusiness()
        await refetchPersonal()
        await fetchData()
    }

    const endDay = async () => {
        const now = new Date()
        const { error } = await supabase.from('fin_planner_initializations').update({
            ended_at: now.toISOString()
        }).eq('date', dateStr)
        if (error) {
            // If column doesn't exist yet, just log — non-blocking
            console.warn('endDay: could not persist. Add ended_at column to fin_planner_initializations if needed.', error)
        }
        // Clear active task
        setActiveTaskId(null)
        localStorage.removeItem('schrö_active_task_id')
    }

    return {
        isWorkDay,
        anchors: plannerData.anchors,
        fluidTasks: plannerData.fluidTasks,
        zones: plannerData.zones,
        reminders: plannerData.reminders,
        plannerItems,
        loading,
        settings,
        initialization,
        initializeDay,
        reinitializeDay,
        endDay,
        startTask,
        completeTask,
        rescheduleTask,
        isFlowActive,
        toggleFlow,
        updateSettings,
        refresh: fetchData
    }
}
