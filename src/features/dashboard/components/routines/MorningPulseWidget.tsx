'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Target, ListTodo, Sparkles, Coffee, ArrowRight, Check, X, Zap, ExternalLink, Timer, Feather, Wallet, Briefcase, Heart, User, Clapperboard, Newspaper, Trophy, Rocket, Video, Play, Clock3, Globe, Youtube, Instagram, Twitter, Smile, Meh, Frown, Annoyed, Send, Trash2, CloudRain, Eye, EyeOff, Calendar, RefreshCw, ChevronDown, PiggyBank } from 'lucide-react'
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
import { TaskDetailModal } from '@/features/tasks/components/TaskDetailModal'
import ProjectDetailModal from '@/features/studio/components/ProjectDetailModal'
import ContentDetailModal from '@/features/studio/components/ContentDetailModal'
import PressDetailModal from '@/features/studio/components/PressDetailModal'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { useGoals as useFinanceGoals } from '@/features/finance/hooks/useGoals'
import { usePots } from '@/features/finance/hooks/usePots'

function usePersistentBlur(key: string) {
    const { settings, updateSetting } = useSystemSettings()
    const blurredIds = settings.blurred_ids || []
    const isBlurred = blurredIds.includes(key)

    const toggleBlur = async () => {
        const next = !isBlurred
        let newIds = [...blurredIds]
        if (next) {
            if (!newIds.includes(key)) newIds.push(key)
        } else {
            newIds = newIds.filter(id => id !== key)
        }
        await updateSetting('blurred_ids', newIds)
    }

    return [isBlurred, toggleBlur] as const
}

