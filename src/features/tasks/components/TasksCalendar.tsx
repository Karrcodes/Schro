'use client'

import React, { useState, useMemo, type FormEvent, type MouseEvent, type ChangeEvent } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, Clock, Briefcase } from 'lucide-react'
import { useSchedule, ScheduleItem } from '@/hooks/useSchedule'
import { cn } from '@/lib/utils'
import { useTasks } from '../hooks/useTasks'
import { Plus, X as CloseIcon, Edit2, Trash2, CheckCircle2, AlertCircle, Zap, ExternalLink } from 'lucide-react'

export function TasksCalendar() {
    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date()
        d.setDate(1)
        d.setHours(0, 0, 0, 0)
        return d
    })
    const [selectedQuickAdd, setSelectedQuickAdd] = useState<{ day: number, date: Date } | null>(null)
    const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedTitle, setEditedTitle] = useState('')
    const [editedDate, setEditedDate] = useState('')
    const [editedPriority, setEditedPriority] = useState<'super' | 'high' | 'mid' | 'low'>('mid')
    const [quickAddTitle, setQuickAddTitle] = useState('')
    const { createTask, editTask, deleteTask } = useTasks('todo')

    const resetToToday = () => setCalMonth(() => {
        const d = new Date()
        d.setDate(1)
        d.setHours(0, 0, 0, 0)
        return d
    })

    const { schedule, loading } = useSchedule(60, true) // Fetch 60 days across both profiles
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const calendarData = useMemo(() => {
        const year = calMonth.getFullYear()
        const month = calMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)

        // Map day number → items
        const byDay: Record<number, ScheduleItem[]> = {}
        schedule.forEach((item: ScheduleItem) => {
            const itemDate = item.date
            if (itemDate.getMonth() === month && itemDate.getFullYear() === year) {
                const d = itemDate.getDate()
                if (!byDay[d]) byDay[d] = []
                byDay[d].push(item)
            }
        })

        return {
            byDay,
            daysInMonth: lastDay.getDate(),
            startDow: firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Monday = 0
        }
    }, [calMonth, schedule])

    const handleQuickAdd = async (e: FormEvent) => {
        e.preventDefault()
        if (!quickAddTitle.trim() || !selectedQuickAdd) return

        try {
            await createTask({
                title: quickAddTitle.trim(),
                priority: 'low',
                due_date: selectedQuickAdd.date.toISOString().split('T')[0]
            })
            setQuickAddTitle('')
            setSelectedQuickAdd(null)
        } catch (err) {
            console.error(err)
        }
    }

    const handleToggleTask = async (item: ScheduleItem) => {
        if (item.type !== 'task') return
        const realId = item.id.split('-')[0]
        try {
            await editTask(realId, { is_completed: !item.is_completed })
            setSelectedItem(null)
        } catch (err) {
            console.error(err)
        }
    }

    const handleDeleteTask = async (item: ScheduleItem) => {
        if (item.type !== 'task') return
        if (!window.confirm('Are you sure you want to delete this task?')) return
        const realId = item.id.split('-')[0]
        try {
            await deleteTask(realId)
            setSelectedItem(null)
        } catch (err) {
            console.error(err)
        }
    }

    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden shadow-sm">
                {/* Calendar Header */}
                <div className="p-5 flex items-center justify-between">
                    <h2 className="text-[16px] font-bold text-black flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Focus Schedule
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCalMonth((m: Date) => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n })}
                                className="p-1.5 rounded-lg hover:bg-black/5 text-black/40"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[13px] font-bold text-black min-w-[120px] text-center">
                                {calMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                                onClick={resetToToday}
                                className="px-2 py-1 text-[9px] font-black uppercase tracking-tight bg-black/[0.03] hover:bg-black/5 rounded-md transition-all text-black/40"
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setCalMonth((m: Date) => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n })}
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
                        {Array.from({ length: calendarData.startDow }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-white min-h-[100px]" />
                        ))}

                        {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                            const day = i + 1
                            const items = calendarData.byDay[day] || []
                            const currentDayDate = new Date(calMonth.getFullYear(), calMonth.getMonth(), day)
                            const isToday = today.toDateString() === currentDayDate.toDateString()
                            const isPast = currentDayDate < today

                            return (
                                <div
                                    key={day}
                                    onClick={() => {
                                        setSelectedQuickAdd({ day, date: currentDayDate })
                                    }}
                                    className={cn(
                                        "bg-white min-h-[100px] p-2 flex flex-col gap-1.5 transition-all relative cursor-pointer group",
                                        isPast && !isToday && "bg-black/[0.005]",
                                        !isPast && "hover:bg-black/[0.01]"
                                    )}
                                >
                                    <span className={cn(
                                        "text-[10px] sm:text-[12px] font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full mb-1 transition-all",
                                        isToday ? "bg-black text-white" : "text-black/30 group-hover:text-black/60"
                                    )}>
                                        {day}
                                    </span>

                                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                        {items.map((item: ScheduleItem, idx: number) => {
                                            const isBusiness = item.profile === 'business'
                                            const isDone = item.is_completed
                                            return (
                                                <button
                                                    key={item.id + idx}
                                                    onClick={(e: MouseEvent) => {
                                                        e.stopPropagation()
                                                        setSelectedItem(item)
                                                        setIsEditing(false)
                                                        setEditedTitle(item.title)
                                                        setEditedDate(item.date.toISOString().split('T')[0])
                                                        setEditedPriority((item.priority as any) || 'mid')
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-1.5 py-0.5 rounded font-bold border truncate text-[8px] sm:text-[10px] transition-all",
                                                        item.type === 'shift' && "bg-blue-50 text-blue-700 border-blue-100",
                                                        item.type === 'overtime' && "bg-orange-50 text-orange-700 border-orange-100",
                                                        item.type === 'holiday' && "bg-purple-50 text-purple-700 border-purple-100",
                                                        item.type === 'task' && isBusiness && !isDone && "bg-rose-50 text-rose-600 border-rose-100",
                                                        item.type === 'task' && !isBusiness && !isDone && "bg-black text-white border-black",
                                                        isDone && "bg-emerald-50 text-emerald-600 border-emerald-100 opacity-50"
                                                    )}
                                                >
                                                    {item.type === 'shift' ? 'Work' : item.title}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}

                        {/* Trailing empty cells */}
                        {Array.from({ length: (7 - (calendarData.startDow + calendarData.daysInMonth) % 7) % 7 }).map((_, i) => (
                            <div key={`empty-end-${i}`} className="bg-white min-h-[100px]" />
                        ))}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-6 p-4 bg-black/[0.02] rounded-xl border border-black/[0.04]">
                        <LegendItem color="bg-black" label="Personal" />
                        <LegendItem color="bg-rose-500" label="Business" />
                        <LegendItem color="bg-blue-500" label="Shift" />
                        <LegendItem color="bg-emerald-500" label="Done" />
                    </div>
                </div>
            </div>

            {/* Quick Add Overlay */}
            {selectedQuickAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-black/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[14px] font-bold text-black uppercase tracking-tight">
                                Map task to {selectedQuickAdd.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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
                                placeholder="Task title..."
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

            {/* Item Detail Overlay */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-black/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    selectedItem.type === 'shift' && "bg-blue-500",
                                    selectedItem.type === 'overtime' && "bg-orange-500",
                                    selectedItem.type === 'holiday' && "bg-purple-500",
                                    selectedItem.type === 'task' && (
                                        selectedItem.is_completed
                                            ? "bg-emerald-500"
                                            : (selectedItem.profile === 'business' ? "bg-rose-500" : "bg-black")
                                    )
                                )} />
                                <h3 className="text-[12px] font-black text-black/30 uppercase tracking-widest">
                                    {selectedItem.type === 'task' ? 'Operation Details' : 'Rota Information'}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-black/5 rounded-lg text-black/40">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-black/30 uppercase tracking-widest pl-1">Title</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editedTitle}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value)}
                                            className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] font-medium outline-none focus:border-black/20 focus:bg-white transition-all"
                                        />
                                    </div>
                                    {selectedItem.originalTask?.category !== 'grocery' && selectedItem.originalTask?.category !== 'reminder' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest pl-1">Due Date</label>
                                            <input
                                                type="date"
                                                value={editedDate}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedDate(e.target.value)}
                                                className="block w-full min-w-full appearance-none bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] font-medium outline-none focus:border-black/20 focus:bg-white transition-all min-h-[46px]"
                                            />
                                        </div>
                                    )}

                                    {selectedItem.originalTask?.category !== 'reminder' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest pl-1">Priority</label>
                                            <div className="flex gap-1.5 p-1 bg-black/[0.03] rounded-xl border border-black/5">
                                                {(['super', 'high', 'mid', 'low'] as const).map(p => {
                                                    const COLORS: Record<string, string> = { super: 'bg-purple-100 text-purple-700 border-purple-200', high: 'bg-red-100 text-red-700 border-red-200', mid: 'bg-blue-100 text-blue-700 border-blue-200', low: 'bg-black/5 text-black/50 border-black/10' }
                                                    const LABELS: Record<string, string> = { super: 'Super', high: 'High', mid: 'Mid', low: 'Low' }
                                                    return (
                                                        <button
                                                            key={p}
                                                            type="button"
                                                            onClick={() => setEditedPriority(p)}
                                                            className={cn(
                                                                'flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-tight',
                                                                editedPriority === p ? COLORS[p] + ' shadow-sm' : 'bg-transparent text-black/30 border-transparent hover:text-black/50 hover:bg-black/5'
                                                            )}
                                                        >
                                                            {LABELS[p]}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 bg-black/[0.05] text-black/60 rounded-xl py-3 text-[12px] font-bold uppercase tracking-widest hover:bg-black/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const realId = selectedItem.id.split('-')[0]
                                                try {
                                                    await editTask(realId, { title: editedTitle, due_date: editedDate, priority: editedPriority })
                                                    setSelectedItem(null)
                                                    setIsEditing(false)
                                                } catch (err) {
                                                    console.error(err)
                                                }
                                            }}
                                            className="flex-1 bg-black text-white rounded-xl py-3 text-[12px] font-bold uppercase tracking-widest hover:bg-black/80 transition-all"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <div className="text-[18px] font-bold text-black tracking-tight leading-tight">
                                            {selectedItem.type === 'shift' ? 'Work Shift' : selectedItem.title}
                                        </div>
                                        {/* Date context subtitle */}
                                        <p className="text-[12px] text-black/40 mt-1">
                                            {selectedItem.due_date_mode === 'before'
                                                ? `By ${selectedItem.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`
                                                : selectedItem.due_date_mode === 'range'
                                                    ? `Range · ends ${selectedItem.end_date ? new Date(selectedItem.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}`
                                                    : selectedItem.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
                                            }
                                        </p>
                                        {selectedItem.profile && (
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-widest mt-1 inline-block px-1.5 py-0.5 rounded",
                                                selectedItem.profile === 'business' ? "bg-rose-50 text-rose-600" : "bg-black/5 text-black/40"
                                            )}>{selectedItem.profile}</span>
                                        )}
                                    </div>

                                    {selectedItem.type === 'task' ? (
                                        <div className="flex flex-col gap-3 pt-2">
                                            <button
                                                onClick={() => handleToggleTask(selectedItem)}
                                                className={cn(
                                                    "w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-[13px] font-bold transition-all",
                                                    selectedItem.is_completed
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                                        : "bg-black text-white border-black hover:bg-black/90"
                                                )}
                                            >
                                                {selectedItem.is_completed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                {selectedItem.is_completed ? 'Mark as Pending' : 'Mark as Completed'}
                                            </button>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setIsEditing(true)}
                                                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-black/[0.08] text-black/60 text-[13px] font-bold hover:bg-black/[0.02] transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTask(selectedItem)}
                                                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 text-red-600 text-[13px] font-bold hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-black/[0.02] rounded-xl border border-black/5">
                                            <p className="text-[11px] text-black/50 leading-relaxed font-medium">
                                                This is a {selectedItem.type} generated from your rotation settings.
                                                {selectedItem.type !== 'shift' && " It can be managed in the Finances module."}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function LegendItem({ color, label, opacity }: { color: string, label: string, opacity?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", color, opacity && "opacity-40")} />
            <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{label}</span>
        </div>
    )
}
