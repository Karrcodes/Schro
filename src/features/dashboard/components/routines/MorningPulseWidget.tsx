'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sun, Target, ListTodo, Sparkles, Coffee, ArrowRight, Check, X, Zap, ExternalLink, Timer, Feather, Wallet, Briefcase, Heart, User, Clapperboard, Newspaper, Trophy, Play, Clock3, Globe, Youtube, Instagram, Twitter, Smile, Meh, Frown, Annoyed, Send } from 'lucide-react'
import { usePlannerEngine } from '@/features/tasks/hooks/usePlannerEngine'
import { useGoalsContext } from '@/features/goals/contexts/GoalsContext'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { useWellbeing } from '@/features/wellbeing/contexts/WellbeingContext'
import type { MoodValue } from '@/features/wellbeing/types'
import { PRIORITY_MAP, WORK_MODES } from '@/features/tasks/constants/tasks.constants'
import { useQueryState } from '@/hooks/useQueryState'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { TaskDetailModal } from '@/features/tasks/components/TaskDetailModal'
import ProjectDetailModal from '@/features/studio/components/ProjectDetailModal'
import ContentDetailModal from '@/features/studio/components/ContentDetailModal'
import PressDetailModal from '@/features/studio/components/PressDetailModal'

function CapBadge({ cap }: { cap: 'P' | 'B' }) {
    return (
        <span className={cn(
            "w-3.5 h-3.5 flex items-center justify-center rounded-[2px] text-[8px] font-bold border shrink-0 select-none",
            cap === 'P'
                ? "bg-blue-50 text-blue-600 border-blue-200/50"
                : "bg-emerald-50 text-emerald-600 border-emerald-200/50"
        )}>
            {cap}
        </span>
    )
}

