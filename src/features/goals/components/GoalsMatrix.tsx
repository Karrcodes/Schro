'use client'

import React, { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Wallet, Briefcase, Heart, User, ChevronRight, Clock, PiggyBank, Stars } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGoals as useFinanceGoals } from '@/features/finance/hooks/useGoals'
import { usePots } from '@/features/finance/hooks/usePots'
import type { Goal, GoalCategory, GoalTimeframe, Aspiration } from '../types/goals.types'

const CATEGORIES: Record<GoalCategory, { label: string, icon: React.ElementType, color: string }> = {
    finance: { label: 'Finance', icon: Wallet, color: 'text-emerald-500 bg-emerald-50' },
    career: { label: 'Career', icon: Briefcase, color: 'text-blue-500 bg-blue-50' },
    health: { label: 'Health', icon: Heart, color: 'text-rose-500 bg-rose-50' },
    personal: { label: 'Personal', icon: User, color: 'text-purple-500 bg-purple-50' }
}

const TIMEFRAME_CONFIG: Record<GoalTimeframe, { label: string, desc: string }> = {
    short: { label: 'Short Term', desc: 'Next 3-6 Months' },
    medium: { label: 'Medium Term', desc: '1-2 Years' },
    long: { label: 'Long Term', desc: 'Strategic Legacy' }
}

const PRIORITY_CONFIG: Record<string, { label: string, color: string, pulse?: boolean }> = {
    super: { label: 'Super Priority', color: 'bg-purple-600/10 text-purple-600', pulse: true },
    high: { label: 'High Priority', color: 'bg-red-500/10 text-red-600' },
    mid: { label: 'Mid Priority', color: 'bg-amber-500/10 text-amber-600' },
    low: { label: 'Low Priority', color: 'bg-black/[0.04] text-black/30' }
}

interface GoalsMatrixProps {
    items: (Goal | Aspiration)[]
    onItemClick: (item: Goal | Aspiration) => void
}

