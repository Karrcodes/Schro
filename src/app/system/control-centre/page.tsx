'use client'

import { LayoutDashboard, Activity, TrendingUp, Heart, Terminal, Lock, Target, AlertCircle, RefreshCw, BarChart3, Brain, Shield, SlidersHorizontal, Sparkles, ArrowRight, Briefcase } from 'lucide-react'


import { KarrFooter } from '@/components/KarrFooter'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { useTransactions } from '@/features/finance/hooks/useTransactions'
import { cn } from '@/lib/utils'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { useGoals } from '@/features/goals/hooks/useGoals'

const MOTIVATION_QUOTES = [
    { text: "The mind is the battlefield. Control what you can, let the rest burn.", tag: "Stoic" },
    { text: "Adapt like water to the 9-to-5 work, but carry the boats when you return to the Studio.", tag: "Taoist/Goggins" },
    { text: "You have to build calluses on your brain. Suffer through the friction of the process to unlock the Exceptional Promise.", tag: "Goggins" },
    { text: "Do not outsource your discipline to your feelings. The obstacle is the way. Act.", tag: "Stoic" },
    { text: "Nature does not hurry, yet everything is accomplished. Stay relentless, but stay fluid.", tag: "Taoist" }
]

export default function ControlCentrePage() {
    const { tasks, loading: tasksLoading } = useTasks('todo', 'all')
    const { transactions, loading: financeLoading } = useTransactions('all')
    const { goals, loading: goalsLoading } = useGoals()
    const { settings } = useSystemSettings()
    const [quoteIndex, setQuoteIndex] = useState(0)

    // Motivation Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % MOTIVATION_QUOTES.length)
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    // Data Aggregation
    const stats = useMemo(() => {
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const weeklyTasks = tasks.filter(t => new Date(t.created_at) >= oneWeekAgo)
        const taskCompletion = weeklyTasks.length > 0
            ? (weeklyTasks.filter(t => t.is_completed).length / weeklyTasks.length) * 100
            : 0

        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const monthlyInflow = transactions
            .filter(t => t.type === 'income' && new Date(t.date) >= thirtyDaysAgo)
            .reduce((s, t) => s + t.amount, 0)
        const monthlyOutflow = transactions
            .filter(t => t.type === 'spend' && new Date(t.date) >= thirtyDaysAgo)
            .reduce((s, t) => s + t.amount, 0)

        const budgetScore = monthlyInflow > 0
            ? Math.max(0, 100 - (monthlyOutflow / monthlyInflow) * 100)
            : 0

        const score = Math.round((taskCompletion * 0.5) + (budgetScore * 0.5))

        let nextAction = "System optimal. No high-priority items."
        const highPriorityTask = tasks.find(t => !t.is_completed && (t.priority === 'urgent' || t.priority === 'high'))

        if (highPriorityTask) {
            nextAction = `High Priority: ${highPriorityTask.title}`
        } else if (monthlyOutflow > monthlyInflow && monthlyInflow > 0) {
            nextAction = "Spending exceeds income — Review budget."
        } else {
            const nextPending = tasks.find(t => !t.is_completed)
            if (nextPending) nextAction = `Next Up: ${nextPending.title}`
        }

        return { score, nextAction, taskCompletion, budgetScore }
    }, [tasks, transactions])

    const loading = tasksLoading || financeLoading

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Page Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06] bg-white flex-shrink-0 shadow-sm z-10">
                <div>
                    <h1 className="text-[22px] font-bold text-black tracking-tight">Control Centre</h1>
                    <p className="text-[12px] text-black/35 mt-0.5">System Hub</p>
                </div>
                <div className="flex items-center gap-3">
                    {loading && (
                        <div className="flex items-center gap-1.5 text-black/30">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-[11px]">Scanning</span>
                        </div>
                    )}
                    <div className="text-[11px] text-black/25 uppercase tracking-wider font-medium">
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#fafafa] flex flex-col p-6">
                <div className="max-w-5xl mx-auto w-full space-y-8 pb-12">
                    {/* Quick Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {[
                            { href: "/create", color: "orange", icon: Sparkles, label: "Studio" },
                            { href: "/finances", color: "emerald", icon: BarChart3, label: "Finances" },
                            { href: "/tasks", color: "blue", icon: Activity, label: "Operations" },
                            { href: "/vault", color: "purple", icon: Shield, label: "Vault" },
                            { href: "/intelligence", color: "black", icon: Sparkles, label: "Karr AI" },
                            { href: "/goals", color: "amber", icon: Target, label: "Goals" },
                            { href: "/wellbeing", color: "rose", icon: Heart, label: "Wellbeing" },
                            { href: "/system/settings", color: "slate", icon: SlidersHorizontal, label: "Settings" }
                        ].map((btn) => (


                            <Link
                                key={btn.label}
                                href={btn.href}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-black/[0.06] rounded-xl hover:border-black/20 hover:bg-black/[0.02] transition-all group shadow-sm"
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm",
                                    btn.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600" :
                                        btn.color === 'blue' ? "bg-blue-600/10 text-blue-600" :
                                            btn.color === 'purple' ? "bg-purple-500/10 text-purple-600" :
                                                btn.color === 'amber' ? "bg-amber-500/10 text-amber-600" :
                                                    btn.color === 'orange' ? "bg-orange-500/10 text-orange-600" :
                                                        btn.color === 'rose' ? "bg-rose-500/10 text-rose-600" :
                                                            btn.color === 'slate' ? "bg-slate-500/10 text-slate-600" :
                                                                "bg-black/5 text-black"


                                )}>
                                    <btn.icon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[12px] font-bold text-black/70 group-hover:text-black">{btn.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Summary Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <SummaryCard
                            label="Next Objective"
                            value={loading ? "INDEXING..." : stats.nextAction}
                            icon={<Target className="w-5 h-5" />}
                            color="#3b82f6"
                            sub="Action Engine Recommendation"
                        />
                        <SummaryCard
                            label="Efficiency Analysis"
                            value={`${stats.score}/100`}
                            icon={<TrendingUp className="w-5 h-5" />}
                            color="#059669"
                            sub="Discipline & Budget Index"
                        />
                        <SummaryCard
                            label="Pending Items"
                            value={tasks.filter(t => !t.is_completed).length.toString()}
                            icon={<Activity className="w-5 h-5" />}
                            color="#f59e0b"
                            sub="Ops requiring attention"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 flex flex-col">
                            <div className="bg-black text-white rounded-2xl p-8 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[160px] h-full">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.05]">
                                    <Terminal className="w-32 h-32" />
                                </div>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[9px] font-mono tracking-widest uppercase text-white/40">Philosophy Engine // Synchronised</p>
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <p className="text-[17px] font-medium leading-relaxed font-mono" key={quoteIndex}>
                                        "{MOTIVATION_QUOTES[quoteIndex].text}"
                                    </p>
                                    <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mt-4">— {MOTIVATION_QUOTES[quoteIndex].tag}</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Strategic Focus */}
                        <div className="lg:col-span-1 flex flex-col">
                            <SectionBlock title="Strategic Focus" desc="Top Objectives" className="h-full">
                                <div className="space-y-4 p-1">
                                    {goals.slice(0, 3).map(goal => {
                                        const total = goal.milestones?.length || 0
                                        const completed = goal.milestones?.filter(m => m.is_completed).length || 0
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
                                    <Link href="/goals" className="flex items-center justify-center gap-2 py-2 mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-black/20 hover:text-black transition-colors">
                                        View All Goals
                                        <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </SectionBlock>
                        </div>
                    </div>
                </div>
                <KarrFooter />
            </div>
        </div>
    )
}

function SummaryCard({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactNode; color: string; sub?: string }) {
    return (
        <div className="rounded-xl border border-black/[0.07] bg-white p-4 hover:bg-black/[0.01] transition-colors shadow-sm flex flex-col h-full">
            <div className="flex flex-col gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: color }}>
                    {icon}
                </div>
                <p className="text-[11px] uppercase tracking-wider text-black/40 font-semibold">{label}</p>
            </div>
            <div className="mt-auto">
                <p className="text-lg font-bold text-black tracking-tight line-clamp-2">{value}</p>
                {sub && <p className="text-[11px] text-black/35 mt-1">{sub}</p>}
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
