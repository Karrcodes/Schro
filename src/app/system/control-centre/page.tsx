'use client'

import { LayoutDashboard, Activity, TrendingUp, Heart, Terminal, Lock, Target, AlertCircle, RefreshCw, BarChart3, Brain, Shield, SlidersHorizontal, Sparkles, ArrowRight, Briefcase, Moon } from 'lucide-react'
import { moduleNav } from '@/lib/navConfig'

import { KarrFooter } from '@/components/KarrFooter'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import * as React from 'react'
import { Task } from '@/features/tasks/types/tasks.types'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { useTransactions } from '@/features/finance/hooks/useTransactions'
import { cn, timeToMinutes, formatTime } from '@/lib/utils'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { useGoals } from '@/features/goals/hooks/useGoals'
import { usePlannerEngine, PlannerItem } from '@/features/tasks/hooks/usePlannerEngine'
import { usePots } from '@/features/finance/hooks/usePots'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { TransactionLedger } from '@/features/finance/components/TransactionLedger'
import { WeatherWidget } from '@/features/system/components/WeatherWidget'
import { AnimatePresence, motion } from 'framer-motion'
import { LifePerformanceVisualizer } from '@/features/dashboard/components/metrics/LifePerformanceVisualizer'
import { DashboardManager } from '@/features/dashboard/components/DashboardManager'
import { WeeklyHorizon } from '@/features/tasks/components/WeeklyHorizon'
import { EntertainmentCuration } from '@/features/dashboard/components/widgets/EntertainmentCuration'
import { MorningPulseWidget } from '@/features/dashboard/components/routines/MorningPulseWidget'
import { EveningReportWidget } from '@/features/dashboard/components/routines/EveningReportWidget'

const MOTIVATION_QUOTES = [
    { text: "The mind is the battlefield. Control what you can, let the rest burn.", tag: "Stoic" },
    { text: "Adapt like water to the 9-to-5 work, but carry the boats when you return to the Studio.", tag: "Taoist/Goggins" },
    { text: "You have to build calluses on your brain. Suffer through the friction of the process to unlock the Exceptional Promise.", tag: "Goggins" },
    { text: "Do not outsource your discipline to your feelings. The obstacle is the way. Act.", tag: "Stoic" },
    { text: "Nature does not hurry, yet everything is accomplished. Stay relentless, but stay fluid.", tag: "Taoist" }
]

