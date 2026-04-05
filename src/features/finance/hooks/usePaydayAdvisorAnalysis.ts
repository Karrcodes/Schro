'use client'

import { useMemo, useState } from 'react'
import { usePots } from '@/features/finance/hooks/usePots'
import { useRecurring } from '@/features/finance/hooks/useRecurring'
import { usePayslips } from '@/features/finance/hooks/usePayslips'
import { useTransactions } from '@/features/finance/hooks/useTransactions'
import { usePayProjection } from '@/features/finance/hooks/usePayProjection'
import { useGoals as useManifestGoals } from '@/features/goals/hooks/useGoals'
import { Wallet, ShoppingBag, ShieldCheck, Target } from 'lucide-react'
import { useFinanceAdvisor, AdvisorOverride } from '@/features/finance/contexts/FinanceAdvisorContext'

// Helper to get a stable YYYY-MM-DD from a Date object
function toLocalDateStr(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

export function usePaydayAdvisorAnalysis(viewMode: 'upcoming' | 'last' = 'upcoming') {
    const { pots } = usePots()
    const { obligations } = useRecurring()
    const { payslips } = usePayslips()
    const { transactions } = useTransactions()
    const { wishlist } = useManifestGoals()
    const { getProjectedPayForDate } = usePayProjection()
    const { overrides: allOverrides, setOverride } = useFinanceAdvisor()

    // Local UI state for things that don't need persistence
    const [dismissedItems, setDismissedItems] = useState<string[]>([])

    const RENT_WEEKLY = 143.75
    const DAILY_EXPENSES_WEEKLY = 100
    const VISA_MONTHLY_TARGET = 500

    const isViewingUpcoming = viewMode === 'upcoming'
    
    // Calculate dates outside memo for easier access and cross-cycle isolation
    const nextThursday = useMemo(() => {
        const now = new Date()
        const nextThursday = new Date(now)
        const dayOfWeek = now.getDay()
        const isThursdayLate = dayOfWeek === 4 && now.getHours() === 23 && now.getMinutes() === 59
        const daysToThursday = (4 - dayOfWeek + 7) % 7
        const targetThursdayOffset = (daysToThursday === 0 && isThursdayLate) ? 7 : daysToThursday
        nextThursday.setDate(now.getDate() + targetThursdayOffset)
        nextThursday.setHours(0, 0, 0, 0)
        return nextThursday
    }, [])

    const lastThursday = useMemo(() => {
        const d = new Date(nextThursday)
        d.setDate(nextThursday.getDate() - 7)
        return d
    }, [nextThursday])

    const activeDate = isViewingUpcoming ? nextThursday : lastThursday
    const currentWeekId = toLocalDateStr(activeDate)
    const overrides = allOverrides[currentWeekId] || {}

    const analysis = useMemo(() => {
        const now = new Date()
        
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
                pDate.setHours(0,0,0,0)
                const windowStart = new Date(lastThursday)
                windowStart.setDate(lastThursday.getDate() - 1)
                windowStart.setHours(0,0,0,0)
                const windowEnd = new Date(lastThursday)
                windowEnd.setDate(lastThursday.getDate() + 1)
                windowEnd.setHours(23,59,59,999)
                return pDate >= windowStart && pDate <= windowEnd
              })

        const projectedPayForTarget = getProjectedPayForDate(nextThursday)
        const isProjected = isViewingUpcoming ? !upcomingPayslip : !activePayslip
        const detectedNetPay = isViewingUpcoming 
            ? (upcomingPayslip?.net_pay || projectedPayForTarget) 
            : (activePayslip?.net_pay || projectedPayForTarget)
        
        const cycleStart = activeDate
        const cycleEnd = new Date(activeDate)
        cycleEnd.setDate(activeDate.getDate() + 7)

        const cycleObligations = obligations.filter(o => {
            const dueDate = new Date(o.next_due_date)
            return dueDate >= cycleStart && dueDate < cycleEnd
        })

        const groomingObligations = cycleObligations.filter(o => 
            o.name.toLowerCase().includes('haircut') || 
            o.name.toLowerCase().includes('hair braiding')
        )
        const nonGroomingObligations = cycleObligations.filter(o => 
            !o.name.toLowerCase().includes('haircut') && 
            !o.name.toLowerCase().includes('hair braiding')
        )

        // Liability Lookahead
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
                return d >= fStart && d < fEnd && !o.name.toLowerCase().includes('haircut') && !o.name.toLowerCase().includes('hair braiding')
            }).reduce((s, o) => s + o.amount, 0)

            const fMandatory = RENT_WEEKLY + DAILY_EXPENSES_WEEKLY
            const fSurplus = fPay - fObligations - fMandatory
            if (fSurplus < 50) futureLiabilityShield += (detectedNetPay * 0.05) 
        }

        const currysPayments = nonGroomingObligations.filter(o => o.name.toLowerCase().includes('currys'))
        const clearpayPayments = nonGroomingObligations.filter(o => o.name.toLowerCase().includes('clearpay'))
        const klarnaPayments = nonGroomingObligations.filter(o => o.name.toLowerCase().includes('klarna'))
        const otherObligations = nonGroomingObligations.filter(o => 
            !o.name.toLowerCase().includes('currys') && !o.name.toLowerCase().includes('clearpay') && !o.name.toLowerCase().includes('klarna')
        )

        const isFulfilled = (amount: number, keywords: string[], potId?: string, isMainAccount: boolean = false) => {
            if (potId || isMainAccount) {
                const isPayday = now.getDate() === activeDate.getDate() && now.getMonth() === activeDate.getMonth()
                if (!isPayday) return false
            }
            return transactions.some(t => {
                const tDate = new Date(t.date)
                const isInWindow = tDate >= cycleStart && tDate < cycleEnd
                const potMatch = potId ? t.pocket_id === potId : (isMainAccount ? !t.pocket_id : false)
                const isLiability = t.description.includes('[Liability]')
                const nameMatch = keywords.some(k => t.description.toLowerCase().includes(k.toLowerCase()))
                const amountMatch = (Math.abs(t.amount) >= amount * 0.98)
                if (potId || isMainAccount) return isInWindow && potMatch && amountMatch
                return isInWindow && (isLiability || nameMatch) && amountMatch
            })
        }

        const findPot = (keywords: string[]) => 
            pots.find(p => keywords.some(k => p.name.toLowerCase().includes(k.toLowerCase())) && p.monzo_id) ||
            pots.find(p => keywords.some(k => p.name.toLowerCase().includes(k.toLowerCase())))

        const mandatoryAllocations = [
            { 
                name: 'Rent Allocation', 
                amount: RENT_WEEKLY, 
                icon: Wallet, 
                color: 'text-blue-500', 
                bg: 'bg-blue-50', 
                desc: 'Target: Monthly Rent 🏡',
                explanation: `Saving £${RENT_WEEKLY.toFixed(2)} weekly ensures you have the full amount ready for your monthly rent payment without stress.`,
                fulfilled: isFulfilled(RENT_WEEKLY, ['rent'], findPot(['Monthly Rent'])?.id) || overrides['Rent Allocation']?.manualFulfilled
            },
            { 
                name: 'Daily Expenses', 
                amount: DAILY_EXPENSES_WEEKLY, 
                icon: ShoppingBag, 
                color: 'text-orange-500', 
                bg: 'bg-orange-50', 
                desc: 'Main account buffer',
                explanation: `Standard weekly allowance of £${DAILY_EXPENSES_WEEKLY.toFixed(2)} for food, transport, and basic necessities.`,
                fulfilled: isFulfilled(DAILY_EXPENSES_WEEKLY, ['daily', 'expenses', 'living'], undefined, true) || overrides['Daily Expenses']?.manualFulfilled
            },
            { 
                name: 'Currys Flexipay', 
                amount: currysPayments.reduce((s, o) => s + o.amount, 0), 
                icon: ShieldCheck, 
                color: 'text-purple-600', 
                bg: 'bg-purple-50', 
                desc: 'Mandatory / On-time', 
                explanation: 'Critical credit obligation. Ensuring this is paid on time protects your credit rating and avoids penalties.',
                fulfilled: (currysPayments.length === 0 || currysPayments.every(cp => cp.amount <= 0 || isFulfilled(cp.amount, ['currys']))) || overrides['Currys Flexipay']?.manualFulfilled
            },
            ...otherObligations.map(o => ({
                name: o.name,
                amount: o.amount,
                icon: Wallet,
                color: 'text-slate-500',
                bg: 'bg-slate-50',
                desc: o.description || 'Standard Obligation',
                explanation: o.description || `Automatic payment for your ${o.name} obligation due this cycle.`,
                fulfilled: isFulfilled(o.amount, [o.name]) || overrides[o.name]?.manualFulfilled
            }))
        ]

        if (futureLiabilityShield > 0) {
            mandatoryAllocations.push({ 
                name: 'Future Liability Shield', 
                amount: futureLiabilityShield, 
                icon: ShieldCheck, 
                color: 'text-cyan-600', 
                bg: 'bg-cyan-50', 
                desc: 'Anticipating heavy weeks',
                explanation: `Proactively setting aside £${futureLiabilityShield.toFixed(2)} to cover upcoming cycles where your pay may not cover all obligations.`,
                fulfilled: isFulfilled(futureLiabilityShield, ['shield', 'liability buffer', 'buffer']) || overrides['Future Liability Shield']?.manualFulfilled
            } as any)
        }

        const totalMandatory = mandatoryAllocations
            .filter(a => !overrides[a.name]?.disregarded)
            .reduce((s, a) => s + (overrides[a.name]?.manualAmount ?? a.amount), 0)
        let remaining = detectedNetPay - totalMandatory

        const visaBaseTarget = VISA_MONTHLY_TARGET / 4
        let visaAllocation = !overrides['GTV Application']?.disregarded ? (overrides['GTV Application']?.manualAmount ?? Math.min(Math.max(80, remaining * 0.4), visaBaseTarget, remaining > 80 ? remaining : 0)) : 0
        const visaFulfilled = isFulfilled(visaAllocation, ['gtv', 'visa', 'application'], findPot(['GTV Application'])?.id) || overrides['GTV Application']?.manualFulfilled
        remaining -= visaAllocation

        const clearpayTotal = clearpayPayments.reduce((s, o) => s + o.amount, 0)
        const klarnaTotal = klarnaPayments.reduce((s, o) => s + o.amount, 0)
        if (remaining >= clearpayTotal) remaining -= clearpayTotal
        if (remaining >= klarnaTotal) remaining -= klarnaTotal

        const groomingRequirement = groomingObligations.reduce((s, o) => s + o.amount, 0)
        const potSplits = [
            { 
                name: 'Liabilities Buffer', 
                amount: !overrides['Liabilities Buffer']?.disregarded ? (overrides['Liabilities Buffer']?.manualAmount ?? Math.max(0, remaining * 0.25)) : 0, 
                desc: 'Target: Liabilities 💸',
                explanation: `Allocating 25% of your remaining weekly surplus to shield against future debt cycles.`,
                fulfilled: isFulfilled(Math.max(0, remaining * 0.25), ['liabilities', 'debt'], findPot(['Liabilities'])?.id) || overrides['Liabilities Buffer']?.manualFulfilled
            },
            { 
                name: 'Recurring Reserve', 
                amount: !overrides['Recurring Reserve']?.disregarded ? (overrides['Recurring Reserve']?.manualAmount ?? Math.max(0, remaining * 0.15)) : 0, 
                desc: 'Target: Recurring 🔄',
                explanation: `Allocating 15% of your remaining weekly surplus to cover predictable subscription renewals.`,
                fulfilled: isFulfilled(Math.max(0, remaining * 0.15), ['recurring', 'subscriptions'], findPot(['Recurring'])?.id) || overrides['Recurring Reserve']?.manualFulfilled
            },
            { 
                name: 'Grooming Fund', 
                amount: !overrides['Grooming Fund']?.disregarded ? (overrides['Grooming Fund']?.manualAmount ?? (groomingRequirement > 0 ? groomingRequirement : Math.max(0, remaining * 0.1))) : 0, 
                desc: groomingRequirement > 0 ? `${groomingObligations.map(o => o.name).join(' & ')} pending` : 'Target: Grooming 💈',
                explanation: groomingRequirement > 0 
                    ? `Priority funding to cover £${groomingRequirement.toFixed(2)} for upcoming appointments.`
                    : `Allocating 10% of your remaining weekly surplus toward your standard grooming schedule.`,
                fulfilled: isFulfilled(groomingRequirement > 0 ? groomingRequirement : Math.max(0, remaining * 0.1), ['grooming', 'hair'], findPot(['Grooming'])?.id) || overrides['Grooming Fund']?.manualFulfilled
            }
        ]

        const currentSplitsPlanned = potSplits.reduce((s, a) => s + a.amount, 0)
        let disposable = remaining - currentSplitsPlanned
        let funAllocation = 0
        if (disposable > 0) {
            funAllocation = !overrides['Fun Pot Surplus']?.disregarded ? (overrides['Fun Pot Surplus']?.manualAmount ?? disposable) : 0
        }
        const funFulfilled = isFulfilled(funAllocation, ['fun', 'disposable'], findPot(['Fun'])?.id) || overrides['Fun Pot Surplus']?.manualFulfilled

        return {
            income: detectedNetPay,
            mandatoryAllocations,
            potSplits,
            visaAllocation,
            visaFulfilled,
            funAllocation,
            funFulfilled,
            isProjected,
            progress: (() => {
                const all = [...mandatoryAllocations, ...potSplits]
                const done = all.filter(a => a.fulfilled).length + (visaFulfilled ? 1 : 0) + (funFulfilled ? 1 : 0)
                const total = all.length + 2
                return (done / total) * 100
            })()
        }
    }, [payslips, obligations, pots, transactions, viewMode, getProjectedPayForDate, allOverrides, activeDate, nextThursday, lastThursday])

    return {
        ...analysis,
        activeDate,
        weekId: currentWeekId,
        overrides,
        setOverride: (itemName: string, override: AdvisorOverride) => setOverride(currentWeekId, itemName, override),
        setDismissedItems
    }
}
