'use client'

import { useMemo, useState, useEffect } from 'react'
import { DollarSign, TrendingDown, Wallet, RefreshCw, Eye, EyeOff, BarChart3, Receipt, Calendar, PiggyBank, Settings, CreditCard, TrendingUp, SlidersHorizontal } from 'lucide-react'
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
import { PaydayAdvisor } from './PaydayAdvisor'
import { MonzoSyncControls } from './MonzoSyncControls'

// --- Helper Components ---

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

function SectionBlock({ title, desc, children, className }: { title?: string; desc?: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm", className)}>
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

export function CommandCenter() {
    const { pots, loading: pLoading, isSyncing, refetch: refetchPots, syncMonzo } = usePots()
    const { obligations, loading: oLoading } = useRecurring()
    const { goals, loading: gLoading, refetch: refetchGoals } = useGoals()
    const { refetch: refetchTransactions } = useTransactions()
    const { activeProfile, setProfile, isPrivacyEnabled, togglePrivacy } = useFinanceProfile()
    const searchParams = useSearchParams()
    const router = useRouter()

    const defaultButtons = useMemo(() => [
        { href: "/finances/projections", color: "purple", icon: TrendingUp, label: "Projections" },
        { href: "/finances/transactions", color: "emerald", icon: Receipt, label: "Transactions" },
        { href: "/finances/analytics", color: "blue", icon: BarChart3, label: "Analytics" },
        { href: "/finances/liabilities", color: "red", icon: CreditCard, label: "Liabilities" },
        { href: "/finances/savings", color: "amber", icon: PiggyBank, label: "Savings" },
        { href: "/finances/pot-settings", color: "orange", icon: SlidersHorizontal, label: "Pot Settings" }
    ], [])

    const [quickAccessButtons, setQuickAccessButtons] = useState(defaultButtons)

    useEffect(() => {
        const savedSubOrderStr = localStorage.getItem('schro_sidebar_sub_order')
        if (savedSubOrderStr) {
            try {
                const subOrderObj = JSON.parse(savedSubOrderStr)
                if (subOrderObj['Finances']) {
                    const orderedLabels = subOrderObj['Finances']
                    setQuickAccessButtons([...defaultButtons].sort((a, b) => {
                        const idxA = orderedLabels.indexOf(a.label)
                        const idxB = orderedLabels.indexOf(b.label)
                        if (idxA === -1 && idxB === -1) return 0
                        if (idxA === -1) return 1
                        if (idxB === -1) return -1
                        return idxA - idxB
                    }))
                }
            } catch (e) {}
        }
    }, [defaultButtons])

    useEffect(() => {
        if (searchParams.get('monzo') === 'connected') {
            syncMonzo().then(() => {
                const newParams = new URLSearchParams(searchParams.toString())
                newParams.delete('monzo')
                router.replace('/finances?' + newParams.toString())
            })
        }
    }, [searchParams])

    const summary = useMemo(() => {
        const totalLiquid = pots.reduce((s, p) => s + p.balance, 0)
        let totalDebt = 0
        let monthlyObligations = 0
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endOfMonth.setHours(23, 59, 59, 999)

        obligations.forEach(o => {
            if (o.end_date || o.payments_left) {
                const paymentsLeft = countRemainingPayments(o.next_due_date, o.end_date, o.frequency, now, o.payments_left)
                totalDebt += o.amount * paymentsLeft
            }

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

    const displayPockets = useMemo(() => {
        return pots.filter(p => {
            const nameLower = p.name.toLowerCase();
            const isPrimaryAccount = p.monzo_id?.startsWith('acc_') && (
                nameLower.includes('general') ||
                nameLower.includes('joint account')
            );
            if (isPrimaryAccount) return false;

            const isSavingsSide = p.type === 'savings' ||
                                 (p.target_amount || 0) > 0 ||
                                 nameLower.includes('goal') ||
                                 nameLower.includes('savings');
            if (isSavingsSide) return false;

            if (!p.monzo_id && (nameLower.includes('general') || nameLower.includes('joint account'))) {
                const hasLinked = pots.some(other => other.monzo_id?.startsWith('acc_') && other.profile === p.profile);
                if (hasLinked) return false;
            }

            return true;
        }).sort((a, b) => (b.balance || 0) - (a.balance || 0))
    }, [pots])

    const combinedGoals = useMemo(() => {
        const potGoals = pots
            .filter(p => {
                const nameLower = p.name.toLowerCase();
                return p.type === 'savings' ||
                       (p.target_amount || 0) > 0 ||
                       nameLower.includes('goal') ||
                       nameLower.includes('savings');
            })
            .map(p => ({
                id: p.id,
                name: p.name,
                current_amount: p.balance,
                target_amount: p.target_amount || 0,
                deadline: null,
                profile: p.profile,
                created_at: p.last_synced_at || new Date().toISOString(),
                category: 'savings' as const,
                last_update: p.last_synced_at || new Date().toISOString()
            }))

        return potGoals.sort((a, b: any) => (b.current_amount || 0) - (a.current_amount || 0))
    }, [pots, goals, activeProfile])

    const loading = pLoading || oLoading || gLoading

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                <div className="flex-1 p-6 md:p-10">
                    <div className="max-w-7xl mx-auto w-full space-y-12 pb-12">
                {/* Page Header */}
                <header className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h2 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">Financial Matrix</h2>
                            <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Finance Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-4 h-fit text-[11px] text-black/25 uppercase tracking-[0.2em] font-black">
                            {(loading || isSyncing) && (
                                <div className="flex items-center gap-1.5 text-black/30">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>{isSyncing ? 'Syncing' : 'Loading'}</span>
                                </div>
                            )}
                            <div>
                                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                            <MonzoSyncControls />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
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
                </header>

                {/* Quick Access */}
                <div className="space-y-4">
                    <div className="select-none text-[11px] font-black text-black/40 uppercase tracking-[0.3em]">
                        Quick Access
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {quickAccessButtons.map((btn) => (
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

                {/* Overview */}
                <div className="space-y-8">
                    <div className="select-none text-[11px] font-black text-black/40 uppercase tracking-[0.3em]">
                        Overview
                    </div>
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <SummaryCard
                            label="Total Liquid Cash"
                            value={(loading || isSyncing) ? "0000.00" : `£${summary.totalLiquid.toFixed(2)}`}
                            isShimmering={loading || isSyncing}
                            icon={<Wallet className="w-5 h-5" />}
                            color="#059669"
                            sub={`${pots.length} pots`}
                            tooltip="Sum of current balances across all active pots."
                        />
                        <SummaryCard
                            label="Total Debt Projection"
                            value={`£${summary.totalDebt.toFixed(2)}`}
                            icon={<TrendingDown className="w-5 h-5" />}
                            color="#dc2626"
                            sub="Remaining on fixed terms"
                            tooltip="Projected total for obligations with end dates."
                        />
                        <SummaryCard
                            label="Monthly Obligations"
                            value={`£${summary.monthlyObligations.toFixed(2)}`}
                            icon={<DollarSign className="w-5 h-5" />}
                            color="#d97706"
                            sub="Fixed debt payments"
                            tooltip="Total recurring payments normalized to monthly."
                        />
                    </div>

                    {/* Payday Advisor Insight */}
                    {activeProfile === 'personal' && <PaydayAdvisor />}

                    {/* Main Layout Stack */}
                    <div className="space-y-6">
                        {/* Main Account Balance */}
                        <div className="rounded-2xl border border-black/[0.08] bg-white p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group">
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
                                    <Skeleton show={loading || isSyncing}>
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

                        {/* Grid Areas */}
                        <div className="grid grid-cols-1 gap-6">
                            <SectionBlock title="Pots" desc="Your synced allocations">
                                <PotsGrid pots={displayPockets} isSyncing={isSyncing} />
                            </SectionBlock>

                            {/* Transactions & Savings Goals */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                                <SectionBlock title="Recent Transactions" desc="Latest activity" className="flex flex-col min-h-[420px]">
                                    <div className="flex-1 overflow-y-auto no-scrollbar">
                                        <TransactionLedger />
                                    </div>
                                </SectionBlock>

                                <SectionBlock title="Savings Goals" desc="Long-term targets" className="flex flex-col min-h-[420px]">
                                    <div className="flex-1 overflow-y-auto no-scrollbar">
                                        <GoalsList goals={combinedGoals} onRefresh={refetchGoals} />
                                    </div>
                                </SectionBlock>
                            </div>

                            {/* Liabilities */}
                            <div className="grid grid-cols-1 gap-6 items-stretch">
                                <SectionBlock title="Liabilities" desc="30-Day projections for subs & debt" className="flex flex-col min-h-[420px]">
                                    <div className="flex-1 overflow-y-auto no-scrollbar">
                                        <CalendarVisualizer obligations={obligations} />
                                    </div>
                                </SectionBlock>
                            </div>

                            {/* AI Copilot (Full Width) */}
                            <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm flex flex-col min-h-[420px]">
                                <h2 className="text-[17px] font-bold text-black mb-1">Financial Co-pilot</h2>
                                <p className="text-[12px] text-black/40 mb-4">Ask Gemini about patterns or status</p>
                                <div className="flex-1 overflow-hidden">
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
