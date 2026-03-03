'use client'

import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, Instagram, Hash, Globe, Mail, Clock, Zap, ExternalLink } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import { cn } from '@/lib/utils'
import type { StudioContent } from '../types/studio.types'
import ContentDetailModal from './ContentDetailModal'
import { Platform } from '../types/studio.types'

const PLATFORM_ICONS: Record<Platform, any> = {
    youtube: Video,
    instagram: Instagram,
    tiktok: Hash,
    x: Hash, // Using Hash as standby for X
    web: Globe,
    substack: Mail
}

const STATUS_CONFIG = {
    idea: { color: 'bg-black/[0.03] text-black/40 border-black/5' },
    scripted: { color: 'bg-blue-50 text-blue-600 border-blue-100' },
    filmed: { color: 'bg-amber-50 text-amber-600 border-amber-100' },
    edited: { color: 'bg-purple-50 text-purple-600 border-purple-100' },
    scheduled: { color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
    published: { color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
}

export default function ContentCalendar() {
    const { content } = useStudio()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedItem, setSelectedItem] = useState<StudioContent | null>(null)

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()

        const firstDayOfMonth = new Date(year, month, 1)
        const lastDayOfMonth = new Date(year, month + 1, 0)

        const daysInMonth = lastDayOfMonth.getDate()
        const startDay = firstDayOfMonth.getDay() // 0-6 (Sun-Sat)

        const prevMonthLastDay = new Date(year, month, 0).getDate()

        const days = []

        // Previous month days
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                month: month - 1,
                year,
                isCurrentMonth: false
            })
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                month,
                year,
                isCurrentMonth: true
            })
        }

        // Next month days
        const remainingSlots = 42 - days.length
        for (let i = 1; i <= remainingSlots; i++) {
            days.push({
                day: i,
                month: month + 1,
                year,
                isCurrentMonth: false
            })
        }

        return days
    }, [currentDate])

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    const resetToToday = () => setCurrentDate(new Date())

    const getItemsForDay = (day: number, month: number, year: number) => {
        return content.filter(item => {
            const dateStr = item.publish_date || item.deadline
            if (!dateStr) return false
            const d = new Date(dateStr)
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
        })
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long' })

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Calendar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-[28px] font-black text-black tracking-tight flex items-center gap-3">
                        {monthName} <span className="text-black/10">{currentDate.getFullYear()}</span>
                    </h2>
                    <div className="flex items-center gap-1 bg-black/[0.03] p-1 rounded-xl border border-black/[0.04]">
                        <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-black/40 hover:text-black">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={resetToToday} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-sm rounded-lg transition-all text-black/40 hover:text-black">
                            Today
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-black/40 hover:text-black">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 bg-black/[0.02] border border-black/[0.05] rounded-xl overflow-x-auto no-scrollbar">
                        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                            <div key={status} className="flex items-center gap-1.5 shrink-0">
                                <div className={cn("w-1.5 h-1.5 rounded-full", config.color.split(' ')[0])} />
                                <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest">{status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-black/[0.08] rounded-[24px] overflow-hidden border border-black/[0.08] shadow-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-black/[0.02] py-3 text-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/25">{day}</span>
                    </div>
                ))}

                {calendarData.map((data, i) => {
                    const dayItems = getItemsForDay(data.day, data.month, data.year)
                    const isToday = new Date().toDateString() === new Date(data.year, data.month, data.day).toDateString()

                    return (
                        <div
                            key={i}
                            className={cn(
                                "min-h-[140px] bg-white p-3 transition-colors flex flex-col gap-2",
                                !data.isCurrentMonth && "bg-black/[0.01] opacity-40",
                                data.isCurrentMonth && "hover:bg-black/[0.01]"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className={cn(
                                    "text-[13px] font-black tracking-tight",
                                    isToday ? "flex items-center justify-center w-7 h-7 bg-black text-white rounded-full -ml-1.5" : "text-black/30"
                                )}>
                                    {data.day}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {dayItems.map(item => {
                                    const StatusIcon = item.platforms && item.platforms.length > 0 ? PLATFORM_ICONS[item.platforms[0]] : Clock
                                    const config = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.idea

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedItem(item)}
                                            className={cn(
                                                "w-full text-left p-2 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] group",
                                                config.color
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <div className="flex items-center gap-1">
                                                    {StatusIcon && <StatusIcon className="w-2.5 h-2.5 opacity-50" />}
                                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                                                        {item.status}
                                                    </span>
                                                </div>
                                                {item.impact_score && (
                                                    <div className="flex items-center gap-0.5 text-[8px] font-black text-amber-600">
                                                        <Zap className="w-2 h-2 fill-current" />
                                                        {item.impact_score}
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="text-[11px] font-extrabold leading-tight tracking-tight line-clamp-2">
                                                {item.title}
                                            </h4>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {selectedItem && (
                <ContentDetailModal
                    item={selectedItem}
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    )
}