const GOAL_PRIORITY_STYLES: Record<string, { label: string; color: string }> = {
    super:   { label: 'Super', color: 'bg-purple-600/20 text-purple-300 border border-purple-500/30' },
    high:    { label: 'High',  color: 'bg-red-500/20 text-red-300 border border-red-500/30' },
    mid:     { label: 'Mid',   color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
    low:     { label: 'Low',   color: 'bg-white/10 text-white/40 border border-white/10' },
}
const GOAL_CATEGORY_CONFIG: Record<string, { label: string; icon: any; iconColor: string; tagColor: string }> = {
    finance:  { label: 'Finance',  icon: Wallet,    iconColor: 'text-emerald-400', tagColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
    career:   { label: 'Career',   icon: Briefcase, iconColor: 'text-blue-400',    tagColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
    health:   { label: 'Health',   icon: Heart,     iconColor: 'text-rose-400',    tagColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
    personal: { label: 'Personal', icon: User,      iconColor: 'text-purple-400',  tagColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
}

function GoalCard({ goal }: { goal: any }) {
    const [expanded, setExpanded] = useState(false)
    const [showMilestones, setShowMilestones] = useState(false)
    const milestones: any[] = goal.milestones || []
    const priority = GOAL_PRIORITY_STYLES[goal.priority] || GOAL_PRIORITY_STYLES.low
    const catConfig = GOAL_CATEGORY_CONFIG[goal.category] || GOAL_CATEGORY_CONFIG.personal
    const CatIcon = catConfig.icon
    const visibleMilestones = expanded ? milestones : milestones.slice(0, 2)
    const hasMore = milestones.length > 2
    const hasImage = !!goal.vision_image_url

    return (
        <div className="bg-black text-white rounded-2xl border border-white/10 shadow-xl overflow-hidden">
            {/* Vision image banner */}
            {hasImage && (
                <div className="relative w-full h-20 overflow-hidden">
                    <img
                        src={goal.vision_image_url}
                        alt={goal.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black" />
                </div>
            )}

            <div className={cn("p-4 space-y-3", hasImage && "-mt-5 relative")}>
                {/* Header: icon + title + tags all grouped together */}
                <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-xl shrink-0 mt-0.5 bg-white/10")}>
                        <CatIcon className={cn("w-3.5 h-3.5", catConfig.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-[13px] font-black uppercase italic tracking-tight leading-tight">{goal.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", priority.color)}>
                                {priority.label}
                            </span>
                            <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1", catConfig.tagColor)}>
                                <CatIcon className="w-2 h-2" />
                                {catConfig.label}
                            </span>
                            {goal.target_date && (
                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10">
                                    {format(new Date(goal.target_date), 'MMM d, yyyy')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Milestone Toggle */}
                {milestones.length > 0 && (
                    <button
                        onClick={() => setShowMilestones(!showMilestones)}
                        className="w-full py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-between group/toggle transition-all"
                    >
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover/toggle:text-white/70 transition-colors">
                            {showMilestones ? 'Hide Milestones' : 'Show Milestones'}
                        </span>
                        <div className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-white/60 transition-transform", showMilestones ? "rotate-180" : "")}>
                            {milestones.length}
                        </div>
                    </button>
                )}

                {/* Milestones */}
                {milestones.length > 0 && showMilestones && (
                    <div className="pl-9 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <AnimatePresence>
                            {visibleMilestones.map((m: any) => (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="flex items-center gap-2"
                                >
                                    <div className={cn(
                                        "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
                                        m.is_completed
                                            ? "bg-emerald-500 border-emerald-500"
                                            : "border-white/20 bg-white/5"
                                    )}>
                                        {m.is_completed && <Check className="w-2 h-2 text-white" />}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold leading-tight",
                                        m.is_completed ? "line-through text-white/30" : "text-white/70"
                                    )}>{m.title}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {hasMore && (
                            <button
                                onClick={() => setExpanded(v => !v)}
                                className="text-[8px] font-black uppercase tracking-widest text-emerald-400/70 hover:text-emerald-400 transition-colors mt-1"
                            >
                                {expanded ? '↑ Show less' : `+ ${milestones.length - 2} more`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}



function TaskCard({ task, ix, projects, content, completeTask, handleDismiss, onSelect }: { task: any, ix: number, projects: any[], content: any[], completeTask: (id: string) => void, handleDismiss: (id: string) => void, onSelect: (task: any) => void }) {
    const priority = PRIORITY_MAP[task.priority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.low
    const workType = WORK_MODES.find(m => m.id === task.work_type) || WORK_MODES[0] // Default to Light
    const project = task.project_id ? projects.find((p: any) => p.id === task.project_id) : null
    const contentItem = task.content_id ? content.find((c: any) => c.id === task.content_id) : null

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.05 * ix }}
            className="bg-white/70 backdrop-blur-md border border-black/[0.05] p-3.5 rounded-2xl hover:border-emerald-500/30 hover:shadow-xl transition-all group/task relative"
        >
            <div className="flex items-start gap-3">
                <button 
                    onClick={(e) => {
                        e.stopPropagation()
                        completeTask(task.id)
                    }}
                    className="mt-0.5 w-5 h-5 rounded-lg border-2 border-black/10 flex items-center justify-center hover:border-emerald-500 hover:bg-emerald-50 transition-all shrink-0 group-hover/task:border-black/20 z-10"
                >
                    <Check className="w-3.5 h-3.5 text-emerald-500 opacity-0 hover:opacity-100 transition-opacity" />
                </button>
                
                <div className="flex-1 min-w-0 pr-6 cursor-pointer" onClick={() => onSelect(task)}>
                    <p className="text-[12px] font-black text-black group-hover/task:text-emerald-700 transition-colors uppercase italic leading-tight mb-2.5 truncate">
                        {task.title}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tight",
                            task.work_type === 'deep' ? "bg-orange-50 text-orange-950 border-orange-200" : "bg-orange-50/30 text-orange-900/60 border-orange-100"
                        )}>
                            <workType.icon className="w-2.5 h-2.5" />
                            {workType.label}
                        </div>

                        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border", priority.color)}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                            <span className="text-[8px] font-black uppercase tracking-tighter">
                                {priority.label}
                            </span>
                        </div>

                        <CapBadge cap={task.profile === 'personal' ? 'P' : 'B'} />

                        {task.impact_score > 0 && (
                            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 text-amber-700">
                                <Zap className="w-2.5 h-2.5" />
                                <span className="text-[9px] font-black">{task.impact_score}</span>
                            </div>
                        )}

                        {(project || contentItem) && (
                            <div className="flex items-center gap-1 text-black/20 group-hover/task:text-black/40 transition-colors">
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                <span className="text-[8px] font-bold uppercase truncate max-w-[60px]">
                                    {project?.title || contentItem?.title}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <button 
                    onClick={(e) => {
                        e.stopPropagation()
                        handleDismiss(task.id)
                    }}
                    className="absolute top-3 right-3 p-1 rounded-lg text-black/10 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/task:opacity-100 z-10"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </motion.div>
    )
}

// ─── Priority / Impact style maps ───────────────────────────────────────────
const STUDIO_PRIORITY: Record<string, { label: string; cls: string }> = {
    super: { label: 'Super', cls: 'bg-purple-50 text-purple-700 border-purple-200/60' },
    high:  { label: 'High',  cls: 'bg-red-50 text-red-700 border-red-200/60' },
    mid:   { label: 'Mid',   cls: 'bg-amber-50 text-amber-700 border-amber-200/60' },
    low:   { label: 'Low',   cls: 'bg-black/5 text-black/40 border-black/10' },
}
const STUDIO_IMPACT: Record<string, { label: string; cls: string }> = {
    super: { label: '⚡ Super', cls: 'bg-violet-50 text-violet-700 border-violet-200/60' },
    high:  { label: '⚡ High',  cls: 'bg-orange-50 text-orange-700 border-orange-200/60' },
    mid:   { label: '⚡ Mid',   cls: 'bg-yellow-50 text-yellow-700 border-yellow-200/60' },
    low:   { label: '⚡ Low',   cls: 'bg-black/5 text-black/40 border-black/10' },
}
const PLATFORM_ICON: Record<string, React.ReactNode> = {
    youtube:   <Youtube   className="w-3 h-3" />,
    instagram: <Instagram className="w-3 h-3" />,
    tiktok:    <Play      className="w-3 h-3" />,
    x:         <Twitter   className="w-3 h-3" />,
    substack:  <Globe     className="w-3 h-3" />,
    web:       <Globe     className="w-3 h-3" />,
}

// ─── Shared milestone mini-list ───────────────────────────────────────────────
function MilestoneList({ milestones }: { milestones: any[] }) {
    const [expanded, setExpanded] = useState(false)
    const visible = expanded ? milestones : milestones.slice(0, 2)
    const hasMore = milestones.length > 2
    return (
        <div className="space-y-1">
            {visible.map((m: any) => (
                <div key={m.id} className="flex items-center gap-1.5">
                    <div className={cn(
                        'w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0',
                        m.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-black/20 bg-black/[0.03]'
                    )}>
                        {m.status === 'completed' && <Check className="w-1.5 h-1.5 text-white" />}
                    </div>
                    <span className={cn(
                        'text-[9px] font-bold leading-tight line-clamp-1',
                        m.status === 'completed' ? 'line-through text-black/30' : 'text-black/50'
                    )}>{m.title}</span>
                </div>
            ))}
            {hasMore && (
                <button onClick={() => setExpanded(v => !v)}
                    className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70 hover:text-emerald-600 transition-colors">
                    {expanded ? '↑ Less' : `+ ${milestones.length - 2} more`}
                </button>
            )}
        </div>
    )
}

// ─── Studio column card sub-components ───────────────────────────────────────
function MorningCheckIn() {
    const { logMood, reflections, saveReflection, moodLogs } = useWellbeing()
    const [journalEntry, setJournalEntry] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    const today = new Date().toISOString().split('T')[0]
    const todayReflection = reflections.find(r => r.date === today)
    const todayMood = moodLogs.find(m => m.date === today)

    const handleMoodSelect = (value: MoodValue) => {
        logMood(value)
    }

    const handleJournalSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!journalEntry.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            const bullet = `- ${journalEntry.trim()}`
            const newContent = todayReflection 
                ? `${todayReflection.content}\n${bullet}`
                : bullet
            
            await saveReflection(newContent, todayReflection?.id)
            setJournalEntry('')
        } finally {
            setIsSubmitting(false)
        }
    }

    const MOODS: { value: MoodValue; icon: any; color: string; bg: string }[] = [
        { value: 'excellent', icon: Heart, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { value: 'good', icon: Smile, color: 'text-blue-500', bg: 'bg-blue-50' },
        { value: 'neutral', icon: Meh, color: 'text-gray-400', bg: 'bg-gray-50' },
        { value: 'low', icon: Frown, color: 'text-orange-400', bg: 'bg-orange-50' },
        { value: 'bad', icon: Annoyed, color: 'text-red-400', bg: 'bg-red-50' },
    ]

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Mood Selector */}
            <div className="bg-white/40 border border-black/[0.03] rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="space-y-0.5 px-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/30">Current Mood</p>
                    <p className="text-[10px] font-bold text-black/60 capitalize">{todayMood?.value || 'Check-in'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                    {MOODS.map((m) => {
                        const Icon = m.icon
                        const isActive = todayMood?.value === m.value
                        return (
                            <button
                                key={m.value}
                                onClick={() => handleMoodSelect(m.value)}
                                className={cn(
                                    "p-2 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95",
                                    isActive ? cn(m.bg, m.color, "shadow-sm ring-1 ring-black/5") : "bg-black/[0.02] text-black/20 hover:text-black/40"
                                )}
                                title={m.value}
                            >
                                <Icon className="w-4 h-4" />
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Quick Journal */}
            <div className="lg:col-span-2 bg-white/40 border border-black/[0.03] rounded-2xl p-1.5 flex items-center gap-2">
                <form onSubmit={handleJournalSubmit} className="flex-1 flex items-center gap-2 px-1.5">
                    <input
                        type="text"
                        value={journalEntry}
                        onChange={(e) => setJournalEntry(e.target.value)}
                        placeholder="Log a morning reflection or thought..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[12px] font-medium text-black placeholder:text-black/20 h-9"
                    />
                    <button
                        type="submit"
                        disabled={!journalEntry.trim() || isSubmitting}
                        className={cn(
                            "p-2 rounded-xl transition-all duration-300",
                            journalEntry.trim() 
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                : "bg-black/5 text-black/20"
                        )}
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </form>
            </div>
        </div>
    )
}

function StudioProjectCard({ project, milestones, onSelect }: { project: any; milestones: any[]; onSelect: (p: any) => void }) {
    const pms = milestones.filter(m => m.project_id === project.id)
    const priority = STUDIO_PRIORITY[project.priority]
    const impact   = STUDIO_IMPACT[project.impact]
    return (
        <div 
            onClick={() => onSelect(project)}
            className="bg-white/70 border border-black/[0.06] rounded-2xl overflow-hidden hover:border-black/20 hover:shadow-lg transition-all group/pc cursor-pointer"
        >
            {project.cover_url ? (
                <div className="h-14 w-full overflow-hidden">
                    <img src={project.cover_url} alt={project.title} className="w-full h-full object-cover group-hover/pc:scale-105 transition-transform duration-500" />
                </div>
            ) : (
                <div className="h-14 w-full bg-black/[0.03] flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-black/10" />
                </div>
            )}
            <div className="p-3 space-y-2">
                <p className="text-[10px] font-black uppercase italic tracking-tight leading-tight line-clamp-1">{project.title}</p>
                <div className="flex flex-wrap gap-1">
                    {priority && <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', priority.cls)}>{priority.label}</span>}
                    {impact   && <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', impact.cls)}>{impact.label}</span>}
                    {project.target_date && (
                        <span className="flex items-center gap-1 text-[8px] font-bold text-black/30 uppercase">
                            <Clock3 className="w-2.5 h-2.5" />{format(new Date(project.target_date), 'MMM d')}
                        </span>
                    )}
                </div>
                {pms.length > 0 && <MilestoneList milestones={pms} />}
            </div>
        </div>
    )
}

function StudioContentCard({ item, milestones, onSelect }: { item: any; milestones: any[]; onSelect: (c: any) => void }) {
    const cms = milestones.filter(m => m.content_id === item.id)
    const priority = STUDIO_PRIORITY[item.priority]
    const impact   = STUDIO_IMPACT[item.impact]
    const STATUS_CLS: Record<string, string> = {
        scripted:  'bg-blue-50 text-blue-700 border-blue-200/60',
        filmed:    'bg-violet-50 text-violet-700 border-violet-200/60',
        edited:    'bg-amber-50 text-amber-700 border-amber-200/60',
        scheduled: 'bg-orange-50 text-orange-700 border-orange-200/60',
        idea:      'bg-black/5 text-black/40 border-black/10',
    }
    return (
        <div 
            onClick={() => onSelect(item)}
            className="bg-white/70 border border-black/[0.06] rounded-2xl overflow-hidden hover:border-black/20 hover:shadow-lg transition-all group/pc cursor-pointer relative"
        >
            {/* Platform Icons - Top Left Premium Styling */}
            {item.platforms && item.platforms.length > 0 && (
                <div className="absolute top-2 left-2 flex -space-x-1.5 z-10">
                    {item.platforms.map((pl: string) => (
                        <div key={pl} className="w-5 h-5 rounded-full bg-white border border-black/[0.08] flex items-center justify-center text-black shadow-sm ring-1 ring-black/5" title={pl}>
                            <span className="text-black scale-[0.7]">{PLATFORM_ICON[pl] || <Globe className="w-3.5 h-3.5" />}</span>
                        </div>
                    ))}
                </div>
            )}

            {item.cover_url ? (
                <div className="h-14 w-full overflow-hidden">
                    <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover group-hover/pc:scale-105 transition-transform duration-500" />
                </div>
            ) : (
                <div className="h-14 w-full bg-black/[0.03] flex items-center justify-center">
                    <Play className="w-5 h-5 text-black/10" />
                </div>
            )}
            <div className="p-3 space-y-2">
                <p className="text-[10px] font-black uppercase italic tracking-tight leading-tight line-clamp-1">{item.title}</p>
                <div className="flex flex-wrap gap-1 items-center">
                    <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', STATUS_CLS[item.status] || 'bg-black/5 text-black/40 border-black/10')}>{item.status}</span>
                    {priority && <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', priority.cls)}>{priority.label}</span>}
                    {impact   && <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', impact.cls)}>{impact.label}</span>}
                    {(item.deadline || item.publish_date) && (
                        <span className="flex items-center gap-1 text-[8px] font-bold text-black/30 uppercase">
                            <Clock3 className="w-2.5 h-2.5" />{format(new Date(item.deadline || item.publish_date), 'MMM d')}
                        </span>
                    )}
                </div>
                {cms.length > 0 && <MilestoneList milestones={cms} />}
            </div>
        </div>
    )
}

function StudioPressCard({ item, onSelect }: { item: any; onSelect: (p: any) => void }) {
    const STATUS_CLS: Record<string, string> = {
        applying:  'bg-blue-50 text-blue-700 border-blue-200/60',
        submitted: 'bg-violet-50 text-violet-700 border-violet-200/60',
    }
    const TYPE_CLS: Record<string, string> = {
        competition:  'bg-red-50 text-red-700 border-red-200/60',
        grant:        'bg-green-50 text-green-700 border-green-200/60',
        award:        'bg-amber-50 text-amber-700 border-amber-200/60',
        feature:      'bg-sky-50 text-sky-700 border-sky-200/60',
        accelerator:  'bg-purple-50 text-purple-700 border-purple-200/60',
    }
    return (
        <div 
            onClick={() => onSelect(item)}
            className="bg-white/70 border border-black/[0.06] rounded-2xl overflow-hidden hover:border-black/20 hover:shadow-lg transition-all cursor-pointer group/press"
        >
            {item.cover_url ? (
                <div className="h-14 w-full overflow-hidden">
                    <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover group-hover/press:scale-105 transition-transform duration-500" />
                </div>
            ) : (
                <div className="h-14 w-full bg-black/[0.03] flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-black/10" />
                </div>
            )}
            <div className="p-3">
                <div className="flex items-start gap-2.5 mb-2">
                    <div className="p-1.5 bg-amber-50 rounded-lg shrink-0 mt-0.5">
                        <Trophy className="w-3 h-3 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase italic tracking-tight leading-tight line-clamp-1">{item.title}</p>
                        <p className="text-[8px] font-bold text-black/40 uppercase truncate mt-0.5">{item.organization}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1">
                    <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', STATUS_CLS[item.status] || 'bg-black/5 text-black/40 border-black/10')}>{item.status}</span>
                    <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', TYPE_CLS[item.type] || 'bg-black/5 text-black/40 border-black/10')}>{item.type}</span>
                    {item.deadline && (
                        <span className="flex items-center gap-1 text-[8px] font-bold text-black/30 uppercase">
                            <Clock3 className="w-2.5 h-2.5" />{format(new Date(item.deadline), 'MMM d')}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export function MorningPulseWidget() {
    const { fluidTasks, isWorkDay, completeTask, loading } = usePlannerEngine()
    const { goals } = useGoalsContext()
    const { projects, content, press, milestones } = useStudio()
    const { editTask, toggleTask } = useTasks('todo')

    // Modal states with URL persistence
    const [selectedTaskId, setSelectedTaskId] = useQueryState('taskId', '')
    const [selectedProjectId, setSelectedProjectId] = useQueryState('projectId', '')
    const [selectedContentId, setSelectedContentId] = useQueryState('contentId', '')
    const [selectedPressId, setSelectedPressId] = useQueryState('pressId', '')

    // Derived objects for modals
    const selectedTaskForModal = useMemo(() => 
        fluidTasks.find(t => t.id === selectedTaskId) || null
    , [selectedTaskId, fluidTasks])

    const selectedProjectForModal = useMemo(() => 
        (projects as any[]).find(p => p.id === selectedProjectId) || null
    , [selectedProjectId, projects])

    const selectedContentForModal = useMemo(() => 
        (content as any[]).find(c => c.id === selectedContentId) || null
    , [selectedContentId, content])

    const selectedPressForModal = useMemo(() => 
        (press as any[]).find(p => p.id === selectedPressId) || null
    , [selectedPressId, press])
    
    // Expansion states
    const [showMoreProjects, setShowMoreProjects] = useState(false)
    const [showMoreContent, setShowMoreContent] = useState(false)
    const [showMorePress, setShowMorePress] = useState(false)
    const [dismissedTaskIds, setDismissedTaskIds] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('schro_dismissed_tasks')
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
                    // Only keep dismissals for today
                    if (parsed.date === new Date().toISOString().split('T')[0]) {
                        return new Set(parsed.ids)
                    }
                } catch (e) {}
            }
        }
        return new Set()
    })

    useEffect(() => {
        const data = {
            date: new Date().toISOString().split('T')[0],
            ids: Array.from(dismissedTaskIds)
        }
        localStorage.setItem('schro_dismissed_tasks', JSON.stringify(data))
    }, [dismissedTaskIds])

    const handleDismiss = (id: string) => {
        setDismissedTaskIds(prev => new Set([...prev, id]))
    }

    const availableTasks = fluidTasks.filter(t => !dismissedTaskIds.has(t.id) && !t.is_completed)

    const lightTasks = availableTasks.filter(t => ((t as any).work_type || 'light') === 'light').slice(0, 3)
    const deepTasks = availableTasks.filter(t => ((t as any).work_type || 'light') === 'deep').slice(0, 3)

    const activeGoals = goals.filter(g => g.status === 'active')

    // Studio pipeline
    const activeProjects = (projects as any[]).filter(p => p.status === 'active' && !p.is_archived).slice(0, 3)
    const activeContent  = (content  as any[]).filter(c => !['published', 'archived'].includes(c.status) && !c.is_archived).slice(0, 3)
    const activePress    = (press    as any[]).filter(p => ['applying', 'submitted'].includes(p.status) && !p.is_archived).slice(0, 3)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50/50 border border-emerald-500/10 rounded-3xl p-6 relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <Sun className="w-32 h-32 text-emerald-600" />
            </div>

            <div className="relative z-10 space-y-6">
                {/* ── Header row ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                            <Coffee className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-[20px] font-black tracking-tight text-black italic uppercase">Daily Brief</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                        </div>
                    </div>
                </div>

                {/* ── Morning Check-in Row ── */}
                <MorningCheckIn />

                {/* ── Two-column body ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left: Strategic Goals */}
                    <div className="space-y-3 lg:col-span-1">
                        <div className="flex items-center gap-2 pb-1">
                            <Target className="w-3.5 h-3.5 text-black/40" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40">Strategic Goals</h3>
                        </div>
                        {activeGoals.length > 0 ? (
                            activeGoals.map(goal => (
                                <GoalCard key={goal.id} goal={goal} />
                            ))
                        ) : (
                            <EmptyTasks />
                        )}
                    </div>

                    {/* Right: Incoming Tasks (taking 2/3 and splitting) */}
                    <div className="space-y-3 lg:col-span-2">
                        <div className="flex items-center gap-2 pb-1">
                            <ListTodo className="w-3.5 h-3.5 text-black/40" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40 flex-1">
                                {isWorkDay ? 'Light Focus Protocols' : 'Incoming Tasks'}
                            </h3>
                            <div className={cn(
                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                isWorkDay ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
                            )}>
                                {isWorkDay ? 'Working' : 'Off-Day'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Timer className="w-3 h-3 text-orange-950" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-950/40">Deep Execution</span>
                                </div>
                                <AnimatePresence mode="popLayout">
                                    {deepTasks.length > 0 ? (
                                        deepTasks.map((task, ix) => (
                                            <TaskCard key={task.id} task={task} ix={ix} projects={projects} content={content} completeTask={completeTask} handleDismiss={handleDismiss} onSelect={(t) => setSelectedTaskId(t.id)} />
                                        ))
                                    ) : (
                                        <EmptyTasks />
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Feather className="w-3 h-3 text-orange-900/60" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-900/40">Light Maintenance</span>
                                </div>
                                <AnimatePresence mode="popLayout">
                                    {lightTasks.length > 0 ? (
                                        lightTasks.map((task, ix) => (
                                            <TaskCard key={task.id} task={task} ix={ix} projects={projects} content={content} completeTask={completeTask} handleDismiss={handleDismiss} onSelect={(t) => setSelectedTaskId(t.id)} />
                                        ))
                                    ) : (
                                        <EmptyTasks />
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Studio Intelligence Row ── */}
                {(activeProjects.length > 0 || activeContent.length > 0 || activePress.length > 0) && (
                    <div className="pt-2 border-t border-black/[0.06] grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

                        {/* Projects */}
                        {activeProjects.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-3.5 h-3.5 text-black/40" />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40 flex-1">Active Projects</h3>
                                    <Link href="/create" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                                        <ArrowRight className="w-3.5 h-3.5 group-hover/sl:translate-x-0.5 transition-transform" />
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {(showMoreProjects ? activeProjects : activeProjects.slice(0, 2)).map((p: any) => (
                                        <StudioProjectCard key={p.id} project={p} milestones={milestones as any[]} onSelect={(item) => setSelectedProjectId(item.id)} />
                                    ))}
                                    {activeProjects.length > 2 && (
                                        <button 
                                            onClick={() => setShowMoreProjects(!showMoreProjects)}
                                            className="w-full py-2 bg-black/[0.02] border border-dashed border-black/[0.06] rounded-xl text-[9px] font-black uppercase tracking-widest text-black/30 hover:bg-black/[0.04] transition-all"
                                        >
                                            {showMoreProjects ? 'Show Less' : `+ ${activeProjects.length - 2} more`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        {activeContent.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Clapperboard className="w-3.5 h-3.5 text-black/40" />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40 flex-1">Content</h3>
                                    <Link href="/create/content" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {(showMoreContent ? activeContent : activeContent.slice(0, 2)).map((c: any) => (
                                        <StudioContentCard key={c.id} item={c} milestones={milestones as any[]} onSelect={(item) => setSelectedContentId(item.id)} />
                                    ))}
                                    {activeContent.length > 2 && (
                                        <button 
                                            onClick={() => setShowMoreContent(!showMoreContent)}
                                            className="w-full py-2 bg-black/[0.02] border border-dashed border-black/[0.06] rounded-xl text-[9px] font-black uppercase tracking-widest text-black/30 hover:bg-black/[0.04] transition-all"
                                        >
                                            {showMoreContent ? 'Show Less' : `+ ${activeContent.length - 2} more`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Press */}
                        {activePress.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Newspaper className="w-3.5 h-3.5 text-black/40" />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40 flex-1">Press</h3>
                                    <Link href="/create/press" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {(showMorePress ? activePress : activePress.slice(0, 2)).map((p: any) => (
                                        <StudioPressCard key={p.id} item={p} onSelect={(item) => setSelectedPressId(item.id)} />
                                    ))}
                                    {activePress.length > 2 && (
                                        <button 
                                            onClick={() => setShowMorePress(!showMorePress)}
                                            className="w-full py-2 bg-black/[0.02] border border-dashed border-black/[0.06] rounded-xl text-[9px] font-black uppercase tracking-widest text-black/30 hover:bg-black/[0.04] transition-all"
                                        >
                                            {showMorePress ? 'Show Less' : `+ ${activePress.length - 2} more`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                )}

            </div>

            {/* Modals */}
            <TaskDetailModal
                task={selectedTaskForModal as any}
                isOpen={!!selectedTaskForModal}
                onClose={() => setSelectedTaskId('')}
                onToggleSubtask={async (taskId, index) => {
                    if (!selectedTaskForModal || !Array.isArray(selectedTaskForModal.notes?.content)) return
                    const newContent = [...selectedTaskForModal.notes.content]
                    newContent[index].completed = !newContent[index].completed
                    await editTask(taskId, { notes: { ...selectedTaskForModal.notes, content: newContent } })
                }}
                onToggleComplete={async (taskId, completed) => {
                    await toggleTask(taskId, completed)
                }}
                onEditTask={async (taskId, updates) => {
                    await editTask(taskId, updates)
                }}
                projects={projects}
                content={content}
            />

            {selectedProjectForModal && (
                <ProjectDetailModal
                    project={selectedProjectForModal}
                    isOpen={!!selectedProjectForModal}
                    onClose={() => setSelectedProjectId('')}
                />
            )}

            {selectedContentForModal && (
                <ContentDetailModal
                    item={selectedContentForModal}
                    isOpen={!!selectedContentForModal}
                    onClose={() => setSelectedContentId('')}
                />
            )}

            {selectedPressForModal && (
                <PressDetailModal
                    item={selectedPressForModal}
                    isOpen={!!selectedPressForModal}
                    onClose={() => setSelectedPressId('')}
                />
            )}
        </motion.div>
    )
}


function EmptyTasks({ colSpan }: { colSpan?: number }) {
    return (
        <div className={cn(
            "py-8 text-center border-2 border-dashed border-black/5 rounded-2xl opacity-40 flex flex-col items-center justify-center gap-2",
            colSpan === 3 ? "col-span-3" : ""
        )}>
            <Sparkles className="w-5 h-5" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] italic">System Clear</p>
        </div>
    )
}
