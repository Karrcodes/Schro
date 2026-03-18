'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Dumbbell, Play, Sparkles } from 'lucide-react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface DynamicWorkoutModalProps {
    isOpen: boolean
    onClose: () => void
}

const MUSCLE_GROUPS = [
    { id: 'Chest', name: 'Chest' },
    { id: 'Back', name: 'Back' },
    { id: 'Shoulders', name: 'Shoulders' },
    { id: 'Legs', name: 'Legs' },
    { id: 'Biceps', name: 'Biceps' },
    { id: 'Triceps', name: 'Triceps' },
]

export function DynamicWorkoutModal({ isOpen, onClose }: DynamicWorkoutModalProps) {
    const { startDynamicSession } = useWellbeing()
    const router = useRouter()
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [exerciseCount, setExerciseCount] = useState(5)

    const toggleGroup = (id: string) => {
        if (selectedGroups.includes(id)) {
            setSelectedGroups(prev => prev.filter(g => g !== id))
        } else {
            setSelectedGroups(prev => [...prev, id])
        }
    }

    const handleGenerate = () => {
        if (selectedGroups.length === 0) return
        startDynamicSession(selectedGroups, exerciseCount)
        onClose()
        router.push('/health/fitness/session')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                        className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-black/5"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-black/5 flex items-center justify-between bg-black/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-violet-500" />
                                </div>
                                <div>
                                    <h2 className="text-[14px] font-black uppercase tracking-widest text-black">Dynamic Generator</h2>
                                    <p className="text-[11px] font-bold text-black/40 uppercase tracking-wider">Custom On-The-Fly Session</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-black/60" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-8">
                            {/* Muscle Selection */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Target Muscles</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {MUSCLE_GROUPS.map((group) => {
                                        const isSelected = selectedGroups.includes(group.id)
                                        return (
                                            <button
                                                key={group.id}
                                                onClick={() => toggleGroup(group.id)}
                                                className={cn(
                                                    "px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border",
                                                    isSelected 
                                                        ? "bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20 scale-[1.02]" 
                                                        : "bg-black/[0.03] text-black/60 border-transparent hover:bg-black/[0.06] hover:text-black"
                                                )}
                                            >
                                                {group.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Options */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Workout Length</h3>
                                    <span className="text-[12px] font-black text-violet-500 uppercase">{exerciseCount} Exercises</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" 
                                        min="2" 
                                        max="10" 
                                        value={exerciseCount} 
                                        onChange={(e) => setExerciseCount(Number(e.target.value))}
                                        className="w-full accent-violet-500"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
                                    Approx. {exerciseCount * 10} minutes total duration
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-black/[0.02] border-t border-black/5">
                            <button
                                onClick={handleGenerate}
                                disabled={selectedGroups.length === 0}
                                className={cn(
                                    "w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest transition-all",
                                    selectedGroups.length > 0 
                                        ? "bg-black text-white shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98]" 
                                        : "bg-black/10 text-black/30 cursor-not-allowed"
                                )}
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Generate & Start Session
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
