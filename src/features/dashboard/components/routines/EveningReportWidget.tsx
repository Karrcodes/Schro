'use client'

import React, { useState, useContext, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, CheckCircle2, XCircle, MessageSquare, Sparkles, Send, Heart, Star, TrendingUp, Check, X, Zap, ExternalLink, Timer, Feather } from 'lucide-react'
import { usePlannerEngine } from '@/features/tasks/hooks/usePlannerEngine'
import { WellbeingContext } from '@/features/wellbeing/contexts/WellbeingContext'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { PRIORITY_MAP, WORK_MODES } from '@/features/tasks/constants/tasks.constants'
import { cn } from '@/lib/utils'

function CapBadge({ cap }: { cap: 'P' | 'B' }) {
    return (
        <span className={cn(
            "w-3.5 h-3.5 flex items-center justify-center rounded-[2px] text-[8px] font-bold border shrink-0 select-none",
            cap === 'P'
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
        )}>
            {cap}
        </span>
    )
}

function TaskCard({ task, ix, projects, content, completeTask, handleDismiss }: { task: any, ix: number, projects: any[], content: any[], completeTask: (id: string) => void, handleDismiss: (id: string) => void }) {
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
            className="bg-white/5 border border-white/10 p-3.5 rounded-2xl hover:border-blue-500/30 hover:bg-white/10 transition-all group/task relative"
        >
            <div className="flex items-start gap-3">
                <button 
                    onClick={() => completeTask(task.id)}
                    className="mt-0.5 w-5 h-5 rounded-lg border-2 border-white/20 flex items-center justify-center hover:border-emerald-500 hover:bg-emerald-500/20 transition-all shrink-0 group-hover/task:border-white/40"
                >
                    <Check className="w-3.5 h-3.5 text-emerald-400 opacity-0 hover:opacity-100 transition-opacity" />
                </button>
                
                <div className="flex-1 min-w-0 pr-6">
                    <p className="text-[12px] font-black text-white group-hover/task:text-blue-200 transition-colors uppercase italic leading-tight mb-2.5 truncate">
                        {task.title}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tight",
                            task.work_type === 'deep' ? "bg-orange-500/20 text-orange-200 border-orange-500/30" : "bg-orange-900/40 text-orange-400 border-orange-900/50"
                        )}>
                            <workType.icon className="w-2.5 h-2.5" />
                            {workType.label}
                        </div>

                        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border", priority.color)}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                            <span className={cn("text-[8px] font-black uppercase tracking-tighter")}>
                                {priority.label}
                            </span>
                        </div>

                        <CapBadge cap={task.profile === 'personal' ? 'P' : 'B'} />

                        {task.impact_score > 0 && (
                            <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-300">
                                <Zap className="w-2.5 h-2.5" />
                                <span className="text-[9px] font-black">{task.impact_score}</span>
                            </div>
                        )}

                        {(project || contentItem) && (
                            <div className="flex items-center gap-1 text-white/30 group-hover/task:text-white/60 transition-colors">
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                <span className="text-[8px] font-bold uppercase truncate max-w-[60px]">
                                    {project?.title || contentItem?.title}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <button 
                    onClick={() => handleDismiss(task.id)}
                    className="absolute top-3 right-3 p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover/task:opacity-100"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </motion.div>
    )
}