export default function ControlCentrePage() {
    const { tasks, loading: tasksLoading } = useTasks('todo', 'all')
    const { transactions, loading: txLoading } = useTransactions('all')
    const { pots, loading: potsLoading } = usePots()
    const { projects, sparks, loading: studioLoading } = useStudio()
    const { goals, loading: goalsLoading } = useGoals()
    const { settings, loading: settingsLoading, updateSetting } = useSystemSettings()
    const [quoteIndex, setQuoteIndex] = useState(0)
    const [isMounted, setIsMounted] = useState(false)
    const [orderedModules, setOrderedModules] = useState<typeof moduleNav>([])
    const [isManagerOpen, setIsManagerOpen] = useState(false)
    const [routineMode, setRoutineMode] = useState<'morning' | 'evening'>(() => {
        const hour = new Date().getHours()
        return (hour >= 3 && hour < 18) ? 'morning' : 'evening'
    })

    useEffect(() => {
        setIsMounted(true)
        // Check localStorage first for immediate render
        const savedOrder = localStorage.getItem('schro_sidebar_order')
        const getSortedModules = (orderStr: string | null) => {
            let sorted = [...moduleNav]
            if (orderStr) {
                try {
                    const parsed = JSON.parse(orderStr) as string[]
                    sorted.sort((a, b) => {
                        const idxA = parsed.indexOf(a.label)
                        const idxB = parsed.indexOf(b.label)
                        if (idxA === -1 && idxB === -1) return 0
                        if (idxA === -1) return 1
                        if (idxB === -1) return -1
                        return idxA - idxB
                    })
                } catch (e) { }
            }
            return sorted
        }

        setOrderedModules(getSortedModules(savedOrder))
    }, [])

    useEffect(() => {
        // Hydrate with Supabase settings if available
        if (!settingsLoading && settings['schro_sidebar_order']) {
            const savedOrder = localStorage.getItem('schro_sidebar_order')
            if (settings['schro_sidebar_order'] !== savedOrder) {
                const getSortedModules = (orderStr: string) => {
                    let sorted = [...moduleNav]
                    try {
                        const parsed = JSON.parse(orderStr) as string[]
                        sorted.sort((a, b) => {
                            const idxA = parsed.indexOf(a.label)
                            const idxB = parsed.indexOf(b.label)
                            if (idxA === -1 && idxB === -1) return 0
                            if (idxA === -1) return 1
                            if (idxB === -1) return -1
                            return idxA - idxB
                        })
                    } catch (e) { }
                    return sorted
                }
                setOrderedModules(getSortedModules(settings['schro_sidebar_order']))
            }
        }
    }, [settings, settingsLoading])

    // Motivation Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setQuoteIndex((prev: number) => (prev + 1) % MOTIVATION_QUOTES.length)
        }, 10000)
        return () => clearInterval(interval)
    }, [])



    const totalLiquid = useMemo(() => pots.filter((p: any) => p.type !== 'savings' && p.type !== 'buffer').reduce((acc: number, p: any) => acc + p.balance, 0), [pots])
    const totalLiabilities = useMemo(() => pots.filter((p: any) => p.type === 'buffer').reduce((acc: number, p: any) => acc + p.balance, 0), [pots])

    const loading = tasksLoading || txLoading || potsLoading || studioLoading || goalsLoading

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            <div className="flex-1 overflow-y-auto bg-[#fafafa] flex flex-col p-6 md:p-10">
                <div className="max-w-7xl mx-auto w-full space-y-12 pb-12">
                    {/* Page Header */}
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">System Core</h2>
                            <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Control Centre</h1>
                        </div>
                        <div className="flex items-center gap-6">
                            <WeatherWidget />

                            {loading && (
                                <div className="flex items-center gap-1.5 text-black/30">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span className="text-[11px]">Scanning</span>
                                </div>
                            )}

                            <button 
                                onClick={() => setIsManagerOpen(true)}
                                className="p-2.5 bg-white border border-black/[0.1] rounded-xl hover:bg-black/[0.02] transition-colors relative group"
                            >
                                <SlidersHorizontal className="w-4 h-4 text-black/40 group-hover:text-black transition-colors" />
                            </button>


                            <div className="text-[11px] text-black/25 uppercase tracking-wider font-medium pb-1">
                                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                        </div>
                    </header>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {isMounted && (orderedModules as any[]).map((item: any) => (
                            <Link
                                key={item.href}
                                href={item.disabled ? '#' : item.href}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 bg-white border border-black/[0.06] rounded-xl transition-all group shadow-sm",
                                    item.disabled
                                        ? "opacity-40 cursor-not-allowed"
                                        : "hover:border-black/20 hover:bg-black/[0.02]"
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm",
                                    item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600" :
                                        item.color === 'blue' ? "bg-blue-600/10 text-blue-600" :
                                            item.color === 'purple' ? "bg-purple-500/10 text-purple-600" :
                                                item.color === 'amber' ? "bg-amber-500/10 text-amber-600" :
                                                    item.color === 'orange' ? "bg-orange-500/10 text-orange-600" :
                                                        item.color === 'rose' ? "bg-rose-500/10 text-rose-600" :
                                                            item.color === 'slate' ? "bg-slate-500/10 text-slate-600" :
                                                                "bg-black/5 text-black"
                                )}>
                                    <item.icon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[12px] font-bold text-black/70 group-hover:text-black">{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Daily Routine Pulse */}
                    {settings.dashboard_widgets?.routine !== false && (
                        <div className="grid grid-cols-1 gap-6">
                            <AnimatePresence mode="wait">
                                {routineMode === 'morning' ? (
                                    <motion.div
                                        key="morning"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                    >
                                        <MorningPulseWidget routineMode={routineMode} setRoutineMode={setRoutineMode} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="evening"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                    >
                                        <EveningReportWidget routineMode={routineMode} setRoutineMode={setRoutineMode} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Intelligence Analysis */}
                    {settings.dashboard_widgets?.intelligence !== false && (
                        <SectionBlock title="Intelligence Command" desc="Deep System Analysis">
                            <LifePerformanceVisualizer />
                        </SectionBlock>
                    )}

                    {/* Weekly Horizon */}
                    {settings.dashboard_widgets?.timeline !== false && (
                        <SectionBlock title="7-Day Horizon" desc="Weekly Momentum">
                            <WeeklyHorizon />
                        </SectionBlock>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: AI Extensions */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            {/* Smart Curation */}
                            {settings.dashboard_widgets?.curation !== false && (
                                <SectionBlock title="Curation Engine" desc="Personalized Media">
                                    <EntertainmentCuration />
                                </SectionBlock>
                            )}


                            <div className="bg-black text-white rounded-2xl p-8 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[160px]">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.05]">
                                    <Terminal className="w-32 h-32" />
                                </div>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[9px] font-mono tracking-widest uppercase text-white/40">Philosophy Engine // Synchronised</p>
                                </div>
                                <div className="flex-1 flex flex-col justify-center relative z-10">
                                    <p className="text-[17px] font-medium leading-relaxed font-mono" key={quoteIndex}>
                                        "{MOTIVATION_QUOTES[quoteIndex].text}"
                                    </p>
                                    <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mt-4">— {MOTIVATION_QUOTES[quoteIndex].tag}</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Strategic Focus & Finance */}
                        <div className="lg:col-span-1 flex flex-col gap-6">

                            {/* Finance Pulse */}
                            {settings.dashboard_widgets?.finance !== false && (
                                <SectionBlock title="Finance Pulse" desc="Liquidity Overview">
                                    <Link href="/finances" className="block w-full p-4 rounded-xl bg-black border border-black group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 translate-x-4 -translate-y-4">
                                            <BarChart3 className="w-24 h-24 text-white" />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-1">Liquid Assets</p>
                                            <p className="text-2xl font-black text-white tracking-tight">£{totalLiquid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>

                                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                                <p className="text-[11px] font-medium text-white/60">Liabilities Buffer</p>
                                                <p className="text-[12px] font-bold text-white">£{totalLiabilities.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="mt-6 pt-6 border-t border-black/[0.05]">
                                        <TransactionLedger />
                                    </div>
                                </SectionBlock>
                            )}

                            {settings.dashboard_widgets?.focus !== false && (
                                <SectionBlock title="Strategic Focus" desc="Top Objectives" className="flex-1">
                                    <div className="space-y-4 p-1">
                                        {goals.slice(0, 3).map((goal: any) => {
                                            const total = goal.milestones?.length || 0
                                            const completed = goal.milestones?.filter((m: any) => m.is_completed).length || 0
                                            const perc = total > 0 ? (completed / total) * 100 : 0

                                            return (
                                                <Link key={goal.id} href="/goals" className="block space-y-2 group">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[12px] font-bold text-black/70 group-hover:text-black transition-colors">{goal.title}</span>
                                                        <span className="text-[10px] font-black text-black/20 group-hover:text-black/40 transition-colors">{Math.round(perc)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-black/[0.04] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-black transition-all duration-700"
                                                            style={{ width: `${perc}%` }}
                                                        />
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                        {goals.length === 0 && (
                                            <p className="text-[11px] text-black/30 font-medium italic">No active strategic objectives.</p>
                                        )}
                                        <Link href="/goals" className="flex items-center justify-center gap-2 py-2 mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-black/20 hover:text-black transition-colors border-t border-black/[0.04]">
                                            View All Goals
                                            <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </SectionBlock>
                            )}
                        </div>
                    </div>
                </div>
                <KarrFooter />
            </div>

            <DashboardManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
        </div>
    )
}


function SectionBlock({ title, desc, children, className }: { title: string; desc: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm", className)}>
            <div className="flex items-baseline gap-2 mb-6">
                <h2 className="text-[15px] font-bold text-black">{title}</h2>
                <span className="text-[11px] text-black/35 font-medium">{desc}</span>
            </div>
            {children}
        </div>
    )
}
