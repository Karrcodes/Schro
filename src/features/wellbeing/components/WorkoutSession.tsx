'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { Dumbbell, CheckCircle2, ChevronRight, X, Play, Pause, RotateCcw, Save, Trash2, ArrowRight, SkipForward, ChevronDown, ChevronUp, Trophy, Search, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ExerciseLibrary } from './ExerciseLibrary'
import type { Exercise, ExerciseLog, WorkoutSet } from '../types'

export function WorkoutSession() {
    const { activeSession, updateSessionSet, togglePauseSession, finishSession, cancelSession, routines, randomizeSessionExercise, swapSessionExercise } = useWellbeing()
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

    const sessionExercises = useMemo(() => 
        activeSession?.plannedExercises || routine?.exercises || [],
        [activeSession?.plannedExercises, routine?.exercises]
    )

    // Modal & Summary State (Moved to top to prevent hook mismatch)
    const [showCompleteModal, setShowCompleteModal] = useState(false)
    const [showExitModal, setShowExitModal] = useState(false)
    const [showSkipModal, setShowSkipModal] = useState(false)
    const [showSwapModal, setShowSwapModal] = useState(false)
    const [swapMode, setSwapMode] = useState<'menu' | 'manual'>('menu')
    const [isRandomizing, setIsRandomizing] = useState(false)
    const [sessionSummary, setSessionSummary] = useState<{ volume: number, exercises: number } | null>(null)

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
        if (showCompleteModal) return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                {/* Just let the modal render at the bottom by returning null here but allowing the main flow? No, better to return the modal wrapper */}
                <AnimatePresence>
                    {showCompleteModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1200] flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, y: 40 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                className="bg-white rounded-[48px] p-10 w-full max-w-md shadow-2xl text-center space-y-8 relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] -z-10" />
                                <div className="space-y-4">
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                                        className="w-24 h-24 rounded-[32px] bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40"
                                    >
                                        <Trophy className="w-12 h-12" />
                                    </motion.div>
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-black uppercase tracking-tighter text-black">Workout Complete</h2>
                                        <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 inline-block px-4 py-1.5 rounded-full">
                                            Optimization Target Achieved
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/5 rounded-3xl p-6 border border-black/5">
                                        <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em] mb-2">Total Volume</p>
                                        <p className="text-2xl font-black uppercase tracking-tighter text-black">
                                            {sessionSummary?.volume.toLocaleString()}<span className="text-sm ml-1 opacity-20">kg</span>
                                        </p>
                                    </div>
                                    <div className="bg-black/5 rounded-3xl p-6 border border-black/5">
                                        <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em] mb-2">Efforts</p>
                                        <p className="text-2xl font-black uppercase tracking-tighter text-black">
                                            {sessionSummary?.exercises}<span className="text-sm ml-1 opacity-20">exec</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[13px] font-medium text-black/40 leading-relaxed uppercase tracking-tight px-4">
                                        Protocol successfully asymmetrically logged to your performance matrix.
                                    </p>
                                    <button 
                                        onClick={() => router.push('/health/fitness')}
                                        className="w-full py-6 bg-black text-white rounded-[32px] text-[12px] font-black uppercase tracking-widest shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        Return to Command <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )

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
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const handleNextSet = () => {
        const currentEx = sessionExercises[currentExerciseIndex]
        if (currentSetIndex < currentEx.suggestedSets - 1) {
            setCurrentSetIndex(prev => prev + 1)
            setBreakTimeRemaining(60) // Could be dynamic
            setSessionMode('break')
        } else {
            if (currentExerciseIndex < sessionExercises.length - 1) {
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

    const handleFinish = async () => {
        const volume = activeSession.exercises.reduce((v, ex) => 
            v + ex.sets.reduce((sv, set) => sv + (set.weight * (set.reps || 0)), 0), 0)
        
        setSessionSummary({
            volume,
            exercises: activeSession.exercises.length
        })
        
        await finishSession()
        setShowCompleteModal(true)
    }

    const handleCancel = () => {
        setShowExitModal(true)
    }

    const confirmExit = () => {
        cancelSession()
        router.push('/health/fitness')
    }

    const handleSkipExercise = () => {
        setShowSkipModal(true)
    }

    const confirmSkip = () => {
        setShowSkipModal(false)
        if (currentExerciseIndex < sessionExercises.length - 1) {
            setSessionMode('setup')
            setCurrentExerciseIndex(prev => prev + 1)
            setCurrentSetIndex(0)
        } else {
            handleFinish()
        }
    }

    const currentExercise = sessionExercises[currentExerciseIndex]
    const exSession = activeSession.exercises.find(e => e.exerciseId === currentExercise?.id)
    const currentSets = exSession?.sets || []

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

                <div className="flex items-center gap-2 w-full max-w-[320px]">
                    <button 
                        onClick={togglePauseSession}
                        title={activeSession.isPaused ? 'Resume' : 'Pause'}
                        className={cn(
                            "w-12 h-10 flex items-center justify-center rounded-2xl transition-all shrink-0",
                            activeSession.isPaused ? "bg-emerald-500 text-white shadow-lg" : "bg-black/[0.03] text-black hover:bg-black/[0.06]"
                        )}
                    >
                        {activeSession.isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                    </button>
                    
                    <button 
                        onClick={handleSkipExercise}
                        title="Skip Exercise"
                        className="w-12 h-10 flex items-center justify-center bg-black/[0.03] text-black hover:bg-black/[0.06] rounded-2xl transition-all shrink-0"
                    >
                        <SkipForward className="w-4 h-4 fill-current" />
                    </button>

                    <button 
                        onClick={handleFinish}
                        className="flex-1 h-10 flex items-center justify-center bg-black text-white rounded-2xl transition-all gap-2 shadow-xl shadow-black/10 px-4"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Finish</span>
                    </button>

                    <button 
                        onClick={handleCancel}
                        title="Exit Session"
                        className="w-10 h-10 flex items-center justify-center bg-black/[0.03] text-black/20 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shrink-0"
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
            <div className="relative h-[460px] w-full min-h-0">
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
                                <div className="flex items-center justify-center gap-4">
                                    <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">{currentExercise?.name}</h1>
                                    <button 
                                        onClick={() => { setSwapMode('menu'); setShowSwapModal(true); }}
                                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/5"
                                    >
                                        <RefreshCw className="w-5 h-5 text-white/60" />
                                    </button>
                                </div>
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
                                <h1 className="text-8xl font-black tracking-tighter tabular-nums leading-none">
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
                            <div className="space-y-0.5 mb-2 shrink-0 text-center relative group">
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em]">{currentExercise?.name}</p>
                                    <button 
                                        onClick={() => { setSwapMode('menu'); setShowSwapModal(true); }}
                                        className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-black/5 rounded-full"
                                    >
                                        <RefreshCw className="w-3 h-3 text-black/20" />
                                    </button>
                                </div>
                                <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">SET {currentSetIndex + 1}</h2>
                                <p className="text-[10px] font-bold text-black/40 uppercase tracking-tighter pt-1">
                                    Goal: {currentExercise?.suggestedReps} Reps @ {currentExercise?.suggestedSets || 'MAX'} sets
                                </p>
                            </div>

                            <div className="flex-1 flex flex-col justify-center space-y-4">
                                {!currentExercise.isBodyweight && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Weight (kg)</label>
                                        <input 
                                            type="number" 
                                            value={currentSetData?.weight || ''}
                                            onChange={(e) => updateSessionSet(currentExercise.id, currentSetIndex, { weight: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-black/[0.03] border-none rounded-[28px] p-5 text-center text-3xl font-black focus:ring-4 ring-black/5 outline-none transition-all"
                                            placeholder="0.0"
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Reps Performed</label>
                                    <input 
                                        type="number" 
                                        value={currentSetData?.reps || ''}
                                        onChange={(e) => updateSessionSet(currentExercise.id, currentSetIndex, { reps: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-black/[0.03] border-none rounded-[28px] p-5 text-center text-3xl font-black focus:ring-4 ring-black/5 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleNextSet}
                                disabled={(currentExercise.isBodyweight ? !currentSetData?.reps : (!currentSetData?.weight || !currentSetData?.reps))}
                                className="mt-4 py-5 bg-black text-white rounded-[28px] text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl disabled:opacity-30 disabled:grayscale transition-all active:scale-95 shrink-0"
                            >
                                Complete Set <ArrowRight className="w-6 h-6" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Swap Exercise Modal */}
            <AnimatePresence>
                {showSwapModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1150] flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[40px] p-8 w-full max-w-lg shadow-2xl space-y-8 relative overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <button 
                                onClick={() => setShowSwapModal(false)}
                                className="absolute top-6 right-6 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-all z-10"
                            >
                                <X className="w-5 h-5 text-black/40" />
                            </button>

                            <div className="space-y-1 shrink-0">
                                <h3 className="text-3xl font-black uppercase tracking-tight text-black leading-none">Swap Exercise</h3>
                                <p className="text-[10px] font-black text-black/20 uppercase tracking-widest">Diverge from original protocol</p>
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col">
                                {swapMode === 'menu' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            disabled={isRandomizing}
                                            onClick={async () => {
                                                setIsRandomizing(true);
                                                randomizeSessionExercise(currentExercise.id);
                                                setTimeout(() => {
                                                    setIsRandomizing(false);
                                                    setShowSwapModal(false);
                                                }, 800);
                                            }}
                                            className="flex flex-col items-center justify-center p-8 bg-black/[0.03] border border-black/5 rounded-[32px] hover:bg-black text-black hover:text-white transition-all group relative overflow-hidden"
                                        >
                                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                                                <RefreshCw className={cn("w-7 h-7 text-emerald-600 group-hover:text-emerald-400", isRandomizing && "animate-spin")} />
                                            </div>
                                            <p className="text-[13px] font-black uppercase tracking-tight">Random Swap</p>
                                            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest pt-1 px-4 text-center">Same Muscle Group</p>
                                        </button>

                                        <button
                                            onClick={() => setSwapMode('manual')}
                                            className="flex flex-col items-center justify-center p-8 bg-black/[0.03] border border-black/5 rounded-[32px] hover:bg-black text-black hover:text-white transition-all group"
                                        >
                                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                                                <Search className="w-7 h-7 text-blue-600 group-hover:text-blue-400" />
                                            </div>
                                            <p className="text-[13px] font-black uppercase tracking-tight">Manual Selection</p>
                                            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest pt-1 px-4 text-center">Browse Library</p>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 flex flex-col h-full">
                                        <button 
                                            onClick={() => setSwapMode('menu')}
                                            className="flex items-center gap-2 text-[9px] font-black text-black/40 uppercase tracking-[0.2em] hover:text-black transition-colors shrink-0"
                                        >
                                            <ChevronRight className="w-3 h-3 rotate-180" /> Back to Menu
                                        </button>
                                        <div className="flex-1 overflow-hidden pr-1">
                                            <ExerciseLibrary 
                                                selectedIds={[currentExercise?.id]}
                                                onSelect={(ex) => {
                                                    swapSessionExercise(currentExercise.id, ex);
                                                    setShowSwapModal(false);
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Exit Confirmation Modal */}
            <AnimatePresence>
                {showExitModal && (
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
                            className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl space-y-6"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                                <Trash2 className="w-7 h-7 text-rose-500" />
                            </div>
                            <div className="space-y-2 text-left">
                                <h3 className="text-xl font-black uppercase tracking-tight text-black">Exit Session?</h3>
                                <p className="text-[13px] font-medium text-black/40 leading-relaxed uppercase tracking-tight">
                                    Progress on unfinished exercises will be lost. Are you sure you want to exit?
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={confirmExit}
                                    className="w-full py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20"
                                >
                                    Confirm Exit
                                </button>
                                <button 
                                    onClick={() => setShowExitModal(false)}
                                    className="w-full py-4 bg-black/5 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Skip Exercise Modal */}
            <AnimatePresence>
                {showSkipModal && (
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
                            className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl space-y-6"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <SkipForward className="w-7 h-7 text-amber-600" />
                            </div>
                            <div className="space-y-2 text-left">
                                <h3 className="text-xl font-black uppercase tracking-tight text-black">Skip Exercise?</h3>
                                <p className="text-[13px] font-medium text-black/40 leading-relaxed uppercase tracking-tight">
                                    Are you sure you want to move to the next protocol? Current exercise progress will be saved.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={confirmSkip}
                                    className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/20"
                                >
                                    Confirm Skip
                                </button>
                                <button 
                                    onClick={() => setShowSkipModal(false)}
                                    className="w-full py-4 bg-black/5 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Workout Complete Congratulatory Modal */}
            <AnimatePresence>
                {showCompleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1200] flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white rounded-[48px] p-10 w-full max-w-md shadow-2xl text-center space-y-8 relative overflow-hidden"
                        >
                            {/* Decorative background flare */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] -z-10" />
                            
                            <div className="space-y-4">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                                    className="w-24 h-24 rounded-[32px] bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40"
                                >
                                    <Trophy className="w-12 h-12" />
                                </motion.div>
                                <div className="space-y-1">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-black">Workout Complete</h2>
                                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 inline-block px-4 py-1.5 rounded-full">
                                        Optimization Target Achieved
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/5 rounded-3xl p-6 border border-black/5">
                                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em] mb-2">Total Volume</p>
                                    <p className="text-2xl font-black uppercase tracking-tighter text-black">
                                        {sessionSummary?.volume.toLocaleString()}<span className="text-sm ml-1 opacity-20">kg</span>
                                    </p>
                                </div>
                                <div className="bg-black/5 rounded-3xl p-6 border border-black/5">
                                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em] mb-2">Efforts</p>
                                    <p className="text-2xl font-black uppercase tracking-tighter text-black">
                                        {sessionSummary?.exercises}<span className="text-sm ml-1 opacity-20">exec</span>
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[13px] font-medium text-black/40 leading-relaxed uppercase tracking-tight px-4">
                                    Protocol successfully asymmetrically logged to your performance matrix.
                                </p>
                                <button 
                                    onClick={() => router.push('/health/fitness')}
                                    className="w-full py-6 bg-black text-white rounded-[32px] text-[12px] font-black uppercase tracking-widest shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    Return to Command <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

