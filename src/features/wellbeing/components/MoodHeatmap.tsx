'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWellbeing } from '../contexts/WellbeingContext'
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay, startOfYear, endOfYear, isAfter } from 'date-fns'
import { cn } from '@/lib/utils'
import type { MoodValue, MoodEntry } from '../types'
import { X, Calendar, MessageSquare, Briefcase, Dumbbell, Apple, Code, Map, MessageCircle, Heart } from 'lucide-react'

const MOOD_COLORS: Record<MoodValue | 'none', { cell: string; label: string; hex: string }> = {
    excellent: { cell: 'bg-amber-400 border-amber-400/30 shadow-sm shadow-amber-400/20', label: 'Excellent', hex: '#fbbf24' },
    good:      { cell: 'bg-emerald-500 border-emerald-500/30 shadow-sm shadow-emerald-500/20', label: 'Good', hex: '#10b981' },
    neutral:   { cell: 'bg-blue-400 border-blue-400/30 shadow-sm shadow-blue-400/20', label: 'Neutral', hex: '#60a5fa' },
    low:       { cell: 'bg-orange-400 border-orange-400/30 shadow-sm shadow-orange-400/20', label: 'Low', hex: '#fb923c' },
    bad:       { cell: 'bg-rose-500 border-rose-500/30 shadow-sm shadow-rose-500/20', label: 'Bad', hex: '#f43f5e' },
    none:      { cell: 'bg-black/[0.04] border-black/5', label: 'No Entry', hex: 'transparent' },
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const MOOD_VALUES: Record<MoodValue, number> = {
    excellent: 5,
    good: 4,
    neutral: 3,
    low: 2,
    bad: 1
}

const VALUE_TO_MOOD: Record<number, MoodValue> = {
    5: 'excellent',
    4: 'good',
    3: 'neutral',
    2: 'low',
    1: 'bad'
}

const ACTIVITIES = [
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'workout', label: 'Workout', icon: Dumbbell },
    { id: 'macros', label: 'Macros', icon: Apple },
    { id: 'project', label: 'Project', icon: Code },
    { id: 'walk', label: 'Walk', icon: Map },
    { id: 'conversation', label: 'Talk', icon: MessageCircle },
]

