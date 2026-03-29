'use client'

import React, { useState } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { Trophy, Plus, Target, CheckCircle2, Trash2, Milestone as MilestoneIcon, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { generateInitialMilestones } from '../utils/milestoneGenerator'

export function MilestoneTracker() {
    const { profile, workoutLogs, milestones, addMilestone, bulkAddMilestones, deleteMilestone, updateMilestone } = useWellbeing()
    const [isAdding, setIsAdding] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newTarget, setNewTarget] = useState('')
    const [newUnit, setNewUnit] = useState('kg')
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleAdd = async () => {
        if (!newTitle || !newTarget) return
        await addMilestone({
            title: newTitle,
            targetValue: Number(newTarget),
            currentValue: 0,
            unit: newUnit,
            type: 'lift'
        })
        setNewTitle('')
        setNewTarget('')
        setIsAdding(false)
    }

    return (
        <div className="bg-white border border-black/5 rounded-[32px] p-6 flex flex-col shadow-sm w-full relative h-full">
            <header className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-[14px] font-black text-black uppercase tracking-widest">Milestones</h3>
                </div>
                <div className="flex items-center gap-2">
                    {profile && (
                        <button 
                            onClick={async () => {
                                const generated = generateInitialMilestones(profile, workoutLogs)
                                const toAdd = generated.filter(gm => !milestones.some(m => m.title === gm.title))
                                if (toAdd.length > 0) {
                                    await bulkAddMilestones(toAdd)
                                }
                            }}
                            className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                            title="Auto-Generate Goals"
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        onClick={() => setIsAdding(!isAdding)}
                        className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                    >
                        <Plus className={cn("w-4 h-4 transition-transform", isAdding && "rotate-45")} />
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar pt-6 space-y-6">
                <AnimatePresence>
                    {isAdding && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 overflow-hidden pb-4"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Milestone (e.g. Bench Press)"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    className="col-span-2 bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[12px] font-bold outline-none"
                                />
                                <input 
                                    type="number" 
                                    placeholder="Target"
                                    value={newTarget}
                                    onChange={e => setNewTarget(e.target.value)}
                                    className="bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[12px] font-bold outline-none"
                                />
                                <select 
                                    value={newUnit}
                                    onChange={e => setNewUnit(e.target.value)}
                                    className="bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[12px] font-bold outline-none"
                                >
                                    <option value="kg">kg</option>
                                    <option value="reps">reps</option>
                                    <option value="lbs">lbs</option>
                                    <option value="days">days</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleAdd}
                                className="w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                                Create Milestone
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-3">
                    {milestones.length === 0 ? (
                        <div className="py-10 text-center space-y-4">
                            <div className="opacity-20 space-y-2">
                                <MilestoneIcon className="w-8 h-8 mx-auto" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No Milestones Set</p>
                            </div>
                            {profile && (
                                <button 
                                    onClick={async () => {
                                        const generated = generateInitialMilestones(profile, workoutLogs)
                                        await bulkAddMilestones(generated)
                                    }}
                                    className="px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10"
                                >
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                    Generate Intermediate Goals
                                </button>
                            )}
                        </div>
                    ) : (
                        milestones.map(m => {
                            const progress = Math.min(100, (m.currentValue / m.targetValue) * 100)
                            return (
                                <div key={m.id} className="p-3 bg-black/[0.02] border border-black/5 rounded-2xl space-y-2 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                m.completed ? "bg-emerald-500" : "bg-black/10"
                                            )} />
                                            <p className="text-[12px] font-black uppercase tracking-tight">{m.title}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setDeletingId(m.id)}
                                                className="p-1 text-black/20 hover:text-rose-500 transition-all"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                            <span className="text-[10px] font-black text-black/40 uppercase">
                                                {m.currentValue} / {m.targetValue}{m.unit}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1 bg-black/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className={cn(
                                                "h-full rounded-full",
                                                m.completed ? "bg-emerald-500" : "bg-rose-500"
                                            )}
                                        />
                                    </div>
                                    {!m.completed && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <input 
                                                type="number"
                                                placeholder="Update current..."
                                                className="w-20 bg-white border border-black/5 rounded-lg px-2 py-1 text-[10px] font-bold outline-none"
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = Number((e.target as HTMLInputElement).value)
                                                        const completed = val >= m.targetValue
                                                        await updateMilestone(m.id, { 
                                                            currentValue: val,
                                                            completed,
                                                            dateCompleted: completed ? new Date().toISOString() : undefined
                                                        })
                                                        ;(e.target as HTMLInputElement).value = ''
                                                    }
                                                }}
                                            />
                                            <span className="text-[9px] font-bold text-black/20 uppercase">Press Enter</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {deletingId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1100] flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl space-y-8"
                        >
                            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center">
                                <Trophy className="w-8 h-8 text-rose-500" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black uppercase tracking-tight">Delete Milestone?</h3>
                                <p className="text-[13px] font-medium text-black/40 leading-relaxed uppercase tracking-tight">
                                    You're about to remove this goal. Your progress data for this lift will be lost.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={async () => {
                                        await deleteMilestone(deletingId)
                                        setDeletingId(null)
                                    }}
                                    className="w-full py-5 bg-rose-500 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-rose-500/20 active:scale-95 transition-all"
                                >
                                    Confirm Deletion
                                </button>
                                <button 
                                    onClick={() => setDeletingId(null)}
                                    className="w-full py-5 bg-black/5 text-black rounded-[24px] text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
