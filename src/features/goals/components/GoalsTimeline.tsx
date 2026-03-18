'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Target, Flag, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Goal } from '../types/goals.types'

interface GoalsTimelineProps {
    goals: Goal[]
    onGoalClick: (goal: Goal) => void
}

type StrategicStage = 'preparation' | 'execution' | 'extraction' | 'secured'

const STAGE_CONFIG: Record<StrategicStage, { label: string, desc: string, icon: any, color: string }> = {
    preparation: {
        label: 'Preparation',
        desc: 'Long-term planning & intel',
        icon: Clock,
        color: 'text-black/40 bg-black/[0.03]'
    },
    execution: {
        label: 'Execution',
        desc: 'Active tactical operations',
        icon: Target,
        color: 'text-blue-600 bg-blue-50'
    },
    extraction: {
        label: 'Extraction',
        desc: 'Critical goal window',
        icon: AlertCircle,
        color: 'text-amber-600 bg-amber-50'
    },
    secured: {
        label: 'Secured',
        desc: 'Goals achieved',
        icon: CheckCircle2,
        color: 'text-emerald-600 bg-emerald-50'
    }
}

export default function GoalsTimeline({ goals, onGoalClick }: GoalsTimelineProps) {
    const groupedGoals = useMemo(() => {
        const groups: Record<StrategicStage, Goal[]> = {
            preparation: [],
            execution: [],
            extraction: [],
            secured: []
        }

        const today = new Date()
        const criticalThreshold = new Date()
        criticalThreshold.setDate(today.getDate() + 14) // 2 weeks for extraction

        goals.forEach(goal => {
            if (goal.status === 'completed') {
                groups.secured.push(goal)
                return
            }

            const milestones = goal.milestones || []
            const completedCount = milestones.filter(m => m.is_completed).length
            const progress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0

            const targetDate = goal.target_date ? new Date(goal.target_date) : null

            if (targetDate && targetDate <= criticalThreshold) {
                groups.extraction.push(goal)
            } else if (progress > 0) {
                groups.execution.push(goal)
            } else {
                groups.preparation.push(goal)
            }
        })

        return groups
    }, [goals])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(['preparation', 'execution', 'extraction', 'secured'] as StrategicStage[]).map(stageId => {
                const config = STAGE_CONFIG[stageId]
                const stageGoals = groupedGoals[stageId]

                return (
                    <div key={stageId} className="flex flex-col gap-4">
                        {/* Stage Header */}
                        <div className="flex flex-col px-1">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className={cn("p-1.5 rounded-lg", config.color)}>
                                        <config.icon className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-[14px] font-bold text-black uppercase tracking-widest">{config.label}</h3>
                                </div>
                                <span className="text-[11px] font-bold font-mono text-black/20">
                                    {stageGoals.length}
                                </span>
                            </div>
                            <p className="text-[11px] text-black/35 font-medium ml-9">{config.desc}</p>
                        </div>

                        {/* Drop Zone / Goal List */}
                        <div className="flex flex-col gap-3 min-h-[500px] p-2 rounded-2xl bg-black/[0.02] border border-black/[0.03]">
                            {stageGoals.map(goal => {
                                const milestones = goal.milestones || []
                                const completedCount = milestones.filter(m => m.is_completed).length
                                const progress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0

                                return (
                                    <motion.button
                                        key={goal.id}
                                        layoutId={goal.id}
                                        onClick={() => onGoalClick(goal)}
                                        className="group relative flex flex-col w-full bg-white border border-black/[0.06] rounded-xl p-4 text-left hover:border-black/20 hover:shadow-xl hover:shadow-black/5 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                                                goal.category === 'finance' ? "bg-emerald-50 text-emerald-600" :
                                                    goal.category === 'career' ? "bg-blue-50 text-blue-600" :
                                                        goal.category === 'health' ? "bg-rose-50 text-rose-600" :
                                                            "bg-black/5 text-black/40"
                                            )}>
                                                {goal.category}
                                            </span>
                                            <div className="flex flex-col gap-1.5 items-end">
                                                {goal.target_date && (
                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-black/20 uppercase">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {new Date(goal.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                )}
                                                <div className={cn(
                                                    "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                                                    goal.priority === 'super' ? "bg-purple-600/10 text-purple-600 animate-pulse" :
                                                        goal.priority === 'high' ? "bg-red-500/10 text-red-600" :
                                                            goal.priority === 'mid' ? "bg-amber-500/10 text-amber-600" :
                                                                "bg-black/[0.04] text-black/30"
                                                )}>
                                                    {goal.priority || 'mid'}
                                                </div>
                                            </div>
                                        </div>

                                        <h4 className="text-[14px] font-bold text-black mb-3 group-hover:text-blue-600 transition-colors">
                                            {goal.title}
                                        </h4>

                                        {/* Progress Section */}
                                        <div className="mt-auto space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                                                <span className="text-black/35">Milestones</span>
                                                <span className="text-black/60">{completedCount}/{milestones.length}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-black/[0.03] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    className={cn(
                                                        "h-full transition-all duration-500",
                                                        stageId === 'secured' ? "bg-emerald-500" :
                                                            stageId === 'extraction' ? "bg-amber-500" :
                                                                "bg-blue-500"
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Hover Overlay Icon */}
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="w-4 h-4 text-black/20" />
                                        </div>
                                    </motion.button>
                                )
                            })}

                            {stageGoals.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <div className="w-8 h-8 rounded-full border border-dashed border-black/10 flex items-center justify-center mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-black/5" />
                                    </div>
                                    <p className="text-[10px] font-bold text-black/15 uppercase tracking-widest">Inert Stage</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
