'use client'

import React, { useState } from 'react'
import { useWellbeing } from '@/features/wellbeing/contexts/WellbeingContext'
import { RoutineBuilder } from './RoutineBuilder'
import { RoutineSwitcherModal } from './RoutineSwitcherModal'
import { EditRoutineModal } from './EditRoutineModal'
import { GymConnectionModal } from './GymConnectionModal'
import { DynamicWorkoutModal } from './DynamicWorkoutModal'
import { MilestoneTracker } from './MilestoneTracker'
import { FitnessHeatmap } from './FitnessHeatmap'
import { WorkoutAnalytics } from './WorkoutAnalytics'
import { useRouter } from 'next/navigation'
import { Dumbbell, Activity, CheckCircle2, Info, Plus, Calendar, Trophy, ChevronRight, Play, ArrowRight, List, Repeat, History, Settings, Sparkles, Pause, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

import { WellbeingHeader } from './WellbeingHeader'
import { WellbeingControls } from './WellbeingControls'
import { WellbeingTabs } from './WellbeingTabs'

export function FitnessTab() {
    const { routines, activeRoutineId, activeSession, startSession, gymStats, syncGymData, gymRecommendation, logWorkout, workoutLogs, profile, isGymModalOpen, setIsGymModalOpen, setGymOverride, cancelSession, togglePauseSession } = useWellbeing()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
    const [isDynamicModalOpen, setIsDynamicModalOpen] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const router = useRouter()

    const activeRoutine = routines.find((r: any) => r.id === activeRoutineId) || routines[0]
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const isoDateStr = new Date().toISOString().split('T')[0]
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
        <div className="flex flex-col space-y-4">
            <WellbeingHeader
                title="Fitness & Vitality"
                subtitle="Wellbeing Protocol"
                activeColor="text-rose-500"
            />

            <div className="w-full space-y-4">
                {/* Module Controls Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    {['can_go', 'pending'].includes(gymRecommendation.status) && (
                        <div className="flex items-center gap-3">
                            <div className="hidden md:block">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                    Rotational Split Active
                                </span>
                            </div>
                            <button
                                onClick={() => setGymOverride(isoDateStr, 'skip')}
                                className="text-[10px] font-black text-black/40 hover:text-rose-500 uppercase tracking-widest bg-black/[0.03] hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                            >
                                Skip Today
                            </button>
                        </div>
                    )}
                    {['completed'].includes(gymRecommendation.status) && (
                        <div className="flex items-center gap-3">
                            <div className="hidden md:block">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                    Rotational Split Active
                                </span>
                            </div>
                            {gymRecommendation.reason.includes('Manual override') && (
                                <button
                                    onClick={() => setGymOverride(isoDateStr, null)}
                                    className="text-[10px] font-black text-black/40 hover:text-black uppercase tracking-widest bg-black/[0.03] hover:bg-black/5 px-3 py-1.5 rounded-xl transition-colors border border-transparent hover:border-black/5"
                                >
                                    Clear Override
                                </button>
                            )}
                        </div>
                    )}
                    {['work_day', 'overtime', 'rest_needed'].includes(gymRecommendation.status) && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setGymOverride(isoDateStr, 'force')}
                                className="text-[10px] font-black text-black/40 hover:text-emerald-600 uppercase tracking-widest bg-black/[0.03] hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors border border-transparent hover:border-emerald-100"
                            >
                                Go Anyway
                            </button>
                            {gymRecommendation.reason.includes('Manual override') && (
                                <button
                                    onClick={() => setGymOverride(isoDateStr, null)}
                                    className="text-[10px] font-black text-black/40 hover:text-black uppercase tracking-widest bg-black/[0.03] hover:bg-black/5 px-3 py-1.5 rounded-xl transition-colors border border-transparent hover:border-black/5"
                                >
                                    Clear Override
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6 items-start">
                    {routines.length === 0 ? (
                        <div className="lg:col-span-3">
                            <RoutineBuilder />
                        </div>
                    ) : (
                        <>
                            {/* Active Protocol */}
                            <section className="bg-black text-white rounded-[32px] shadow-2xl lg:col-span-1 w-full relative overflow-visible group h-[330px] xl:h-[380px]">
                                    <div className="h-full w-full overflow-y-auto lg:overflow-hidden p-6 relative no-scrollbar rounded-[32px]">
                                        <div className="flex items-center justify-between relative z-10 shrink-0 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                                    <Dumbbell className="w-3.5 h-3.5 text-emerald-500" />
                                                </div>
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Active Protocol</span>
                                            </div>
                                            {activeSession ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowCancelConfirm(true);
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20 group/cancel"
                                                >
                                                    <X className="w-3 h-3 text-rose-500 group-hover:text-rose-400 transition-colors" />
                                                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest text-rose-200 group-hover:text-white">Cancel Session</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsDynamicModalOpen(true);
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 rounded-xl transition-all border border-violet-500/20 group/dyn"
                                                >
                                                    <Sparkles className="w-3 h-3 text-violet-500 group-hover:text-violet-400 transition-colors" />
                                                    <span className="hidden xl:inline text-[9px] font-black uppercase tracking-widest text-violet-200 group-hover:text-white">Dynamic Session</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex flex-col items-start gap-1 relative z-10 w-full">
                                                <h2 className="text-xl lg:text-2xl xl:text-3xl font-black uppercase tracking-tighter leading-none">{displayTitle}</h2>
                                                <p className="text-rose-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-snug">{displayMuscles}</p>
                                            </div>

                                            <div style={{ marginTop: '30px' }} className="w-full flex flex-col items-center justify-center relative z-10">
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
                                                        className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full bg-white text-black flex flex-col items-center justify-center hover:scale-[1.05] active:scale-[0.95] transition-all shadow-white/20 shadow-2xl group shrink-0"
                                                    >
                                                        {activeSession ? (
                                                            <Pause className="w-10 h-10 fill-black translate-x-[-1px]" />
                                                        ) : (
                                                            <Play className="w-10 h-10 fill-black ml-1" />
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={() => setIsSwitcherOpen(true)}
                                                        className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group/btn shrink-0"
                                                    >
                                                        <Repeat className="w-5 h-5 text-white/50 group-hover/btn:text-white" />
                                                    </button>
                                                </div>
                                                <p className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest mt-4">
                                                    {activeSession ? 'SESSION PAUSED' : 'Start Session'}
                                                </p>
                                                
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            {/* Operational Flow */}
                            <div className="bg-white border border-black/5 rounded-[32px] shadow-sm lg:col-span-1 w-full relative overflow-visible h-[330px] xl:h-[380px]">
                                <div className="h-full w-full overflow-y-auto lg:overflow-hidden p-6 no-scrollbar">
                                        <div className="flex items-center justify-between mb-4 lg:mb-3 xl:mb-6">
                                            <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em]">Operational Flow</h3>
                                            <Activity className="w-4 h-4 text-black/20" />
                                        </div>
                                        <FitnessHeatmap />
                                    </div>
                                </div>
                                
                            {/* Milestones */}
                            <div className="lg:col-span-1 relative w-full overflow-visible h-[330px] xl:h-[380px]">
                                <MilestoneTracker />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <GymConnectionModal isOpen={isGymModalOpen} onClose={() => setIsGymModalOpen(false)} />
            <RoutineSwitcherModal isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />
            <DynamicWorkoutModal isOpen={isDynamicModalOpen} onClose={() => setIsDynamicModalOpen(false)} />
            {activeRoutine && <EditRoutineModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} routine={activeRoutine} />}
            
            <AnimatePresence>
                {showCancelConfirm && (
                    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCancelConfirm(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[32px] p-8 max-w-sm w-full relative z-10 shadow-2xl space-y-6 text-center"
                        >
                            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                                <X className="w-8 h-8 text-rose-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black uppercase tracking-tighter text-black">Discard Session?</h3>
                                <p className="text-xs font-medium text-black/40 leading-relaxed italic">
                                    All progress for the current "{cleanRoutineName}" session will be lost permanently.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        cancelSession();
                                        setShowCancelConfirm(false);
                                    }}
                                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-lg shadow-rose-500/20 active:scale-[0.98]"
                                >
                                    Confirm Discard
                                </button>
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="w-full py-4 bg-black/5 hover:bg-black/10 text-black/40 hover:text-black rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all"
                                >
                                    Keep Working
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
