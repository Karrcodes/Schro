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
    const [selectedContentId, setSelectedContentId] = useState<string | null>(null)

    const selectedItem = useMemo(() => content.find((i: StudioContent) => i.id === selectedContentId) || null, [content, selectedContentId])

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
        return content.filter((item: StudioContent) => {
            const dateStr = item.publish_date || item.deadline
            if (!dateStr) return false
            const d = new Date(dateStr)
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
        })
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long' })

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden shadow-sm">
                {/* Calendar Header */}
                <div className="p-5 border-b border-black/[0.04] flex items-center justify-between bg-black/[0.01]">
                    <h2 className="text-[16px] font-bold text-black flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Content Timeline
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={prevMonth}
                                className="p-1.5 rounded-lg hover:bg-black/5 text-black/40"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[13px] font-bold text-black min-w-[120px] text-center">
                                {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                                onClick={resetToToday}
                                className="px-2 py-1 text-[9px] font-black uppercase tracking-tight bg-black/[0.03] hover:bg-black/5 rounded-md transition-all text-black/40"
                            >
                                Today
                            </button>
                            <button
                                onClick={nextMonth}
                                className="p-1.5 rounded-lg hover:bg-black/5 text-black/40"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 mb-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-black/25 uppercase tracking-wider py-2">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-black/[0.05] rounded-xl overflow-hidden border border-black/[0.05]">
                        {calendarData.map((data, i) => {
                            const dayItems = getItemsForDay(data.day, data.month, data.year)
                            const isToday = new Date().toDateString() === new Date(data.year, data.month, data.day).toDateString()
                            const isPast = new Date(data.year, data.month, data.day) < new Date(new Date().setHours(0, 0, 0, 0))

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "min-h-[100px] bg-white p-2 flex flex-col gap-1.5 transition-all relative",
                                        !data.isCurrentMonth && "bg-black/[0.01] opacity-40",
                                        data.isCurrentMonth && isPast && !isToday && "bg-black/[0.005]",
                                        data.isCurrentMonth && "hover:bg-black/[0.01]"
                                    )}
                                >
                                    <div className="flex items-center justify-between px-1">
                                        <span className={cn(
                                            "text-[10px] sm:text-[12px] font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full mb-1 transition-all",
                                            isToday ? "bg-black text-white" : "text-black/30"
                                        )}>
                                            {data.day}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                        {dayItems.map(item => {
                                            const StatusIcon = item.platforms && item.platforms.length > 0 ? PLATFORM_ICONS[item.platforms[0]] : Clock
                                            const config = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.idea

                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setSelectedContentId(item.id)}
                                                    className={cn(
                                                        "w-full text-left px-1.5 py-0.5 rounded font-bold border truncate text-[8px] sm:text-[10px] transition-all",
                                                        config.color
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                                        <div className="flex items-center gap-1">
                                                            {StatusIcon && <StatusIcon className="w-2.5 h-2.5 opacity-40" />}
                                                            <span style={{ fontSize: '7px' }} className="font-bold uppercase tracking-widest opacity-60">
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                        {item.impact_score && (
                                                            <div className="flex items-center gap-0.5 text-[8px] font-black text-amber-600">
                                                                <Zap className="w-2.5 h-2.5 fill-current" />
                                                                {item.impact_score}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h4 style={{ fontSize: '10px' }} className="font-semibold leading-tight tracking-tight line-clamp-1">
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

                    <div className="mt-6 flex flex-wrap items-center gap-6 p-4 bg-black/[0.02] rounded-xl border border-black/[0.04]">
                        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                            <div key={status} className="flex items-center gap-2">
                                <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", config.color.split(' ')[0])} />
                                <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ContentDetailModal
                item={selectedItem || null}
                isOpen={!!selectedContentId}
                onClose={() => setSelectedContentId(null)}
            />
        </div>
    )
}