function CapBadge({ cap }: { cap: 'P' | 'B' }) {
    return (
        <span className={cn(
            "w-3 h-3 flex items-center justify-center rounded-[2px] text-[7px] font-bold border shrink-0 select-none",
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

function GoalCard({ goal, savingsData }: { goal: any; savingsData?: { name: string; current: number; target: number } | null }) {
    const [expanded, setExpanded] = useState(false)
    const [showMilestones, setShowMilestones] = useState(false)
    const milestones: any[] = goal.milestones || []
    const priority = GOAL_PRIORITY_STYLES[goal.priority] || GOAL_PRIORITY_STYLES.low
    const catConfig = GOAL_CATEGORY_CONFIG[goal.category] || GOAL_CATEGORY_CONFIG.personal
    const CatIcon = catConfig.icon
    const visibleMilestones = expanded ? milestones : milestones.slice(0, 2)
    const hasMore = milestones.length > 2
    const hasImage = !!goal.vision_image_url

    const [isBlurred, toggleBlur] = usePersistentBlur(goal.id)

    const milestoneProgress = milestones.length > 0
        ? (milestones.filter(m => m.is_completed).length / milestones.length) * 100
        : 0
    const savingsProgress = savingsData && savingsData.target > 0
        ? Math.min(100, (savingsData.current / savingsData.target) * 100)
        : 0

    return (
        <div className="bg-black text-white rounded-2xl border border-white/10 shadow-xl overflow-hidden relative group/wrapper">
            <button
                onClick={(e) => { e.stopPropagation(); toggleBlur() }}
                className={cn(
                    "absolute top-3 right-3 p-1.5 rounded-lg transition-all z-20 backdrop-blur-md",
                    isBlurred ? "bg-white/20 text-white shadow-sm ring-1 ring-white/10" : "bg-black/30 text-white/50 hover:text-white hover:bg-black/80 ring-1 ring-white/5"
                )}
            >
                {isBlurred ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <div className={cn("transition-all duration-500", isBlurred && "blur-[5px] opacity-40 select-none pointer-events-none")}>
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
                    <div className="flex-1 min-w-0 pr-10">
                        <div className="flex items-center gap-1.5 overflow-hidden mb-1.5">
                            <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap shrink-0", priority.color)}>
                                {priority.label}
                            </span>
                            <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap shrink-0", catConfig.tagColor)}>
                                <CatIcon className="w-2 h-2 shrink-0" />
                                {catConfig.label}
                            </span>
                            {goal.target_date && (
                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10 whitespace-nowrap shrink-0 flex items-center gap-1">
                                    <Calendar className="w-2 h-2" />
                                    {format(new Date(goal.target_date), 'MMM d, yyyy')}
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] font-bold text-white group-hover/wrapper:text-white transition-colors leading-tight line-clamp-2 pr-1">{goal.title}</p>
                    </div>
                </div>

                {/* Progress Indicators — always visible */}
                {(milestones.length > 0 || savingsData) && (
                    <div className="space-y-2 px-1">
                        {/* Milestone Progress */}
                        {milestones.length > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
                                    <span>{milestones.filter(m => m.is_completed).length}/{milestones.length} Milestones</span>
                                    <span>{Math.round(milestoneProgress)}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${milestoneProgress}%` }}
                                        className="h-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Savings Progress */}
                        {savingsData && savingsData.target > 0 && (
                            <div className={cn("space-y-1", milestones.length > 0 && "pt-1.5 border-t border-white/[0.06]")}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400/70">
                                        <PiggyBank className="w-2.5 h-2.5" />
                                        <span className="truncate max-w-[100px]">{savingsData.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[8px] font-black text-emerald-400/70">£{savingsData.current.toLocaleString()}</span>
                                        <span className="text-[7px] text-white/20 font-black">/</span>
                                        <span className="text-[8px] font-black text-white/20">£{savingsData.target.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/10">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${savingsProgress}%` }}
                                        className="h-full bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
                            <ChevronDown className="w-3 h-3" />
                        </div>
                    </button>
                )}

                {/* Milestones list */}
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
        </div>
    )
}



function TaskCard({ task, ix, projects, content, press, completeTask, handleDismiss, onSelect, toggleSubtask }: { task: any, ix: number, projects: any[], content: any[], press: any[], completeTask: (id: string) => void, handleDismiss: (id: string) => void, onSelect: (task: any) => void, toggleSubtask: (task: any, subIndex: number) => void }) {
    const priority = PRIORITY_MAP[task.priority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.low
    const workType = WORK_MODES.find(m => m.id === task.work_type) || WORK_MODES[0] // Default to Light
    const project = task.project_id ? projects.find((p: any) => p.id === task.project_id) : null
    const contentItem = task.content_id ? content.find((c: any) => c.id === task.content_id) : null
    const pressItem = task.press_id ? press.find((p: any) => p.id === task.press_id) : null
    
    const [showChecklist, setShowChecklist] = useState(false)
    const [isChecklistExpanded, setIsChecklistExpanded] = useState(false)
    const [showNotes, setShowNotes] = useState(false)

    const [isBlurred, toggleBlur] = usePersistentBlur(task.id)

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.05 * ix }}
            className={cn("bg-white/70 backdrop-blur-md border border-black/[0.05] p-3.5 rounded-2xl hover:shadow-md transition-all group/task relative")}
        >
            <div className="absolute top-2.5 right-8 flex items-center gap-1 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleBlur() }}
                    className={cn(
                        "p-1.5 rounded-lg transition-all",
                        isBlurred ? "bg-black/5 text-black/60 shadow-sm" : "text-black/30 hover:text-black/60 hover:bg-black/5"
                    )}
                >
                    {isBlurred ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
            </div>
            
            <button 
                onClick={(e) => {
                    e.stopPropagation()
                    handleDismiss(task.id)
                }}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-black/30 hover:text-red-500 hover:bg-red-50 transition-all z-20"
            >
                <X className="w-3 h-3" />
            </button>

            <div className={cn("flex items-center gap-3 transition-all duration-500", isBlurred && "blur-[5px] opacity-40 pointer-events-none select-none")}>
                <button 
                    onClick={(e) => {
                        e.stopPropagation()
                        completeTask(task.id)
                    }}
                    className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 group-hover/task:shadow-sm z-10",
                        task.priority === 'super' ? "border-purple-400/30 bg-purple-50/10 hover:border-purple-500" :
                        task.priority === 'high' ? "border-red-400/30 bg-red-50/10 hover:border-red-500" :
                        task.priority === 'mid' ? "border-yellow-400/30 bg-yellow-50/10 hover:border-yellow-500" :
                        "border-black/10 hover:border-black/20"
                    )}
                >
                    <Check className={cn(
                        "w-3.5 h-3.5 opacity-0 hover:opacity-100 transition-opacity",
                        task.priority === 'super' ? "text-purple-500" :
                        task.priority === 'high' ? "text-red-500" :
                        task.priority === 'mid' ? "text-yellow-600" :
                        "text-emerald-500"
                    )} />
                </button>
                
                <div className="flex-1 min-w-0 pr-10">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5 opacity-60 group-hover/task:opacity-100 transition-opacity">
                        <CapBadge cap={task.profile === 'personal' ? 'P' : 'B'} />
                        {task.impact_score > 0 && (
                            <div className="flex items-center gap-0.5 text-amber-600">
                                <Zap className="w-2.5 h-2.5" />
                                <span className="text-[9px] font-black">{task.impact_score}</span>
                            </div>
                        )}
                        <workType.icon className={cn(
                            "w-2.5 h-2.5",
                            task.work_type === 'deep' ? "text-orange-950" : "text-orange-900/40"
                        )} />
                        {task.due_date && (
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tight text-black/30">
                                <Calendar className="w-2.5 h-2.5" />
                                {format(new Date(task.due_date), 'MMM d')}
                            </div>
                        )}
                    </div>

                    <p className="text-[12px] font-bold text-black group-hover/task:text-emerald-700 transition-colors leading-tight line-clamp-2 pr-1">
                        {task.title}
                    </p>

                    {(project || contentItem || pressItem) && (
                        <div className={cn(
                            "flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.1em] shrink-0 mt-2 w-fit border",
                            project ? "bg-purple-50 text-purple-600 border-purple-100/50" : 
                            contentItem ? "bg-blue-50 text-blue-600 border-blue-100/50" : 
                            "bg-amber-50 text-amber-600 border-amber-100/50"
                        )}>
                            {project ? <Rocket className="w-2.5 h-2.5 shrink-0" /> : 
                             contentItem ? <Video className="w-2.5 h-2.5 shrink-0" /> : 
                             <Trophy className="w-2.5 h-2.5 shrink-0" />}
                            <span className="truncate max-w-[150px]">
                                {project?.title || contentItem?.title || pressItem?.title}
                            </span>
                        </div>
                    )}

                    {/* Checklist Toggle & List */}
                    {task.notes?.type === 'checklist' && task.notes.content?.length > 0 && (
                        <div className="mt-2.5 space-y-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowChecklist(!showChecklist)
                                }}
                                className="flex items-center gap-2 group/check transition-colors"
                            >
                                <span className="text-[9px] font-black uppercase tracking-widest text-black/20 group-hover/check:text-emerald-600 transition-colors">
                                    {showChecklist ? 'Hide Checklist' : 'Show Checklist'}
                                </span>
                                <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5 text-black/40">
                                    {task.notes.content.length}
                                </div>
                            </button>

                            {/* Checklist Progress Bar */}
                            <div className="space-y-1">
                                <div className="h-1 w-full bg-black/[0.04] rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(task.notes.content.filter((i: any) => i.completed).length / task.notes.content.length) * 100}%` }}
                                        className="h-full bg-emerald-500/40"
                                    />
                                </div>
                            </div>

                            {showChecklist && (
                                <div className="pl-2 space-y-1.5 border-l-2 border-black/5 animate-in fade-in slide-in-from-left-1 duration-200">
                                    {(isChecklistExpanded ? task.notes.content : task.notes.content.slice(0, 3)).map((item: any, sidx: number) => (
                                        <div 
                                            key={sidx}
                                            className="flex items-center gap-2 group/item cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleSubtask(task, sidx)
                                            }}
                                        >
                                            <div className={cn(
                                                "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                                item.completed ? "bg-emerald-500 border-emerald-500" : "border-black/10 group-hover/item:border-emerald-500"
                                            )}>
                                                {item.completed && <Check className="w-2 h-2 text-white" />}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-bold leading-tight",
                                                item.completed ? "line-through text-black/20" : "text-black/60"
                                            )}>
                                                {item.text}
                                            </span>
                                        </div>
                                    ))}
                                    {task.notes.content.length > 3 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setIsChecklistExpanded(!isChecklistExpanded)
                                            }}
                                            className="text-[8px] font-bold uppercase text-emerald-600 hover:text-emerald-700 transition-colors pl-5"
                                        >
                                            {isChecklistExpanded ? '↑ Show Less' : `+ ${task.notes.content.length - 3} more`}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes Toggle & Content (Text/Bullets) */}
                    {task.notes?.type !== 'checklist' && task.notes?.content && (
                        <div className="mt-2.5 space-y-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowNotes(!showNotes)
                                }}
                                className="flex items-center gap-2 group/notes transition-colors"
                            >
                                <span className="text-[9px] font-black uppercase tracking-widest text-black/20 group-hover/notes:text-blue-600 transition-colors">
                                    {showNotes ? 'Hide Notes' : 'Show Notes'}
                                </span>
                            </button>

                            {showNotes && (
                                <div className="pl-2 pr-4 py-1 border-l-2 border-black/5 animate-in fade-in slide-in-from-left-1 duration-200">
                                    <p className="text-[10px] text-black/50 leading-relaxed whitespace-pre-wrap font-medium">
                                        {task.notes.content}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
    const completedCount = milestones.filter(m => m.status === 'completed' || m.is_completed).length
    const progress = (completedCount / milestones.length) * 100

    return (
        <div className="space-y-2">
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-black/20">
                    <span>{completedCount}/{milestones.length} Milestones</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1 w-full bg-black/[0.04] rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-emerald-500/60"
                    />
                </div>
            </div>
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
        </div>
    )
}

// ─── Studio column card sub-components ───────────────────────────────────────
function MorningCheckIn() {
    const { logMood, reflections, saveReflection, moodLogs, loading, clearMoodsByDate } = useWellbeing()
    const [journalEntry, setJournalEntry] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    
    const today = new Date().toISOString().split('T')[0]
    const todayReflection = reflections.find(r => r.date === today)
    const todayMood = moodLogs.find(m => m.date === today)

    const yesterdayStr = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        return d.toISOString().split('T')[0]
    }, [])
    
    const missedYesterday = useMemo(() => {
        if (loading || moodLogs.length === 0) return false
        return !moodLogs.some(m => m.date === yesterdayStr)
    }, [moodLogs, yesterdayStr, loading])

    const handleMoodSelect = async (value: MoodValue) => {
        setIsSubmitting(true)
        try {
            if (missedYesterday && !todayMood) {
                await logMood(value, 'Late check-in', [], yesterdayStr)
            } else {
                await logMood(value)
            }
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 1500)
        } finally {
            setIsSubmitting(false)
        }
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
        { value: 'excellent', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
        { value: 'good', icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { value: 'neutral', icon: Meh, color: 'text-blue-400', bg: 'bg-blue-50' },
        { value: 'low', icon: CloudRain, color: 'text-orange-400', bg: 'bg-orange-50' },
        { value: 'bad', icon: Frown, color: 'text-rose-500', bg: 'bg-rose-50' },
    ]

    const activeMoodConfig = MOODS.find(m => m.value === todayMood?.value)

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Mood Selector */}
            <div className={cn(
                "border rounded-2xl p-3 flex items-center justify-between gap-2 transition-all duration-500 relative overflow-hidden group/checkin",
                missedYesterday && !todayMood 
                    ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20" 
                    : todayMood && activeMoodConfig
                        ? cn(activeMoodConfig.bg, "border-black/5 shadow-sm")
                        : "bg-white/40 border-black/[0.03]"
            )}>
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex items-center justify-center p-4 text-center"
                        >
                            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-black/60">
                                Mood Logged
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1 min-w-0 pr-2">
                    <p className={cn(
                        "text-[9px] font-black uppercase tracking-widest mb-0.5",
                        missedYesterday && !todayMood ? "text-amber-700/60" : todayMood ? "text-black/30" : "text-black/20"
                    )}>
                        {missedYesterday && !todayMood ? "Consistency Gap" : "Mood"}
                    </p>
                    <div className="flex items-center gap-2">
                        <p className={cn(
                            "text-[10px] font-bold capitalize leading-tight",
                            missedYesterday && !todayMood ? "text-amber-800" : "text-black/60"
                        )}>
                            {missedYesterday && !todayMood ? "Log Yesterday" : (todayMood?.value || 'Daily Check-in')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
                    {todayMood && !missedYesterday && (
                        <button 
                            onClick={() => clearMoodsByDate(today)}
                            className="p-2 rounded-xl text-black/20 hover:text-red-500 hover:bg-red-500/10 transition-all border border-black/[0.05] hover:border-red-500/20"
                            title="Clear Today's Entry"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Journal */}
            <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm border border-black/[0.05] rounded-2xl p-1.5 flex items-center gap-2 shadow-sm transition-all focus-within:bg-white focus-within:border-black/10 focus-within:shadow-md">
                <form onSubmit={handleJournalSubmit} className="flex-1 flex items-center gap-2 px-1.5">
                    <input
                        type="text"
                        value={journalEntry}
                        onChange={(e) => setJournalEntry(e.target.value)}
                        placeholder="Log a reflection or thought to today's journal..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[12px] font-medium text-black placeholder:text-black/30 h-9 outline-none selection:bg-emerald-100"
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
    const [isBlurred, toggleBlur] = usePersistentBlur(project.id)

    return (
        <div 
            onClick={() => onSelect(project)}
            className="bg-white/70 border border-black/[0.06] rounded-2xl overflow-hidden hover:border-black/20 hover:shadow-lg transition-all group/pc cursor-pointer relative"
        >
            <div className="absolute top-2 right-2 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleBlur() }}
                    className={cn(
                        "p-1.5 rounded-lg transition-all backdrop-blur-md",
                        isBlurred ? "bg-white/50 text-black/60 shadow-sm ring-1 ring-black/10" : "bg-white/70 text-black/40 hover:text-black/80 hover:bg-white ring-1 ring-black/5"
                    )}
                >
                    {isBlurred ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
            </div>
            <div className={cn("transition-all duration-500 h-full flex flex-col", isBlurred && "blur-[5px] opacity-40 select-none pointer-events-none")}>
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
                <div className="flex flex-wrap gap-1 mb-1.5">
                    {project.type && (
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border",
                            project.type === 'Architectural Design' && "bg-blue-50 text-blue-600 border-blue-100",
                            project.type === 'Product Design' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                            project.type === 'Technology' && "bg-cyan-50 text-cyan-600 border-cyan-100",
                            project.type === 'Media' && "bg-rose-50 text-rose-600 border-rose-100",
                            project.type === 'Fashion' && "bg-purple-50 text-purple-600 border-purple-100",
                            !['Architectural Design', 'Product Design', 'Technology', 'Media', 'Fashion'].includes(project.type as any) && "bg-black/5 text-black/40 border-black/10"
                        )}>
                            {project.type}
                        </span>
                    )}
                    {priority && <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', priority.cls)}>{priority.label}</span>}
                    {impact   && <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', impact.cls)}>{impact.label}</span>}
                    {project.target_date && (
                        <span className="flex items-center gap-1 text-[8px] font-bold text-black/30 uppercase">
                            <Calendar className="w-2.5 h-2.5" />{format(new Date(project.target_date), 'MMM d')}
                        </span>
                    )}
                </div>
                <div className="pr-10">
                    <p className="text-[10px] font-bold text-black group-hover/pc:text-emerald-700 transition-colors leading-tight line-clamp-2 pr-1">{project.title}</p>
                </div>
                {pms.length > 0 && (
                    <div className="pt-2 border-t border-black/5">
                        <MilestoneList milestones={pms} />
                    </div>
                )}
            </div>
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
    const [isBlurred, toggleBlur] = usePersistentBlur(item.id)

    return (
        <div 
            onClick={() => onSelect(item)}
            className="bg-white/70 border border-black/[0.06] rounded-2xl overflow-hidden hover:border-black/20 hover:shadow-lg transition-all group/pc cursor-pointer relative"
        >
            <div className="absolute top-2 right-2 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleBlur() }}
                    className={cn(
                        "p-1.5 rounded-lg transition-all backdrop-blur-md",
                        isBlurred ? "bg-white/50 text-black/60 shadow-sm ring-1 ring-black/10" : "bg-white/70 text-black/40 hover:text-black/80 hover:bg-white ring-1 ring-black/5"
                    )}
                >
                    {isBlurred ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
            </div>
            <div className={cn("transition-all duration-500 h-full flex flex-col relative", isBlurred && "blur-[5px] opacity-40 select-none pointer-events-none")}>
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
                <div className="flex flex-wrap gap-1 items-center mb-1.5">
                    <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', STATUS_CLS[item.status] || 'bg-black/5 text-black/40 border-black/10')}>{item.status}</span>
                    {item.category && (
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border",
                            item.category === 'Thoughts' && "bg-blue-50 text-blue-600 border-blue-100",
                            item.category === 'Concept' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                            item.category === 'Vlog' && "bg-purple-50 text-purple-600 border-purple-100",
                            item.category === 'Showcase' && "bg-rose-50 text-rose-600 border-rose-100",
                            item.category === 'Update' && "bg-amber-50 text-amber-600 border-amber-100",
                            !['Thoughts', 'Concept', 'Vlog', 'Showcase', 'Update'].includes(item.category as any) && "bg-black/5 text-black/40 border-black/10"
                        )}>
                            {item.category}
                        </span>
                    )}
                    {priority && <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', priority.cls)}>{priority.label}</span>}
                    {impact   && <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', impact.cls)}>{impact.label}</span>}
                    {(item.deadline || item.publish_date) && (
                        <span className="flex items-center gap-1 text-[8px] font-bold text-black/30 uppercase">
                            <Calendar className="w-2.5 h-2.5" />{format(new Date(item.deadline || item.publish_date), 'MMM d')}
                        </span>
                    )}
                </div>
                <div className="pr-10">
                    <p className="text-[10px] font-bold text-black group-hover/pc:text-emerald-700 transition-colors leading-tight line-clamp-2 pr-1">{item.title}</p>
                </div>
                {cms.length > 0 && (
                    <div className="pt-2 border-t border-black/5">
                        <MilestoneList milestones={cms} />
                    </div>
                )}
            </div>
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
    const [isBlurred, toggleBlur] = usePersistentBlur(item.id)

    return (
        <div 
            onClick={() => onSelect(item)}
            className="bg-white/70 border border-black/[0.06] rounded-2xl overflow-hidden hover:border-black/20 hover:shadow-lg transition-all cursor-pointer group/press relative"
        >
            <div className="absolute top-2 right-2 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleBlur() }}
                    className={cn(
                        "p-1.5 rounded-lg transition-all backdrop-blur-md",
                        isBlurred ? "bg-white/50 text-black/60 shadow-sm ring-1 ring-black/10" : "bg-white/70 text-black/40 hover:text-black/80 hover:bg-white ring-1 ring-black/5"
                    )}
                >
                    {isBlurred ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
            </div>
            <div className={cn("transition-all duration-500", isBlurred && "blur-[5px] opacity-40 select-none pointer-events-none")}>
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
                <div className="flex flex-wrap gap-1 mb-1.5">
                    <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', STATUS_CLS[item.status] || 'bg-black/5 text-black/40 border-black/10')}>{item.status}</span>
                    <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border', TYPE_CLS[item.type] || 'bg-black/5 text-black/40 border-black/10')}>{item.type}</span>
                    {item.deadline && (
                        <span className="flex items-center gap-1 text-[8px] font-bold text-black/30 uppercase">
                            <Calendar className="w-2.5 h-2.5" />{format(new Date(item.deadline), 'MMM d')}
                        </span>
                    )}
                </div>
                <div className="flex items-start gap-2.5 mb-2">
                    <div className="p-1.5 bg-amber-50 rounded-lg shrink-0 mt-0.5">
                        <Trophy className="w-3 h-3 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0 pr-10">
                        <p className="text-[10px] font-bold text-black group-hover/press:text-emerald-700 transition-colors leading-tight line-clamp-2 pr-1">{item.title}</p>
                        <p className="text-[8px] font-bold text-black/40 uppercase truncate mt-0.5">{item.organization}</p>
                    </div>
                </div>
            </div>
            </div>
        </div>
    )
}

function SkeletonCard({ h = 'h-24' }: { h?: string }) {
    return <div className={cn("bg-black/[0.03] animate-pulse rounded-2xl border border-black/[0.05]", h)} />
}

export function MorningPulseWidget({ routineMode, setRoutineMode }: { routineMode: 'morning' | 'evening', setRoutineMode: (mode: 'morning' | 'evening') => void }) {
    const { fluidTasks, isWorkDay, completeTask, loading: tasksLoading } = usePlannerEngine()
    const { goals, loading: goalsLoading } = useGoalsContext()
    const { projects, content, press, milestones, loading: studioLoading } = useStudio()
    const { goals: personalFinGoals } = useFinanceGoals('personal')
    const { goals: businessFinGoals } = useFinanceGoals('business')
    const { pots: personalPots } = usePots('personal')
    const { pots: businessPots } = usePots('business')
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
    const [taskToComplete, setTaskToComplete] = useState<any>(null)
    const [taskToDismiss, setTaskToDismiss] = useState<any>(null)
    const [isRecalibrating, setIsRecalibrating] = useState(false)
    const { settings, updateSetting } = useSystemSettings()
    
    const dismissedTaskIds = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]
        if (settings.dismissed_tasks?.date === today) {
            return new Set(settings.dismissed_tasks.ids)
        }
        return new Set<string>()
    }, [settings.dismissed_tasks])

    const handleToggleSubtask = async (task: any, subIndex: number) => {
        if (task.notes?.type !== 'checklist') return
        const content = [...(task.notes.content as any[])]
        content[subIndex] = { ...content[subIndex], completed: !content[subIndex].completed }
        await editTask(task.id, { notes: { ...task.notes, content } })
    }

    const handleDismiss = (id: string) => {
        const task = fluidTasks.find(t => t.id === id)
        if (task) setTaskToDismiss(task)
    }

    const confirmDismiss = async () => {
        if (!taskToDismiss) return
        const today = new Date().toISOString().split('T')[0]
        const nextIds = Array.from(new Set([...Array.from(dismissedTaskIds), taskToDismiss.id]))
        await updateSetting('dismissed_tasks', { date: today, ids: nextIds })
        setTaskToDismiss(null)
    }

    const handleCompleteIntent = (id: string) => {
        const task = fluidTasks.find(t => t.id === id)
        if (task) setTaskToComplete(task)
    }

    const confirmComplete = () => {
        if (!taskToComplete) return
        completeTask(taskToComplete.id)
        setTaskToComplete(null)
    }

    const sortedTasks = useMemo(() => {
        const now = new Date()
        const next7Days = new Date()
        next7Days.setDate(now.getDate() + 7)
        
        const priorityOrder: Record<string, number> = {
            super: 0,
            high: 1,
            mid: 2,
            low: 3
        }

        return [...fluidTasks]
            .filter(t => !dismissedTaskIds.has(t.id) && !t.is_completed)
            .sort((a, b) => {
                const aDate = a.due_date ? new Date(a.due_date) : null
                const bDate = b.due_date ? new Date(b.due_date) : null

                const aWithin7Days = aDate && aDate <= next7Days
                const bWithin7Days = bDate && bDate <= next7Days

                // 1. Due date within next 7 days
                if (aWithin7Days && !bWithin7Days) return -1
                if (!aWithin7Days && bWithin7Days) return 1

                // 2. Priority
                const aPriority = priorityOrder[a.priority as string] ?? 4
                const bPriority = priorityOrder[b.priority as string] ?? 4
                if (aPriority !== bPriority) return aPriority - bPriority

                // 3. Impact Score
                const aImpact = a.impact_score ?? 0
                const bImpact = b.impact_score ?? 0
                return bImpact - aImpact
            })
    }, [fluidTasks, dismissedTaskIds])

    const lightTasks = sortedTasks.filter(t => ((t as any).work_type || 'light') === 'light').slice(0, 3)
    const deepTasks = sortedTasks.filter(t => ((t as any).work_type || 'light') === 'deep').slice(0, 3)

    const activeGoals = goals.filter(g => g.status === 'active')

    // Build a savings lookup map for GoalCards
    const allFinGoals = useMemo(() => [...personalFinGoals, ...businessFinGoals], [personalFinGoals, businessFinGoals])
    const allPots = useMemo(() => [...personalPots, ...businessPots], [personalPots, businessPots])
    const savingsLookup = useMemo(() => {
        const map = new Map<string, { name: string; current: number; target: number }>()
        for (const goal of activeGoals) {
            if (!goal.linked_savings_id) continue
            if (goal.linked_savings_type === 'manual') {
                const finGoal = allFinGoals.find((g: any) => g.id === goal.linked_savings_id)
                if (finGoal && finGoal.target_amount > 0) {
                    map.set(goal.id, { name: finGoal.name, current: finGoal.current_amount ?? 0, target: finGoal.target_amount })
                }
            } else if (goal.linked_savings_type === 'monzo') {
                const pot = allPots.find((p: any) => p.id === goal.linked_savings_id)
                if (pot && pot.target_amount > 0) {
                    map.set(goal.id, { name: pot.name, current: pot.balance ?? 0, target: pot.target_amount })
                }
            }
        }
        return map
    }, [activeGoals, allFinGoals, allPots])

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
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                            <Coffee className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-[20px] font-black tracking-tight text-black italic uppercase">Daily Brief</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                        </div>
                    </div>

                    <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.05]">
                        <button 
                            onClick={() => setRoutineMode('morning')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                routineMode === 'morning' ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/60"
                            )}
                        >
                            Briefing
                        </button>
                        <button 
                            onClick={() => setRoutineMode('evening')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                routineMode === 'evening' ? "bg-black text-white shadow-lg" : "text-black/30 hover:text-black/60"
                            )}
                        >
                            Debrief
                        </button>
                    </div>
                </div>

                {/* ── Morning Check-in Row ── */}
                <MorningCheckIn />

                {/* ── Two-column body ── */}
                <div className="pt-6 border-t border-black/[0.06] grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left: Strategic Goals */}
                    <div className="space-y-3 lg:col-span-1">
                        <div className="flex items-center gap-2 pb-1">
                            <Target className="w-3.5 h-3.5 text-black/40" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40">Strategic Goals</h3>
                        </div>
                        {goalsLoading ? (
                            <div className="space-y-3">
                                <SkeletonCard h="h-[140px]" />
                                <SkeletonCard h="h-[140px]" />
                            </div>
                        ) : activeGoals.length > 0 ? (
                            activeGoals.map(goal => (
                                <GoalCard key={goal.id} goal={goal} savingsData={savingsLookup.get(goal.id) ?? null} />
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
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                    isWorkDay ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
                                )}>
                                    {isWorkDay ? 'Working' : 'Off-Day'}
                                </div>
                                <button
                                    disabled={isRecalibrating}
                                    onClick={async () => {
                                        setIsRecalibrating(true)
                                        const today = new Date().toISOString().split('T')[0]
                                        await updateSetting('dismissed_tasks', { date: today, ids: [] })
                                        // Slight delay for visual confirmation
                                        setTimeout(() => setIsRecalibrating(false), 500)
                                    }}
                                    className={cn(
                                        "p-1 px-1.5 rounded-lg bg-black/[0.03] hover:bg-black/[0.1] text-black/30 hover:text-black transition-all flex items-center gap-1 group/recal border border-black/[0.05]",
                                        isRecalibrating && "opacity-50 cursor-not-allowed"
                                    )}
                                    title="Recalibrate Tasks"
                                >
                                    <RefreshCw className={cn(
                                        "w-2.5 h-2.5 transition-transform duration-500",
                                        isRecalibrating ? "animate-spin" : "group-hover/recal:rotate-180"
                                    )} />
                                    <span className="text-[7px] font-black uppercase tracking-widest">
                                        {isRecalibrating ? 'Recalibrating...' : 'Recalibrate'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Timer className="w-3 h-3 text-orange-950" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-950/40">Deep Execution</span>
                                </div>
                                <AnimatePresence mode="popLayout">
                                    {tasksLoading || isRecalibrating ? (
                                        <div className="space-y-3">
                                            <SkeletonCard h="h-[76px]" />
                                            <SkeletonCard h="h-[76px]" />
                                        </div>
                                    ) : deepTasks.length > 0 ? (
                                        deepTasks.map((task, ix) => (
                                            <TaskCard key={task.id} task={task} ix={ix} projects={projects} content={content} press={press} completeTask={handleCompleteIntent} handleDismiss={handleDismiss} onSelect={(t) => setSelectedTaskId(t.id)} toggleSubtask={handleToggleSubtask} />
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
                                    {tasksLoading || isRecalibrating ? (
                                        <div className="space-y-3">
                                            <SkeletonCard h="h-[76px]" />
                                            <SkeletonCard h="h-[76px]" />
                                        </div>
                                    ) : lightTasks.length > 0 ? (
                                        lightTasks.map((task, ix) => (
                                            <TaskCard key={task.id} task={task} ix={ix} projects={projects} content={content} press={press} completeTask={handleCompleteIntent} handleDismiss={handleDismiss} onSelect={(t) => setSelectedTaskId(t.id)} toggleSubtask={handleToggleSubtask} />
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
                {(studioLoading || activeProjects.length > 0 || activeContent.length > 0 || activePress.length > 0) && (
                    <div className="pt-6 border-t border-black/[0.06] grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

                        {/* Projects */}
                        {(studioLoading || activeProjects.length > 0) && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-3.5 h-3.5 text-black/40" />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40 flex-1">Active Projects</h3>
                                    <Link href="/create" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                                        <ArrowRight className="w-3.5 h-3.5 group-hover/sl:translate-x-0.5 transition-transform" />
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {studioLoading ? (
                                        <>
                                            <SkeletonCard h="h-[104px]" />
                                            <SkeletonCard h="h-[104px]" />
                                        </>
                                    ) : (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        {(studioLoading || activeContent.length > 0) && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Clapperboard className="w-3.5 h-3.5 text-black/40" />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40 flex-1">Content</h3>
                                    <Link href="/create/content" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {studioLoading ? (
                                        <>
                                            <SkeletonCard h="h-[104px]" />
                                            <SkeletonCard h="h-[104px]" />
                                        </>
                                    ) : (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Press */}
                        {(studioLoading || activePress.length > 0) && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Newspaper className="w-3.5 h-3.5 text-black/40" />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40 flex-1">Press & Media</h3>
                                    <Link href="/create/press" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {studioLoading ? (
                                        <>
                                            <SkeletonCard h="h-[104px]" />
                                            <SkeletonCard h="h-[104px]" />
                                        </>
                                    ) : (
                                        <>
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
                                        </>
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

            {/* Confirmation Modals */}
            <AnimatePresence>
                {taskToComplete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[500] flex items-center justify-center p-6"
                        onClick={() => setTaskToComplete(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-black/5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                <Check className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-black text-center mb-2">Complete Task?</h3>
                            <p className="text-[13px] text-black/40 text-center mb-8 leading-relaxed">
                                Are you sure you&apos;ve finished <span className="text-black font-bold">&quot;{taskToComplete.title}&quot;</span>?
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={confirmComplete}
                                    className="w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                                >
                                    Yes, Completed
                                </button>
                                <button
                                    onClick={() => setTaskToComplete(null)}
                                    className="w-full py-4 bg-black/5 text-black/40 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl hover:bg-black/10 transition-all active:scale-[0.98]"
                                >
                                    Go Back
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {taskToDismiss && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[500] flex items-center justify-center p-6"
                        onClick={() => setTaskToDismiss(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-black/5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                <X className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-black text-center mb-2">Dismiss Task?</h3>
                            <p className="text-[13px] text-black/40 text-center mb-8 leading-relaxed">
                                Should we skip <span className="text-black font-bold">&quot;{taskToDismiss.title}&quot;</span> for today?
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={confirmDismiss}
                                    className="w-full py-4 bg-red-500 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                                >
                                    Yes, Skip for Today
                                </button>
                                <button
                                    onClick={() => setTaskToDismiss(null)}
                                    className="w-full py-4 bg-black/5 text-black/40 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl hover:bg-black/10 transition-all active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
