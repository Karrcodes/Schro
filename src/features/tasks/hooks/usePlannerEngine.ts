'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { useRota } from '@/features/finance/hooks/useRota'
import { isShiftDay } from '@/features/finance/utils/rotaUtils'
import { useTasks } from './useTasks'
import type { Task, DayPlannerSettings, PlannerInitialization } from '../types/tasks.types'
import { addMinutes, timeToMinutes, minutesToTime, formatTime } from '@/lib/utils'

export interface PlannerItem {
    id: string
    title: string
    time: string
    end_time?: string
    duration: number
    type: 'routine' | 'task' | 'shift' | 'transit' | 'buffer'
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

interface PlannerData {
    items: PlannerItem[]
    reminders: Task[]
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
        const dayOverride = overrides.find(o => o.date === dateStr)

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
        if (typeof window !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }, [fetchData])


    // 3. Algorithm: The Engine
    const plannerData = useMemo<PlannerData>(() => {
        if (!settings) return { items: [], reminders: [] }
        const items: PlannerItem[] = []

        // Filter tasks based on date and profile
        const personalTasks = allPersonalTasks.filter(t =>
            !t.is_completed && t.category !== 'reminder' &&
            (t.due_date_mode === 'on' ? t.due_date === dateStr : true)
        )
        const businessTasks = allBusinessTasks.filter(t =>
            !t.is_completed && t.category !== 'reminder' &&
            (t.due_date_mode === 'on' ? t.due_date === dateStr : true)
        )

        const reminders = [...allPersonalTasks, ...allBusinessTasks].filter(t =>
            !t.is_completed && t.category === 'reminder' &&
            (t.due_date === dateStr || !t.due_date) // Show for specific day or if undated
        ).sort((a, b) => {
            const weights = { urgent: 4, high: 3, mid: 2, low: 1 }
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

        // A. Handle Work Day Protocol (Automatic T-Zero 03:30)
        if (isWorkDay) {
            items.push({ id: 'wake', title: 'Wake / Prep', time: '03:30', duration: 45, type: 'routine', class: 'A', is_current: isCurrentItem('03:30', 45) })
            items.push({ id: 'commute-out', title: 'Commute (Shift)', time: '04:15', duration: 90, type: 'transit', class: 'A', is_current: isCurrentItem('04:15', 90) })
            items.push({ id: 'shift-start', title: 'GXO Shift', time: '06:00', duration: 210, type: 'shift', class: 'A', is_current: isCurrentItem('06:00', 210) })
            items.push({ id: 'break-1', title: 'First Break (Meal)', time: '09:30', duration: 30, type: 'routine', class: 'A', is_current: isCurrentItem('09:30', 30) })
            items.push({ id: 'shift-mid', title: 'GXO Shift', time: '10:00', duration: 240, type: 'shift', class: 'A', is_current: isCurrentItem('10:00', 240) })
            items.push({ id: 'break-2', title: 'Second Break', time: '14:00', duration: 30, type: 'routine', class: 'A', is_current: isCurrentItem('14:00', 30) })
            items.push({ id: 'shift-end', title: 'GXO Shift', time: '14:30', duration: 210, type: 'shift', class: 'A', is_current: isCurrentItem('14:30', 210) })
            items.push({ id: 'commute-in', title: 'Return Commute', time: '18:15', duration: 85, type: 'transit', class: 'A', is_current: isCurrentItem('18:15', 85) })
            items.push({ id: 'evening-routine', title: 'Meal + Shower + Oats', time: '19:40', duration: 60, type: 'routine', class: 'A', is_current: isCurrentItem('19:40', 60) })

            const eveningStart = '20:40'
            const bedTime = settings.bed_time_work || '21:30'

            const allowedTasks = [...personalTasks, ...businessTasks]
                .filter(t => settings.evening_constraints?.allowed_categories.includes(t.strategic_category || ''))
                .sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0))

            let currentTime = eveningStart
            allowedTasks.forEach(task => {
                const taskDuration = task.estimated_duration || 30
                const travelTo = task.travel_to_duration || 0
                const travelFrom = task.travel_from_duration || 0
                const totalDuration = travelTo + taskDuration + travelFrom

                if (timeToMinutes(currentTime) + totalDuration <= timeToMinutes(bedTime)) {
                    if (travelTo > 0) {
                        items.push({ id: `transit-to-${task.id}`, title: 'Transit (To)', time: currentTime, duration: travelTo, type: 'transit', class: 'C', is_current: isCurrentItem(currentTime, travelTo), sort_priority: 1 })
                        currentTime = addMinutes(currentTime, travelTo)
                    }

                    // Respect start_time if provided for 'appointment' feel
                    const effectiveStartTime = task.start_time || currentTime

                    items.push({
                        id: task.id,
                        title: task.title,
                        time: effectiveStartTime,
                        end_time: addMinutes(effectiveStartTime, taskDuration),
                        duration: taskDuration,
                        type: 'task',
                        class: 'B',
                        project_id: task.project_id,
                        impact_score: task.impact_score,
                        is_active: activeTaskId === task.id || activeTaskId === `${task.id}-${dateStr}`,
                        is_current: isCurrentItem(effectiveStartTime, taskDuration),
                        sort_priority: 2,
                        location: task.location,
                        profile: task.profile,
                        strategic_category: task.strategic_category,
                        priority: task.priority
                    })

                    currentTime = addMinutes(effectiveStartTime, taskDuration)

                    if (travelFrom > 0) {
                        items.push({ id: `transit-from-${task.id}`, title: 'Transit (Return)', time: currentTime, duration: travelFrom, type: 'transit', class: 'C', is_current: isCurrentItem(currentTime, travelFrom), sort_priority: 3 })
                        currentTime = addMinutes(currentTime, travelFrom)
                    }
                    currentTime = addMinutes(currentTime, 10)
                }
            })
            items.push({ id: 'sleep', title: 'Sleep', time: bedTime, duration: 480, type: 'routine', class: 'A', is_current: isCurrentItem(bedTime, 480) })
        }
        // B. Handle Day Off Protocol (Manual T-Zero)
        else {
            if (!initialization && !settings.chill_mode_active) {
                return { items: [], reminders: [] }
            }
            if (settings.chill_mode_active) {
                // Chill Mode: Just a flat list of habits and high priority tasks
                return {
                    items: ([...personalTasks, ...businessTasks]
                        .filter(t => t.priority === 'urgent')
                        .map(t => ({
                            id: t.id,
                            title: t.title,
                            time: '--:--',
                            duration: t.estimated_duration || 30,
                            type: 'task',
                            class: 'B',
                            sort_priority: 1
                        })) as PlannerItem[]),
                    reminders: []
                }
            }

            const tZero = formatTime(new Date(initialization!.t_zero))
            const tZeroMins = timeToMinutes(tZero)
            let currentTime = tZero

            if (tZeroMins < timeToMinutes('10:00')) {
                items.push({ id: 'wake-off', title: 'Wake Up', time: currentTime, duration: 30, type: 'routine', class: 'A', is_current: isCurrentItem(currentTime, 30), sort_priority: 10 })
                currentTime = addMinutes(currentTime, 30)
            }

            const gymDur = settings.routine_defaults?.gym.duration || 90
            const gymWindow = settings.routine_defaults?.gym.preferred_window || ['08:00', '12:00']

            if (tZeroMins < timeToMinutes(gymWindow[1])) {
                const gymStart = tZeroMins < timeToMinutes(gymWindow[0]) ? gymWindow[0] : currentTime
                items.push({ id: 'gym-off', title: 'Gym Session', time: gymStart, duration: gymDur, type: 'routine', class: 'B', is_current: isCurrentItem(gymStart, gymDur), sort_priority: 20 })
                currentTime = addMinutes(gymStart, gymDur + 15)
            }

            if (settings.routine_defaults?.meal_prep.required) {
                const prepDur = settings.routine_defaults.meal_prep.duration
                items.push({ id: 'meal-prep-off', title: 'Meal Prep', time: currentTime, duration: prepDur, type: 'routine', class: 'A', is_current: isCurrentItem(currentTime, prepDur), sort_priority: 30 })
                currentTime = addMinutes(currentTime, prepDur + 10)
            }

            const backlog = [...personalTasks, ...businessTasks]
                .sort((a, b) => {
                    if (a.priority !== b.priority) {
                        const weights = { urgent: 4, high: 3, mid: 2, low: 1 }
                        return weights[b.priority] - weights[a.priority]
                    }
                    return (b.impact_score || 0) - (a.impact_score || 0)
                })

            let consecutiveWorkMins = 0
            backlog.forEach(task => {
                const taskDuration = task.estimated_duration || 30
                const travelTo = task.travel_to_duration || 0
                const travelFrom = task.travel_from_duration || 0
                const scheduledMins = timeToMinutes(currentTime)
                const isAfterNow = scheduledMins > nowMins
                const isCurrent = !isAfterNow && (nowMins < scheduledMins + taskDuration)

                if (isFlowActive && isAfterNow && task.priority !== 'urgent' && task.deadline_type !== 'hard') {
                    return
                }

                if (consecutiveWorkMins >= 180) {
                    items.push({ id: 'recovery-auto', title: 'Recovery (Walk/Rest)', time: currentTime, duration: 30, type: 'routine', class: 'C', is_current: isCurrentItem(currentTime, 30) })
                    currentTime = addMinutes(currentTime, 30 + 5)
                    consecutiveWorkMins = 0
                }

                if (travelTo > 0) {
                    items.push({ id: `transit-to-${task.id}`, title: 'Transit (To)', time: currentTime, duration: travelTo, type: 'transit', class: 'C', is_current: isCurrentItem(currentTime, travelTo), sort_priority: 1 })
                    currentTime = addMinutes(currentTime, travelTo)
                }

                const isStalled = !task.is_completed && !isAfterNow && (nowMins - scheduledMins > 15)

                // Respect start_time if provided
                const effectiveStartTime = task.start_time || currentTime

                items.push({
                    id: task.id,
                    title: task.title,
                    time: effectiveStartTime,
                    end_time: addMinutes(effectiveStartTime, taskDuration),
                    duration: taskDuration,
                    type: 'task',
                    class: 'B',
                    is_completed: task.is_completed,
                    project_id: task.project_id,
                    is_stalled: isStalled,
                    impact_score: task.impact_score,
                    is_active: activeTaskId === task.id || activeTaskId === `${task.id}-${dateStr}`,
                    is_current: isCurrent,
                    sort_priority: 2,
                    location: task.location,
                    profile: task.profile,
                    strategic_category: task.strategic_category,
                    priority: task.priority
                })

                currentTime = addMinutes(effectiveStartTime, taskDuration)
                if (travelFrom > 0) {
                    items.push({ id: `transit-from-${task.id}`, title: 'Transit (Return)', time: currentTime, duration: travelFrom, type: 'transit', class: 'C', is_current: isCurrentItem(currentTime, travelFrom), sort_priority: 3 })
                    currentTime = addMinutes(currentTime, travelFrom)
                }
                currentTime = addMinutes(currentTime, 10)
                consecutiveWorkMins += taskDuration
            })

            items.push({ id: 'sleep-off', title: 'Sleep', time: settings.bed_time_off || '00:00', end_time: '09:00', duration: 480, type: 'routine', class: 'A', is_current: isCurrentItem(settings.bed_time_off || '00:00', 480) })
        }

        // Separate sleep items — they must always be last regardless of time string sort
        let sleepItems = items.filter(i => i.id.startsWith('sleep'))
        const nonSleepItems = items.filter(i => !i.id.startsWith('sleep'))

        // Sort all non-sleep items
        const sorted = nonSleepItems.sort((a, b) => {
            if (a.time !== b.time) return a.time.localeCompare(b.time)
            return (a.sort_priority || 0) - (b.sort_priority || 0)
        })

        // Ensure sleep starts no earlier than the end of the last item
        if (sorted.length > 0 && sleepItems.length > 0) {
            const lastItem = sorted[sorted.length - 1]
            const lastEndTime = lastItem.end_time || addMinutes(lastItem.time, lastItem.duration)

            // Basic check: if last end time is structurally later than bedtime (adjusting for next-day midnight logic)
            // For simplicity, we just use the string comparison, but treat 00:xx - 05:xx as being > 21:xx - 23:xx
            const isLastNextDay = lastEndTime >= '00:00' && lastEndTime <= '06:00'
            const isSleepNextDay = sleepItems[0].time >= '00:00' && sleepItems[0].time <= '06:00'

            let pushSleepForward = false
            if (isLastNextDay && !isSleepNextDay) {
                pushSleepForward = true
            } else if (isLastNextDay === isSleepNextDay) {
                if (lastEndTime > sleepItems[0].time) pushSleepForward = true
            }

            if (pushSleepForward) {
                sleepItems[0] = { ...sleepItems[0], time: lastEndTime }
            }
        }

        const finalItems = [...sorted, ...sleepItems]
        return { items: finalItems, reminders }
    }, [settings, initialization, isWorkDay, allPersonalTasks, allBusinessTasks, dateStr, isFlowActive, activeTaskId])

    const plannerItems = plannerData.items
    const reminders = plannerData.reminders

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
        setIsFlowActive(prev => !prev)
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
        plannerItems,
        reminders,
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
