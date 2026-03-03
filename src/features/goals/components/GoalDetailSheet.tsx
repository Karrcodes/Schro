'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Target, Calendar, Clock, Trash2, Plus, CheckCircle2, Circle, Image as ImageIcon, Sparkles, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Goal, Milestone } from '../types/goals.types'

interface GoalDetailSheetProps {
    goal: Goal | null
    isOpen: boolean
    onClose: () => void
    onToggleMilestone: (milestoneId: string, completed: boolean) => void
    onUpdateMilestone: (milestoneId: string, updates: Partial<Milestone>) => void
    onDeleteGoal: (id: string) => void
    onEdit: (goal: Goal) => void
}

export default function GoalDetailSheet({ goal, isOpen, onClose, onToggleMilestone, onUpdateMilestone, onDeleteGoal, onEdit }: GoalDetailSheetProps) {
    if (!goal) return null

    const totalMilestones = goal.milestones?.length || 0
    const completedMilestones = goal.milestones?.filter(m => m.is_completed).length || 0
    const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[100] max-h-[90vh] overflow-y-auto shadow-2xl border-t border-black/5"
                    >
                        {/* Handle */}
                        <div className="flex justify-center p-4">
                            <div className="w-12 h-1.5 bg-black/10 rounded-full" />
                        </div>

                        <div className="max-w-3xl mx-auto px-6 pb-12">
                            <div className="flex items-start justify-between mb-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 md:px-2.5 py-1 bg-black text-white rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider">
                                            {goal.category}
                                        </span>
                                        <div className="hidden xs:block w-1 h-1 rounded-full bg-black/10" />
                                        <span className="px-2 md:px-2.5 py-1 bg-black/[0.04] text-black/50 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider border border-black/5">
                                            {goal.timeframe} Horizon
                                        </span>
                                    </div>
                                    <h2 className="text-[24px] md:text-[32px] font-bold text-black tracking-tight leading-[1.1]">{goal.title}</h2>
                                    <p className="text-[14px] md:text-[15px] text-black/50 font-medium leading-relaxed max-w-xl">{goal.description || 'Define your strategic path.'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onEdit(goal)}
                                        className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-full transition-transform active:scale-90 shadow-lg shadow-black/10"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-12 h-12 flex items-center justify-center bg-black/[0.03] hover:bg-black/[0.06] rounded-full transition-colors group"
                                    >
                                        <X className="w-5 h-5 text-black/40 group-hover:text-black transition-colors" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Left Column: Progress & Image */}
                                <div className="md:col-span-1 space-y-6">
                                    {goal.vision_image_url ? (
                                        <div className="relative group aspect-square rounded-2xl overflow-hidden border border-black/5 shadow-xl shadow-black/5">
                                            <img
                                                src={goal.vision_image_url}
                                                alt={goal.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ) : (
                                        <div className="aspect-square rounded-2xl bg-black/[0.02] border-2 border-dashed border-black/[0.05] flex flex-col items-center justify-center gap-3 text-center p-6">
                                            <ImageIcon className="w-8 h-8 text-black/10" />
                                            <p className="text-[11px] font-bold uppercase text-black/20 tracking-widest leading-tight">No Vision Image</p>
                                        </div>
                                    )}

                                    <div className="p-6 bg-black/[0.02] rounded-2xl border border-black/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Completion</span>
                                            <span className="text-[12px] font-mono font-bold text-black">{Math.round(progress)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-black/[0.04] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                className="h-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.1)]"
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-black/20 uppercase tracking-tight">Milestones</span>
                                                <span className="text-[15px] font-bold text-black">{completedMilestones}/{totalMilestones}</span>
                                            </div>
                                            <div className="w-px h-8 bg-black/5" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-black/20 uppercase tracking-tight">Status</span>
                                                <span className="text-[15px] font-bold uppercase tracking-tight text-emerald-600">{goal.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onEdit(goal)}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-black/[0.04] hover:bg-black/[0.08] rounded-xl transition-colors text-[12px] font-bold uppercase tracking-widest text-black mb-1"
                                    >
                                        Refine Objective
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (window.confirm('Terminate this objective? This cannot be undone.')) {
                                                onDeleteGoal(goal.id)
                                                onClose()
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-[12px] font-bold uppercase tracking-widest"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Goal
                                    </button>
                                </div>

                                {/* Right Column: Milestones */}
                                <div className="md:col-span-2 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[12px] font-bold uppercase tracking-widest text-black/40">Tactical Milestones</h3>
                                    </div>

                                    <div className="space-y-4">
                                        {goal.milestones?.map((m) => (
                                            <div
                                                key={m.id}
                                                className={cn(
                                                    "w-full flex flex-col gap-3 p-4 rounded-xl border transition-all text-left group",
                                                    m.is_completed
                                                        ? "bg-emerald-50 border-emerald-100 opacity-60"
                                                        : "bg-white border-black/[0.06] hover:border-black/20"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => onToggleMilestone(m.id, !m.is_completed)}
                                                        className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0",
                                                            m.is_completed ? "bg-emerald-500 text-white" : "bg-black/5 text-black/20 group-hover:bg-black group-hover:text-white"
                                                        )}
                                                    >
                                                        {m.is_completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <input
                                                            type="text"
                                                            value={m.title}
                                                            onChange={(e) => onUpdateMilestone(m.id, { title: e.target.value })}
                                                            className={cn(
                                                                "w-full bg-transparent border-none focus:outline-none text-[14px] font-bold p-0",
                                                                m.is_completed && "line-through text-emerald-900/40"
                                                            )}
                                                            placeholder="Milestone title..."
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 pl-10">
                                                    <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                                                        <span className="text-[9px] font-black uppercase text-black/20 whitespace-nowrap">Impact Score</span>
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            value={m.impact_score || 5}
                                                            onChange={(e) => onUpdateMilestone(m.id, { impact_score: parseInt(e.target.value) })}
                                                            className="w-full h-1 bg-black/5 rounded-full appearance-none accent-black"
                                                        />
                                                        <span className="text-[10px] font-black text-black/40 w-4 text-center">{m.impact_score || 5}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {totalMilestones === 0 && (
                                            <div className="p-8 text-center bg-black/[0.02] border-2 border-dashed border-black/[0.04] rounded-2xl">
                                                <p className="text-[12px] font-medium text-black/30">Break this objective into actionable tactical milestones.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-8 space-y-4">
                                        <h3 className="text-[12px] font-bold uppercase tracking-widest text-black/40">Targeting</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 bg-[#fafafa] rounded-2xl border border-black/[0.06] space-y-1 shadow-sm">
                                                <div className="flex items-center gap-2 text-black/30 mb-2">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Deadline</span>
                                                </div>
                                                <p className="text-[14px] font-bold text-black">{goal.target_date ? new Date(goal.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Set Deadline'}</p>
                                            </div>
                                            <div className="p-5 bg-[#fafafa] rounded-2xl border border-black/[0.06] space-y-1 shadow-sm">
                                                <div className="flex items-center gap-2 text-black/30 mb-2">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Priority</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        goal.priority === 'urgent' ? "bg-purple-600 animate-pulse shadow-[0_0_8px_rgba(147,51,234,0.5)]" :
                                                            goal.priority === 'high' ? "bg-red-500" :
                                                                goal.priority === 'mid' ? "bg-amber-500" :
                                                                    "bg-black/20"
                                                    )} />
                                                    <p className={cn(
                                                        "text-[14px] font-bold uppercase tracking-tight",
                                                        goal.priority === 'urgent' ? "text-purple-600" :
                                                            goal.priority === 'high' ? "text-red-600" :
                                                                goal.priority === 'mid' ? "text-amber-600" :
                                                                    "text-black"
                                                    )}>
                                                        {goal.priority}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
