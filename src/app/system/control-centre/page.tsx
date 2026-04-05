'use client'

import { LayoutDashboard, Activity, TrendingUp, Heart, Lock, Target, AlertCircle, RefreshCw, BarChart3, Brain, Shield, SlidersHorizontal, Sparkles, Briefcase, Moon, Calendar, Zap, LayoutList, Coffee, Gauge } from 'lucide-react'
import { moduleNav } from '@/lib/navConfig'
import { useRouter, useSearchParams } from 'next/navigation'

import { KarrFooter } from '@/components/KarrFooter'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import * as React from 'react'
import { Task } from '@/features/tasks/types/tasks.types'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { cn } from '@/lib/utils'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { useGoals } from '@/features/goals/hooks/useGoals'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { WeatherWidget } from '@/features/system/components/WeatherWidget'
import { AnimatePresence, motion } from 'framer-motion'
import { LifePerformanceVisualizer } from '@/features/dashboard/components/metrics/LifePerformanceVisualizer'
import { TasksCalendar } from '@/features/tasks/components/TasksCalendar'
import { MorningPulseWidget } from '@/features/dashboard/components/routines/MorningPulseWidget'

function ControlCentreContent() {
    const { loading: tasksLoading } = useTasks('todo', 'all')
    const { loading: studioLoading } = useStudio()
    const { loading: goalsLoading } = useGoals()
    const { settings, loading: settingsLoading } = useSystemSettings()
    const [isMounted, setIsMounted] = useState(false)
    const [orderedModules, setOrderedModules] = useState<typeof moduleNav>([])
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeFocusTab = (searchParams.get('tab') as 'brief' | 'calendar' | 'intelligence') || 'brief'
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




    const loading = tasksLoading || studioLoading || goalsLoading

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                <div className="flex-1 p-6 md:p-10">
                    <div className="max-w-7xl mx-auto w-full space-y-8 pb-0">
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

                                <div className="text-[11px] text-black/25 uppercase tracking-wider font-medium pb-1">
                                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </div>
                            </div>
                        </header>

                        {/* Quick Actions */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                    <LayoutDashboard className="w-3.5 h-3.5 text-blue-500" />
                                </div>
                                <h2 className="text-[14px] font-bold text-black">Quick Access</h2>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
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

                                {/* Focus Tabbed Icons (Premium UI) */}
                                <div className="flex bg-black/[0.02] p-1 rounded-2xl border border-black/[0.06] shrink-0 backdrop-blur-sm shadow-inner relative group">
                                    {(['brief', 'calendar', 'intelligence'] as const).map((tab) => {
                                        const Icon = tab === 'brief' ? Coffee : tab === 'calendar' ? Calendar : Gauge
                                        const isActive = activeFocusTab === tab

                                        return (
                                            <button
                                                key={tab}
                                                onClick={() => router.push(`/system/control-centre?tab=${tab}`)}
                                                className={cn(
                                                    "relative p-2.5 rounded-xl transition-colors duration-300 group/btn",
                                                    isActive ? "text-white" : "text-black/30 hover:text-black/60"
                                                )}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="focus-pill"
                                                        className="absolute inset-0 bg-black rounded-xl shadow-md z-0"
                                                        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                                    />
                                                )}
                                                <div className="relative z-10 flex items-center justify-center">
                                                    <Icon className={cn(
                                                        "w-4 h-4 transition-transform duration-300",
                                                        isActive ? "scale-110" : "group-hover/btn:scale-110"
                                                    )} />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Main Focus Area (Tabbed) */}
                        <div className="grid grid-cols-1 gap-6 min-h-[600px]">
                            <AnimatePresence mode="wait">
                                {activeFocusTab === 'brief' && (
                                    <motion.div
                                        key="brief"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <MorningPulseWidget />
                                    </motion.div>
                                )}
                                {activeFocusTab === 'calendar' && (
                                    <motion.div
                                        key="calendar"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <TasksCalendar />
                                    </motion.div>
                                )}
                                {activeFocusTab === 'intelligence' && (
                                    <motion.div
                                        key="intelligence"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-white rounded-3xl border border-black/[0.08] p-8 shadow-sm"
                                    >
                                        <h3 className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] mb-6">Intelligence command</h3>
                                        <LifePerformanceVisualizer />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
                <KarrFooter />
            </div>
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

export default function ControlCentrePage() {
    return (
        <React.Suspense fallback={<div className="min-h-screen bg-[#fafafa] flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-black/20" /></div>}>
            <ControlCentreContent />
        </React.Suspense>
    )
}
