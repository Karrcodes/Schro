'use client'

import { useMemo } from 'react'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { useRota } from '@/features/finance/hooks/useRota'
import { isShiftDay } from '@/features/finance/utils/rotaUtils'
import { addDays, format, startOfDay } from 'date-fns'

export interface DayOutlook {
    date: Date
    dateStr: string
    isWorkDay: boolean
    tasks: any[]
    reminders: any[]
}

export function useWeeklyHorizon() {
    const { tasks: personalTasks } = useTasks('todo', 'personal')
    const { tasks: businessTasks } = useTasks('todo', 'business')
    const { overrides } = useRota()

    const horizon = useMemo(() => {
        const days: DayOutlook[] = []
        const start = startOfDay(new Date())

        for (let i = 0; i < 7; i++) {
            const current = addDays(start, i)
            const dateStr = format(current, 'yyyy-MM-dd')

            // Determine if it's a work day
            const baseIsWorkDay = isShiftDay(current)
            const dayOverride = overrides.find((o: any) => o.date === dateStr)
            let isWorkDay = baseIsWorkDay
            if (dayOverride) {
                if (dayOverride.type === 'absence' || dayOverride.type === 'holiday') isWorkDay = false
                if (dayOverride.type === 'overtime') isWorkDay = true
            }

            // Filter tasks for this day
            const allTasks = [...personalTasks, ...businessTasks]
            const dayTasks = allTasks.filter(t => 
                !t.is_completed && 
                t.category !== 'reminder' && 
                t.due_date === dateStr
            )
            const dayReminders = allTasks.filter(t => 
                !t.is_completed && 
                t.category === 'reminder' && 
                t.due_date === dateStr
            )

            days.push({
                date: current,
                dateStr,
                isWorkDay,
                tasks: dayTasks,
                reminders: dayReminders
            })
        }

        return days
    }, [personalTasks, businessTasks, overrides])

    return { horizon }
}
