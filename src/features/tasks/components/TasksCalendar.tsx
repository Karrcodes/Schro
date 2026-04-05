'use client'

import React, { useState, useMemo, useEffect, type FormEvent, type MouseEvent, type ChangeEvent } from 'react'
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, Clock, 
    Briefcase, Landmark, Clapperboard, Target, Globe, Apple, ExternalLink, 
    Zap, CheckCircle2, X as CloseIcon, Trash2, Plus, Filter, Eye, EyeOff,
    Brain, Activity, ChevronUp, ChevronDown, Minus, ShieldAlert,
    Timer, Feather, Heart, Wallet, User, Tv, Factory, Beaker, TrendingUp,
    CreditCard, RefreshCw, Pencil
} from 'lucide-react'
import { useSchedule, ScheduleItem } from '@/hooks/useSchedule'
import { cn } from '@/lib/utils'
import { useTasks } from '../hooks/useTasks'
import DatePickerInput from '@/components/DatePickerInput'

export function TasksCalendar() {
    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date()
        d.setDate(1)
        d.setHours(0, 0, 0, 0)
        return d
    })
    const [selectedQuickAdd, setSelectedQuickAdd] = useState<{ day: number, date: Date } | null>(null)
    const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState<ScheduleItem | null>(null)
    const [notification, setNotification] = useState<{title: string, message: string, type: 'success'|'error'} | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedTitle, setEditedTitle] = useState('')
    const [editedDate, setEditedDate] = useState('')
    const [editedPriority, setEditedPriority] = useState<'super' | 'high' | 'mid' | 'low'>('mid')
    const [quickAddTitle, setQuickAddTitle] = useState('')
    const [isSavingEvent, setIsSavingEvent] = useState(false)
    const { editTask, deleteTask } = useTasks('todo')

    // Visibility toggles for the Perspective Filter
    const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set([
        'personal', 'business', 'shift', 'overtime', 'holiday', 
        'payday', 'liability', 'studio', 'goal', 
        'external-google', 'external-apple'
    ]))

    const toggleType = (type: string) => {
        const next = new Set(visibleTypes)
        if (next.has(type)) next.delete(type)
        else next.add(type)
        setVisibleTypes(next)
    }

    const resetToToday = () => setCalMonth(() => {
        const d = new Date()
        d.setDate(1)
        d.setHours(0, 0, 0, 0)
        return d
    })

    // Fetch 45 days to cover the month view well
    // We use allProfiles: true to bring in all personal + business data
    const { schedule, loading, refresh } = useSchedule(45, true)
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
            if (itemDate.getMonth() !== month || itemDate.getFullYear() !== year) return

            // Filter logic
            let isVisible = false
            if (item.type === 'task') {
                if (item.profile === 'business') isVisible = visibleTypes.has('business')
                else isVisible = visibleTypes.has('personal')
            } else {
                isVisible = visibleTypes.has(item.type)
            }

            if (isVisible) {
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
    }, [calMonth, schedule, visibleTypes])

    const isGoogleConnected = useMemo(() => 
        schedule.some(item => item.type === 'external-google'), 
    [schedule])

    const [isAppleModalOpen, setIsAppleModalOpen] = useState(false)
    const [appleUrl, setAppleUrl] = useState('')
    const [appleLabel, setAppleLabel] = useState('')
    const [isSavingApple, setIsSavingApple] = useState(false)
    const [appleCalendars, setAppleCalendars] = useState<any[]>([])

    const isAppleConnected = appleCalendars.length > 0

    // Fetch Apple Calendars list
    useEffect(() => {
        const fetchList = async () => {
            try {
                const res = await fetch('/api/calendar/apple')
                if (res.ok) {
                    const data = await res.json()
                    if (data.calendars) setAppleCalendars(data.calendars)
                }
            } catch (err) {
                console.error(err)
            }
        }
        fetchList()
    }, [isAppleModalOpen])

    const handleSaveAppleUrl = async (e: FormEvent) => {
        e.preventDefault()
        if (!appleUrl.trim()) return
        setIsSavingApple(true)
        try {
            const res = await fetch('/api/calendar/apple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'add', 
                    url: appleUrl.trim(),
                    label: appleLabel.trim() || 'Apple Calendar'
                })
            })
            
            if (res.ok) {
                const data = await res.json()
                setAppleCalendars(data.calendars || [])
                setAppleUrl('')
                setAppleLabel('')
                setIsAppleModalOpen(false)
                window.location.reload() 
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Connection failed' }))
                alert(`Error: ${errorData.error || 'Failed to connect'}`)
            }
        } catch (err: any) {
            console.error('[Apple Save] Connection error:', err)
            alert(`Connection failed: ${err.message}`)
        } finally {
            setIsSavingApple(false)
        }
    }

    const handleDeleteAppleUrl = async (id: string) => {
        try {
            const res = await fetch('/api/calendar/apple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            })
            if (res.ok) {
                const data = await res.json()
                setAppleCalendars(data.calendars || [])
                window.location.reload()
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleQuickAdd = async (e: FormEvent) => {
        e.preventDefault()
        if (!quickAddTitle.trim() || !selectedQuickAdd) return

        if (!isGoogleConnected) {
            setNotification({ title: 'Connection Required', message: 'Please connect Google Calendar first using the "Google Sync" button below.', type: 'error' })
            return
        }

        setIsSavingEvent(true)
        try {
            const yyyy = selectedQuickAdd.date.getFullYear()
            const mm = String(selectedQuickAdd.date.getMonth() + 1).padStart(2, '0')
            const dd = String(selectedQuickAdd.date.getDate()).padStart(2, '0')

            const res = await fetch('/api/calendar/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: quickAddTitle.trim(),
                    date: `${yyyy}-${mm}-${dd}`
                })
            })

            if (res.ok) {
                setQuickAddTitle('')
                setSelectedQuickAdd(null)
                refresh()
                setNotification({ title: 'Event Synced', message: 'Successfully pushed to your Google Calendar.', type: 'success' })
            } else {
                const data = await res.json()
                setNotification({ title: 'Event Failed', message: `Could not create Google event: ${data.error || 'Unknown error'}`, type: 'error' })
            }
        } catch (err) {
            console.error(err)
            setNotification({ title: 'Network Error', message: 'Failed to connect to Google Calendar API', type: 'error' })
        } finally {
            setIsSavingEvent(false)
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

    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    function renderMetadataIcons(item: ScheduleItem) {
        return null
    }

    function getTaskStyles(item: ScheduleItem) {
        if (item.type !== 'task' || !item.originalTask) return { bg: "bg-black text-white border-black", categoryIcon: null }
        
        const t = item.originalTask
        const isDone = item.is_completed
        const isBusiness = item.profile === 'business'
        
        if (isDone) return { bg: "bg-emerald-50/50 text-emerald-700 border-emerald-200/40 opacity-50 shadow-none", categoryIcon: null }

        // Category-based colors
        let bg = isBusiness ? "bg-rose-50/80 text-rose-900 border-rose-200/60" : "bg-zinc-50 text-zinc-900 border-zinc-200/60 shadow-sm"

        // Map strategic category to styles
        const cat = t.strategic_category
        switch(cat) {
            case 'finance':
                bg = "bg-emerald-50/90 text-emerald-900 border-emerald-200/70"
                break
            case 'career':
                bg = "bg-blue-50/90 text-blue-900 border-blue-200/70"
                break
            case 'health':
                bg = "bg-rose-50/90 text-rose-900 border-rose-200/70"
                break
            case 'personal':
                bg = "bg-amber-50/90 text-amber-900 border-amber-200/70"
                break
            case 'rnd':
                bg = "bg-purple-50/90 text-purple-900 border-purple-200"
                break
            case 'production':
                bg = "bg-orange-50/90 text-orange-900 border-orange-200"
                break
            case 'media':
                bg = "bg-rose-50/90 text-rose-900 border-rose-200"
                break
            case 'growth':
                bg = "bg-emerald-50/90 text-emerald-900 border-emerald-200"
                break
        }

        // Reminders are distinct
        if (t.category === 'reminder') {
            bg = "bg-indigo-50/40 text-indigo-900 border-indigo-200/40 italic"
        }

        return { bg, categoryIcon: null }
    }

    return (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden shadow-sm">
                {/* Calendar Header */}
                <div className="p-5 flex items-center justify-between border-b border-black/[0.03]">
                    <h2 className="text-[16px] font-bold text-black flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        This Month
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCalMonth((m: Date) => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n })}
                                className="p-1.5 rounded-lg hover:bg-black/5 text-black/40 transition-colors"
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
                                className="p-1.5 rounded-lg hover:bg-black/5 text-black/40 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 !pt-4">
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 mb-2">
                        {DAY_LABELS.map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-black/25 uppercase tracking-wider py-2">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-black/[0.05] rounded-xl overflow-hidden border border-black/[0.05]">
                        {Array.from({ length: calendarData.startDow }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-white min-h-[120px]" />
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
                                        "bg-white min-h-[120px] p-2 flex flex-col gap-1.5 transition-all relative cursor-pointer group",
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

                                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[90px] custom-scrollbar px-1 py-1">
                                        {items.map((item: ScheduleItem, idx: number) => {
                                            const isExternal = item.type.startsWith('external-')
                                            
                                            let bgColor = "bg-black text-white border-black"
                                            let icon = null
                                            let source = null

                                            switch(item.type) {
                                                case 'shift':
                                                    bgColor = "bg-blue-50/70 text-blue-800 border-blue-200/50"
                                                    icon = <Briefcase className="w-2.5 h-2.5" />
                                                    break
                                                case 'overtime':
                                                    bgColor = "bg-orange-50/70 text-orange-800 border-orange-200/50"
                                                    icon = <Zap className="w-2.5 h-2.5" />
                                                    break
                                                case 'holiday':
                                                    bgColor = "bg-purple-50 text-purple-700 border-purple-100"
                                                    break
                                                case 'payday':
                                                    bgColor = "bg-emerald-50 text-emerald-700 border-emerald-200 font-black"
                                                    break
                                                case 'liability':
                                                    bgColor = "bg-rose-50 text-rose-700 border-rose-200"
                                                    icon = <CreditCard className="w-2.5 h-2.5" />
                                                    break
                                                case 'studio':
                                                    bgColor = "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                    icon = <Clapperboard className="w-2.5 h-2.5" />
                                                    break
                                                case 'goal':
                                                    bgColor = "bg-amber-50 text-amber-700 border-amber-200"
                                                    icon = <Target className="w-2.5 h-2.5" />
                                                    break
                                                case 'external-google':
                                                    bgColor = "bg-[#fef9c3]/40 text-[#854d0e] border-[#fef08a]/60"
                                                    icon = <Globe className="w-2.5 h-2.5 text-[#eab308]" />
                                                    source = "Google"
                                                    break
                                                case 'external-apple':
                                                    bgColor = "bg-slate-50/60 text-slate-800 border-slate-200/60 "
                                                    icon = <Apple className="w-2.5 h-2.5 text-slate-500" />
                                                    source = item.calendarLabel || "Apple"
                                                    break
                                                case 'task':
                                                    const styles = getTaskStyles(item)
                                                    bgColor = styles.bg
                                                    icon = null
                                                    break
                                                default:
                                                    bgColor = "bg-black/[0.03] text-black/60 border-black/10"
                                            }
                                            
                                            const displayName = item.title.length > 25 ? item.title.substring(0, 25) + '...' : item.title

                                            return (
                                                <button
                                                    key={item.id + idx}
                                                    onClick={(e: any) => {
                                                        e.stopPropagation()
                                                        setSelectedItem(item)
                                                        setIsEditing(false)
                                                        setEditedTitle(item.title)
                                                        setEditedDate(new Date(item.date.getTime() - (item.date.getTimezoneOffset() * 60000)).toISOString().split('T')[0])
                                                        setEditedPriority((item.priority as any) || 'mid')
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-1.5 py-1 rounded-md border text-[8.5px] sm:text-[9.5px] font-bold transition-all flex flex-col gap-px group/item hover:shadow-sm relative hover:z-20",
                                                        bgColor,
                                                        isExternal && "py-1.5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        {icon}
                                                        <span className={cn(
                                                            "truncate leading-tight",
                                                            !icon && "pl-0.5"
                                                        )}>{displayName}</span>
                                                    </div>
                                                    {renderMetadataIcons(item)}
                                                    {source && (
                                                        <span className="text-[7px] sm:text-[8px] opacity-40 font-black uppercase tracking-widest pl-0.5">
                                                            {source}
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}

                        {/* Trailing empty cells */}
                        {Array.from({ length: (7 - (calendarData.startDow + calendarData.daysInMonth) % 7) % 7 }).map((_, i) => (
                            <div key={`empty-end-${i}`} className="bg-white min-h-[120px]" />
                        ))}
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-black/[0.02] rounded-2xl border border-black/[0.04]">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[10px] font-black text-black/30 uppercase tracking-widest flex items-center gap-1.5">
                                    <Filter className="w-3 h-3" />
                                    Perspective Filters
                                </h3>
                                <span className="text-[9px] font-bold text-black/20 uppercase tracking-tight">Toggle Visibility</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <FilterToggle icon={<Eye className="w-3 h-3" />} label="Personal" isActive={visibleTypes.has('personal')} color="bg-black" onClick={() => toggleType('personal')} />
                                <FilterToggle icon={<Eye className="w-3 h-3" />} label="Business" isActive={visibleTypes.has('business')} color="bg-rose-500" onClick={() => toggleType('business')} />
                                <FilterToggle icon={<Eye className="w-3 h-3" />} label="Shifts" isActive={visibleTypes.has('shift')} color="bg-blue-500" onClick={() => toggleType('shift')} />
                                <FilterToggle icon={<Globe className="w-3 h-3" />} label="Google" isActive={visibleTypes.has('external-google')} color="bg-yellow-500" onClick={() => toggleType('external-google')} />
                                <FilterToggle icon={<Apple className="w-3 h-3" />} label="Apple" isActive={visibleTypes.has('external-apple')} color="bg-slate-400" onClick={() => toggleType('external-apple')} />
                                <FilterToggle icon={<Landmark className="w-3 h-3" />} label="Liabilities" isActive={visibleTypes.has('liability')} color="bg-rose-100" onClick={() => toggleType('liability')} />
                                <FilterToggle icon={<Clapperboard className="w-3 h-3" />} label="Studio" isActive={visibleTypes.has('studio')} color="bg-indigo-100" onClick={() => toggleType('studio')} />
                                <FilterToggle icon={<Target className="w-3 h-3" />} label="Goals" isActive={visibleTypes.has('goal')} color="bg-amber-100" onClick={() => toggleType('goal')} />
                                <FilterToggle icon={<Landmark className="w-3 h-3" />} label="Paydays" isActive={visibleTypes.has('payday')} color="bg-emerald-500" onClick={() => toggleType('payday')} />
                            </div>
                        </div>

                        <div className="p-5 bg-black/[0.02] rounded-2xl border border-black/[0.04] flex flex-col justify-between">
                            <div>
                                <h3 className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Globe className="w-3 h-3" />
                                    External Integration
                                </h3>
                                <p className="text-[11px] text-black/50 font-medium leading-relaxed">
                                    Sync your professional and personal life. Connect external providers to bring external events into Schrö.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-5">
                                <button 
                                    onClick={() => {
                                        const currentPath = window.location.pathname
                                        window.location.href = `/api/auth/google?redirect=${encodeURIComponent(currentPath)}`
                                    }}
                                    className={cn(
                                        "flex-1 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all group border",
                                        isGoogleConnected 
                                            ? "bg-emerald-50 border-emerald-100/50 hover:bg-emerald-100/50" 
                                            : "bg-white border-black/[0.08] hover:bg-black/[0.02]"
                                    )}
                                >
                                    {isGoogleConnected ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                                    )}
                                    <span className={cn(
                                        "text-[11px] font-bold",
                                        isGoogleConnected ? "text-emerald-700" : "text-black/60"
                                    )}>
                                        {isGoogleConnected ? 'Google Active' : 'Google Sync'}
                                    </span>
                                </button>
                                <button 
                                    onClick={() => setIsAppleModalOpen(true)}
                                    className={cn(
                                        "flex-1 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all group border",
                                        isAppleConnected 
                                            ? "bg-slate-50 border-slate-100 hover:bg-slate-100" 
                                            : "bg-white border-black/[0.08] hover:bg-black/[0.02]"
                                    )}
                                >
                                    {appleCalendars.length > 0 ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                    ) : (
                                        <Apple className="w-3.5 h-3.5 shadow-sm" />
                                    )}
                                    <span className={cn(
                                        "text-[11px] font-bold",
                                        appleCalendars.length > 0 ? "text-slate-600" : "text-black/60"
                                    )}>
                                        {appleCalendars.length > 0 ? `Apple Feed (${appleCalendars.length})` : 'Apple Sync'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Add Overlay */}
            {selectedQuickAdd && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-black/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[14px] font-bold text-black uppercase tracking-tight">
                                Google Event for {selectedQuickAdd.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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
                                placeholder="Event title..."
                                className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] font-medium outline-none focus:border-black/20 focus:bg-white transition-all"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={!quickAddTitle.trim() || isSavingEvent}
                                    className="flex-1 bg-black text-white rounded-xl py-3 text-[12px] font-bold uppercase tracking-widest hover:bg-black/80 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSavingEvent && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    {isSavingEvent ? 'Pushing...' : 'Push to Google'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Item Detail Overlay */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-black/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    selectedItem.type === 'shift' && "bg-blue-500",
                                    selectedItem.type === 'overtime' && "bg-orange-500",
                                    selectedItem.type === 'holiday' && "bg-purple-500",
                                    selectedItem.type === 'payday' && "bg-emerald-500",
                                    selectedItem.type === 'liability' && "bg-rose-500",
                                    selectedItem.type === 'studio' && "bg-indigo-500",
                                    selectedItem.type === 'goal' && "bg-amber-500",
                                    selectedItem.type === 'task' && (
                                        selectedItem.is_completed
                                            ? "bg-emerald-500"
                                            : (selectedItem.profile === 'business' ? "bg-rose-500" : "bg-black")
                                    )
                                )} />
                                <h3 className="text-[12px] font-black text-black/30 uppercase tracking-widest">
                                    {selectedItem.type} Information
                                </h3>
                            </div>
                            <div className="flex gap-1 items-center">
                                {(selectedItem.type === 'task' || selectedItem.type === 'external-google') && !isEditing && (
                                    <>
                                        <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-black/5 rounded-lg text-black/40 transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setDeleteConfirmation(selectedItem)
                                            }} 
                                            className="p-1 hover:bg-rose-50 hover:text-rose-500 rounded-lg text-black/40 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-black/5 rounded-lg text-black/40 transition-colors">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
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
                                            <DatePickerInput
                                                value={editedDate}
                                                onChange={val => setEditedDate(val)}
                                            />
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
                                                try {
                                                    if (selectedItem.type === 'external-google') {
                                                        const res = await fetch('/api/calendar/google', {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ id: selectedItem.id, title: editedTitle, date: editedDate })
                                                        })
                                                        if (res.ok) {
                                                            setSelectedItem(null)
                                                            setIsEditing(false)
                                                            refresh()
                                                            setNotification({ title: 'Event Edited', message: 'Your event was updated in Google Calendar.', type: 'success' })
                                                        } else {
                                                            setNotification({ title: 'Save Failed', message: 'Could not update the Google event.', type: 'error' })
                                                        }
                                                    } else {
                                                        const realId = selectedItem.id.split('-')[0]
                                                        await editTask(realId, { title: editedTitle, due_date: editedDate })
                                                        setSelectedItem(null)
                                                        setIsEditing(false)
                                                    }
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
                                            {selectedItem.title}
                                        </div>
                                        <p className="text-[12px] text-black/40 mt-1">
                                            {selectedItem.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </p>
                                        {selectedItem.amount && (
                                            <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                                <div className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Financial Value</div>
                                                <div className="text-[24px] font-black text-emerald-700 tracking-tight">£{selectedItem.amount.toFixed(2)}</div>
                                            </div>
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
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-black/[0.02] rounded-xl border border-black/5">
                                            <p className="text-[11px] text-black/50 leading-relaxed font-medium">
                                                This is a {selectedItem.type} event. 
                                                {selectedItem.type === 'payday' || selectedItem.type === 'liability' ? " Manage in Finance module." : ""}
                                                {selectedItem.type === 'studio' ? " Manage in Studio module." : ""}
                                                {selectedItem.type === 'goal' ? " Manage in Strategic module." : ""}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Apple Link Modal */}
            {isAppleModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-black/10 rounded-3xl shadow-2xl p-7 w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Apple className="w-5 h-5 text-black" />
                                <h3 className="text-[16px] font-black text-black uppercase tracking-tight">iCloud Subscriptions</h3>
                            </div>
                            <button onClick={() => setIsAppleModalOpen(false)} className="p-1.5 hover:bg-black/5 rounded-xl text-black/40 transition-colors">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Current Calendars List */}
                        {appleCalendars.length > 0 && (
                            <div className="mb-8 space-y-2">
                                <h4 className="text-[10px] font-black text-black/20 uppercase tracking-widest pl-1 mb-2">Connected Feeds</h4>
                                {appleCalendars.map((cal) => (
                                    <div key={cal.id} className="group flex items-center justify-between p-3 bg-black/[0.02] border border-black/[0.04] rounded-2xl hover:bg-white hover:border-black/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                                            <div>
                                                <div className="text-[13px] font-bold text-black">{cal.label}</div>
                                                <div className="text-[10px] text-black/30 font-medium truncate max-w-[200px]">{cal.url}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteAppleUrl(cal.id)}
                                            className="p-2 text-black/20 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-black/20 uppercase tracking-widest pl-1">Add New Subscription</h4>
                            <form onSubmit={handleSaveAppleUrl} className="space-y-3">
                                <input
                                    type="text"
                                    value={appleLabel}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setAppleLabel(e.target.value)}
                                    placeholder="Calendar Label (e.g. Work)"
                                    className="w-full bg-black/[0.03] border border-black/5 rounded-2xl px-4 py-3.5 text-[13px] font-bold outline-none focus:border-black/20 focus:bg-white transition-all"
                                />
                                <input
                                    type="text"
                                    value={appleUrl}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setAppleUrl(e.target.value)}
                                    placeholder="webcal://pXX-caldav.icloud.com/..."
                                    className="w-full bg-black/[0.03] border border-black/5 rounded-2xl px-4 py-3.5 text-[12px] font-mono outline-none focus:border-black/20 focus:bg-white transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!appleUrl.trim() || isSavingApple}
                                    className="w-full bg-black text-white rounded-2xl py-4 text-[12px] font-black uppercase tracking-[0.2em] hover:bg-black/80 disabled:opacity-30 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-black/5"
                                >
                                    {isSavingApple ? <Zap className="w-4 h-4 animate-pulse" /> : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            Connect Feed
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-black/10 rounded-3xl shadow-2xl p-7 w-full max-w-sm animate-in zoom-in-95 duration-200 text-center">
                        <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <h3 className="text-[18px] font-black text-black tracking-tight mb-2">Delete Event?</h3>
                        <p className="text-[13px] text-black/50 font-medium mb-6 leading-relaxed">
                            Are you sure you want to delete <span className="text-black font-bold">{deleteConfirmation.title}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="flex-1 bg-black/[0.05] text-black/60 rounded-2xl py-3.5 text-[12px] font-bold uppercase tracking-widest hover:bg-black/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setDeleteConfirmation(null)
                                    setSelectedItem(null)
                                    if (deleteConfirmation.type === 'external-google') {
                                        await fetch('/api/calendar/google', {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ id: deleteConfirmation.id })
                                        })
                                        refresh()
                                        setNotification({ title: 'Deleted', message: 'Google Event successfully removed.', type: 'success' })
                                    } else {
                                        const realId = deleteConfirmation.id.split('-')[0]
                                        await deleteTask(realId)
                                        setNotification({ title: 'Deleted', message: 'Task successfully removed.', type: 'success' })
                                    }
                                }}
                                className="flex-1 bg-rose-500 text-white rounded-2xl py-3.5 text-[12px] font-bold uppercase tracking-widest hover:bg-rose-600 transition-all font-mono shadow-lg shadow-rose-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {notification && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-black/10 rounded-3xl shadow-2xl p-7 w-full max-w-sm animate-in zoom-in-95 duration-200 text-center">
                        <div className={cn(
                            "mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4",
                            notification.type === 'success' ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                        )}>
                            {notification.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                        </div>
                        <h3 className="text-[18px] font-black text-black tracking-tight mb-2">{notification.title}</h3>
                        <p className="text-[13px] text-black/50 font-medium mb-6 leading-relaxed">
                            {notification.message}
                        </p>
                        <button
                            onClick={() => setNotification(null)}
                            className="w-full bg-black text-white rounded-2xl py-3.5 text-[12px] font-bold uppercase tracking-widest hover:bg-black/80 transition-all"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function FilterToggle({ 
    icon, 
    label, 
    isActive, 
    color, 
    onClick 
}: { 
    icon: React.ReactNode, 
    label: string, 
    isActive: boolean, 
    color: string, 
    onClick: () => void 
}) {
    return (
        <button 
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClick()
            }}
            className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all text-left group",
                isActive 
                    ? "bg-white border-black/10 shadow-sm" 
                    : "bg-transparent border-transparent opacity-40 hover:opacity-100 italic"
            )}
        >
            <div className={cn(
                "w-2 h-2 rounded-full transition-transform group-hover:scale-125",
                color
            )} />
            <div className="flex flex-col">
                <span className={cn(
                    "text-[9.5px] font-black uppercase tracking-[0.05em]",
                    isActive ? "text-black" : "text-black/60"
                )}>
                    {label}
                </span>
            </div>
            <div className="ml-auto">
                {isActive ? <Eye className="w-2.5 h-2.5 text-black/20" /> : <EyeOff className="w-2.5 h-2.5 text-black/10" />}
            </div>
        </button>
    )
}
