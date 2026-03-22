'use client'

import React, { useState, useMemo, type ChangeEvent } from 'react'
import { Plus, X as CloseIcon, Edit2, Trash2, CheckCircle2, AlertCircle, Zap, ExternalLink, Video as VideoIcon, Instagram, Youtube, Hash, Globe, Mail, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import { cn } from '@/lib/utils'
import type { StudioContent } from '../types/studio.types'
import ContentDetailModal from './ContentDetailModal'
import CreateContentModal from './CreateContentModal'

const PLATFORM_ICONS: Record<string, any> = {
    youtube: Youtube,
    instagram: Instagram,
    tiktok: Hash,
    x: Hash,
    web: Globe,
    substack: Mail
}

const STATUS_CONFIG = {
    idea: { color: 'bg-black/[0.03] text-black/40 border-black/5', dot: 'bg-black/20' },
    scripted: { color: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-500' },
    filmed: { color: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' },
    edited: { color: 'bg-purple-50 text-purple-600 border-purple-100', dot: 'bg-purple-500' },
    scheduled: { color: 'bg-cyan-50 text-cyan-600 border-cyan-100', dot: 'bg-cyan-500' },
    published: { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' }
}

export default function ContentCalendar() {
    const { content, addContent } = useStudio()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedQuickAdd, setSelectedQuickAdd] = useState<{ day: number, date: Date } | null>(null)
    const [quickAddTitle, setQuickAddTitle] = useState('')
    const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const selectedItem = useMemo(() => content.find((i: StudioContent) => i.id === selectedContentId) || null, [content, selectedContentId])

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()

        const firstDayOfMonth = new Date(year, month, 1)
        const lastDayOfMonth = new Date(year, month + 1, 0)

        const daysInMonth = lastDayOfMonth.getDate()
        // Adjust start day to Monday-first (0-6)
        let startDay = firstDayOfMonth.getDay()
        startDay = startDay === 0 ? 6 : startDay - 1

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

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickAddTitle.trim() || !selectedQuickAdd) return

        try {
            await addContent({
                title: quickAddTitle.trim(),
                status: 'idea',
                publish_date: selectedQuickAdd.date.toISOString().split('T')[0],
                platforms: ['web']
            })
            setQuickAddTitle('')
            setSelectedQuickAdd(null)
        } catch (err) {
            console.error(err)
        }
    }

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

    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden shadow-sm">
                {/* Calendar Header */}
                <div className="p-5 flex items-center justify-between">
                    <h2 className="text-[16px] font-bold text-black flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Content Schedule
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

                <div className="p-4 sm:p-6 !pt-0">
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 mb-2">
                        {DAY_LABELS.map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-black/25 uppercase tracking-wider py-2">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-black/[0.05] rounded-xl overflow-hidden border border-black/[0.05]">
                        {calendarData.map((data: any, i: number) => {
                            const dayItems = getItemsForDay(data.day, data.month, data.year)
                            const currentDayDate = new Date(data.year, data.month, data.day)
                            const isToday = new Date().toDateString() === currentDayDate.toDateString()
                            const todayStart = new Date()
                            todayStart.setHours(0, 0, 0, 0)
                            const isPast = currentDayDate < todayStart

                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedQuickAdd({ day: data.day, date: currentDayDate })}
                                    className={cn(
                                        "min-h-[100px] bg-white p-2 flex flex-col gap-1.5 transition-all relative cursor-pointer group",
                                        !data.isCurrentMonth && "bg-black/[0.01] opacity-40",
                                        data.isCurrentMonth && isPast && !isToday && "bg-black/[0.005]",
                                        data.isCurrentMonth && "hover:bg-black/[0.01]"
                                    )}
                                >
                                    <div className="flex items-center justify-between px-1">
                                        <span className={cn(
                                            "text-[10px] sm:text-[12px] font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full mb-1 transition-all",
                                            isToday ? "bg-black text-white" : "text-black/30 group-hover:text-black/60"
                                        )}>
                                            {data.day}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                        {dayItems.map((item: StudioContent) => {
                                            const StatusIcon = item.platforms && item.platforms.length > 0 ? PLATFORM_ICONS[item.platforms[0]] : null
                                            const config = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.idea

                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedContentId(item.id); }}
                                                    className={cn(
                                                        "w-full text-left px-1.5 py-0.5 rounded font-bold border truncate text-[8px] sm:text-[10px] transition-all",
                                                        config.color
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        {StatusIcon && <StatusIcon className="w-2.5 h-2.5 opacity-40" />}
                                                        <span className="truncate">{item.title}</span>
                                                    </div>
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
                            <LegendItem key={status} color={config.dot} label={status} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Add Overlay */}
            {selectedQuickAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-black/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[14px] font-bold text-black uppercase tracking-tight font-black">
                                Map content to {selectedQuickAdd.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </h3>
                            <button onClick={() => setSelectedQuickAdd(null)} className="p-1 hover:bg-black/5 rounded-lg text-black/40">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleQuickAdd} className="space-y-4">
                            <input
                                autoFocus
                                type="text"
                                value={quickAddTitle}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setQuickAddTitle(e.target.value)}
                                placeholder="Content title..."
                                className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] font-medium outline-none focus:border-black/20 focus:bg-white transition-all transition-colors"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={!quickAddTitle.trim()}
                                    className="flex-1 bg-black text-white rounded-xl py-3 text-[12px] font-bold uppercase tracking-widest hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    Add to Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ContentDetailModal
                item={selectedItem || null}
                isOpen={!!selectedContentId}
                onClose={() => setSelectedContentId(null)}
            />
        </div>
    )
}

function LegendItem({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", color)} />
            <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{label}</span>
        </div>
    )
}
