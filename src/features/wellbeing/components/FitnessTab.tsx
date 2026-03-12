'use client'

import React, { useState } from 'react'
import { useWellbeing } from '@/features/wellbeing/contexts/WellbeingContext'
import { RoutineBuilder } from './RoutineBuilder'
import { RoutineSwitcherModal } from './RoutineSwitcherModal'
import { EditRoutineModal } from './EditRoutineModal'
import { GymConnectionModal } from './GymConnectionModal'
import { MilestoneTracker } from './MilestoneTracker'
import { FitnessHeatmap } from './FitnessHeatmap'
import { useRouter } from 'next/navigation'
import { Dumbbell, Activity, CheckCircle2, Info, Plus, Calendar, Trophy, ChevronRight, Play, ArrowRight, List, Repeat } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function FitnessTab() {
    const { routines, activeRoutineId, activeSession, startSession, gymStats, syncGymData, gymRecommendation, logWorkout, workoutLogs, profile } = useWellbeing()
    const [isGymModalOpen, setIsGymModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
    const router = useRouter()

    const activeRoutine = routines.find((r: any) => r.id === activeRoutineId) || routines[0]
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const hasVisitedGymToday = gymStats.visitHistory?.some((v: any) => v.date?.split('T')[0] === todayStr)

    const cleanRoutineName = activeRoutine?.name?.replace(/\s*\(.*?\)/g, '').trim() || 'Workout'
    const matchStr1 = cleanRoutineName.toLowerCase()
    const matchStr2 = (activeRoutine?.day || '').toLowerCase().replace(/\s*day/g, '').trim()

    const displayTitle = (activeRoutine?.day && (matchStr1.includes(matchStr2) || matchStr2.includes(matchStr1)))
        ? activeRoutine.day
        : cleanRoutineName;

    const uniqueMuscles = Array.from(new Set(activeRoutine?.exercises?.flatMap((ex: any) => ex.muscleGroups || [ex.muscleGroup] || []) || [])).filter(Boolean).map((m: any) => m.toLowerCase());
    const displayMuscles = uniqueMuscles.length > 0 
        ? (uniqueMuscles.length === 1 ? uniqueMuscles[0] : uniqueMuscles.length === 2 ? `${uniqueMuscles[0]} and ${uniqueMuscles[1]}` : `${uniqueMuscles.slice(0, -1).join(', ')} and ${uniqueMuscles[uniqueMuscles.length - 1]}`)
        : 'Full Body';

    return (
        <div className="space-y-6">

            {/* Recommendation Banner */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "p-4 rounded-[32px] border flex items-center justify-between",
                    gymRecommendation.status === 'can_go' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
                )}
            >
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        gymRecommendation.status === 'can_go' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    )}>
                        {gymRecommendation.status === 'can_go' ? <Dumbbell className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                    </div>
                    <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest leading-none mb-1">
                            {gymRecommendation.status === 'can_go' ? 'Recommended: Hit the Gym' : 'Recommended: Rest Day'}
                        </h4>
                        <p className="text-[11px] font-bold text-black/40 uppercase">{gymRecommendation.reason}</p>
                    </div>
                </div>
                {gymRecommendation.status === 'can_go' && (
                    <div className="hidden md:block">
                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            Rotational Split Active
                         </span>
                    </div>
                )}
            </motion.div>
            {/* Active Protocol & Gym Stats */}
            {/* Main Content Grid: Protocol (Wide) and Operational Flow (Narrow) side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                {routines.length === 0 ? (
                    <div className="lg:col-span-3">
                        <RoutineBuilder />
                    </div>
                ) : (
                    <>
                        {/* Active Protocol (Minimalist Launchpad) */}
                        <section className="bg-black text-white rounded-[32px] p-6 md:p-8 relative overflow-hidden flex flex-col group shadow-2xl h-auto md:h-[320px] lg:h-auto lg:min-h-full lg:col-span-1 max-w-[400px] mx-auto lg:max-w-none lg:mx-0 w-full">
                            <div className="flex items-center gap-2 relative z-10 shrink-0 mb-3">
                                <Dumbbell className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Active Protocol</h3>
                            </div>

                            <div className="flex flex-col flex-1 min-h-0 justify-between">
                                <div className="flex flex-col items-start gap-1 relative z-10 w-full mb-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none">{displayTitle}</h2>
                                    </div>
                                    <p className="text-rose-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-snug line-clamp-2">{displayMuscles}</p>
                                </div>
                                
                                {/* TEMPORARILY DISABLED FOR DESIGN WORK */}
                                {false && hasVisitedGymToday ? (
                                    <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-3 text-center">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-4 border-emerald-500/30 flex items-center justify-center mb-2 relative">
                                            <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/20" style={{ animationDuration: '3s' }} />
                                            <CheckCircle2 className="w-8 h-8 text-emerald-400 relative z-10" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-white">Session Complete</h3>
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest max-w-[200px]">
                                            You've already crushed your workout today. Enjoy your recovery!
                                        </p>
                                        
                                        <div className="pt-2 w-full">
                                            <button 
                                                onClick={() => {
                                                    if (!activeSession) {
                                                        startSession(activeRoutine.id)
                                                    }
                                                    router.push('/health/fitness/session')
                                                }}
                                                className="w-full py-3 bg-white/5 text-white/60 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 group border border-white/5"
                                            >
                                                Log Extra Session <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Minimalist Play Button Layout */}
                                        <div className="w-full flex flex-col items-center justify-center relative z-10 flex-1 my-4">
                                            <div className="flex items-center justify-center gap-4 md:gap-6 w-full">
                                                <button 
                                                    onClick={() => setIsEditModalOpen(true)}
                                                    className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group/btn shrink-0 shadow-lg shadow-black/20"
                                                    title="View/Edit Routine"
                                                >
                                                    <List className="w-5 h-5 md:w-6 md:h-6 text-white/50 group-hover/btn:text-white transition-colors" />
                                                </button>

                                                <button 
                                                    onClick={() => {
                                                        if (!activeSession) {
                                                            startSession(activeRoutine.id)
                                                        }
                                                        router.push('/health/fitness/session')
                                                    }}
                                                    className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full bg-white text-black flex flex-col items-center justify-center hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] group shrink-0"
                                                >
                                                    {activeSession ? (
                                                        <ArrowRight className="w-10 h-10 md:w-12 md:h-12 text-black group-hover:translate-x-2 transition-transform" />
                                                    ) : (
                                                        <Play className="w-10 h-10 md:w-12 md:h-12 text-black fill-black ml-1.5 md:ml-2" />
                                                    )}
                                                </button>

                                                <button 
                                                    onClick={() => setIsSwitcherOpen(true)}
                                                    className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group/btn shrink-0 shadow-lg shadow-black/20"
                                                    title="Switch Routine"
                                                >
                                                    <Repeat className="w-5 h-5 md:w-6 md:h-6 text-white/50 group-hover/btn:text-white transition-colors" />
                                                </button>
                                            </div>
                                            <p className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest mt-6">
                                                {activeSession ? 'Resume Session' : 'Start Session'}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Operational Flow (Weekly Split) */}
                        <div className="bg-white border border-black/5 rounded-[32px] p-8 shadow-sm flex flex-col space-y-6 lg:col-span-1 h-auto md:h-[320px] lg:h-auto max-w-[400px] mx-auto lg:max-w-none lg:mx-0 w-full">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em]">Operational Flow</h3>
                                <Activity className="w-4 h-4 text-black/20" />
                            </div>

                            <FitnessHeatmap />
                        </div>

                        {/* Milestones (1/3 width) */}
                        <div className="lg:col-span-1 h-auto md:h-[320px] lg:h-0 lg:min-h-full min-h-0 relative max-w-[400px] mx-auto lg:max-w-none lg:mx-0 w-full">
                            <MilestoneTracker />
                        </div>
                    </>
                )}
            </div>

            <GymConnectionModal
                isOpen={isGymModalOpen}
                onClose={() => setIsGymModalOpen(false)}
            />

            <RoutineSwitcherModal
                isOpen={isSwitcherOpen}
                onClose={() => setIsSwitcherOpen(false)}
            />

            {activeRoutine && (
                <EditRoutineModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    routine={activeRoutine}
                />
            )}
        </div>
    )
}
