'use client'

import React, { useMemo, useState } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { isShiftDay } from '@/features/finance/utils/rotaUtils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function FitnessHeatmap() {
    const { workoutLogs, gymStats, gymRecommendation } = useWellbeing()
    const [weekOffset, setWeekOffset] = useState(0) // 0 is current 4 weeks
    const [hoveredDate, setHoveredDate] = useState<string | null>(null)

    const days = useMemo(() => {
        const baseDate = subDays(new Date(), weekOffset * 28)
        const todayStr = format(new Date(), 'yyyy-MM-dd')

        return Array.from({ length: 28 }, (_, i) => {
            const date = subDays(baseDate, i)
            const dateStr = format(date, 'yyyy-MM-dd')

            const hasVisit = gymStats.visitHistory?.some((v: any) => v.date?.split('T')[0] === dateStr)
            const hasLog = workoutLogs?.some((l: any) => l.date === dateStr)
            const isWorkDay = isShiftDay(date)
            const isToday = dateStr === todayStr
            const isPending = isToday && gymRecommendation.status === 'pending'

            return {
                date: dateStr,
                hasVisit: hasVisit || hasLog,
                isWorkDay,
                isPending
            }
        }).reverse()
    }, [workoutLogs, gymStats.visitHistory, gymRecommendation, weekOffset])

    const getHeatmapColor = (hasVisit?: boolean, isWorkDay?: boolean, isPending?: boolean) => {
        if (hasVisit) return "bg-emerald-500 shadow-sm shadow-emerald-500/20 border-emerald-500/20 scale-105 z-10"
        if (isPending) return "bg-emerald-500/20 border-emerald-500/30 animate-pulse"
        if (isWorkDay) return "bg-black/[0.03] scale-95"
        return "bg-rose-500/10 border-rose-500/20 scale-95"
    }

    const activeDays = days.filter(d => d.hasVisit || d.isPending).length

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">Operational Adherence</p>
                    <p className="text-[13px] font-black text-black uppercase">{activeDays} / 28 Days Active</p>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-1 bg-black/[0.03] p-1 rounded-xl border border-black/5">
                        <button
                            onClick={() => setWeekOffset(prev => prev + 1)}
                            className="p-1 px-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all"
                            title="Previous 4 weeks"
                        >
                            <ChevronLeft className="w-4 h-4 text-black/40" />
                        </button>
                        <button
                            onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                            disabled={weekOffset === 0}
                            className={cn(
                                "p-1 px-1.5 rounded-lg transition-all",
                                weekOffset === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white hover:shadow-sm"
                            )}
                            title="Next 4 weeks"
                        >
                            <ChevronRight className="w-4 h-4 text-black/40" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {days.map((day) => (
                    <div
                        key={day.date}
                        onMouseEnter={() => setHoveredDate(day.date)}
                        onMouseLeave={() => setHoveredDate(null)}
                        className={cn(
                            "aspect-square rounded-md border border-black/5 transition-all duration-500 flex items-center justify-center relative",
                            hoveredDate === day.date ? "z-[100]" : "z-10",
                            getHeatmapColor(day.hasVisit, day.isWorkDay, day.isPending)
                        )}
                    >
                        {/* Tooltip */}
                        {hoveredDate === day.date && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl z-[100] shadow-xl pointer-events-none text-center animate-in fade-in zoom-in-95 duration-200">
                                {format(new Date(day.date), 'MMM do')}
                                {day.hasVisit ? (
                                    <span className="block text-emerald-400 mt-0.5">Gym Session</span>
                                ) : day.isPending ? (
                                    <span className="block text-emerald-400/60 mt-0.5 animate-pulse">Session Pending</span>
                                ) : (
                                    <span className={cn("block mt-0.5", day.isWorkDay ? "text-white/40" : "text-rose-400")}>{day.isWorkDay ? 'Work Day' : 'Rest Day'}</span>
                                )}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-2">
                <span className="text-[7px] font-black text-black/20 uppercase tracking-widest">
                    {format(new Date(days[0].date), 'MMM do')}
                </span>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-black/[0.03]" />
                        <span className="text-[7px] font-black text-black/20 uppercase tracking-widest">Work</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-rose-500/10 border border-rose-500/20" />
                        <span className="text-[7px] font-black text-black/20 uppercase tracking-widest">Rest</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
                        <span className="text-[7px] font-black text-black/20 uppercase tracking-widest">Pending</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                        <span className="text-[7px] font-black text-black/20 uppercase tracking-widest">Gym</span>
                    </div>
                </div>

                <span className="text-[7px] font-black text-black/20 uppercase tracking-widest">
                    {weekOffset === 0 ? 'Today' : format(new Date(days[days.length - 1].date), 'MMM do')}
                </span>
            </div>
        </div>
    )
}
