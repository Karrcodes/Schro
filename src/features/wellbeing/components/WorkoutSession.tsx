'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { Dumbbell, CheckCircle2, ChevronRight, X, Play, Pause, RotateCcw, Save, Trash2, ArrowRight, SkipForward, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

export function WorkoutSession() {
    const { activeSession, updateSessionSet, togglePauseSession, finishSession, cancelSession, routines } = useWellbeing()
    const router = useRouter()
    
    // Core Session State
    const [elapsed, setElapsed] = useState(0)
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
    const [currentSetIndex, setCurrentSetIndex] = useState(0)
    const [sessionMode, setSessionMode] = useState<'training' | 'break' | 'setup'>('setup')
    const [breakTimeRemaining, setBreakTimeRemaining] = useState(60) // Default 60s
    const breakIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const routine = useMemo(() => 
        routines.find(r => r.id === activeSession?.routineId),
        [routines, activeSession?.routineId]
    )

    // Timer logic
    useEffect(() => {
        if (!activeSession || activeSession.isPaused) return
        
        const start = new Date(activeSession.startTime).getTime()
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000))
        }, 1000)
        
        return () => clearInterval(interval)
    }, [activeSession])

    // Break Timer Logic
    useEffect(() => {
        if (sessionMode === 'break' && breakTimeRemaining > 0 && !activeSession?.isPaused) {
            breakIntervalRef.current = setInterval(() => {
                setBreakTimeRemaining(prev => {
                    if (prev <= 1) {
                        setSessionMode('training')
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } else {
            if (breakIntervalRef.current) clearInterval(breakIntervalRef.current)
        }
        return () => {
            if (breakIntervalRef.current) clearInterval(breakIntervalRef.current)
        }
    }, [sessionMode, breakTimeRemaining, activeSession?.isPaused])

    if (!activeSession || !routine) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="w-20 h-20 rounded-full bg-black/5 flex items-center justify-center">
                    <Dumbbell className="w-10 h-10 text-black/20" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">No Active Session</h2>
                    <p className="text-black/40 text-sm font-bold uppercase">Start a routine from the fitness dashboard</p>
                </div>
                <button 
                    onClick={() => router.push('/health/fitness')}
                    className="px-8 py-4 bg-black text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                >
                    Back to Dashboard
                </button>
            </div>
        )
    }

    const handleNextSet = () => {
        const currentEx = routine.exercises[currentExerciseIndex]
        if (currentSetIndex < currentEx.suggestedSets - 1) {
            setCurrentSetIndex(prev => prev + 1)
            setBreakTimeRemaining(60) // Could be dynamic
            setSessionMode('break')
        } else {
            if (currentExerciseIndex < routine.exercises.length - 1) {
                setSessionMode('setup')
                setCurrentExerciseIndex(prev => prev + 1)
                setCurrentSetIndex(0)
            } else {
                handleFinish()
            }
        }
    }

    const handleSkipBreak = () => {
        setSessionMode('training')
        setBreakTimeRemaining(0)
    }

    const handleStartExercise = () => {
        setSessionMode('training')
    }

    const currentExercise = routine.exercises[currentExerciseIndex]
    const exSession = activeSession.exercises.find(e => e.exerciseId === currentExercise?.id)
    const currentSets = exSession?.sets || []

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const handleFinish = async () => {
        if (confirm('Finish this workout session?')) {
            await finishSession()
            router.push('/health/fitness')
        }
    }

    const handleCancel = () => {
        if (confirm('Are you sure you want to cancel? Progress will be lost.')) {
            cancelSession()
            router.push('/health/fitness')
        }
    }

    const currentSetData = exSession?.sets[currentSetIndex]

    return (
        <div className="max-w-xl mx-auto flex flex-col p-2 sm:p-4">
            {/* Transparent Header - Pins further up */}
            <header className="flex flex-col items-center text-center space-y-1 shrink-0 pt-0 pb-1.5">
                <div className="space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5">
                        <span className={cn("w-1 h-1 rounded-full", activeSession.isPaused ? "bg-amber-500" : "bg-rose-500 animate-pulse")} />
                        <h3 className="text-[8px] font-black text-black/15 uppercase tracking-[0.5em]">Active Session</h3>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight text-black">{routine.name}</h2>
                    <div className="flex items-center justify-center gap-3 text-black/25 text-[8px] font-black uppercase tracking-[0.2em]">
                        <span>{new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-black/5">•</span>
                        <span className="text-black font-black tabular-nums">{formatTime(elapsed)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full max-w-[280px]">
                    <button 
                        onClick={togglePauseSession}
                        className={cn(
                            "flex-1 flex items-center justify-center py-2.5 rounded-2xl transition-all gap-2",
                            activeSession.isPaused ? "bg-emerald-500 text-white shadow-lg" : "bg-black/[0.03] text-black hover:bg-black/[0.06]"
                        )}
                    >
                        {activeSession.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        <span className="text-[9px] font-black uppercase tracking-widest">{activeSession.isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button 
                        onClick={handleFinish}
                        className="flex-1 flex items-center justify-center py-2.5 bg-black text-white rounded-2xl transition-all gap-2 shadow-xl shadow-black/10"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Finish</span>
                    </button>
                    <button 
                        onClick={handleCancel}
                        className="w-10 h-10 flex items-center justify-center bg-black/[0.03] text-black/20 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Minimal Progress Pipeline - Relocated */}
                <div className="pt-3 pb-2 flex justify-center gap-1.5 w-full">
                    {routine.exercises.map((_, idx) => (
                        <div 
                            key={idx}
                            className={cn(
                                "h-1 rounded-full transition-all duration-500",
                                idx === currentExerciseIndex ? "w-8 bg-black" : 
                                idx < currentExerciseIndex ? "w-1.5 bg-emerald-500" : "w-1.5 bg-black/10"
                            )}
                        />
                    ))}
                </div>
            </header>

            {/* Paged Exercise Content - Fixed Height Container */}
            <div className="relative h-[400px] w-full min-h-0">
                <AnimatePresence mode="wait">
                    {sessionMode === 'setup' ? (
                        <motion.div
                            key="setup"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="h-full w-full bg-black text-white rounded-[40px] p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8 shadow-2xl border border-transparent"
                        >
                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Prepare Next Protocol</p>
                                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">{currentExercise?.name}</h1>
                                <div className="flex items-center justify-center gap-4 pt-4">
                                    <div className="bg-white/10 rounded-2xl px-5 py-3 border border-white/5">
                                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Target Sets</p>
                                        <p className="text-xl font-black">{currentExercise?.suggestedSets}</p>
                                    </div>
                                    <div className="bg-white/10 rounded-2xl px-5 py-3 border border-white/5">
                                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Target Reps</p>
                                        <p className="text-xl font-black">{currentExercise?.suggestedReps}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleStartExercise}
                                className="w-full py-8 bg-white text-black rounded-[32px] text-lg font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl"
                            >
                                Start Exercise
                            </button>
                        </motion.div>
                    ) : sessionMode === 'break' ? (
                        <motion.div
                            key="break"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="h-full w-full bg-emerald-500 text-white rounded-[40px] p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8 shadow-2xl border border-transparent"
                        >
                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em]">Rest Protocol</p>
                                <h1 className="text-7xl font-black tracking-tighter tabular-nums leading-none">
                                    {breakTimeRemaining}s
                                </h1>
                            </div>

                            <div className="space-y-2 opacity-80">
                                <p className="text-[9px] font-black uppercase tracking-widest">Upcoming</p>
                                <p className="text-xl font-black uppercase">Set {currentSetIndex + 1} of {currentExercise?.suggestedSets}</p>
                            </div>

                            <button
                                onClick={handleSkipBreak}
                                className="px-14 py-5 bg-white/20 hover:bg-white/30 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all min-w-[200px]"
                            >
                                Skip Break
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="training"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="h-full w-full bg-white border border-black/5 rounded-[40px] shadow-2xl p-6 sm:p-8 flex flex-col"
                        >
                            <div className="space-y-0.5 mb-2 shrink-0 text-center">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em]">{currentExercise?.name}</p>
                                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">SET {currentSetIndex + 1}</h2>
                                <p className="text-[9px] font-bold text-black/40 uppercase tracking-tighter pt-1">
                                    Goal: {currentExercise?.suggestedReps} Reps @ {currentExercise?.suggestedSets || 'MAX'} sets
                                </p>
                            </div>

                            <div className="flex-1 flex flex-col justify-center space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Weight (kg)</label>
                                    <input 
                                        type="number" 
                                        value={currentSetData?.weight || ''}
                                        onChange={(e) => updateSessionSet(currentExercise.id, currentSetIndex, { weight: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-black/[0.03] border-none rounded-[28px] p-4 text-center text-2xl font-black focus:ring-4 ring-black/5 outline-none transition-all"
                                        placeholder="0.0"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-black/30 uppercase tracking-widest ml-1">Reps Performed</label>
                                    <input 
                                        type="number" 
                                        value={currentSetData?.reps || ''}
                                        onChange={(e) => updateSessionSet(currentExercise.id, currentSetIndex, { reps: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-black/[0.03] border-none rounded-[28px] p-4 text-center text-2xl font-black focus:ring-4 ring-black/5 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleNextSet}
                                disabled={!currentSetData?.weight || !currentSetData?.reps}
                                className="mt-2 py-4 bg-black text-white rounded-[28px] text-base font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl disabled:opacity-30 disabled:grayscale transition-all active:scale-95 shrink-0"
                            >
                                Complete Set <ArrowRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