export default function GoalsMatrix({ items, onItemClick }: GoalsMatrixProps) {
    const { goals: financeGoals } = useFinanceGoals()
    const { pots } = usePots()
    
    const groupedItems = useMemo(() => {
        const groups: Record<GoalTimeframe, (Goal | Aspiration)[]> = {
            short: [],
            medium: [],
            long: []
        }
        items.forEach(item => {
            const h = 'horizon' in item ? item.horizon : (item as Goal).timeframe
            if (h && h in groups) {
                groups[h as GoalTimeframe].push(item)
            }
        })
        return groups
    }, [items])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {(['short', 'medium', 'long'] as GoalTimeframe[]).map((timeframe) => (
                <div key={timeframe} className="space-y-6">
                    <div className="flex flex-col px-1 mb-4">
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-[14px] font-bold text-black whitespace-nowrap">
                                {TIMEFRAME_CONFIG[timeframe].label}
                            </h3>
                            <div className="ml-auto bg-black/[0.04] px-1.5 py-0.5 rounded text-[9px] font-bold font-mono text-black/20">
                                {groupedItems[timeframe].length}
                            </div>
                        </div>
                        <span className="text-[10px] text-black/35 font-medium mt-0.5">
                            {TIMEFRAME_CONFIG[timeframe].desc}
                        </span>
                    </div>

                        <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {groupedItems[timeframe].map((item, idx) => (
                                <StrategicCard
                                    key={item.id}
                                    item={item}
                                    index={idx}
                                    financeGoals={financeGoals}
                                    pots={pots}
                                    onClick={() => onItemClick(item)}
                                />
                            ))}
                        </AnimatePresence>
                        {groupedItems[timeframe].length === 0 && (
                            <div className="h-24 rounded-2xl border-2 border-dashed border-black/[0.03] flex items-center justify-center">
                                <p className="text-[11px] text-black/20 font-medium uppercase tracking-widest">Awaiting Command</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function StrategicCard({ item, index, financeGoals, pots, onClick }: { 
    item: Goal | Aspiration, 
    index: number, 
    financeGoals: any[], 
    pots: any[], 
    onClick: () => void 
}) {
    const isAspiration = 'horizon' in item
    const isGoal = !isAspiration
    const isDragging = useRef(false)
    const wasDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault()
        startPos.current = { x: e.clientX, y: e.clientY }
        isDragging.current = false
        wasDragging.current = false

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPos.current.x
            const dy = ev.clientY - startPos.current.y
            if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDragging.current = true
                wasDragging.current = true
                setIsDraggingThis(true)
            }
        }

        const handleUp = () => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)
            setIsDraggingThis(false)
            if (isDragging.current) {
                isDragging.current = false
            }
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    }

    const totalMilestones = item.milestones?.length || 0
    const completedMilestones = item.milestones?.filter(m => m.is_completed).length || 0
    const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0
    const config = isGoal ? CATEGORIES[(item as Goal).category] : CATEGORIES[(item as Aspiration).category]
    const priority = isGoal ? PRIORITY_CONFIG[(item as Goal).priority || 'mid'] : null

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
                if (wasDragging.current) return
                onClick()
            }}
            className={cn(
                "group relative bg-white border border-black/[0.06] rounded-2xl hover:border-black/20 hover:shadow-xl hover:shadow-black/5 transition-all cursor-pointer overflow-hidden flex flex-col",
                isDraggingThis && "opacity-30 scale-95 shadow-none"
            )}
        >
            {/* Image Header */}
            <div 
                className="relative w-full aspect-[21/9] bg-black/[0.02] overflow-hidden border-b border-black/[0.04] cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                style={{ touchAction: 'none' }}
            >
                {item.vision_image_url ? (
                    <img
                        src={item.vision_image_url}
                        alt={item.title}
                        className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-[0.03]">
                        {isGoal ? <Target className="w-8 h-8 text-black" /> : <Stars className="w-8 h-8 text-black" />}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between">
                    <div className={cn("p-2.5 rounded-xl flex items-center justify-center", config?.color)}>
                        {config ? React.createElement(config.icon, { className: "w-4 h-4" }) : <Stars className="w-4 h-4" />}
                    </div>
                    {isGoal && (
                        <div className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                            priority?.color
                        )}>
                            {priority?.label || 'Mid Priority'}
                        </div>
                    )}
                    {!isGoal && (
                        <div className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-black text-white">
                            Vector
                        </div>
                    )}
                </div>

                <div>
                    <h4 className="text-[15px] font-bold text-black group-hover:text-blue-600 transition-colors line-clamp-1">{item.title}</h4>
                    <p className={cn(
                        "text-[12px] mt-1 line-clamp-2 leading-relaxed italic transition-colors",
                        isGoal ? "text-black/40" : "text-amber-500/60 font-medium"
                    )}>
                        {item.description || (isGoal ? 'No strategic breakdown defined.' : 'No visionary narrative manifested.')}
                    </p>
                </div>

                <div className="mt-auto space-y-4">
                    {(isGoal || totalMilestones > 0) ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-black/30 uppercase tracking-wider">{completedMilestones}/{totalMilestones} {isGoal ? 'Milestones' : 'Steps'}</span>
                                    <span className="font-mono font-bold">{Math.round(progress)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/[0.04] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className={cn(
                                            "h-full transition-colors",
                                            isAspiration ? "bg-amber-500" : "bg-black group-hover:bg-blue-600"
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Savings Progress — Only for Goals */}
                            {isGoal && (item as Goal).linked_savings_id && (() => {
                                const g = item as Goal
                                const savings = g.linked_savings_type === 'manual' 
                                    ? financeGoals.find(f => f.id === g.linked_savings_id)
                                    : pots.find(p => p.id === g.linked_savings_id)
                                
                                if (!savings) return null
                                
                                const current = 'current_amount' in savings ? savings.current_amount : (savings.balance || 0)
                                const target = savings.target_amount || 0
                                const sProgress = target > 0 ? Math.min(100, (current / target) * 100) : 0
                                
                                return (
                                    <div className="space-y-2 pt-2 border-t border-black/[0.03]">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-1.5 text-emerald-600">
                                                <PiggyBank className="w-3.5 h-3.5" />
                                                <span className="font-bold uppercase tracking-wider">Savings Goal</span>
                                            </div>
                                            <span className="font-mono font-bold text-emerald-600">£{current.toLocaleString()} <span className="text-black/10">/ £{target.toLocaleString()}</span></span>
                                        </div>
                                        <div className="h-1.5 w-full bg-emerald-500/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${sProgress}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                            />
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 pt-2">
                             <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60">Visionary Resonance Active</span>
                             </div>
                             <div className="h-1 w-full bg-amber-500/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "100%" }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="h-full w-1/3 bg-amber-500/20"
                                />
                             </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-black/[0.04]">
                        <div className="flex items-center gap-1.5 text-black/25">
                            {isGoal ? <Clock className="w-3 h-3" /> : <Stars className="w-3 h-3" />}
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                {isGoal ? ((item as Goal).target_date ? new Date((item as Goal).target_date!).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'No Deadline') : 'Eternal Horizon'}
                            </span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-black/20 group-hover:bg-black group-hover:text-white transition-all transform group-hover:translate-x-1">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
