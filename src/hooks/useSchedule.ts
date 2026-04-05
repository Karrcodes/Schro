import { useMemo, useState, useEffect } from 'react'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { useRota } from '@/features/finance/hooks/useRota'
import { isShiftDay } from '@/features/finance/utils/rotaUtils'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import type { Task } from '@/features/tasks/types/tasks.types'
import { useRecurring } from '@/features/finance/hooks/useRecurring'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { useGoals as useGoalsContext } from '@/features/goals/hooks/useGoals'
import { usePayProjection } from '@/features/finance/hooks/usePayProjection'
import { format, addDays, startOfDay, isThursday, startOfMonth } from 'date-fns'

export interface ScheduleItem {
    id: string
    title: string
    date: Date
    type: 'task' | 'shift' | 'overtime' | 'holiday' | 'payday' | 'liability' | 'studio' | 'goal' | 'external-google' | 'external-apple'
    priority?: string
    is_completed?: boolean
    due_date_mode?: 'on' | 'before' | 'range'
    end_date?: string
    profile?: string
    originalTask?: Task
    amount?: number
    category?: string
    description?: string
    location?: string
    calendarLabel?: string
    link?: string
}

export function useSchedule(days: number = 14, allProfiles: boolean = false) {
    const activeProfile = allProfiles ? 'all' : undefined
    const { tasks: todoTasks, loading: todoLoading } = useTasks('todo', activeProfile)
    const { tasks: allReminderTasks, loading: reminderLoading } = useTasks('reminder', activeProfile)
    const { overrides, loading: rotaLoading } = useRota(activeProfile as any)
    const { settings } = useSystemSettings()

    // Additional data sources
    const { obligations, loading: recurringLoading } = useRecurring(activeProfile)
    const { projects: studioProjects, content: studioContent, loading: studioLoading } = useStudio()
    const { goals: visionGoals, loading: goalsLoading } = useGoalsContext()
    const { getProjectedPayForDate } = usePayProjection()

    const [externalEvents, setExternalEvents] = useState<ScheduleItem[]>([])
    const [externalLoading, setExternalLoading] = useState(false)
    const [refreshCounter, setRefreshCounter] = useState(0)

    const refreshExternal = () => setRefreshCounter(c => c + 1)

    useEffect(() => {
        const fetchExternal = async () => {
            setExternalLoading(true)
            try {
                const [googleRes, appleRes] = await Promise.all([
                    fetch('/api/calendar/sync'),
                    fetch('/api/calendar/apple')
                ])

                let allEvents: ScheduleItem[] = []

                if (googleRes.ok) {
                    const googleData = await googleRes.json()
                    const googleMapped = (googleData.events || []).map((ev: any) => ({
                        ...ev,
                        date: new Date(ev.date)
                    }))
                    allEvents = [...allEvents, ...googleMapped]
                }

                if (appleRes.ok) {
                    const appleData = await appleRes.json()
                    const appleMapped = (appleData.events || []).map((ev: any) => ({
                        ...ev,
                        date: new Date(ev.date)
                    }))
                    allEvents = [...allEvents, ...appleMapped]
                }

                setExternalEvents(allEvents)
            } catch (err) {
                console.error('[useSchedule] External fetch error', err)
            } finally {
                setExternalLoading(false)
            }
        }
        fetchExternal()
    }, [days, refreshCounter])

    const schedule = useMemo(() => {
        const items: ScheduleItem[] = [...externalEvents]
        const today = new Date()
        const start = startOfMonth(today)
        const end = addDays(start, days + 15) // Extra buffer

        const allTasks = [...todoTasks, ...allReminderTasks]

        // 1. Add Tasks
        const dateRange: Date[] = []
        for (let i = 0; i < days; i++) {
            const d = addDays(start, i)
            dateRange.push(d)
        }

        allTasks.forEach(task => {
            if ((task.recurrence_config?.type as any) === 'shift_relative') {
                dateRange.forEach(d => {
                    const isShift = isShiftDay(d)
                    const targetMatch = ((task.recurrence_config as any)?.target === 'off_days' && !isShift) ||
                        ((task.recurrence_config as any)?.target === 'on_days' && isShift);

                    if (targetMatch) {
                        items.push({
                            id: `${task.id}-${d.toISOString()}`,
                            title: task.title,
                            date: d,
                            type: 'task',
                            priority: task.priority,
                            is_completed: task.is_completed,
                            profile: task.profile,
                            originalTask: task
                        })
                    }
                })
                return
            }

            if (task.due_date) {
                const startDate = startOfDay(new Date(task.due_date))

                if (task.due_date_mode === 'range' && task.end_date) {
                    const endDate = new Date(task.end_date)
                    endDate.setHours(23, 59, 59, 999)

                    dateRange.forEach(d => {
                        if (d >= startDate && d <= endDate) {
                            items.push({
                                id: `${task.id}-${d.toISOString()}`,
                                title: task.title,
                                date: d,
                                type: 'task',
                                priority: task.priority,
                                is_completed: task.is_completed,
                                due_date_mode: 'range',
                                profile: task.profile,
                                originalTask: task
                            })
                        }
                    })
                } else if (task.due_date_mode === 'before') {
                    if (startDate >= start && startDate <= end) {
                        items.push({
                            id: task.id,
                            title: task.title,
                            date: startDate,
                            type: 'task',
                            priority: task.priority,
                            is_completed: task.is_completed,
                            due_date_mode: 'before',
                            profile: task.profile,
                            originalTask: task
                        })
                    }
                } else {
                    if (startDate >= start && startDate <= end) {
                        items.push({
                            id: task.id,
                            title: task.title,
                            date: startDate,
                            type: 'task',
                            priority: task.priority,
                            is_completed: task.is_completed,
                            due_date_mode: 'on',
                            profile: task.profile,
                            originalTask: task
                        })
                    }
                }
            }
        })

        // 2. Add Rota & Overrides
        dateRange.forEach(curr => {
            const dateStr = format(curr, 'yyyy-MM-dd')
            const override = overrides.find(o => o.date === dateStr)

            if (override) {
                if (override.type !== 'absence') {
                    items.push({
                        id: override.id,
                        title: override.type.charAt(0).toUpperCase() + override.type.slice(1),
                        date: new Date(curr),
                        type: override.type as any
                    })
                }
            } else if (isShiftDay(curr)) {
                items.push({
                    id: `shift-${dateStr}`,
                    title: settings.is_demo_mode ? 'Work' : 'Work Shift',
                    date: new Date(curr),
                    type: 'shift'
                })
            }

            // Paydays (Every Thursday)
            if (isThursday(curr)) {
                const pay = getProjectedPayForDate(curr)
                items.push({
                    id: `payday-${dateStr}`,
                    title: pay > 0 ? `£${pay.toFixed(2)} Payday` : 'Payday',
                    date: new Date(curr),
                    type: 'payday',
                    amount: pay
                })
            }
        })

        // 3. Add Finance Obligations (Paydays & Liabilities)
        obligations.forEach(ob => {
            if (ob.next_due_date) {
                const date = startOfDay(new Date(ob.next_due_date))
                if (date >= start && date <= end) {
                    items.push({
                        id: `ob-${ob.id}`,
                        title: ob.name,
                        date,
                        type: 'liability',
                        amount: ob.amount,
                        category: ob.category || undefined
                    })
                }
            }
        })

        // 4. Add Studio Deadlines
        studioProjects.forEach(p => {
            if (p.target_date) {
                const date = startOfDay(new Date(p.target_date))
                if (date >= start && date <= end) {
                    items.push({
                        id: `sp-${p.id}`,
                        title: `Deadline: ${p.title}`,
                        date,
                        type: 'studio',
                        category: 'project'
                    })
                }
            }
        })
        studioContent.forEach(c => {
            if (c.deadline) {
                const date = startOfDay(new Date(c.deadline))
                if (date >= start && date <= end) {
                    items.push({
                        id: `sc-${c.id}`,
                        title: `Content: ${c.title}`,
                        date,
                        type: 'studio',
                        category: 'content'
                    })
                }
            }
        })

        // 5. Add Goals
        visionGoals.forEach(g => {
            if (g.target_date) {
                const date = startOfDay(new Date(g.target_date))
                if (date >= start && date <= end) {
                    items.push({
                        id: `goal-${g.id}`,
                        title: `Goal: ${g.title}`,
                        date,
                        type: 'goal',
                        priority: 'high'
                    })
                }
            }
        })

        return items.sort((a, b) => a.date.getTime() - b.date.getTime())
    }, [todoTasks, allReminderTasks, externalEvents, overrides, obligations, settings, studioProjects, studioContent, visionGoals, getProjectedPayForDate, days])

    return {
        schedule,
        loading: todoLoading || reminderLoading || rotaLoading || recurringLoading || studioLoading || goalsLoading || externalLoading,
        refresh: refreshExternal
    }
}
