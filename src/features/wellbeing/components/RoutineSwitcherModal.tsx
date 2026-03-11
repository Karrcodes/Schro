'use client'

import React from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { X, Check, Activity, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { WorkoutRoutine } from '../types'

interface RoutineSwitcherModalProps {
    isOpen: boolean
    onClose: () => void
}

export function RoutineSwitcherModal({ isOpen, onClose }: RoutineSwitcherModalProps) {
    const { routines, activeRoutineId, setActiveRoutineId, deleteRoutine } = useWellbeing()

    const handleSelect = (id: string) => {
        setActiveRoutineId(id)
        onClose()
    }

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm('Are you sure you want to delete this routine?')) {
            deleteRoutine(id)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[40px] p-10 z-[1000] shadow-2xl border border-black/5 max-h-[80vh] flex flex-col"
                    >
                        <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-black/5 rounded-full transition-colors z-10">
                            <X className="w-5 h-5 text-black/20" />
                        </button>

                        <div className="space-y-8 flex-1 flex flex-col min-h-0">
                            <div className="space-y-2">
                                <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center mb-4">
                                    <Activity className="w-6 h-6 text-black" />
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-1">Routines</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter">Switch Protocol</h2>
                                <p className="text-[13px] font-medium text-black/40 leading-relaxed uppercase tracking-tight">
                                    Select which split you want to activate for your dashboard.
                                </p>
                            </div>

                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                                {routines.map((routine: WorkoutRoutine) => {
                                    const isActive = routine.id === activeRoutineId
                                    return (
                                        <button
                                            key={routine.id}
                                            onClick={() => handleSelect(routine.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-5 rounded-2xl border transition-all text-left group",
                                                isActive 
                                                    ? "bg-black border-black text-white" 
                                                    : "bg-white border-black/5 hover:border-black/10"
                                            )}
                                        >
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <h4 className="text-[15px] font-black uppercase tracking-tight truncate">
                                                    {routine.name}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest",
                                                        isActive ? "text-white/40" : "text-black/20"
                                                    )}>
                                                        {routine.exercises.length} Exercises
                                                    </span>
                                                    {routine.day && (
                                                        <>
                                                            <div className={cn("w-1 h-1 rounded-full", isActive ? "bg-white/20" : "bg-black/10")} />
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-widest",
                                                                isActive ? "text-rose-400" : "text-rose-500"
                                                            )}>
                                                                {routine.day}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!isActive && (
                                                    <button 
                                                        onClick={(e) => handleDelete(e, routine.id)}
                                                        className="p-2 text-black/20 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <div className={cn(
                                                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                                                    isActive ? "bg-white/10" : "bg-black/5"
                                                )}>
                                                    {isActive ? <Check className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4 text-black/20" />}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

import { ChevronRight } from 'lucide-react'