export function EveningReportWidget({ routineMode, setRoutineMode }: { routineMode: 'morning' | 'evening', setRoutineMode: (mode: 'morning' | 'evening') => void }) {
    const { plannerItems, fluidTasks, isWorkDay, completeTask, loading } = usePlannerEngine()
    const wellbeing = useContext(WellbeingContext)
    const { projects, content } = useStudio()
    const [reflection, setReflection] = useState('')
    const [selectedMood, setSelectedMood] = useState<number | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const [dismissedTaskIds, setDismissedTaskIds] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('schro_dismissed_tasks')
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
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

    const completedTasks = plannerItems.filter(i => i.is_completed)
    const allPendingTasks = fluidTasks.filter(i => !i.is_completed)
    const availablePendingTasks = allPendingTasks.filter(t => !dismissedTaskIds.has(t.id))
    
    // Apply same daily routine rules for consistency
    const lightTasks = availablePendingTasks.filter(t => ((t as any).work_type || 'light') === 'light').slice(0, 3)
    const deepTasks = availablePendingTasks.filter(t => ((t as any).work_type || 'light') === 'deep').slice(0, 3)

    const completionRate = plannerItems.length > 0 ? Math.round((completedTasks.length / plannerItems.length) * 100) : 0

    const handleSubmit = async () => {
        if (!selectedMood && !reflection) return
        setIsSubmitting(true)
        try {
            if (wellbeing?.logMood) {
                // Map 1-10 to MoodValue tokens
                let token: any = 'neutral'
                if (selectedMood) {
                    if (selectedMood <= 2) token = 'bad'
                    else if (selectedMood <= 4) token = 'low'
                    else if (selectedMood <= 6) token = 'neutral'
                    else if (selectedMood <= 8) token = 'good'
                    else token = 'excellent'
                }
                
                await wellbeing.logMood(token, reflection)
                setShowSuccess(true)
                setReflection('')
                setSelectedMood(null)
                setTimeout(() => setShowSuccess(false), 3000)
            }
        } catch (e) {
            console.error('Failed to log evening report', e)
        } finally {
            setIsSubmitting(false)
        }
    }



    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black text-white rounded-3xl p-8 relative overflow-hidden group border border-white/5 shadow-2xl"
        >
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <Moon className="w-48 h-48" />
            </div>

            <div className="flex flex-col lg:flex-row gap-12 relative z-10 transition-all">
                {/* Left Column: Stats & Reflection */}
                <div className="space-y-8 flex-1">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-xl">
                                    <Moon className="w-4 h-4 text-blue-400" />
                                </div>
                                <h2 className="text-[18px] font-black tracking-tight italic uppercase">Debrief</h2>
                            </div>

                            <div className="flex bg-white/[0.05] p-1 rounded-xl border border-white/[0.05]">
                                <button 
                                    onClick={() => setRoutineMode('morning')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                        routineMode === 'morning' ? "bg-white text-black shadow-sm" : "text-white/30 hover:text-white/60"
                                    )}
                                >
                                    Briefing
                                </button>
                                <button 
                                    onClick={() => setRoutineMode('evening')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                        routineMode === 'evening' ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-black/60"
                                    )}
                                >
                                    Debrief
                                </button>
                            </div>
                        </div>
                        <p className="text-[32px] font-light leading-tight">
                            The sun sets on <span className="font-black italic uppercase text-emerald-400">Production</span>.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Efficiency</span>
                            </div>
                            <p className="text-[32px] font-black italic">{completionRate}%</p>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Stack Completion</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-blue-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</span>
                            </div>
                            <p className="text-[32px] font-black italic">
                                {completionRate >= 80 ? 'EXCEL' : completionRate >= 50 ? 'STABLE' : 'DRAG'}
                            </p>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1 italic">Neural Output</p>
                        </div>
                    </div>

                    <div className="p-5 bg-white/[0.03] rounded-24px border border-dashed border-white/10">
                        <p className="text-[12px] font-medium text-white/60 leading-relaxed italic">
                            "Success is not final, failure is not fatal: it is the courage to continue that counts. You've processed {completedTasks.length} nodes today. Rest well."
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Daily Reflection
                        </h3>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setSelectedMood(m)}
                                    className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black transition-all",
                                        selectedMood === m 
                                            ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/20" 
                                            : "bg-white/5 hover:bg-white/10 text-white/40"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <textarea
                            value={reflection}
                            onChange={e => setReflection(e.target.value)}
                            placeholder="Final thoughts for today's logs..."
                            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-[13px] font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || (!selectedMood && !reflection)}
                            className="absolute bottom-4 right-4 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                        >
                            {isSubmitting ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Store Logs
                        </button>
                    </div>

                    <AnimatePresence>
                        {showSuccess && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest justify-center"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Neural Record Updated
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Column: Pending Operations */}
                <div className="flex-1 space-y-6 lg:max-w-md">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Moon className="w-3.5 h-3.5 text-blue-400" />
                            Unresolved Operations
                        </h3>
                        {allPendingTasks.length > 0 && (
                            <div className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase tracking-widest">
                                {allPendingTasks.length} Pending
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {isWorkDay ? (
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {lightTasks.length > 0 ? (
                                        lightTasks.map((task, ix) => (
                                            <TaskCard key={task.id} task={task} ix={ix} projects={projects} content={content} completeTask={completeTask} handleDismiss={handleDismiss} />
                                        ))
                                    ) : (
                                        <EmptyTasks />
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <Timer className="w-3 h-3 text-orange-300/50" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-200/40">Deep Execution</span>
                                    </div>
                                    <AnimatePresence mode="popLayout">
                                        {deepTasks.length > 0 ? (
                                            deepTasks.map((task, ix) => (
                                                <TaskCard key={task.id} task={task} ix={ix} projects={projects} content={content} completeTask={completeTask} handleDismiss={handleDismiss} />
                                            ))
                                        ) : (
                                            <EmptyTasks />
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <Feather className="w-3 h-3 text-white/30" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">Light Maintenance</span>
                                    </div>
                                    <AnimatePresence mode="popLayout">
                                        {lightTasks.length > 0 ? (
                                            lightTasks.map((task, ix) => (
                                                <TaskCard key={task.id} task={task} ix={ix} projects={projects} content={content} completeTask={completeTask} handleDismiss={handleDismiss} />
                                            ))
                                        ) : (
                                            <EmptyTasks />
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function EmptyTasks() {
    return (
        <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 opacity-50">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] italic text-white/50">All Clear</p>
        </div>
    )
}
