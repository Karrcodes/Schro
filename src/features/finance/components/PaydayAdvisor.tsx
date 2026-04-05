'use client'

import React, { useState } from 'react'
import { Sparkles, Wallet, ShieldCheck, ShoppingBag, Check, Clock, X, ChevronDown, ChevronUp, TrendingUp, Info } from 'lucide-react'
import DatePickerInput from '@/components/DatePickerInput'
import { usePots } from '../hooks/usePots'
import { useRecurring } from '../hooks/useRecurring'
import { usePayslips } from '../hooks/usePayslips'
import { useTransactions } from '../hooks/useTransactions'
import { usePayProjection } from '../hooks/usePayProjection'
import { useGoals as useManifestGoals } from '../../goals/hooks/useGoals'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { usePaydayAdvisorAnalysis } from '@/features/finance/hooks/usePaydayAdvisorAnalysis'

function toLocalDateStr(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

interface PaydayAdvisorProps {
    className?: string
}

export function PaydayAdvisor({ className }: PaydayAdvisorProps) {
    const { pots } = usePots()
    const { obligations, createObligation, markObligationAsPaid } = useRecurring()
    const { payslips } = usePayslips()
    const { transactions } = useTransactions()
    const { wishlist } = useManifestGoals()
    const { getProjectedPayForDate } = usePayProjection()

    const [viewMode, setViewMode] = useState<'upcoming' | 'last'>('upcoming')
    const [isCollapsed, setIsCollapsed] = useState(true)
    const [explanationRequested, setExplanationRequested] = useState<string | null>(null)
    const [editingItem, setEditingItem] = useState<{ id: string, name: string, currentAmount: number } | null>(null)
    const [dismissedItems, setDismissedItems] = useState<string[]>([])
    
    // UI-only Modal/Action states
    const [selectedObligation, setSelectedObligation] = useState<any | null>(null)
    const [purchaseModalItem, setPurchaseModalItem] = useState<any | null>(null)
    const [itemToDismiss, setItemToDismiss] = useState<any | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [bnplMode, setBnplMode] = useState(false)
    const [bnplForm, setBnplForm] = useState({
        amount: 0,
        payments_left: 3,
        lender: 'clearpay',
        next_date: toLocalDateStr(new Date())
    })

    const { 
        income, 
        mandatoryAllocations, 
        potSplits, 
        visaAllocation, 
        visaFulfilled, 
        funAllocation, 
        funFulfilled, 
        isProjected, 
        progress,
        overrides,
        setOverride,
        activeDate
    } = usePaydayAdvisorAnalysis(viewMode)

    // Maintaining compatibility with the existing large JSX block
    const analysis = {
        income,
        mandatoryAllocations,
        potSplits,
        visaAllocation,
        visaFulfilled,
        funAllocation,
        funFulfilled,
        isProjected,
        progress,
        detectedNetPay: income,
        isViewingUpcoming: viewMode === 'upcoming',
        activeDate,
        affordableWishlistItems: wishlist.filter(item => 
            item.status === 'queue' && 
            !dismissedItems.includes(item.id) &&
            (item.price || 0) > 0 && 
            (item.price || 0) <= funAllocation
        ).sort((a, b) => (a.price || 0) - (b.price || 0)),
        visaExplanation: `Calculated as 40% of surplus to stay on track for your £500 monthly goal.`
    }

    return (
        <div className={cn("bg-white border border-black/[0.08] rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500", className)}>
            <div className="p-6 border-b border-black/[0.04] bg-emerald-500/[0.01]">
                {/* Header with History Switcher */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[18px] font-black text-black leading-tight tracking-tight">Payday Advisor</h2>
                                <button 
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    className="p-2 hover:bg-black/5 rounded-xl transition-all"
                                >
                                    {isCollapsed ? <ChevronDown className="w-5 h-5 text-black/40" /> : <ChevronUp className="w-5 h-5 text-black/40" />}
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <button 
                                    onClick={() => setViewMode('upcoming')}
                                    className={cn("text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest transition-all", viewMode === 'upcoming' ? "bg-emerald-500 text-black" : "bg-black/5 text-black/30 hover:bg-black/10")}
                                >
                                    Upcoming
                                </button>
                                <button 
                                    onClick={() => setViewMode('last')}
                                    className={cn("text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest transition-all", viewMode === 'last' ? "bg-emerald-500 text-black" : "bg-black/5 text-black/30 hover:bg-black/10")}
                                >
                                    Last Payday
                                </button>
                                {isProjected && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-black/5 text-black/40 text-[8px] font-bold uppercase tracking-widest rounded-full">
                                        <Clock className="w-2.5 h-2.5" /> Projection
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                        <div className="text-[20px] font-black text-black tracking-tight flex items-baseline gap-1.5">
                            <span className="text-[12px] font-medium text-black/30">£</span>
                            {analysis.income.toFixed(2)}
                        </div>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Expected Net Pay</p>
                    </div>
                </div>

                {/* Main Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase text-black/40 tracking-[0.15em]">Strategic Progress</span>
                        <span className="text-[11px] font-black text-emerald-600">{analysis.progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/[0.03] rounded-full overflow-hidden border border-black/[0.02]">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${analysis.progress}%` }}
                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]"
                        />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 space-y-8">
                            {/* Tier 1: Fixed Mandatory */}
                            <div>
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    <div className="h-px bg-black/[0.05] flex-1" />
                                    <h4 className="text-[10px] font-black uppercase text-black/25 tracking-widest">Phase 1: Foundations (Auto)</h4>
                                    <div className="h-px bg-black/[0.05] flex-1" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {analysis.mandatoryAllocations.map((a) => (
                                        <div 
                                            key={a.name} 
                                            onClick={() => setSelectedObligation(a)}
                                            className={cn(
                                                "flex items-center justify-between p-3.5 rounded-xl border transition-all group relative overflow-hidden cursor-pointer",
                                                !overrides[a.name]?.disregarded ? (a.fulfilled ? "border-emerald-500/10 bg-emerald-50/40 shadow-sm" : "border-black/5 bg-white hover:border-black/10") : "border-black/5 bg-black/5 opacity-40 grayscale"
                                            )}
                                        >
                                            {a.fulfilled && (
                                                <div className="absolute top-0 right-0 p-1.5">
                                                    <div className="flex items-center gap-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">
                                                        <Check className="w-2 h-2" /> Verified
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", a.bg)}>
                                                    <a.icon className={cn("w-4 h-4", a.color)} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn("text-[13px] font-bold text-black truncate", overrides[a.name]?.disregarded && "line-through")}>{a.name}</span>
                                                        <div className="hidden group-hover:flex items-center gap-1">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setOverride(a.name, { manualFulfilled: !overrides[a.name]?.manualFulfilled }) }}
                                                                className={cn("p-0.5 rounded transition-colors", overrides[a.name]?.manualFulfilled ? "text-emerald-500" : "text-black/10 hover:text-black")}
                                                                title="Manual Verify"
                                                            >
                                                                <ShieldCheck className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setOverride(a.name, { disregarded: !overrides[a.name]?.disregarded }) }}
                                                                className="p-0.5 rounded text-black/10 hover:text-black transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setExplanationRequested(a.name) }}
                                                                className="p-0.5 rounded text-black/10 hover:text-black transition-colors"
                                                            >
                                                                <Info className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-black/40 font-medium truncate">{a.desc}</p>
                                                </div>
                                            </div>
                                            <span className={cn("text-[14px] font-black text-black shrink-0 ml-2", overrides[a.name]?.disregarded && "opacity-10")}>£{a.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tier 2: Strategic Pillars */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-4 px-1">
                                        <div className="h-px bg-black/[0.05] flex-1" />
                                        <h4 className="text-[10px] font-black uppercase text-black/25 tracking-widest">Phase 2: Pillars</h4>
                                        <div className="h-px bg-black/[0.05] flex-1" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className={cn("flex items-center justify-between p-3.5 rounded-xl border transition-all group relative overflow-hidden", !overrides['GTV Application']?.disregarded ? (analysis.visaFulfilled ? "border-indigo-500/10 bg-indigo-50/40" : "border-black/5 bg-white") : "border-black/5 bg-black/5 opacity-40 grayscale")}>
                                            {analysis.visaFulfilled && (
                                                <div className="absolute top-0 right-0 p-1.5">
                                                    <div className="flex items-center gap-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">
                                                        <Check className="w-2 h-2" /> Verified
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center"><Wallet className="w-4 h-4 text-white" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn("text-[13px] font-bold text-black truncate", overrides['GTV Application']?.disregarded && "line-through")}>GTV Application</span>
                                                        <div className="hidden group-hover:flex items-center gap-1">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setOverride('GTV Application', { manualFulfilled: !overrides['GTV Application']?.manualFulfilled }) }}
                                                                className={cn("p-1 rounded transition-colors", overrides['GTV Application']?.manualFulfilled ? "bg-emerald-500/10 text-emerald-600" : "hover:bg-black/5 text-black/20 hover:text-black")}
                                                                title="Manual Verify"
                                                            >
                                                                <ShieldCheck className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setEditingItem({ id: 'GTV Application', name: 'GTV Application', currentAmount: overrides['GTV Application']?.manualAmount ?? analysis.visaAllocation }) }}
                                                                className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black transition-colors"
                                                            >
                                                                <TrendingUp className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setOverride('GTV Application', { disregarded: !overrides['GTV Application']?.disregarded }) }}
                                                                className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setExplanationRequested('GTV Application') }}
                                                                className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black transition-colors"
                                                            >
                                                                <Info className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-indigo-600/60 font-medium truncate">Target: £500 Goal 🇬🇧</p>
                                                </div>
                                            </div>
                                            <span className={cn("text-[14px] font-black text-black shrink-0 ml-2", overrides['GTV Application']?.disregarded && "opacity-10")}>£{analysis.visaAllocation.toFixed(2)}</span>
                                        </div>

                                        {analysis.potSplits.map((a) => (
                                            <div key={a.name} className={cn("flex items-center justify-between p-3.5 rounded-xl border transition-all group relative overflow-hidden", !overrides[a.name]?.disregarded ? (a.fulfilled ? "border-indigo-500/10 bg-indigo-50/40 shadow-sm" : "border-black/5 bg-white") : "border-black/5 bg-black/5 opacity-40 grayscale")}>
                                                {a.fulfilled && (
                                                    <div className="absolute top-0 right-0 p-1.5">
                                                        <div className="flex items-center gap-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">
                                                            <Check className="w-2 h-2" /> Verified
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                                                        <Wallet className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={cn("text-[13px] font-bold text-black truncate", overrides[a.name]?.disregarded && "line-through")}>{a.name}</span>
                                                            <div className="hidden group-hover:flex items-center gap-1">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setOverride(a.name, { manualFulfilled: !overrides[a.name]?.manualFulfilled }) }}
                                                                    className={cn("p-1 rounded transition-colors", overrides[a.name]?.manualFulfilled ? "bg-emerald-500/10 text-emerald-600" : "hover:bg-black/5 text-black/20 hover:text-black")}
                                                                    title="Manual Verify"
                                                                >
                                                                    <ShieldCheck className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setEditingItem({ id: a.name, name: a.name, currentAmount: overrides[a.name]?.manualAmount ?? a.amount }) }}
                                                                    className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black transition-colors"
                                                                >
                                                                    <TrendingUp className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setOverride(a.name, { disregarded: !overrides[a.name]?.disregarded }) }}
                                                                    className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black transition-colors"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setExplanationRequested(a.name) }}
                                                                    className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black transition-colors"
                                                                >
                                                                    <Info className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-black/40 font-medium truncate">{a.desc}</p>
                                                    </div>
                                                </div>
                                                <span className={cn("text-[14px] font-black text-black shrink-0 ml-2", overrides[a.name]?.disregarded && "opacity-10")}>£{a.amount.toFixed(2)}</span>
                                            </div>
                                        ))}

                                        {analysis.funAllocation > 0 && (
                                            <div className={cn("flex items-center justify-between p-3.5 rounded-xl border transition-all group relative overflow-hidden", !overrides['Fun Pot Surplus']?.disregarded ? (analysis.funFulfilled ? "border-pink-500/10 bg-pink-50/40" : "border-black/5 bg-white") : "border-black/5 bg-black/5 opacity-40 grayscale")}>
                                                {analysis.funFulfilled && (
                                                    <div className="absolute top-0 right-0 p-1.5">
                                                        <div className="flex items-center gap-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">
                                                            <Check className="w-2 h-2" /> Verified
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-white" /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={cn("text-[13px] font-bold text-black truncate", overrides['Fun Pot Surplus']?.disregarded && "line-through")}>Fun Pot Surplus</span>
                                                            <div className="hidden group-hover:flex items-center gap-1">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setOverride('Fun Pot Surplus', { manualFulfilled: !overrides['Fun Pot Surplus']?.manualFulfilled }) }}
                                                                    className={cn("p-1 rounded transition-colors", overrides['Fun Pot Surplus']?.manualFulfilled ? "bg-emerald-500/10 text-emerald-600" : "hover:bg-black/5 text-black/20 hover:text-black")}
                                                                    title="Manual Verify"
                                                                >
                                                                    <ShieldCheck className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setEditingItem({ id: 'Fun Pot Surplus', name: 'Fun Pot Surplus', currentAmount: overrides['Fun Pot Surplus']?.manualAmount ?? analysis.funAllocation }) }}
                                                                    className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black transition-colors"
                                                                >
                                                                    <TrendingUp className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setOverride('Fun Pot Surplus', { disregarded: !overrides['Fun Pot Surplus']?.disregarded }) }}
                                                                    className="p-1 hover:bg-black/5 rounded text-black/20 hover:text-black transition-colors"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-pink-600/60 font-medium truncate">Guilt-free disposable</p>
                                                    </div>
                                                </div>
                                                <span className={cn("text-[14px] font-black text-black shrink-0 ml-2", overrides['Fun Pot Surplus']?.disregarded && "opacity-10")}>£{analysis.funAllocation.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tier 3: Aspirations */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 px-1">
                                        <div className="h-px bg-black/[0.05] flex-1" />
                                        <h4 className="text-[10px] font-black uppercase text-black/25 tracking-widest">Phase 3: Aspirations</h4>
                                        <div className="h-px bg-black/[0.05] flex-1" />
                                    </div>
                                    <div className="space-y-3">
                                        {analysis.affordableWishlistItems.slice(0, 3).map((item) => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 group hover:border-amber-500/30 transition-all">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/5 shrink-0 border border-black/5">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <ShoppingBag className="w-5 h-5 text-amber-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-black text-black leading-tight truncate">{item.title}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black text-amber-700">£{Number(item.price).toFixed(2)}</span>
                                                        <span className="px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-700 border border-amber-500/10">{item.priority}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setPurchaseModalItem(item)} className="px-2.5 py-1.25 bg-black text-white rounded-lg text-[7px] font-black uppercase tracking-widest">Bought</button>
                                                    <button onClick={() => setItemToDismiss(item)} className="px-2.5 py-1.25 bg-black/5 text-black/40 rounded-lg text-[7px] font-black uppercase tracking-widest">Hide</button>
                                                </div>
                                            </div>
                                        ))}
                                        {analysis.affordableWishlistItems.length === 0 && (
                                            <div className="p-8 text-center bg-black/[0.01] rounded-2xl border border-dashed border-black/[0.05]">
                                                <Sparkles className="w-5 h-5 text-black/5 mx-auto mb-2" />
                                                <p className="text-[9px] font-black uppercase text-black/30 tracking-widest">Awaiting Surplus Allocation</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals - Standard Restoration */}
            {selectedObligation && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedObligation(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                            <button onClick={() => setSelectedObligation(null)} className="p-2 text-black/20 hover:text-black"><X className="w-5 h-5" /></button>
                        </div>
                        <h3 className="text-[20px] font-black text-black mb-1">{selectedObligation.name}</h3>
                        <p className="text-[12px] text-black/40 font-bold uppercase tracking-widest mb-6">Due This Cycle: £{selectedObligation.amount.toFixed(2)}</p>
                        
                        {selectedObligation.explanation && (
                            <p className="text-[12px] text-black/60 italic mb-8 p-4 bg-black/[0.02] rounded-xl">"{selectedObligation.explanation}"</p>
                        )}
                        
                        <div className="space-y-3">
                            <button 
                                disabled={isUpdating}
                                onClick={async () => {
                                    setIsUpdating(true)
                                    try {
                                        await markObligationAsPaid(selectedObligation)
                                        setSelectedObligation(null)
                                    } finally {
                                        setIsUpdating(false)
                                    }
                                }}
                                className="w-full py-4 bg-emerald-500 text-black font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20"
                            >
                                {isUpdating ? <Clock className="w-4 h-4 animate-spin mx-auto" /> : "Mark as Paid"}
                            </button>
                            <button onClick={() => setSelectedObligation(null)} className="w-full py-4 bg-black/5 text-black/40 font-black uppercase text-[11px] tracking-widest rounded-2xl">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Other modals (Explanation, Editing, Purchase) follow the same restoration pattern... */}
            <AnimatePresence>
                {editingItem && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl">
                            <h3 className="text-[14px] font-black uppercase tracking-widest text-black/40 mb-4">Modify Allocation</h3>
                            <p className="text-[16px] font-bold text-black mb-4">{editingItem.name}</p>
                            <input 
                                type="number"
                                autoFocus
                                defaultValue={editingItem.currentAmount.toFixed(2)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = parseFloat((e.target as HTMLInputElement).value)
                                        setOverride(editingItem.id, { manualAmount: val })
                                        setEditingItem(null)
                                    }
                                }}
                                className="w-full bg-black/5 border-none rounded-xl p-4 text-[24px] font-black focus:ring-2 focus:ring-emerald-500 mb-6"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setEditingItem(null)} className="flex-1 py-3 px-4 bg-black/5 rounded-xl text-[11px] font-black uppercase tracking-widest">Cancel</button>
                                <button 
                                    onClick={() => {
                                        const input = document.querySelector('input[type="number"]') as HTMLInputElement
                                        const val = parseFloat(input.value)
                                        setOverride(editingItem.id, { manualAmount: val })
                                        setEditingItem(null)
                                    }}
                                    className="flex-1 py-3 px-4 bg-emerald-500 text-black rounded-xl text-[11px] font-black uppercase tracking-widest"
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {explanationRequested && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setExplanationRequested(null)} />
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <Info className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-[14px] font-black uppercase tracking-widest text-black/40">Strategy Query</h3>
                            </div>
                            <p className="text-[15px] font-bold text-black mb-2">{explanationRequested}</p>
                            <p className="text-[13px] text-black/60 leading-relaxed italic mb-6">
                                {explanationRequested === 'GTV Application' ? analysis.visaExplanation : (
                                 analysis.potSplits.find((p: any) => p.name === explanationRequested)?.explanation || 
                                 analysis.mandatoryAllocations.find((p: any) => p.name === explanationRequested)?.explanation || 
                                 "Standard strategic allocation based on your weekly net income surplus.")
                                }
                            </p>
                            <button onClick={() => setExplanationRequested(null)} className="w-full py-3 bg-black text-white rounded-xl text-[11px] font-black uppercase tracking-widest">Understood</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Purchase Options Modal */}
            <AnimatePresence>
                {purchaseModalItem && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setPurchaseModalItem(null)
                                setBnplMode(false)
                            }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden border border-black/5"
                        >
                            {!bnplMode ? (
                                <div className="p-8">
                                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 mx-auto">
                                        <Check className="w-8 h-8 text-amber-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-black text-center tracking-tighter mb-2 italic">Strategic Manifestation</h3>
                                    <p className="text-[13px] font-medium text-black/40 text-center mb-8 px-4">
                                        Congratulations on acquiring <span className="text-black font-bold">"{purchaseModalItem.title}"</span>. How was this transaction handled?
                                    </p>
                                    
                                    <div className="space-y-3">
                                        <button 
                                            onClick={async () => {
                                                setDismissedItems(prev => [...prev, purchaseModalItem.id])
                                                setPurchaseModalItem(null)
                                            }}
                                            className="w-full py-5 bg-black text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20"
                                        >
                                            Bought Outright
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setBnplMode(true)
                                                setBnplForm(prev => ({ ...prev, amount: Number(purchaseModalItem.price) / 3 }))
                                            }}
                                            className="w-full py-5 bg-white border border-black/[0.08] hover:border-black text-black rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all"
                                        >
                                            Pay in Installments (BNPL)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8">
                                    <h3 className="text-xl font-black text-black tracking-tighter mb-6">BNPL Schedule</h3>
                                    
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest block mb-2">Service Provider</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['clearpay', 'klarna'].map(l => (
                                                    <button 
                                                        key={l}
                                                        onClick={() => setBnplForm({ ...bnplForm, lender: l })}
                                                        className={cn(
                                                            "py-3 rounded-xl border-2 text-[11px] font-black uppercase tracking-widest transition-all",
                                                            bnplForm.lender === l ? "bg-black border-black text-white" : "border-black/[0.04] text-black/40 hover:border-black/10"
                                                        )}
                                                    >
                                                        {l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest block mb-2">Recurring Amount (Per Installment)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-black/20 text-sm">£</span>
                                                <input 
                                                    type="number"
                                                    value={bnplForm.amount}
                                                    onChange={e => setBnplForm({ ...bnplForm, amount: Number(e.target.value) })}
                                                    className="w-full py-4 pl-10 pr-4 bg-black/[0.03] border-none rounded-xl text-sm font-black outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-black/30 uppercase tracking-widest block mb-2">Payments Left</label>
                                                <input 
                                                    type="number"
                                                    value={bnplForm.payments_left}
                                                    onChange={e => setBnplForm({ ...bnplForm, payments_left: Number(e.target.value) })}
                                                    className="w-full py-4 px-4 bg-black/[0.03] border-none rounded-xl text-sm font-black outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-black/30 uppercase tracking-widest block mb-2">Next Due</label>
                                                <DatePickerInput 
                                                    value={bnplForm.next_date ?? ''}
                                                    onChange={val => setBnplForm({ ...bnplForm, next_date: val })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 space-y-3">
                                        <button 
                                            disabled={isUpdating}
                                            onClick={async () => {
                                                setIsUpdating(true)
                                                try {
                                                    await createObligation({
                                                        name: bnplForm.lender === 'clearpay' ? 'Clearpay' : 'Klarna',
                                                        amount: bnplForm.amount,
                                                        frequency: 'monthly',
                                                        next_due_date: bnplForm.next_date,
                                                        payments_left: bnplForm.payments_left,
                                                        description: `Wishlist: ${purchaseModalItem.title}`,
                                                        category: 'bills',
                                                        emoji: bnplForm.lender === 'clearpay' ? '💚' : '💗'
                                                    } as any)
                                                    setDismissedItems(prev => [...prev, purchaseModalItem.id])
                                                    setPurchaseModalItem(null)
                                                    setBnplMode(false)
                                                } finally {
                                                    setIsUpdating(false)
                                                }
                                            }}
                                            className="w-full py-5 bg-black text-emerald-400 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                                        >
                                            {isUpdating ? <Clock className="w-4 h-4 animate-spin mx-auto" /> : "Confirm Liability"}
                                        </button>
                                        <button 
                                            onClick={() => setBnplMode(false)}
                                            className="w-full py-5 bg-black/[0.03] text-black/30 rounded-3xl font-black text-[11px] uppercase tracking-widest"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Dismiss Confirmation Modal */}
            <AnimatePresence>
                {itemToDismiss && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setItemToDismiss(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 text-center border border-black/5"
                        >
                            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-6 mx-auto">
                                <X className="w-8 h-8 text-black/20" />
                            </div>
                            <h3 className="text-2xl font-black text-black tracking-tighter mb-2">Dismiss Suggestion?</h3>
                            <p className="text-[14px] font-medium text-black/40 mb-8 leading-relaxed">
                                Are you sure you want to ignore <span className="text-black font-bold">"{itemToDismiss.title}"</span> for this payday cycle?
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setItemToDismiss(null)}
                                    className="flex-1 py-4 bg-black/[0.03] hover:bg-black/[0.06] text-black font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all"
                                >
                                    Back
                                </button>
                                <button 
                                    onClick={() => {
                                        setDismissedItems(prev => [...prev, itemToDismiss.id])
                                        setItemToDismiss(null)
                                    }}
                                    className="flex-1 py-4 bg-black text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-black/10 transition-all hover:bg-black/90 active:scale-95"
                                >
                                    Yes, Hide
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}