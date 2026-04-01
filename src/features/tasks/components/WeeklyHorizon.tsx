'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, Briefcase, Moon, AlertCircle, ArrowRight } from 'lucide-react'
import { useWeeklyHorizon, DayOutlook } from '../hooks/useWeeklyHorizon'
import { format, isToday } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function WeeklyHorizon() {
    const { horizon } = useWeeklyHorizon()

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.03]">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-black/40" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-black/60">7-Day Horizon</h3>
                </div>
                <Link href="/tasks/planner" className="text-[10px] font-black uppercase tracking-widest text-black/20 hover:text-black transition-colors">
                    Full Calendar
                </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                {horizon.map((day: DayOutlook, ix: number) => (
                    <DayCard key={day.dateStr} day={day} index={ix} />
                ))}
            </div>
        </div>
    )
}

function DayCard({ day, index }: { day: DayOutlook, index: number }) {
    const today = isToday(day.date)
    const taskCount = day.tasks.length
    const reminderCount = day.reminders.length

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
                "min-w-[120px] p-4 rounded-2xl border transition-all flex flex-col gap-4 relative overflow-hidden",
                today 
                    ? "bg-black text-white border-black shadow-xl scale-105 z-10" 
                    : "bg-white border-black/[0.05] hover:border-black/[0.1] shadow-sm"
            )}
        >
            {/* Work Indicator */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        today ? "text-white/40" : "text-black/30"
                    )}>
                        {format(day.date, 'EEE')}
                    </span>
                    <span className="text-[18px] font-black leading-none">
                        {format(day.date, 'dd')}
                    </span>
                </div>
                <div className={cn(
                    "p-1.5 rounded-lg",
                    day.isWorkDay 
                        ? (today ? "bg-white/10 text-white" : "bg-blue-50 text-blue-600") 
                        : (today ? "bg-white/5 text-white/40" : "bg-black/[0.02] text-black/20")
                )}>
                    {day.isWorkDay ? <Briefcase className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </div>
            </div>

            <div className="space-y-1">
                {taskCount > 0 ? (
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            today ? "bg-emerald-400" : "bg-emerald-500"
                        )} />
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            today ? "text-white/70" : "text-black/50"
                        )}>
                            {taskCount} Focus Items
                        </span>
                    </div>
                ) : (
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider italic",
                        today ? "text-white/30" : "text-black/20"
                    )}>
                        No Anchors
                    </span>
                )}
                {reminderCount > 0 && (
                    <div className="flex items-center gap-2">
                        <AlertCircle className={cn(
                            "w-3 h-3",
                            today ? "text-amber-400" : "text-amber-500"
                        )} />
                        <span className={cn(
                            "text-[10px] font-bold tracking-tight",
                            today ? "text-white/70" : "text-black/50"
                        )}>
                            {reminderCount} Alerts
                        </span>
                    </div>
                )}
            </div>

            {/* Sub-label for Work/Rest */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 h-1",
                day.isWorkDay ? "bg-blue-500" : "bg-transparent border-t border-black/[0.03]"
            )} />
        </motion.div>
    )
}
