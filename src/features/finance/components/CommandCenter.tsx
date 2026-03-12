'use client'

import { useMemo, useState, useEffect } from 'react'
import { DollarSign, TrendingDown, Wallet, RefreshCw, Eye, EyeOff, BarChart3, Receipt, Calendar, PiggyBank, Settings, CreditCard } from 'lucide-react'
import { InfoTooltip } from './InfoTooltip'
import { countRemainingPayments, addMonths } from '../utils/lenderLogos'
import { usePots } from '../hooks/usePots'
import { useRecurring } from '../hooks/useRecurring'
import { useGoals } from '../hooks/useGoals'
import { useTransactions } from '../hooks/useTransactions'
import { PotsGrid } from './PotsGrid'
import { CalendarVisualizer } from './CalendarVisualizer'
import { GoalsList } from './GoalsList'
import { KarrAIChat } from './KarrAIChat'
import { TransactionLedger } from './TransactionLedger'
import { Skeleton } from './Skeleton'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import { KarrFooter } from '@/components/KarrFooter'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'
import { MonzoSyncControls } from './MonzoSyncControls'

export function CommandCenter() {
    const { pots, loading: pLoading, isSyncing, refetch: refetchPots, syncMonzo } = usePots()
    const { obligations, loading: oLoading } = useRecurring()
    const { goals, loading: gLoading, refetch: refetchGoals } = useGoals()
    const { refetch: refetchTransactions } = useTransactions()
    const { activeProfile, setProfile, isPrivacyEnabled, togglePrivacy } = useFinanceProfile()
    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        if (searchParams.get('monzo') === 'connected') {
            syncMonzo().then(() => {
                // Clear the param to avoid re-syncing on manual refresh
                const newParams = new URLSearchParams(searchParams.toString())
                newParams.delete('monzo')
                router.replace('/finances?' + newParams.toString())
            })
        }
    }, [searchParams])

    const summary = useMemo(() => {
        // Total Liquid is everything: Main Accounts + All Pots
        const totalLiquid = pots.reduce((s, p) => s + p.balance, 0)
        let totalDebt = 0
        let monthlyObligations = 0
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endOfMonth.setHours(23, 59, 59, 999)

        obligations.forEach(o => {
            if (o.end_date || o.payments_left) {
                // Use explicitly stored payments_left if set; otherwise derive from dates
                const paymentsLeft = countRemainingPayments(o.next_due_date, o.end_date, o.frequency, now, o.payments_left)
                totalDebt += o.amount * paymentsLeft
            }

            // Exactly calculate how much is due in the remaining current calendar month
            let current = new Date(o.next_due_date)
            current.setHours(0, 0, 0, 0)

            const obsEnd = o.end_date ? new Date(o.end_date) : null
            if (obsEnd) obsEnd.setHours(23, 59, 59, 999)

            const hasLimit = o.payments_left != null && o.payments_left > 0
            let occurrences = 0

            while (current <= endOfMonth) {
                if (hasLimit && occurrences >= o.payments_left!) break
                if (obsEnd && current > obsEnd) break

                if (current >= now) {
                    monthlyObligations += o.amount
                    occurrences++
                }

                if (o.frequency === 'weekly') current.setDate(current.getDate() + 7)
                else if (o.frequency === 'bi-weekly') current.setDate(current.getDate() + 14)
                else if (o.frequency === 'monthly') current = addMonths(current, 1)
                else if (o.frequency === 'yearly') current = addMonths(current, 12)
                else break
            }
        })

        return { totalLiquid, totalDebt, monthlyObligations }
    }, [pots, obligations])

    const combinedGoals = useMemo(() => {
        // Map Monzo savings pots to Goal interface
        const potGoals = pots
            .filter(p =>
                p.type === 'savings' ||
                p.target_amount > 0 ||
                p.name.toLowerCase().includes('goal')
            )
            .map(p => ({
                id: p.id,
                name: p.name,
                target_amount: p.target_amount > 0 ? p.target_amount : p.balance,
                current_amount: p.balance,
                deadline: null,
                is_recurring: p.name.toLowerCase().includes('rent'),
                profile: p.profile,
                created_at: p.created_at
            }))

        return [...goals, ...potGoals].sort((a, b) => (b.current_amount || 0) - (a.current_amount || 0))
    }, [pots, goals])

    const displayPockets = useMemo(() => {
        return pots.filter(p => {
            // A. PHYSICAL ACCOUNTS (acc_...) - These go in the big summary card
            const isPhysicalAccount = p.monzo_id?.startsWith('acc_')
            if (isPhysicalAccount) return false

            // B. SAVINGS GOALS - These go in the savings section
            const isSavingsGoal = p.type === 'savings' || p.target_amount > 0 || p.name.toLowerCase().includes('goal')
            if (isSavingsGoal) return false

            // C. UNLINKED LOCAL POTS - If it doesn't have a Monzo ID and is named "General", it's likely a primary account placeholder
            if (!p.monzo_id && p.name.toLowerCase().includes('general')) return false

            // D. SPENDING POTS - Everything else (starting with pot_ or local custom pots)
            return true
        }).sort((a, b) => (b.balance || 0) - (a.balance || 0))
    }, [pots])

    const loading = pLoading || oLoading || gLoading

    return (
        <div className="flex flex-col h-dvh bg-white">
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#fafafa]">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between px-6 py-8 md:px-10 md:py-10 bg-[#fafafa] z-10 gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">Financial Matrix</h2>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Finance Dashboard</h1>
                        <div className="flex items-center gap-3 pt-2">
                            <div className="flex bg-black/[0.04] p-1 rounded-xl border border-black/[0.06] items-center w-fit">
                                <button
                                    onClick={() => setProfile('personal')}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeProfile === 'personal' ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black/60'}`}
                                >
                                    Personal
                                </button>
                                <button
                                    onClick={() => setProfile('business')}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeProfile === 'business' ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black/60'}`}
                                >
                                    Business
                                </button>
                            </div>
                            <button
                                onClick={togglePrivacy}
                                className={`p-2 rounded-xl border transition-all ${isPrivacyEnabled ? 'border-[#059669]/30 text-[#059669] bg-[#059669]/10 shadow-[0_2px_10px_rgba(5,150,105,0.1)]' : 'bg-white border-black/[0.1] text-black/40 hover:text-black/60 hover:border-black/[0.2] shadow-sm'}`}
                                title={isPrivacyEnabled ? "Disable Privacy Mode" : "Enable Privacy Mode"}
                            >
                                {isPrivacyEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 h-fit mb-1">
                        {(loading || isSyncing) && (
                            <div className="flex items-center gap-1.5 text-black/30">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span className="text-[11px]">{isSyncing ? 'Syncing Monzo' : 'Loading'}</span>
                            </div>
                        )}
                        <div className="text-[11px] text-black/25 uppercase tracking-wider font-medium">
                            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                        <MonzoSyncControls />
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="p-6 pb-2 select-none flex items-center gap-2 text-[13px] font-bold text-black/40 uppercase tracking-wider">
                        Quick Access
                    </div>

                    {/* Finance Quick Actions */}
                    <div className="px-6 pb-4">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {[
                                { href: "/finances/analytics", color: "blue", icon: BarChart3, label: "Analytics" },
                                { href: "/finances/liabilities", color: "red", icon: CreditCard, label: "Liabilities" },
                                { href: "/finances/transactions", color: "emerald", icon: Receipt, label: "Transactions" },
                                { href: "/finances/projections", color: "purple", icon: Calendar, label: "Projections" },
                                { href: "/finances/savings", color: "amber", icon: PiggyBank, label: "Savings" },
                                { href: "/finances/settings", color: "orange", icon: Settings, label: "Settings" }
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
                                                btn.color === 'red' ? "bg-red-500/10 text-red-600" :
                                                    btn.color === 'purple' ? "bg-purple-500/10 text-purple-600" :
                                                        btn.color === 'amber' ? "bg-amber-500/10 text-amber-600" :
                                                            btn.color === 'orange' ? "bg-orange-500/10 text-orange-600" :
                                                                "bg-black/5 text-black"
                                    )}>
                                        <btn.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[12px] font-bold text-black/70 group-hover:text-black">{btn.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 pb-2 select-none flex items-center gap-2 text-[13px] font-bold text-black/40 uppercase tracking-wider">
                        Overview
                    </div>
                    <div className="px-6 pb-2 space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <SummaryCard
                                label="Total Liquid Cash"
                                value={isSyncing ? "0000.00" : `£${summary.totalLiquid.toFixed(2)}`}
                                isShimmering={isSyncing}
                                icon={<Wallet className="w-5 h-5" />}
                                color="#059669"
                                sub={`${pots.length} pots`}
                                tooltip="The sum of current balances across all your active pots. This is your immediately spendable money."
                            />
                            <SummaryCard
                                label="Total Debt Projection"
                                value={`£${summary.totalDebt.toFixed(2)}`}
                                icon={<TrendingDown className="w-5 h-5" />}
                                color="#dc2626"
                                sub="Estimated remaining on fixed terms"
                                tooltip={<span>For each obligation with an end date: <strong>payment amount × number of remaining payments</strong>. Monthly = months left. Weekly = months × 52÷12. Bi-weekly = months × 26÷12. Yearly = rounded years left (min 1). No end date = excluded.</span>}
                            />
                            <SummaryCard
                                label="Monthly Obligations"
                                value={`£${summary.monthlyObligations.toFixed(2)}`}
                                icon={<DollarSign className="w-5 h-5" />}
                                color="#d97706"
                                sub="Fixed debt payments"
                                tooltip="All recurring obligations normalised to a monthly equivalent. Monthly = as-is, weekly × 52 ÷ 12, bi-weekly × 26 ÷ 12, yearly ÷ 12."
                            />
                        </div>

                        {/* Main Layout Stack */}
                        <div className="flex flex-col gap-6 pb-6">
                            {/* Unified Responsive Grid (Mobile -> Tablet -> Desktop) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">

                                {/* Main Account Balance */}
                                <div className="order-1 col-span-1 lg:col-span-2 xl:col-span-3">
                                    <div className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                                            <Wallet className="w-32 h-32 rotate-12" />
                                        </div>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center">
                                                <Wallet className="w-6 h-6 text-[#7c3aed]" />
                                            </div>
                                            <div>
                                                <h2 className="text-[17px] font-bold text-black">Main Account</h2>
                                                <p className="text-[11px] text-black/40 uppercase tracking-widest font-bold">Monzo {activeProfile === 'personal' ? 'Personal' : 'Business'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <div className="text-4xl sm:text-5xl font-black text-black tracking-tighter privacy-blur">
                                                <Skeleton show={isSyncing}>
                                                    £{pots
                                                        .filter(p => 
                                                            p.monzo_id?.startsWith('acc_') || 
                                                            (!p.monzo_id && (p.name.toLowerCase().includes('general') || p.name.toLowerCase().includes('joint account')))
                                                        )
                                                        .reduce((sum, p) => sum + p.balance, 0)
                                                        .toFixed(2)}
                                                </Skeleton>
                                            </div>
                                            <p className="text-[11px] text-[#059669] font-bold uppercase tracking-wider mt-1 flex items-center justify-end gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
                                                Live from Monzo
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pots */}
                                <div className="order-2 col-span-1 lg:col-span-2 xl:col-span-3">
                                    <SectionBlock title="Pockets & Pots" desc="Your synced allocations">
                                        <PotsGrid pots={displayPockets} isSyncing={isSyncing} />
                                    </SectionBlock>
                                </div>

                                {/* Savings Goals */}
                                <div className="order-3 col-span-1 lg:col-span-2 xl:col-span-3">
                                    <SectionBlock title="Savings Goals" desc="Long-term targets">
                                        <GoalsList goals={combinedGoals} onRefresh={refetchGoals} />
                                    </SectionBlock>
                                </div>

                                {/* Liabilities */}
                                <div className="order-4 col-span-1 lg:col-span-2 xl:col-span-3">
                                    <SectionBlock title="Liabilities" desc="30-Day projections for subs & debt">
                                        <CalendarVisualizer obligations={obligations} />
                                    </SectionBlock>
                                </div>
                            </div>

                            {/* Bottom Row: Recent Ledger & AI Chat */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                                <div className="col-span-1 h-full min-h-[500px]">
                                    <SectionBlock title="Recent Transactions" desc="Latest transactions">
                                        <TransactionLedger />
                                    </SectionBlock>
                                </div>
                                <div className="col-span-1 h-full min-h-[500px]">
                                    <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm flex flex-col">
                                        <h2 className="text-[17px] font-bold text-black mb-1">Financial Co-pilot</h2>
                                        <p className="text-[12px] text-black/40 mb-4">Ask Gemini about patterns, advice, or status</p>
                                        <div className="flex-1 overflow-hidden min-h-[400px]">
                                            <KarrAIChat
                                                context={{
                                                    pots: pots.map(p => ({ n: p.name, b: p.balance, t: p.target_budget })),
                                                    goals: goals.map(g => ({ n: g.name, c: g.current_amount, t: g.target_amount })),
                                                    obligations: obligations.map(o => ({ n: o.name, a: o.amount, f: o.frequency, d: o.next_due_date }))
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <KarrFooter />
            </div>
        </div>
    )
}

function SummaryCard({ label, value, icon, color, sub, tooltip, isShimmering }: { label: string; value: string; icon: React.ReactNode; color: string; sub?: string; tooltip?: string | React.ReactNode; isShimmering?: boolean }) {
    return (
        <div className="rounded-xl border border-black/[0.07] bg-white p-4 hover:bg-black/[0.01] transition-colors shadow-sm flex flex-col h-full">
            <div className="flex flex-col gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
                    <span style={{ color }}>{icon}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <p className="text-[11px] uppercase tracking-wider text-black/40 font-semibold">{label}</p>
                    {tooltip && <InfoTooltip content={tooltip} side="bottom" />}
                </div>
            </div>
            <div className="mt-auto pt-2">
                <div className="text-2xl font-bold text-black tracking-tight privacy-blur leading-none">
                    <Skeleton show={isShimmering}>
                        {value}
                    </Skeleton>
                </div>
                <div className="h-[28px] mt-1 flex items-start">
                    {sub && <p className="text-[11px] text-black/35 leading-tight">{sub}</p>}
                </div>
            </div>
        </div>
    )
}

function SectionBlock({ title, desc, children }: { title?: string; desc?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
            {(title || desc) && (
                <div className="flex items-baseline gap-2 mb-4">
                    {title && <h2 className="text-[14px] font-bold text-black">{title}</h2>}
                    {desc && <span className="text-[11px] text-black/35">{desc}</span>}
                </div>
            )}
            {children}
        </div>
    )
}
