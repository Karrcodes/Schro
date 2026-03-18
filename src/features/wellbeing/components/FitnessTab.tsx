'use client'

import React, { useState } from 'react'
import { useWellbeing } from '@/features/wellbeing/contexts/WellbeingContext'
import { RoutineBuilder } from './RoutineBuilder'
import { RoutineSwitcherModal } from './RoutineSwitcherModal'
import { EditRoutineModal } from './EditRoutineModal'
import { GymConnectionModal } from './GymConnectionModal'
import { MilestoneTracker } from './MilestoneTracker'
import { FitnessHeatmap } from './FitnessHeatmap'
import { WorkoutAnalytics } from './WorkoutAnalytics'
import { useRouter } from 'next/navigation'
import { Dumbbell, Activity, CheckCircle2, Info, Plus, Calendar, Trophy, ChevronRight, Play, ArrowRight, List, Repeat, History, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

import { WellbeingHeader } from './WellbeingHeader'
import { WellbeingControls } from './WellbeingControls'
import { WellbeingTabs } from './WellbeingTabs'

export function FitnessTab() {
    const { routines, activeRoutineId, activeSession, startSession, gymStats, syncGymData, gymRecommendation, logWorkout, workoutLogs, profile, isGymModalOpen, setIsGymModalOpen } = useWellbeing()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
    const [showAnalytics, setShowAnalytics] = useState(false)
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
        <div className="flex flex-col space-y-12">
            <WellbeingHeader
                title="Fitness & Vitality"
                subtitle="Wellbeing Protocol"
                activeColor="text-rose-500"
            />

            <div className="w-full space-y-12">
                {/* Module Controls Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <WellbeingTabs />
                    <WellbeingControls />
                </div>

                {/* Recommendation Banner */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "p-4 rounded-[32px] border flex items-center justify-between",
                        gymRecommendation.status === 'completed' ? "bg-emerald-500/10 border-emerald-500/20" :
                            gymRecommendation.status === 'pending' ? "bg-emerald-500/5 border-emerald-500/10" :
                                gymRecommendation.status === 'can_go' ? "bg-emerald-500/10 border-emerald-500/20" :
                                    "bg-rose-500/10 border-rose-500/20"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            ['can_go', 'pending', 'completed'].includes(gymRecommendation.status) ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                        )}>
                            {['can_go', 'pending', 'completed'].includes(gymRecommendation.status) ? <Dumbbell className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                        </div>
                        <div>
                            <h4 className="text-[12px] font-black uppercase tracking-widest leading-none mb-1">
                                {gymRecommendation.status === 'completed' ? 'Recommended: Hit the Gym (Goal Met)' :
                                    gymRecommendation.status === 'pending' ? 'Recommended: Gym Session Pending' :
                                        gymRecommendation.status === 'can_go' ? 'Recommended: Hit the Gym' :
                                            'Recommended: Rest Day'}
                            </h4>
                            <p className="text-[11px] font-bold text-black/40 uppercase">{gymRecommendation.reason}</p>
                        </div>
                    </div>
                    {['can_go', 'pending', 'completed'].includes(gymRecommendation.status) && (
                        <div className="hidden md:block">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                Rotational Split Active
                            </span>
                        </div>
                    )}
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {routines.length === 0 ? (
                        <div className="lg:col-span-3">
                            <RoutineBuilder />
                        </div>
                    ) : (
                        <>
                            {/* Active Protocol */}
                            <section className="bg-black text-white rounded-[32px] shadow-2xl lg:col-span-1 w-full h-[420px] relative overflow-visible group">
                                    <div className="h-full w-full overflow-y-auto p-8 relative no-scrollbar rounded-[32px]">
                                        <div className="flex items-center justify-between relative z-10 shrink-0 mb-3">
                                            <div className="flex items-center gap-2">
                                                <Dumbbell className="w-4 h-4 text-emerald-500" />
                                                <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Active Protocol</h3>
                                            </div>
                                            <button
                                                onClick={() => setShowAnalytics(true)}
                                                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group/hist"
                                            >
                                                <History className="w-4 h-4 text-white/30" />
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-8">
                                            <div className="flex flex-col items-start gap-1 relative z-10 w-full mb-4">
                                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none">{displayTitle}</h2>
                                                <p className="text-rose-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-snug">{displayMuscles}</p>
                                            </div>

                                            <div className="w-full flex flex-col items-center justify-center relative z-10 mt-4">
                                                <div className="flex items-center justify-center gap-6 w-full">
                                                    <button
                                                        onClick={() => setIsEditModalOpen(true)}
                                                        className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group/btn shrink-0"
                                                    >
                                                        <Settings className="w-5 h-5 text-white/50 group-hover/btn:text-white" />
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            const idToStart = activeRoutineId || routines[0]?.id
                                                            if (idToStart) {
                                                                startSession(idToStart)
                                                                router.push('/health/fitness/session')
                                                            }
                                                        }}
                                                        className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full bg-white text-black flex flex-col items-center justify-center hover:scale-[1.05] active:scale-[0.95] transition-all shadow-white/20 shadow-2xl group shrink-0"
                                                    >
                                                        {activeSession ? (
                                                            <ArrowRight className="w-10 h-10 group-hover:translate-x-2 transition-transform" />
                                                        ) : (
                                                            <Play className="w-10 h-10 fill-black ml-1.5" />
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={() => setIsSwitcherOpen(true)}
                                                        className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group/btn shrink-0"
                                                    >
                                                        <Repeat className="w-5 h-5 text-white/50 group-hover/btn:text-white" />
                                                    </button>
                                                </div>
                                                <p className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest mt-6">
                                                    {activeSession ? 'Resume Session' : 'Start Session'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            {/* Operational Flow */}
                            <div className="bg-white border border-black/5 rounded-[32px] shadow-sm lg:col-span-1 w-full h-[420px] relative overflow-visible">
                                <div className="h-full w-full overflow-y-auto p-8 no-scrollbar">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em]">Operational Flow</h3>
                                            <Activity className="w-4 h-4 text-black/20" />
                                        </div>
                                        <FitnessHeatmap />
                                    </div>
                                </div>
                                
                            {/* Milestones */}
                            <div className="lg:col-span-1 h-auto relative w-full overflow-visible">
                                <MilestoneTracker />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <GymConnectionModal isOpen={isGymModalOpen} onClose={() => setIsGymModalOpen(false)} />
            <RoutineSwitcherModal isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />
            {activeRoutine && <EditRoutineModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} routine={activeRoutine} />}
            <AnimatePresence>
                {showAnalytics && <WorkoutAnalytics onClose={() => setShowAnalytics(false)} />}
            </AnimatePresence>
        </div>
    )
}
