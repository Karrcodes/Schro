'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, CheckSquare, Clipboard, Loader2, Sparkles, ListChecks, Calendar, Info, Clock, Heart, Briefcase, User, Beaker, Factory, Tv, Video, TrendingUp, Building2, User2, Lock, PenLine, Youtube, Instagram, Music2, Twitter, Utensils, Database, ChefHat, Smile, Meh, Frown, Sun, CloudRain, Dumbbell, Apple, Code, Map, MessageCircle, MessageSquare, ListTodo } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { usePathname, useRouter } from 'next/navigation'
import { useWellbeing } from '@/features/wellbeing/contexts/WellbeingContext'
import { MoodValue } from '@/features/wellbeing/types'

type ActionType = 'task' | 'clipboard' | 'mood' | 'note' | 'content' | 'meal' | 'gym' | null

const PERSONAL_STRATEGIC = [
    { id: 'finance', label: 'Finance', icon: Heart, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { id: 'career', label: 'Career', icon: Briefcase, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { id: 'health', label: 'Health', icon: Heart, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
    { id: 'personal', label: 'Personal', icon: User, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
] as const

const BUSINESS_STRATEGIC = [
    { id: 'rnd', label: 'R&D', icon: Beaker, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
    { id: 'production', label: 'Production', icon: Factory, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
    { id: 'media', label: 'Media', icon: Tv, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
    { id: 'growth', label: 'Growth', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
] as const

const PRIORITY_OPTS = [
    { id: 'super', label: 'Super', color: 'bg-purple-600' },
    { id: 'high', label: 'High', color: 'bg-orange-500' },
    { id: 'mid', label: 'Mid', color: 'bg-yellow-500' },
    { id: 'low', label: 'Low', color: 'bg-zinc-500' },
] as const

const MOODS: { value: MoodValue; label: string; icon: any; color: string; bg: string }[] = [
    { value: 'excellent', label: 'Excellent', icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { value: 'good', label: 'Good', icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { value: 'neutral', label: 'Neutral', icon: Meh, color: 'text-blue-500', bg: 'bg-blue-50' },
    { value: 'low', label: 'Low', icon: CloudRain, color: 'text-amber-500', bg: 'bg-amber-50' },
    { value: 'bad', label: 'Bad', icon: Frown, color: 'text-rose-500', bg: 'bg-rose-50' },
]

const ACTIVITIES = [
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'workout', label: 'Workout', icon: Dumbbell },
    { id: 'macros', label: 'Macros', icon: Apple },
    { id: 'project', label: 'Project', icon: Code },
    { id: 'walk', label: 'Walk', icon: Map },
    { id: 'conversation', label: 'Talk', icon: MessageCircle },
]

export function GlobalQuickAction() {
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [activeAction, setActiveAction] = useState<ActionType>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [showTaskExtras, setShowTaskExtras] = useState(false)
    const { logMood } = useWellbeing()
    const router = useRouter()

    const [form, setForm] = useState({
        taskTitle: '',
        taskProfile: 'personal' as 'personal' | 'business',
        taskCategory: 'todo' as 'todo' | 'grocery' | 'reminder',
        taskPriority: 'mid' as 'super' | 'high' | 'mid' | 'low',
        strategicCategory: 'personal' as string,
        dueDate: '',
        dueDateMode: 'none' as 'none' | 'on' | 'before' | 'range',
        endDate: '',
        taskDuration: '30',
        taskImpact: '5',
        clipboardText: '',
        networkName: '',
        networkUrl: '',
        networkNotes: '',
        networkStatus: 'interested' as any,
        noteTitle: '',
        noteBody: '',
        noteMode: 'note' as 'note' | 'article',
        contentTitle: '',
        contentStatus: 'idea' as any,
        contentCategory: 'Other' as any,
        contentPlatform: 'web' as any,
        moodValue: null as MoodValue | null,
        moodActivities: [] as string[],
        moodNote: ''
    })

    useEffect(() => { setMounted(true) }, [])

    const resetForm = () => {
        setForm({
            taskTitle: '', taskProfile: 'personal', taskCategory: 'todo', taskPriority: 'mid',
            strategicCategory: 'personal', dueDate: '', dueDateMode: 'none', endDate: '',
            taskDuration: '30', taskImpact: '5', clipboardText: '', networkName: '',
            networkUrl: '', networkNotes: '', networkStatus: 'interested', noteTitle: '',
            noteBody: '', noteMode: 'note', contentTitle: '', contentStatus: 'idea',
            contentCategory: 'Other', contentPlatform: 'web',
            moodValue: null, moodActivities: [], moodNote: ''
        })
        setShowTaskExtras(false)
        setSuccess(false)
        setLoading(false)
    }

    const toggleMenu = () => {
        if (activeAction) { setActiveAction(null); resetForm() }
        else setIsOpen(prev => !prev)
    }

    const handleSubmit = async () => {
        if (loading || success) return
        setLoading(true)
        try {
            if (activeAction === 'task') {
                if (!form.taskTitle.trim()) throw new Error('Task title required')
                const { error } = await supabase.from('fin_tasks').insert({
                    title: form.taskTitle, category: form.taskCategory, priority: form.taskPriority,
                    strategic_category: form.strategicCategory,
                    due_date: form.dueDateMode !== 'none' ? form.dueDate || null : null,
                    due_date_mode: form.dueDateMode !== 'none' ? form.dueDateMode : null,
                    end_date: form.dueDateMode === 'range' ? form.endDate || null : null,
                    estimated_duration: parseInt(form.taskDuration), impact_score: parseInt(form.taskImpact),
                    profile: form.taskProfile, is_completed: false, position: Date.now()
                })
                if (error) throw error
            } else if (activeAction === 'clipboard') {
                if (!form.clipboardText.trim()) throw new Error('Content required')
                const { error } = await supabase.from('sys_clipboard').insert({ content: form.clipboardText.trim(), profile: 'personal' })
                if (error) throw error
            } else if (activeAction === 'note') {
                if (!form.noteTitle.trim()) throw new Error('Title required')
                const { error } = await supabase.from('studio_drafts').insert({
                    title: form.noteTitle.trim(), body: form.noteBody.trim() || '',
                    status: form.noteMode === 'article' ? 'completed' : 'draft',
                    is_archived: false, last_snapshot_at: new Date().toISOString(), node_references: []
                })
                if (error) throw error
            } else if (activeAction === 'mood') {
                if (!form.moodValue) throw new Error('Mood required')
                await logMood(form.moodValue, form.moodNote, form.moodActivities)
            }
            setSuccess(true)
            setTimeout(() => { setActiveAction(null); setIsOpen(false); resetForm() }, 1200)
        } catch (err) {
            console.error(err)
            alert('Failed to save')
        } finally {
            setLoading(false)
        }
    }

    const actions = useMemo(() => [
        { id: 'gym', label: 'Workout', icon: TrendingUp, color: 'bg-rose-500', glow: 'shadow-rose-500/40', locked: false },
        { id: 'meal', label: 'Meal', icon: Utensils, color: 'bg-emerald-500', glow: 'shadow-emerald-500/40', locked: false },
        { id: 'content', label: 'Content', icon: Video, color: 'bg-red-500', glow: 'shadow-red-500/40', locked: false },
        { id: 'note', label: 'Canvas', icon: PenLine, color: 'bg-indigo-500', glow: 'shadow-indigo-500/40', locked: false },
        { id: 'mood', label: 'Mood', icon: Heart, color: 'bg-rose-400', glow: 'shadow-rose-400/40', locked: false },
        { id: 'clipboard', label: 'Vault', icon: Clipboard, color: 'bg-amber-500', glow: 'shadow-amber-500/40', locked: false },
        { id: 'task', label: 'Task', icon: ListTodo, color: 'bg-violet-600', glow: 'shadow-violet-600/40', locked: false },
    ], [])

    if (!mounted || pathname === '/intelligence' || pathname === '/home' || pathname === '/' || pathname.includes('/session')) return null

    const inputHeight = 'h-[48px]'
    const inputBase = cn(inputHeight, 'w-full bg-black/[0.03] border border-black/5 rounded-2xl px-4 text-[13px] font-bold outline-none transition-all flex items-center box-border focus:ring-4 focus:ring-black/5 focus:border-black/10')

    return (
        <div
            className="fixed bottom-6 right-6 md:right-8 z-[310] flex flex-col items-end pointer-events-none"
            style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => { setIsOpen(false); setActiveAction(null); resetForm() }}
                        className="fixed inset-0 bg-black/10 backdrop-blur-[4px] z-10 pointer-events-auto"
                    />
                )}
            </AnimatePresence>

            {/* Action detail popup */}
            <AnimatePresence>
                {activeAction && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-6 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 24 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                            className="bg-white/95 backdrop-blur-xl rounded-[32px] shadow-[0_32px_128px_-32px_rgba(0,0,0,0.4)] border border-black/5 overflow-hidden flex flex-col w-full max-w-[400px] pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between bg-white/40">
                                <div className="flex items-center gap-2">
                                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg', actions.find(a => a.id === activeAction)?.color)}>
                                        {actions.find(a => a.id === activeAction)?.icon && React.createElement(actions.find(a => a.id === activeAction)!.icon, { className: 'w-4 h-4' })}
                                    </div>
                                    <h3 className="text-[15px] font-black text-black uppercase tracking-tighter">
                                        Quick {activeAction}
                                    </h3>
                                </div>
                                <button onClick={() => { setActiveAction(null); resetForm() }} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-black/40 hover:text-black transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">

                                {/* TASK FORM */}
                                {activeAction === 'task' && (
                                    <>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Task Title</label>
                                                <div className="flex gap-1 bg-black/[0.04] p-0.5 rounded-lg">
                                                    {(['personal', 'business'] as const).map(p => (
                                                        <button key={p} type="button"
                                                            onClick={() => setForm({ ...form, taskProfile: p, strategicCategory: p === 'personal' ? 'personal' : 'rnd' })}
                                                            className={cn('px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1', form.taskProfile === p ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/50')}
                                                        >
                                                            {p === 'personal' ? <User2 className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <input
                                                autoFocus value={form.taskTitle}
                                                onFocus={() => setShowTaskExtras(true)}
                                                onChange={e => { setForm({ ...form, taskTitle: e.target.value }); if (!showTaskExtras) setShowTaskExtras(true) }}
                                                placeholder="Action item details..."
                                                className={cn(inputBase, 'text-[16px] font-black placeholder:text-black/10 py-6 h-[56px] w-full')}
                                            />
                                        </div>
                                        <AnimatePresence>
                                            {showTaskExtras && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Operation Type</label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(['todo', 'grocery', 'reminder'] as const).map(cat => (
                                                                <button key={cat} type="button" onClick={() => setForm({ ...form, taskCategory: cat })}
                                                                    className={cn('py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border', form.taskCategory === cat ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.02]' : 'bg-black/[0.02] text-black/40 border-black/5 hover:bg-black/[0.05]')}
                                                                >{cat}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Criticality</label>
                                                            <div className="flex gap-1.5 items-center flex-wrap py-1">
                                                                {PRIORITY_OPTS.map(p => (
                                                                    <button key={p.id} type="button" onClick={() => setForm({ ...form, taskPriority: p.id as any })}
                                                                        className={cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all border shrink-0', form.taskPriority === p.id ? cn(p.color, 'text-white border-transparent shadow-md scale-105') : 'bg-black/[0.03] text-black/40 border-black/5 hover:bg-black/[0.06]')}
                                                                    >{p.label}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 flex-1 min-w-0">
                                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Timeline</label>
                                                            <div className="flex flex-wrap gap-1 mb-2">
                                                                {(['none', 'on', 'before', 'range'] as const).map(mode => (
                                                                    <button key={mode} type="button" onClick={() => setForm({ ...form, dueDateMode: mode })}
                                                                        className={cn('px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-tighter border transition-all', form.dueDateMode === mode ? 'bg-black text-white border-black' : 'bg-black/[0.02] text-black/40 border-black/5')}
                                                                    >{mode}</button>
                                                                ))}
                                                            </div>
                                                            {form.dueDateMode !== 'none' && (
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        {form.dueDateMode === 'range' && <span className="text-[9px] font-black text-black/20 uppercase w-8">Start</span>}
                                                                        <div className={cn(inputBase, 'relative flex-1 h-[42px] py-0')}>
                                                                            <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-transparent border-none outline-none py-2 text-[12px] font-bold" />
                                                                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/20 pointer-events-none" />
                                                                        </div>
                                                                    </div>
                                                                    {form.dueDateMode === 'range' && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-black text-black/20 uppercase w-8">End</span>
                                                                            <div className={cn(inputBase, 'relative flex-1 h-[42px] py-0')}>
                                                                                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full bg-transparent border-none outline-none py-2 text-[12px] font-bold" />
                                                                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/20 pointer-events-none" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Duration</label>
                                                            <div className="relative">
                                                                <select value={form.taskDuration} onChange={e => setForm({ ...form, taskDuration: e.target.value })} className={cn(inputBase, 'appearance-none cursor-pointer')}>
                                                                    {Array.from({ length: 16 }, (_, i) => (i + 1) * 15).map(mins => (
                                                                        <option key={mins} value={mins}>{mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}` : `${mins}m`}</option>
                                                                    ))}
                                                                </select>
                                                                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/20 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Impact ({form.taskImpact}/10)</label>
                                                            <div className="flex items-center gap-3 bg-black/[0.03] border border-black/5 rounded-2xl px-4 py-2 h-[48px]">
                                                                <input type="range" min="1" max="10" value={form.taskImpact} onChange={e => setForm({ ...form, taskImpact: e.target.value })} className="flex-1 accent-indigo-500 h-1 bg-black/10 rounded-lg appearance-none cursor-pointer" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Strategic Alignment</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {(form.taskProfile === 'personal' ? PERSONAL_STRATEGIC : BUSINESS_STRATEGIC).map(strat => (
                                                                <button key={strat.id} type="button" onClick={() => setForm({ ...form, strategicCategory: strat.id as any })}
                                                                    className={cn('px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-2', form.strategicCategory === strat.id ? strat.color : 'bg-black/[0.02] border-black/5 text-black/40 hover:bg-black/[0.04]')}
                                                                >
                                                                    <strat.icon className={cn('w-3.5 h-3.5', form.strategicCategory === strat.id ? strat.color.split(' ')[0] : 'text-black/10')} />
                                                                    {strat.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}

                                {/* CLIPBOARD FORM */}
                                {activeAction === 'clipboard' && (
                                    <div className="space-y-4">
                                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3">
                                            <Info className="w-5 h-5 text-amber-500 shrink-0" />
                                            <p className="text-[11px] font-medium text-amber-900/60 leading-relaxed">Vault assets are saved to your global clipboard for cross-device retrieval.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Asset Transfer</label>
                                            <textarea autoFocus value={form.clipboardText} onChange={e => setForm({ ...form, clipboardText: e.target.value })} placeholder="Secure message or link..." className="w-full h-40 bg-black/[0.03] border border-black/5 rounded-2xl px-4 py-4 text-[14px] font-bold outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/20 transition-all resize-none no-scrollbar" />
                                        </div>
                                    </div>
                                )}

                                { activeAction === 'mood' && (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Current State</label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {MOODS.map((m) => (
                                                    <button
                                                        key={m.value}
                                                        type="button"
                                                        onClick={() => setForm({ ...form, moodValue: m.value })}
                                                        className={cn(
                                                            "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border",
                                                            form.moodValue === m.value
                                                                ? "bg-black text-white border-black"
                                                                : "bg-black/[0.02] border-transparent hover:border-black/10"
                                                        )}
                                                    >
                                                        <m.icon className={cn("w-5 h-5", form.moodValue === m.value ? "text-white" : m.color)} />
                                                        <span className="text-[8px] font-black uppercase tracking-wider">{m.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {form.moodValue && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="space-y-6 overflow-hidden"
                                                >
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Protocol Activities</label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {ACTIVITIES.map(activity => (
                                                                <button
                                                                    key={activity.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = form.moodActivities
                                                                        const next = current.includes(activity.id) 
                                                                            ? current.filter(a => a !== activity.id) 
                                                                            : [...current, activity.id]
                                                                        setForm({ ...form, moodActivities: next })
                                                                    }}
                                                                    className={cn(
                                                                        "flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all",
                                                                        form.moodActivities.includes(activity.id)
                                                                            ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm"
                                                                            : "bg-black/[0.02] border-transparent text-black/40 hover:border-black/10"
                                                                    )}
                                                                >
                                                                    <activity.icon className="w-4 h-4" />
                                                                    <span className="text-[9px] font-black uppercase tracking-wider">{activity.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Emotional Notes</label>
                                                        <textarea 
                                                            value={form.moodNote} 
                                                            onChange={e => setForm({ ...form, moodNote: e.target.value })} 
                                                            placeholder="Loose thoughts or context..." 
                                                            className="w-full h-24 bg-black/[0.03] border border-black/5 rounded-2xl px-4 py-3 text-[13px] font-medium outline-none focus:ring-4 focus:ring-rose-400/10 focus:border-rose-400/20 transition-all resize-none no-scrollbar" 
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* NOTE FORM */}
                                {activeAction === 'note' && (
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Asset Mode</label>
                                            <div className="flex gap-1 bg-black/[0.04] p-0.5 rounded-lg">
                                                {(['note', 'article'] as const).map(m => (
                                                    <button key={m} type="button" onClick={() => setForm({ ...form, noteMode: m })}
                                                        className={cn('px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all', form.noteMode === m ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/50')}
                                                    >{m}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Title</label>
                                            <input autoFocus value={form.noteTitle} onChange={e => setForm({ ...form, noteTitle: e.target.value })} placeholder="Focus of this asset..." className={cn(inputBase, 'text-[15px] font-black')} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Body</label>
                                            <textarea value={form.noteBody} onChange={e => setForm({ ...form, noteBody: e.target.value })} placeholder="Loose thoughts or outline..." className="w-full h-40 bg-black/[0.03] border border-black/5 rounded-2xl px-4 py-4 text-[14px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/20 transition-all resize-none no-scrollbar" />
                                        </div>
                                    </div>
                                )}

                                {/* CONTENT FORM */}
                                {activeAction === 'content' && (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Category</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['Vlog', 'Thoughts', 'Showcase', 'Concept', 'Update', 'Other'].map(cat => (
                                                    <button key={cat} type="button" onClick={() => setForm({ ...form, contentCategory: cat as any })}
                                                        className={cn('py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border', form.contentCategory === cat ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-black/[0.03] text-black/40 border-black/5 hover:bg-black/[0.06]')}
                                                    >{cat}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Title</label>
                                            <input autoFocus value={form.contentTitle} onChange={e => setForm({ ...form, contentTitle: e.target.value })} placeholder="Heading..." className={cn(inputBase, 'text-[15px] font-black')} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Primary Platform</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {([
                                                    { id: 'youtube', Icon: Youtube },
                                                    { id: 'instagram', Icon: Instagram },
                                                    { id: 'tiktok', Icon: Music2 },
                                                    { id: 'x', Icon: Twitter },
                                                ] as const).map(({ id, Icon }) => (
                                                    <button key={id} type="button" onClick={() => setForm({ ...form, contentPlatform: id as any })}
                                                        className={cn('py-3 rounded-xl flex items-center justify-center transition-all border', form.contentPlatform === id ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-black/[0.03] text-black/30 border-black/5 hover:bg-black/[0.06] hover:text-black/50')}
                                                    >
                                                        <Icon className="w-4 h-4" strokeWidth={2} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* GYM / WORKOUT FORM */}
                                {activeAction === 'gym' && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-black/30 uppercase tracking-widest text-center pb-2">Choose a Routine</p>
                                        {[
                                            { id: 'push', label: 'Push Day', sublabel: 'Chest, Shoulders & Triceps', icon: TrendingUp, color: 'bg-rose-500 text-white', glow: 'shadow-rose-500/20', param: 'push' },
                                            { id: 'pull', label: 'Pull Day', sublabel: 'Back & Biceps', icon: TrendingUp, color: 'bg-blue-500 text-white', glow: 'shadow-blue-500/20', param: 'pull' },
                                            { id: 'legs', label: 'Leg Day', sublabel: 'Quads, Hamstrings & Calves', icon: TrendingUp, color: 'bg-emerald-500 text-white', glow: 'shadow-emerald-500/20', param: 'legs' },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    setActiveAction(null)
                                                    setIsOpen(false)
                                                    router.push(`/health/fitness?open=workout&routine=${opt.param}`)
                                                }}
                                                className="w-full flex items-center gap-4 p-4 rounded-[20px] border border-black/5 bg-white hover:shadow-md transition-all text-left group"
                                            >
                                                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg", opt.color, opt.glow)}>
                                                    <opt.icon className="w-5 h-5" strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <div className="text-[12px] font-black uppercase tracking-tight text-black">{opt.label}</div>
                                                    <div className="text-[10px] font-bold text-black/30 mt-0.5">{opt.sublabel}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeAction === 'meal' && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-black/30 uppercase tracking-widest text-center pb-2">Choose an Action</p>
                                        {[
                                            { id: 'quicklog', label: 'Quick Log', sublabel: 'Log a new meal manually or with AI', icon: Plus, color: 'bg-emerald-500 text-white', glow: 'shadow-emerald-500/20' },
                                            { id: 'library', label: 'Log from Library', sublabel: 'Pick a saved meal or combo', icon: Database, color: 'bg-blue-500 text-white', glow: 'shadow-blue-500/20' },
                                            { id: 'fridge', label: 'Consume from Fridge', sublabel: 'Log a prepped meal from inventory', icon: ChefHat, color: 'bg-amber-500 text-white', glow: 'shadow-amber-500/20' },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    setActiveAction(null)
                                                    setIsOpen(false)
                                                    router.push(`/health/nutrition?open=${opt.id}`)
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-4 p-4 rounded-[20px] border border-black/5 bg-white hover:shadow-md transition-all text-left group"
                                                )}
                                            >
                                                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg", opt.color, opt.glow)}>
                                                    <opt.icon className="w-5 h-5" strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <div className="text-[12px] font-black uppercase tracking-tight text-black">{opt.label}</div>
                                                    <div className="text-[10px] font-bold text-black/30 mt-0.5">{opt.sublabel}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* SUBMIT */}
                                {activeAction !== 'meal' && activeAction !== 'gym' && (
                                    <div className="pt-2">
                                        <button onClick={handleSubmit} disabled={loading || success}
                                            className={cn('w-full py-5 rounded-2xl text-white font-black text-[14px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 overflow-hidden relative group',
                                                success ? 'bg-emerald-500' : actions.find(a => a.id === activeAction)?.color,
                                                (loading || success) && 'opacity-80 scale-[0.98]'
                                            )}
                                        >
                                            <span className="relative z-10 flex items-center gap-2">
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" />
                                                    : success ? <><ListChecks className="w-5 h-5" /> Saved</>
                                                        : <><Plus className="w-4 h-4" /> Finalize</>}
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Vertical stack + toggle button */}
            <div className="flex flex-col items-end gap-3 pointer-events-none relative z-20">
                <AnimatePresence>
                    {isOpen && !activeAction && (
                        <motion.div
                            className="flex flex-col-reverse gap-2.5 items-end"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                        >
                            {actions.map((action, i) => (
                                <motion.div
                                    key={action.id}
                                    className="flex items-center gap-3"
                                    variants={{
                                        hidden: { opacity: 0, y: 10, scale: 0.9 },
                                        visible: {
                                            opacity: 1, y: 0, scale: 1,
                                            transition: { type: 'spring', damping: 22, stiffness: 300, delay: i * 0.04 }
                                        }
                                    }}
                                >
                                    <span className="px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl whitespace-nowrap pointer-events-none select-none">
                                        {action.label}
                                    </span>
                                    <motion.button
                                        whileHover={{ scale: action.locked ? 1 : 1.08 }}
                                        whileTap={{ scale: action.locked ? 1 : 0.92 }}
                                        onClick={() => !action.locked && setActiveAction(action.id as ActionType)}
                                        className={cn(
                                            'w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl pointer-events-auto relative flex-shrink-0',
                                            action.color, action.glow,
                                            action.locked && 'opacity-60 cursor-not-allowed'
                                        )}
                                    >
                                        {action.locked && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center shadow border border-white/20">
                                                <Lock className="w-2 h-2 text-white" />
                                            </div>
                                        )}
                                        <action.icon className="w-5 h-5" strokeWidth={2.5} />
                                    </motion.button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main toggle */}
                <motion.button
                    onClick={toggleMenu}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                        'w-14 h-14 rounded-[20px] shadow-2xl flex items-center justify-center z-30 relative overflow-hidden pointer-events-auto flex-shrink-0 transition-colors',
                        isOpen ? 'bg-white text-black ring-1 ring-black/10' : 'bg-black text-white'
                    )}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {isOpen ? (
                            <motion.div key="close" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.15 }}>
                                <X className="w-6 h-6" strokeWidth={2.5} />
                            </motion.div>
                        ) : (
                            <motion.div key="open" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.15 }}>
                                <Plus className="w-6 h-6" strokeWidth={2.5} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {!isOpen && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-50" />}
                </motion.button>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                input[type="date"]::-webkit-calendar-picker-indicator {
                    opacity: 0; position: absolute; right: 0; width: 100%; height: 100%; cursor: pointer;
                }
            `}</style>
        </div>
    )
}
