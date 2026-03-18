'use client'

import React, { useMemo, useState } from 'react'
import { Star, Sparkles, ArrowRight, Wallet, Calendar, ShieldCheck, Target, TrendingUp, Info, ShoppingBag, Briefcase, Check, Clock, X, ChevronDown, ChevronUp } from 'lucide-react'
import { usePots } from '../hooks/usePots'
import { useRecurring } from '../hooks/useRecurring'
import { usePayslips } from '../hooks/usePayslips'
import { useTransactions } from '../hooks/useTransactions'
import { usePayProjection } from '../hooks/usePayProjection'
import { useGoals as useManifestGoals } from '../../goals/hooks/useGoals'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

interface PaydayAdvisorProps {
    className?: string
}

export function PaydayAdvisor({ className }: PaydayAdvisorProps) {
    const { pots } = usePots()
    const { obligations, createObligation } = useRecurring()
    const { payslips } = usePayslips()
    const { transactions } = useTransactions()
    const { markObligationAsPaid } = useRecurring()
    const { wishlist } = useManifestGoals()
    const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null)
    const [selectedObligation, setSelectedObligation] = useState<any | null>(null)
    const [purchaseModalItem, setPurchaseModalItem] = useState<any | null>(null)
    const [itemToDismiss, setItemToDismiss] = useState<any | null>(null)
    const [dismissedItems, setDismissedItems] = useState<string[]>([])
    const [isUpdating, setIsUpdating] = useState(false)
    const [bnplMode, setBnplMode] = useState(false)
    const [bnplForm, setBnplForm] = useState({
        amount: 0,
        payments_left: 3,
        lender: 'clearpay',
        next_date: new Date().toISOString().split('T')[0]
    })

    // State for History
    const [viewMode, setViewMode] = useState<'upcoming' | 'last'>('upcoming')
    const [isCollapsed, setIsCollapsed] = useState(true)

    // Strategy Constants from User
    const RENT_WEEKLY = 143.75
    const DAILY_EXPENSES_WEEKLY = 100
    const VISA_MONTHLY_TARGET = 500
    const { getProjectedPayForDate } = usePayProjection()
    
    const sortedPayslips = useMemo(() => {
        return [...payslips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [payslips])

    const latestPayslip = sortedPayslips[0] || null

    const analysis = useMemo(() => {
        const now = new Date()
        
        // Find next Thursday (Payday - Monzo Early Pay)
        const nextThursday = new Date(now)
        const dayOfWeek = now.getDay()
        
        // Rollover logic: If Thursday night (>= 6pm), move to next week's payday
        const isThursdayNight = dayOfWeek === 4 && now.getHours() >= 18
        const daysToThursday = (4 - dayOfWeek + 7) % 7
        const targetThursdayOffset = (daysToThursday === 0 && isThursdayNight) ? 7 : daysToThursday
        
        nextThursday.setDate(now.getDate() + targetThursdayOffset)
        nextThursday.setHours(0, 0, 0, 0)

        // Find last Thursday (Previous Payday)
        const lastThursday = new Date(nextThursday)
        lastThursday.setDate(nextThursday.getDate() - 7)

        const isViewingUpcoming = viewMode === 'upcoming'
        const activeDate = isViewingUpcoming ? nextThursday : lastThursday
        
        // For 'upcoming', we use a synced payslip if it matches the target date (+/- 1 day)
        // For 'last', we search for the payslip in that cycle's window.
        const upcomingPayslip = payslips.find(p => {
            const pDate = new Date(p.date)
            pDate.setHours(0,0,0,0)
            const tDate = new Date(nextThursday)
            tDate.setHours(0,0,0,0)
            const diff = Math.abs(pDate.getTime() - tDate.getTime())
            return diff <= 24 * 60 * 60 * 1000
        })

        const activePayslip = isViewingUpcoming 
            ? upcomingPayslip 
            : payslips.find(p => {
                const pDate = new Date(p.date)
                return pDate >= lastThursday && pDate < nextThursday
              }) || latestPayslip

        const projectedPayForTarget = getProjectedPayForDate(nextThursday)
        const isProjected = isViewingUpcoming ? !upcomingPayslip : !activePayslip
        const detectedNetPay = isViewingUpcoming 
            ? (upcomingPayslip?.net_pay || projectedPayForTarget) 
            : (activePayslip?.net_pay || projectedPayForTarget)
        
        // Define cycle lookahead (Thursday to Thursday)
        const cycleStart = activeDate
        const cycleEnd = new Date(activeDate)
        cycleEnd.setDate(activeDate.getDate() + 7)

        // 1. Obligations Tiering
        const cycleObligations = obligations.filter(o => {
            const dueDate = new Date(o.next_due_date)
            return dueDate >= cycleStart && dueDate < cycleEnd
        })

        // --- NEW: Grooming Logic ---
        const lastDayOfMonth = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0).getDate()
        const isEndOfMonthCycle = Array.from({length: 7}, (_, i) => {
            const d = new Date(activeDate)
            d.setDate(activeDate.getDate() + i)
            return d.getDate() >= 25 && d.getDate() <= lastDayOfMonth
        }).some(Boolean)

        // Mid-month is roughly 14 days after the end of month (so approx 10th-15th)
        const isMidMonthCycle = Array.from({length: 7}, (_, i) => {
            const d = new Date(activeDate)
            d.setDate(activeDate.getDate() + i)
            return d.getDate() >= 10 && d.getDate() <= 15
        }).some(Boolean)

        const groomingAmount = isEndOfMonthCycle ? 60 : (isMidMonthCycle ? 20 : 0)
        const groomingPriority = isEndOfMonthCycle ? 'high' : 'low'

        // --- NEW: Liability Lookahead (Next 3 weeks) ---
        let futureLiabilityShield = 0
        const lookaheadWeeks = 3
        for (let i = 1; i <= lookaheadWeeks; i++) {
            const fStart = new Date(nextThursday)
            fStart.setDate(nextThursday.getDate() + (i * 7))
            const fEnd = new Date(fStart)
            fEnd.setDate(fStart.getDate() + 7)
            
            const fPay = getProjectedPayForDate(fStart)
            const fObligations = obligations.filter(o => {
                const d = new Date(o.next_due_date)
                return d >= fStart && d < fEnd
            }).reduce((s, o) => s + o.amount, 0)

            const fMandatory = RENT_WEEKLY + DAILY_EXPENSES_WEEKLY
            const fSurplus = fPay - fObligations - fMandatory
            
            if (fSurplus < 50) {
                // If future week is tight, save an extra 15% of current detected pay to shield it
                futureLiabilityShield += (detectedNetPay * 0.05) 
            }
        }

        const currysPayments = cycleObligations.filter(o => o.name.toLowerCase().includes('currys'))
        const clearpayPayments = cycleObligations.filter(o => o.name.toLowerCase().includes('clearpay'))
        const klarnaPayments = cycleObligations.filter(o => o.name.toLowerCase().includes('klarna'))
        const otherObligations = cycleObligations.filter(o => 
            !o.name.toLowerCase().includes('currys') && 
            !o.name.toLowerCase().includes('clearpay') && 
            !o.name.toLowerCase().includes('klarna')
        )

        // Matcher helper
        const isFulfilled = (amount: number, keywords: string[], potId?: string, isMainAccount: boolean = false) => {
            return transactions.some(t => {
                const tDate = new Date(t.date)
                const isInWindow = tDate >= cycleStart && tDate < cycleEnd
                
                // Pot match is primary for pot splits
                const potMatch = potId ? t.pocket_id === potId : (isMainAccount ? !t.pocket_id : false)
                
                // For mandatory/debts, we check for "[Liability]" tag or keyword match
                const isLiability = t.description.includes('[Liability]')
                const nameMatch = keywords.some(k => t.description.toLowerCase().includes(k.toLowerCase()))
                
                // Amount match (within 2% tolerance or greater)
                const amountMatch = (t.amount >= amount * 0.98)

                if (potId || isMainAccount) {
                    return isInWindow && potMatch && amountMatch
                }

                return isInWindow && (isLiability || nameMatch) && amountMatch
            })
        }

        // 6. Pot detection (Strict User Names)
        const findPot = (keywords: string[]) => 
            pots.find(p => keywords.some(k => p.name.toLowerCase().includes(k.toLowerCase())))

        const groomingPot = findPot(['Grooming 💈'])
        const recurringPot = findPot(['Recurring 🔄'])
        const liabilitiesPot = findPot(['Liabilities 💸'])
        const funPot = findPot(['Fun \uD83D\uDECD\uFE0F'])
        const rentPot = findPot(['Monthly Rent 🏡'])
        const visaPot = findPot(['GTV Application 🇬🇧'])

        // 2. Fixed mandatory
        const mandatoryAllocations = [
            { 
                name: 'Rent Allocation', 
                amount: RENT_WEEKLY, 
                icon: Wallet, 
                color: 'text-blue-500', 
                bg: 'bg-blue-50', 
                desc: 'Target: Monthly Rent 🏡',
                fulfilled: isFulfilled(RENT_WEEKLY, ['rent'], rentPot?.id)
            },
            { 
                name: 'Daily Expenses', 
                amount: DAILY_EXPENSES_WEEKLY, 
                icon: ShoppingBag, 
                color: 'text-orange-500', 
                bg: 'bg-orange-50', 
                desc: 'Main account buffer',
                fulfilled: isFulfilled(DAILY_EXPENSES_WEEKLY, ['daily', 'expenses', 'living'], undefined, true)
            },
            { 
                name: 'Currys Flexipay', 
                amount: currysPayments.reduce((s, o) => s + o.amount, 0), 
                icon: ShieldCheck, 
                color: 'text-purple-600', 
                bg: 'bg-purple-50', 
                desc: 'Mandatory / On-time', 
                isMandatory: true,
                fulfilled: currysPayments.length === 0 || currysPayments.every(cp => cp.amount <= 0 || isFulfilled(cp.amount, ['currys']))
            },
            ...otherObligations.map(o => ({
                name: o.name,
                amount: o.amount,
                icon: Wallet,
                color: 'text-slate-500',
                bg: 'bg-slate-50',
                desc: o.description || 'Standard Obligation',
                fulfilled: isFulfilled(o.amount, [o.name])
            }))
        ]

        if (groomingAmount > 0 && groomingPriority === 'high') {
            mandatoryAllocations.push({ 
                name: 'Grooming (End of Month)', 
                amount: groomingAmount, 
                icon: Sparkles, 
                color: 'text-rose-500', 
                bg: 'bg-rose-50', 
                desc: 'Braiding & Cut',
                fulfilled: isFulfilled(groomingAmount, ['grooming', 'hair'])
            } as any)
        }

        if (futureLiabilityShield > 0) {
            mandatoryAllocations.push({ 
                name: 'Future Liability Shield', 
                amount: futureLiabilityShield, 
                icon: ShieldCheck, 
                color: 'text-cyan-600', 
                bg: 'bg-cyan-50', 
                desc: 'Anticipating heavy weeks',
                fulfilled: isFulfilled(futureLiabilityShield, ['shield', 'liability buffer', 'buffer'])
            } as any)
        }

        const totalMandatory = mandatoryAllocations.reduce((s, a) => s + a.amount, 0)
        let remaining = detectedNetPay - totalMandatory

        // 3. Dynamic Visa Allocation (Priority after mandatory)
        const visaBaseTarget = VISA_MONTHLY_TARGET / 4 // 125
        const visaAllocation = Math.min(Math.max(80, remaining * 0.4), visaBaseTarget, remaining > 80 ? remaining : 0)
        remaining -= visaAllocation

        // 4. Flexible liabilities (Clearpay then Klarna)
        const clearpayTotal = clearpayPayments.reduce((s, o) => s + o.amount, 0)
        const klarnaTotal = klarnaPayments.reduce((s, o) => s + o.amount, 0)

        const canAffordClearpay = remaining >= clearpayTotal
        if (canAffordClearpay) remaining -= clearpayTotal

        const canAffordKlarna = remaining >= klarnaTotal
        if (canAffordKlarna) remaining -= klarnaTotal

        const potSplits = [
            { 
                name: 'Liabilities Buffer', 
                amount: Math.max(0, remaining * 0.25), 
                pot: liabilitiesPot, 
                desc: 'Target: Liabilities 💸',
                fulfilled: isFulfilled(Math.max(0, remaining * 0.25), ['liabilities', 'debt'], liabilitiesPot?.id)
            },
            { 
                name: 'Recurring Reserve', 
                amount: Math.max(0, remaining * 0.15), 
                pot: recurringPot, 
                desc: 'Target: Recurring 🔄',
                fulfilled: isFulfilled(Math.max(0, remaining * 0.15), ['recurring', 'subscriptions'], recurringPot?.id)
            },
        ]

        if (groomingAmount > 0 && groomingPriority === 'low') {
            potSplits.push({ 
                name: 'Mid-Month Haircut', 
                amount: groomingAmount, 
                pot: groomingPot, 
                desc: 'Target: Grooming 💈',
                fulfilled: isFulfilled(groomingAmount, ['hair', 'grooming'], groomingPot?.id)
            } as any)
        } else {
            potSplits.push({ 
                name: 'Grooming Fund', 
                amount: Math.max(0, remaining * 0.1), 
                pot: groomingPot, 
                desc: 'Target: Grooming 💈',
                fulfilled: isFulfilled(Math.max(0, remaining * 0.1), ['grooming', 'hair'], groomingPot?.id)
            } as any)
        }

        // 7. SURPLUS LOGIC (Business & Fun)
        let businessAllocation = 0
        let funAllocation = 0

        const currentTotalPlanned = potSplits.reduce((s, a) => s + a.amount, 0)
        let disposable = remaining - currentTotalPlanned

        if (disposable > 100) {
            businessAllocation = disposable * 0.4
            funAllocation = disposable * 0.6 // Swipe all residue to Fun
            disposable = 0
        } else if (disposable > 0) {
            funAllocation = disposable
            disposable = 0
        }

        // 8. Wishlist Integration (Small items within reach)
        // 8. Wishlist Integration (Multiple items within reach)
        let wishlistBudget = funAllocation + disposable
        const affordableWishlistItems = []
        const availableItems = wishlist
            .filter(item => 
                item.status === 'queue' && 
                !dismissedItems.includes(item.id) &&
                (item.price || 0) > 0 && 
                (item.price || 0) <= wishlistBudget
            )
            .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))

        for (const item of availableItems) {
            if ((item.price || 0) <= wishlistBudget) {
                affordableWishlistItems.push(item)
                wishlistBudget -= (item.price || 0)
            }
        }

        return {
            income: detectedNetPay,
            mandatoryAllocations,
            visaAllocation,
            otherObligations,
            potSplits,
            surplus: disposable,
            businessAllocation,
            funAllocation,
            funPot,
            clearpayPayments,
            klarnaPayments,
            canAffordClearpay,
            canAffordKlarna,
            isViewingUpcoming,
            activeDate,
            affordableWishlistItems,
            rawLatest: latestPayslip?.net_pay || 0,
            isProjected,
            progress: (() => {
                const all = [...mandatoryAllocations, ...potSplits]
                const done = all.filter(a => (a as any).fulfilled).length
                return (done / all.length) * 100
            })()
        }
    }, [latestPayslip, payslips, obligations, pots, viewMode, getProjectedPayForDate, transactions])

    if (!latestPayslip && viewMode === 'last') {
        return (
            <div className={cn("bg-white border border-dashed border-black/10 rounded-2xl p-8 text-center", className)}>
                <Sparkles className="w-6 h-6 text-black/10 mx-auto mb-2" />
                <p className="text-[13px] font-bold text-black/40 uppercase tracking-widest">Neural Advisor Standby</p>
                <div className="flex justify-center mt-4">
                    <button onClick={() => setViewMode('upcoming')} className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Switch to Upcoming</button>
                </div>
            </div>
        )
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
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/[0.03] p-1.5 rounded-xl border border-black/[0.05]">
                        <div className="text-right px-2">
                            <div className="flex items-center gap-2 justify-end mb-0.5">
                                <span className="text-[9px] font-black text-black/20 uppercase tracking-widest block whitespace-nowrap">
                                    {analysis?.activeDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                                </span>
                                {analysis?.isProjected ? (
                                    <span className="text-[7px] px-1 py-0.5 bg-black/5 text-black/40 rounded uppercase font-black tracking-tighter shadow-sm border border-black/5">Projected</span>
                                ) : (
                                    <span className="text-[7px] px-1 py-0.5 bg-emerald-500 text-black rounded uppercase font-black tracking-tighter shadow-[0_2px_10px_-4px_rgba(16,185,129,0.5)]">Actual</span>
                                )}
                            </div>
                            <span className="text-[15px] font-black text-black">£{analysis?.income.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Weekly Goal Progress</span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{analysis?.progress.toFixed(0)}% Fulfilled</span>
                    </div>
                    <div className="h-2 w-full bg-black/[0.03] rounded-full overflow-hidden border border-black/[0.05]">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-1000 ease-out relative"
                            style={{ width: `${analysis?.progress}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                        </div>
                    </div>
                </div>

                {/* Main Allocation Highlight */}
                <div className="p-4 rounded-xl bg-black text-white overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-50" />
                    <div className="relative flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <Target className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-white leading-snug">
                                    GTV Application 🇬🇧 Priority: <span className="text-emerald-400 font-black">£{(analysis?.visaAllocation || 0).toFixed(2)}</span>
                                </p>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.05em] mt-0.5">
                                    Strategic allocation to GTV Application 🇬🇧 pot
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[14px] font-black text-emerald-400">{( (analysis?.visaAllocation || 0) / (VISA_MONTHLY_TARGET/4) * 100).toFixed(0)}%</div>
                            <div className="text-[8px] font-black uppercase text-white/30">Of Avg Weekly Target</div>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        key="collapsible-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-black/[0.04]">
                            {/* Mandatory and Priority */}
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Mandatory & High Priority
                                </h3>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {analysis?.mandatoryAllocations.map((item, i) => (
                                        <div key={i} className={cn(
                                            "flex items-center justify-between p-3.5 rounded-xl border transition-all group relative overflow-hidden",
                                            (item as any).fulfilled ? "bg-emerald-50/20 border-emerald-500/20" : "border-black/[0.04] bg-black/[0.01] hover:border-black/10"
                                        )}>
                                            {(item as any).fulfilled && (
                                                <div className="absolute top-0 right-0 p-1.5">
                                                    <div className="flex items-center gap-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">
                                                        <Check className="w-2 h-2" />Success
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.bg)}>
                                                    <item.icon className={cn("w-4 h-4", item.color)} />
                                                </div>
                                                <div>
                                                    <span className="text-[13px] font-bold text-black group-hover:text-emerald-600 transition-colors">{item.name}</span>
                                                    <p className="text-[10px] text-black/30 font-medium">{item.desc}</p>
                                                </div>
                                            </div>
                                            <span className="text-[14px] font-black text-black">£{item.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/30 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                <Target className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <span className="text-[13px] font-bold text-black group-hover:text-emerald-600 transition-colors">GTV Application 🇬🇧</span>
                                                <p className="text-[10px] text-emerald-600/60 font-medium">Target: GTV Application 🇬🇧 Pot</p>
                                            </div>
                                        </div>
                                        <span className="text-[14px] font-black text-black">£{analysis?.visaAllocation.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Flexible Liabilities & Pots */}
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Wallet className="w-3.5 h-3.5" /> Flexible & Buffers
                                </h3>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {(analysis?.clearpayPayments.length || 0) > 0 && (
                                        <div className={cn("p-3 rounded-xl border flex flex-col gap-2 transition-all group/card", analysis?.canAffordClearpay ? "bg-emerald-50/20 border-emerald-500/10" : "bg-amber-50/50 border-amber-500/10")}>
                                            <div onClick={() => analysis.clearpayPayments.length === 1 && setSelectedObligation(analysis.clearpayPayments[0])} className={cn("flex items-center justify-between", analysis.clearpayPayments.length === 1 && "cursor-pointer active:scale-[0.98]")}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px]", analysis?.canAffordClearpay ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>
                                                        {analysis?.canAffordClearpay ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[12px] font-bold text-black flex items-center gap-1.5">
                                                            Clearpay {analysis?.canAffordClearpay ? 'Priority' : 'Window'}
                                                            {analysis?.canAffordClearpay && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md uppercase tracking-tighter font-black">Pay Now</span>}
                                                            {!analysis?.canAffordClearpay && <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-md uppercase tracking-tighter font-black">Delay Available</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={cn("text-[13px] font-black", analysis?.canAffordClearpay ? "text-emerald-700" : "text-amber-700")}>
                                                    £{analysis?.clearpayPayments.reduce((s,o) => s + o.amount, 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 pl-8">
                                                {analysis?.clearpayPayments.map((p, idx) => (
                                                    <button key={idx} onClick={() => setSelectedObligation(p)} className="w-full flex flex-col gap-0.5 text-left p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 transition-all group/row active:scale-[0.98]">
                                                        <div className="flex items-center justify-between text-[10px] text-black/40 font-bold group-hover/row:text-black transition-colors">
                                                            <span className="flex items-center gap-1.5">{p.name}<ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/row:opacity-100 -translate-x-1 group-hover/row:translate-x-0 transition-all" /></span>
                                                            <span>£{p.amount.toFixed(2)}</span>
                                                        </div>
                                                        {p.description && <p className="text-[8px] text-black/20 font-medium italic truncate max-w-[150px]">{p.description}</p>}
                                                    </button>
                                                ))}
                                                {!analysis?.canAffordClearpay && <p className="text-[9px] text-amber-600/70 font-medium italic mt-1 leading-tight">* Utilizing 14-day grace period to preserve essentials</p>}
                                            </div>
                                        </div>
                                    )}
                                    {(analysis?.klarnaPayments.length || 0) > 0 && (
                                        <div className={cn("p-3 rounded-xl border flex flex-col gap-2 transition-all group/card", analysis?.canAffordKlarna ? "bg-blue-50/20 border-blue-500/10" : "bg-purple-50/50 border-purple-500/10")}>
                                            <div onClick={() => analysis.klarnaPayments.length === 1 && setSelectedObligation(analysis.klarnaPayments[0])} className={cn("flex items-center justify-between", analysis.klarnaPayments.length === 1 && "cursor-pointer active:scale-[0.98]")}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px]", analysis?.canAffordKlarna ? "bg-blue-500 text-white" : "bg-purple-500 text-white")}>
                                                        {analysis?.canAffordKlarna ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[12px] font-bold text-black flex items-center gap-1.5">
                                                            Klarna {analysis?.canAffordKlarna ? 'Settlement' : 'Schedule'}
                                                            {analysis?.canAffordKlarna && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded-md uppercase tracking-tighter font-black">Pay Now</span>}
                                                            {!analysis?.canAffordKlarna && <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/10 text-purple-600 rounded-md uppercase tracking-tighter font-black">Delay 30d</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={cn("text-[13px] font-black", analysis?.canAffordKlarna ? "text-blue-700" : "text-purple-700")}>
                                                    £{analysis?.klarnaPayments.reduce((s,o) => s + o.amount, 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 pl-8">
                                                {analysis?.klarnaPayments.map((p, idx) => (
                                                    <button key={idx} onClick={() => setSelectedObligation(p)} className="w-full flex flex-col gap-0.5 text-left p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 transition-all group/row active:scale-[0.98]">
                                                        <div className="flex items-center justify-between text-[10px] text-black/40 font-bold group-hover/row:text-black transition-colors">
                                                            <span className="flex items-center gap-1.5">{p.name}<ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/row:opacity-100 -translate-x-1 group-hover/row:translate-x-0 transition-all" /></span>
                                                            <span>£{p.amount.toFixed(2)}</span>
                                                        </div>
                                                        {p.description && <p className="text-[8px] text-black/20 font-medium italic truncate max-w-[150px]">{p.description}</p>}
                                                    </button>
                                                ))}
                                                {!analysis?.canAffordKlarna && <p className="text-[9px] text-purple-600/70 font-medium italic mt-1 leading-tight">* Pushing back to prioritize high-yield goals & Grooming</p>}
                                            </div>
                                        </div>
                                    )}
                                    {analysis?.potSplits.map((item, i) => (
                                        <div key={i} className={cn("group flex items-center justify-between p-3.5 rounded-xl border transition-all relative overflow-hidden", (item as any).fulfilled ? "bg-emerald-50/20 border-emerald-500/10" : "border-black/[0.04] hover:bg-black/[0.02]")}>
                                            {(item as any).fulfilled && (
                                                <div className="absolute top-0 right-0 p-1.5">
                                                    <div className="flex items-center gap-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter"><Check className="w-2 h-2" />Success</div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] transition-all", (item as any).fulfilled ? "bg-emerald-500 text-white" : "bg-black/[0.03] text-black/40 group-hover:bg-black group-hover:text-white")}>{item.name[0]}</div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-black">{item.name}</p>
                                                    <p className="text-[10px] text-black/30 font-medium">Target: {item.pot?.name || 'Manual'}</p>
                                                </div>
                                            </div>
                                            <span className="text-[14px] font-black text-black">£{item.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {analysis?.businessAllocation != null && analysis.businessAllocation > 0 && (
                                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-blue-500/10 bg-blue-50/20 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center"><Briefcase className="w-4 h-4 text-white" /></div>
                                                <div><span className="text-[13px] font-bold text-black">Business Opportunity</span><p className="text-[10px] text-blue-600/60 font-medium">Surplus growth allocation</p></div>
                                            </div>
                                            <span className="text-[14px] font-black text-black">£{analysis.businessAllocation.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {analysis?.funAllocation != null && analysis.funAllocation > 0 && (
                                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-pink-500/10 bg-pink-50/20 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-white" /></div>
                                                <div><span className="text-[13px] font-bold text-black">Fun Pot Surplus</span><p className="text-[10px] text-pink-600/60 font-medium">Guilt-free disposable</p></div>
                                            </div>
                                            <span className="text-[14px] font-black text-black">£{analysis.funAllocation.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Wishlist Recommendations */}
                        {analysis?.affordableWishlistItems && analysis.affordableWishlistItems.length > 0 && (
                            <div className="p-6 pt-0">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1 mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <h4 className="text-[10px] font-black uppercase text-amber-900 tracking-widest leading-none">Aspirations within Reach</h4>
                                        </div>
                                        <span className="text-[9px] font-bold text-black/30 uppercase tracking-[0.1em]">Funded by Fun/Surplus</span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                        {analysis.affordableWishlistItems.map((item) => {
                                            const OT_RATE_NET = 20.35 * (1 - 0.1821)
                                            const HOURS_PER_SHIFT = 11.5
                                            const hoursNeeded = (item.price || 0) / OT_RATE_NET
                                            const shiftsNeeded = hoursNeeded / HOURS_PER_SHIFT
                                            const otLabel = hoursNeeded < HOURS_PER_SHIFT
                                                ? `${hoursNeeded.toFixed(1)} OT hrs`
                                                : `${shiftsNeeded.toFixed(1)} OT shifts`

                                            return (
                                                <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 group hover:border-amber-500/30 transition-all">
                                                    {/* Image */}
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/5 flex-shrink-0 border border-black/5">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ShoppingBag className="w-5 h-5 text-amber-400" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                            <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                                                                item.priority === 'super' ? 'border-purple-200 bg-purple-50 text-purple-600' :
                                                                item.priority === 'high' ? 'border-red-200 bg-red-50 text-red-500' :
                                                                item.priority === 'mid' ? 'border-amber-200 bg-amber-50 text-amber-600' :
                                                                'border-black/5 bg-black/[0.03] text-black/40'
                                                            }`}>{item.priority}</span>
                                                            {item.category && <span className="text-[7px] font-bold text-black/25 uppercase tracking-widest">{item.category}</span>}
                                                        </div>
                                                        <p className="text-[13px] font-black text-black leading-tight truncate">{item.title}</p>
                                                        {item.description && <p className="text-[9px] text-black/40 font-medium mt-0.5 line-clamp-1">{item.description}</p>}
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[11px] font-black text-amber-700">£{Number(item.price).toFixed(2)}</span>
                                                            <span className="w-0.5 h-0.5 rounded-full bg-black/20" />
                                                            <span className="text-[8px] font-bold text-black/30 uppercase tracking-wide">⚡ {otLabel} to afford</span>
                                                            {item.url && (
                                                                <>
                                                                    <span className="w-0.5 h-0.5 rounded-full bg-black/20" />
                                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[8px] font-black text-black/30 uppercase tracking-wide hover:text-amber-600 transition-colors">Store ↗</a>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-col gap-1.5 shrink-0">
                                                        <button onClick={() => setPurchaseModalItem(item)} className="px-3 py-1.5 bg-black text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:scale-[1.03] active:scale-[0.97] transition-all">
                                                            Bought
                                                        </button>
                                                        <button onClick={() => setItemToDismiss(item)} className="px-3 py-1.5 bg-black/5 hover:bg-black/10 text-black/40 hover:text-black rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {selectedObligation && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setSelectedObligation(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center">
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                </div>
                                <button 
                                    onClick={() => setSelectedObligation(null)}
                                    className="p-2 rounded-xl hover:bg-black/5 transition-colors text-black/20 hover:text-black"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-[20px] font-black text-black leading-tight">{selectedObligation.name}</h3>
                                    <p className="text-[12px] text-black/40 font-bold uppercase tracking-widest mt-1">
                                        Amount Due: <span className="text-black">£{selectedObligation.amount.toFixed(2)}</span>
                                    </p>
                                </div>

                                {selectedObligation.description && (
                                    <div className="p-3 bg-black/[0.02] rounded-xl border border-black/[0.04]">
                                        <p className="text-[11px] text-black/60 font-medium leading-relaxed italic">
                                            "{selectedObligation.description}"
                                        </p>
                                    </div>
                                )}

                                <div className="pt-4 space-y-3">
                                    <button 
                                        disabled={isUpdating}
                                        onClick={async () => {
                                            setIsUpdating(true)
                                            try {
                                                await markObligationAsPaid(selectedObligation)
                                                setSelectedObligation(null)
                                            } catch (e) {
                                                console.error(e)
                                            } finally {
                                                setIsUpdating(false)
                                            }
                                        }}
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        {isUpdating ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Mark as Paid
                                    </button>
                                    <button 
                                        onClick={() => setSelectedObligation(null)}
                                        className="w-full py-4 bg-black/5 hover:bg-black/10 text-black/40 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                                <input 
                                                    type="date"
                                                    value={bnplForm.next_date}
                                                    onChange={e => setBnplForm({ ...bnplForm, next_date: e.target.value })}
                                                    className="w-full py-4 px-4 bg-black/[0.03] border-none rounded-xl text-[10px] font-black outline-none"
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
                                            {isUpdating ? <Clock className="w-4 h-4 animate-spin" /> : "Confirm Liability"}
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
    function remainingVisaTarget(surplus: number = 0) {
        // Mock calculation - September is roughly 24 weeks away from March 
        const targetDate = new Date(2026, 8, 1) // Sept 1
        const now = new Date()
        const weeksLeft = Math.max(1, Math.round((targetDate.getTime() - now.getTime()) / (7 * 86400000)))
        return weeksLeft
    }
}