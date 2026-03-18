'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Target, PiggyBank } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGoals as useFinanceGoals } from '@/features/finance/hooks/useGoals'
import { usePots } from '@/features/finance/hooks/usePots'
import type { Goal } from '../types/goals.types'

interface GoalsVisionBoardProps {
    goals: Goal[]
    onGoalClick: (goal: Goal) => void
}

export default function GoalsVisionBoard({ goals, onGoalClick }: GoalsVisionBoardProps) {
    const { goals: financeGoals } = useFinanceGoals()
    const { pots } = usePots()
    const visionGoals = goals.filter(g => g.vision_image_url)

    if (visionGoals.length === 0) {
        return (
            <div className="h-[400px] rounded-3xl border-2 border-dashed border-black/[0.05] flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="p-4 rounded-full bg-black/5">
                    <Target className="w-8 h-8 text-black/20" />
                </div>
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-black/40">Visualizer Empty</h3>
                    <p className="text-[12px] text-black/25 mt-1 max-w-[240px]">Attach vision images to your goals to populate the board.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {visionGoals.map((goal, idx) => (
                <ViewCard 
                    key={goal.id} 
                    goal={goal} 
                    index={idx} 
                    financeGoals={financeGoals}
                    pots={pots}
                    onClick={() => onGoalClick(goal)} 
                />
            ))}
        </div>
    )
}

function ViewCard({ goal, index, financeGoals, pots, onClick }: { 
    goal: Goal, 
    index: number, 
    financeGoals: any[],
    pots: any[],
    onClick: () => void 
}) {
    const totalMilestones = goal.milestones?.length || 0
    const completedMilestones = goal.milestones?.filter(m => m.is_completed).length || 0
    const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={onClick}
            className="break-inside-avoid relative group rounded-2xl overflow-hidden cursor-pointer shadow-xl shadow-black/10 border border-white/10"
        >
            <img
                src={goal.vision_image_url}
                alt={goal.title}
                className="w-full h-auto object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

            <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="space-y-3 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-white border border-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider text-black shadow-lg">
                            {goal.category}
                        </span>
                        <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg border",
                            goal.priority === 'super' ? "bg-amber-500 text-white border-amber-400 animate-pulse" :
                                goal.priority === 'high' ? "bg-rose-500 text-white border-rose-400" :
                                    goal.priority === 'mid' ? "bg-blue-500 text-white border-blue-400" :
                                        "bg-white/20 text-white border-white/20"
                        )}>
                            {goal.priority || 'mid'}
                        </span>
                    </div>
                    <h4 className="text-[17px] font-bold text-white tracking-tight">{goal.title}</h4>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-white/50 font-bold tracking-wider uppercase">
                            <span>Strategic Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                            />
                        </div>
                    </div>

                    {/* Savings Progress Overlay */}
                    {goal.linked_savings_id && (() => {
                        const savings = goal.linked_savings_type === 'manual' 
                            ? financeGoals.find(f => f.id === goal.linked_savings_id)
                            : pots.find(p => p.id === goal.linked_savings_id)
                        
                        if (!savings) return null
                        
                        const current = 'current_amount' in savings ? savings.current_amount : savings.balance
                        const target = savings.target_amount
                        const sProgress = target > 0 ? Math.min(100, (current / target) * 100) : 0
                        
                        return (
                            <div className="space-y-2 pt-2 border-t border-white/10">
                                <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold tracking-wider uppercase">
                                    <div className="flex items-center gap-1.5">
                                        <PiggyBank className="w-3.5 h-3.5" />
                                        <span>Savings</span>
                                    </div>
                                    <span>£{current.toLocaleString()}</span>
                                </div>
                                <div className="h-1 w-full bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/20">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${sProgress}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                                    />
                                </div>
                            </div>
                        )
                    })()}
                </div>
            </div>
        </motion.div>
    )
}
