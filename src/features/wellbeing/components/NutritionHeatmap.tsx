'use client'

import React, { useMemo, useState } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { format, subDays, addWeeks } from 'date-fns'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function NutritionHeatmap() {
    const { mealLogs, macros } = useWellbeing()
    const targetCalories = macros.calories
    const [weekOffset, setWeekOffset] = useState(0) // 0 is current 4 weeks, 1 is previous 4 weeks, etc.

    const days = useMemo(() => {
        // Calculate the base date by subtracting week offsets
        const baseDate = subDays(new Date(), weekOffset * 28)

        return Array.from({ length: 28 }, (_, i) => {
            const date = subDays(baseDate, i)
            const dateStr = format(date, 'yyyy-MM-dd')

            const dayMeals = mealLogs.filter(m => m.date === dateStr)
            const calories = dayMeals.reduce((acc, meal) => acc + meal.calories, 0)

            return {
                date: dateStr,
                calories
            }
        }).reverse()
    }, [mealLogs, weekOffset])

    const getHeatmapColor = (calories: number) => {
        if (calories === 0) return "bg-rose-500/10 border-rose-500/20 scale-95"

        const ratio = calories / targetCalories

        if (ratio < 0.4) return "bg-emerald-200 border-emerald-300/20 scale-100"
        if (ratio < 0.8) return "bg-emerald-300 border-emerald-400/20 scale-100"
        if (ratio <= 1.1) return "bg-emerald-500 shadow-sm shadow-emerald-500/20 border-emerald-500/20 scale-105 z-10"
        return "bg-emerald-600 shadow-md shadow-emerald-600/20 border-emerald-600/20 scale-105 z-10" // Over target
    }

    const daysOnTarget = days.filter(d =>
        d.calories > 0 &&
        (d.calories / targetCalories) >= 0.8 &&
        (d.calories / targetCalories) <= 1.1
    ).length

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">Target Adherence</p>
                    <p className="text-[13px] font-black text-black uppercase">{daysOnTarget} / 28 Days on Target</p>
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
                        className={cn(
                            "aspect-square rounded-md border border-black/5 transition-all duration-500 flex items-center justify-center group relative",
                            getHeatmapColor(day.calories)
                        )}
                    >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl pointer-events-none text-center">
                            {format(new Date(day.date), 'MMM do')}
                            {day.calories > 0 ? (
                                <span className="block text-emerald-400 mt-0.5">{day.calories} kcal</span>
                            ) : (
                                <span className="block text-rose-400 mt-0.5 whitespace-nowrap">No Data Recorded</span>
                            )}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-2">
                <span className="text-[7px] font-black text-black/20 uppercase tracking-widest">
                    {format(new Date(days[0].date), 'MMM do')}
                </span>

                <div className="flex items-center gap-1.5">
                    <div className="text-[8px] font-black text-black/20 uppercase tracking-widest mr-1">Less</div>
                    <div className="w-2 h-2 rounded-sm bg-rose-500/10 border border-rose-500/20" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-200" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-300" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                    <div className="text-[8px] font-black text-black/20 uppercase tracking-widest ml-1">More</div>
                </div>

                <span className="text-[7px] font-black text-black/20 uppercase tracking-widest">
                    {weekOffset === 0 ? 'Today' : format(new Date(days[days.length - 1].date), 'MMM do')}
                </span>
            </div>
        </div>
    )
}