export function MoodHeatmap() {
    const { moodLogs } = useWellbeing()
    const [hoveredDate, setHoveredDate] = useState<string | null>(null)

    // Build a map of date → { averageMood: MoodValue, logs: MoodEntry[] }
    const moodMap = useMemo(() => {
        const dateGroups: Record<string, MoodEntry[]> = {}
        moodLogs.forEach(log => {
            if (!dateGroups[log.date]) dateGroups[log.date] = []
            dateGroups[log.date].push(log)
        })

        const map: Record<string, { average: MoodValue; logs: MoodEntry[] }> = {}
        Object.entries(dateGroups).forEach(([date, logs]) => {
            const sum = logs.reduce((acc, log) => acc + MOOD_VALUES[log.value], 0)
            const avgValue = Math.round(sum / logs.length)
            map[date] = {
                average: VALUE_TO_MOOD[avgValue] || 'neutral',
                logs
            }
        })
        return map
    }, [moodLogs])

    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    // Build grid: start from Jan 1st of current year to Dec 31st
    const today = startOfDay(new Date())
    const startDate = startOfYear(today)
    const endDate = endOfYear(today)

    const days = useMemo(() => {
        return eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
            const dateStr = format(date, 'yyyy-MM-dd')
            const dayData = moodMap[dateStr]
            return {
                date: dateStr,
                dayOfWeek: date.getDay(), // 0 = Sunday
                month: date.getMonth(),
                dayOfMonth: date.getDate(),
                mood: dayData?.average || null,
                isFuture: isAfter(date, today) && !isSameDay(date, today),
            }
        })
    }, [moodMap])

    // Group into weeks (columns of 7)
    const weeks = useMemo(() => {
        const result: typeof days[number][][] = []
        let week: typeof days[number][] = []

        // Pad the first week with empty slots
        const firstDayOfWeek = days[0].dayOfWeek
        for (let i = 0; i < firstDayOfWeek; i++) {
            week.push(null as any)
        }

        days.forEach(day => {
            week.push(day)
            if (week.length === 7) {
                result.push(week)
                week = []
            }
        })
        if (week.length > 0) result.push(week)
        return result
    }, [days])

    // Find month label positions
    const monthPositions = useMemo(() => {
        const positions: { label: string; weekIndex: number }[] = []
        let lastMonth = -1
        weeks.forEach((week, wi) => {
            const firstReal = week.find(d => d != null)
            if (firstReal && firstReal.month !== lastMonth) {
                positions.push({ label: MONTH_LABELS[firstReal.month], weekIndex: wi })
                lastMonth = firstReal.month
            }
        })
        return positions
    }, [weeks])

    const loggedDays = days.filter(d => d.mood).length
    const streak = useMemo(() => {
        let count = 0
        for (let i = days.length - 1; i >= 0; i--) {
            if (days[i].mood) count++
            else break
        }
        return count
    }, [days])

    const hoveredDay = hoveredDate ? days.find(d => d.date === hoveredDate) : null

    return (
        <div className="bg-white border border-black/5 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm h-full overflow-x-auto no-scrollbar">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">Emotional Landscape</p>
                    <p className="text-[15px] font-black text-black uppercase">Mood · {format(today, 'yyyy')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[12px] font-black text-black">{loggedDays}</p>
                        <p className="text-[9px] font-black text-black/30 uppercase tracking-widest">Logged</p>
                    </div>
                    <div className="w-px h-8 bg-black/10" />
                    <div className="text-right">
                        <p className="text-[12px] font-black text-black">{streak}</p>
                        <p className="text-[9px] font-black text-black/30 uppercase tracking-widest">Streak</p>
                    </div>
                </div>
            </div>

            {/* Month labels */}
            <div className="pt-8">
                <div className="w-full min-w-[600px]">
                    {/* Month row */}
                    <div className="flex mb-1.5">
                        {/* Day labels column spacer */}
                        <div className="w-6 shrink-0" />
                        <div className="flex-1 relative h-4">
                            {monthPositions.map(({ label, weekIndex }) => (
                                <span
                                    key={label + weekIndex}
                                    className="absolute text-[9px] font-black text-black/25 uppercase tracking-widest"
                                    style={{ left: `${(weekIndex / weeks.length) * 100}%` }}
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="flex gap-2">
                        {/* Day of week labels */}
                        <div className="flex flex-col gap-1 shrink-0">
                            {DAY_LABELS.map((d, i) => (
                                <div key={i} className="aspect-square w-4 flex items-center justify-center">
                                    {i % 2 === 1 && (
                                        <span className="text-[8px] font-black text-black/20 uppercase">{d}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-1 flex-1 justify-between">
                            {weeks.map((week, wi) => (
                                <div key={wi} className="flex flex-col gap-1 flex-1">
                                    {Array.from({ length: 7 }, (_, di) => {
                                        const day = week[di]
                                        if (!day) return <div key={di} className="aspect-square w-full" />
                                        const mood = day.mood
                                        const colorConfig = MOOD_COLORS[mood ?? 'none']
                                        return (
                                            <div
                                                key={di}
                                                onMouseEnter={() => setHoveredDate(day.date)}
                                                onMouseLeave={() => setHoveredDate(null)}
                                                className={cn(
                                                    'aspect-square w-full rounded-[2px] border transition-all duration-200 relative cursor-pointer',
                                                    mood ? colorConfig.cell : (day.isFuture ? 'bg-black/[0.04] border-black/5' : 'bg-black/[0.15] border-black/10'),
                                                    hoveredDate === day.date && 'scale-150 z-[100] shadow-xl',
                                                    selectedDate === day.date && 'ring-2 ring-black ring-offset-2 scale-110 z-[50]'
                                                )}
                                                onClick={() => setSelectedDate(day.date)}
                                            >
                                                {/* Tooltip */}
                                                {hoveredDate === day.date && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl z-[200] shadow-xl pointer-events-none text-center whitespace-nowrap">
                                                        {format(new Date(day.date), 'EEE, MMM do')}
                                                        <span className={cn('block mt-0.5', mood ? 'text-white/70' : 'text-white/30')}>
                                                            {colorConfig.label}
                                                        </span>
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between">
                <span className="text-[8px] font-black text-black/20 uppercase tracking-widest">Less</span>
                <div className="flex items-center gap-6">
                    {(Object.entries(MOOD_COLORS) as [string, { cell: string; label: string }][]).filter(([k]) => k !== 'none').map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                            <div className={cn('w-2.5 h-2.5 rounded-[2px] border', v.cell)} />
                            <span className="text-[8px] font-black text-black/25 uppercase tracking-tighter">{v.label}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-[2px] border bg-black/[0.15] border-black/10" />
                        <span className="text-[8px] font-black text-black/25 uppercase tracking-tighter">Missed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-[2px] border bg-black/[0.04] border-black/5" />
                        <span className="text-[8px] font-black text-black/25 uppercase tracking-tighter">Future</span>
                    </div>
                </div>
                <span className="text-[8px] font-black text-black/20 uppercase tracking-widest">More</span>
            </div>

            {/* Daily Detail Modal */}
            <AnimatePresence>
                {selectedDate && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-black/5"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-black/5 flex items-center justify-between bg-black/[0.01]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em]">Daily Summary</p>
                                        <h3 className="text-[18px] font-black text-black uppercase tracking-tight">
                                            {format(new Date(selectedDate), 'EEEE, MMMM do')}
                                        </h3>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedDate(null)}
                                    className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-black/40" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                                {!moodMap[selectedDate] ? (
                                    <div className="py-12 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-black/[0.03] flex items-center justify-center mx-auto">
                                            <Heart className="w-8 h-8 text-black/10" />
                                        </div>
                                        <p className="text-[13px] font-black text-black/20 uppercase tracking-widest">No logs for this day</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {moodMap[selectedDate].logs.map((log: MoodEntry) => {
                                            const moodConfig = MOOD_COLORS[log.value]
                                            return (
                                                <div key={log.id} className="p-6 rounded-[32px] bg-black/[0.02] border border-black/5 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shadow-sm", moodConfig.cell)}>
                                                                {/* Icon mapping here if needed */}
                                                            </div>
                                                            <div>
                                                                <p className="text-[12px] font-black text-black uppercase">{moodConfig.label}</p>
                                                                <p className="text-[9px] font-bold text-black/30 uppercase">{log.time}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {log.activities && log.activities.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {log.activities.map(actId => {
                                                                const act = ACTIVITIES.find(a => a.id === actId)
                                                                return act && (
                                                                    <div key={actId} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-black/5">
                                                                        <act.icon className="w-3.5 h-3.5 text-indigo-500" />
                                                                        <span className="text-[10px] font-black text-black/60 uppercase tracking-tight">{act.label}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}

                                                    {log.note && (
                                                        <div className="flex gap-3 bg-white p-4 rounded-2xl border border-black/5">
                                                            <MessageSquare className="w-4 h-4 text-black/10 shrink-0 mt-0.5" />
                                                            <p className="text-[13px] font-medium text-black/70 italic leading-relaxed">"{log.note}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-black/[0.02] border-t border-black/5">
                                <button 
                                    onClick={() => setSelectedDate(null)}
                                    className="w-full py-4 bg-black text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl shadow-black/10"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
