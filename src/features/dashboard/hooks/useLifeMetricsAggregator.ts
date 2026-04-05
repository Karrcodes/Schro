'use client'

import { useMemo, useContext } from 'react'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { useTransactions } from '@/features/finance/hooks/useTransactions'
import { usePots } from '@/features/finance/hooks/usePots'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { useGoals } from '@/features/goals/hooks/useGoals'
import { WellbeingContext } from '@/features/wellbeing/contexts/WellbeingContext'
import { usePaydayAdvisorAnalysis } from '@/features/finance/hooks/usePaydayAdvisorAnalysis'

export interface DetailItem {
    label: string
    value?: string
    meta?: string
}

export interface PointBreakdown {
    label: string
    points: number
    details?: DetailItem[]
}

export interface MetricDimension {
    points: number
    breakdown: PointBreakdown[]
    summaryValue?: string | number
}

export interface LifeMetrics {
    timestamp: string
    weekId: string
    finance: MetricDimension
    tasks: MetricDimension
    studio: MetricDimension
    wellbeing: MetricDimension
    manifestation: MetricDimension
    totalPoints: number
}

/**
 * Theoretical maximum achievable points per pillar in a "perfect week".
 * The outer ring of the radar only reaches the edge when you have genuinely
 * peaked in that category — not just because you scored more than other pillars.
 *
 * Finance:       £600 salary + savings + debt payoff + £0 essentials + £0 lifestyle spend
 * Operations:    ~6 deep/super-priority tasks completed within 24h w/ checklists
 * Studio:        1 shipped project + 2 milestones + 5 items created
 * Wellbeing:     5 gym sessions + daily nutrition + daily mood + daily reflections
 * Manifestation: 4 goal milestones completed + 2 wishlist acquisitions
 */
export const PILLAR_MAX = {
    finance: 300,
    tasks:   400,
    studio:  200,
    wellbeing: 350,
    manifestation: 150,
} as const


export function useLifeMetricsAggregator() {
    const { tasks: allTasks } = useTasks('todo', 'all')
    const { transactions } = useTransactions('all')
    const { pots } = usePots()
    const { projects, sparks, milestones, content, press, networks } = useStudio()
    const { goals, wishlist } = useGoals()
    const wellbeing = useContext(WellbeingContext)
    
    // Inject Budget Adherence from the last payday
    const { 
        progress: budgetAdherence, 
        mandatoryAllocations, 
        potSplits, 
        visaFulfilled, 
        funFulfilled 
    } = usePaydayAdvisorAnalysis('last')

    return useMemo((): LifeMetrics => {
        const now = new Date()
        // Week resets every Thursday at 16:00 (payday).
        const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ..., 4=Thu, ..., 6=Sat
        const daysSinceThursday = (dayOfWeek - 4 + 7) % 7
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - daysSinceThursday)
        startOfWeek.setHours(17, 0, 0, 0) // 5pm payday
        // If we're on Thursday but before 5pm, the current week hasn't started yet — use previous Thursday
        if (startOfWeek > now) startOfWeek.setDate(startOfWeek.getDate() - 7)
        const weekId = startOfWeek.toISOString().split('T')[0]

        // One-time exception: w/c 2 Apr 2026 — pay landed Wed 1 Apr at 18:02 instead of Thu 17:00
        if (weekId === '2026-04-02') {
            startOfWeek.setDate(startOfWeek.getDate() - 1) // back to Wed 1 Apr
            startOfWeek.setHours(18, 2, 0, 0)
        }

        // Helper to check if a date string falls in the current week
        const isThisWeek = (dateStr: string | null | undefined) => {
            if (!dateStr) return false
            return new Date(dateStr) >= startOfWeek && new Date(dateStr) <= now
        }

        // ---------------------------------------------------------
        // 1. Finance Points
        // ---------------------------------------------------------
        let financePts = 0
        const financeBd: PointBreakdown[] = []

        // Budget Integrity Bonus (based on last payday adherence)
        if (budgetAdherence > 0) {
            const val = Math.floor(budgetAdherence * 0.5) // Max 50 pts if 100% adherence
            financePts += val
            const verifiedDeatils: DetailItem[] = [
                { label: 'Budget adherence score', value: `${budgetAdherence.toFixed(1)}%` },
                ...mandatoryAllocations.filter(a => a.fulfilled).map(a => ({ label: `Verified: ${a.name}`, value: '✓' })),
                ...potSplits.filter(a => a.fulfilled).map(a => ({ label: `Verified: ${a.name}`, value: '✓' })),
                ...(visaFulfilled ? [{ label: 'Verified: GTV Application', value: '✓' }] : []),
                ...(funFulfilled ? [{ label: 'Verified: Fun Pot Surplus', value: '✓' }] : [])
            ]
            financeBd.push({ label: 'Budget Integrity', points: val, details: verifiedDeatils })
        }

        const incomeTxns = transactions.filter((t: any) => t.type === 'income' && isThisWeek(t.date))
        const weeklyIncome = incomeTxns.reduce((s: number, t: any) => s + t.amount, 0)
        
        if (weeklyIncome > 0) {
            const val = Math.floor(weeklyIncome * 0.1)
            financePts += val
            financeBd.push({
                label: 'Weekly Pay/Income', points: val,
                details: incomeTxns.map((t: any) => ({
                    label: t.description || t.merchant || 'Income',
                    value: `£${Math.abs(t.amount).toFixed(2)}`,
                    meta: new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                }))
            })
        }

        // Savings (+10 pts per trans + 0.2 pts per £1)
        const savingsTransactions = transactions.filter((t: any) => t.type === 'transfer' && t.category === 'savings' && isThisWeek(t.date))
        if (savingsTransactions.length > 0) {
            const savingsValue = savingsTransactions.reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
            const val = (savingsTransactions.length * 10) + Math.floor(savingsValue * 0.2)
            financePts += val
            financeBd.push({
                label: 'Savings Contributions', points: val,
                details: savingsTransactions.map((t: any) => ({
                    label: t.description || t.merchant || 'Savings transfer',
                    value: `£${Math.abs(t.amount).toFixed(2)}`,
                    meta: new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                }))
            })
        }

        // Debt Payoff vs New Liabilities
        const debtPayments = transactions.filter((t: any) => t.category === 'debt' && isThisWeek(t.date))
        if (debtPayments.length > 0) {
            const debtVal = debtPayments.reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
            const val = (debtPayments.length * 15) + Math.floor(debtVal * 0.2)
            financePts += val
            financeBd.push({
                label: 'Debt Payoff', points: val,
                details: debtPayments.map((t: any) => ({
                    label: t.description || t.merchant || 'Debt payment',
                    value: `£${Math.abs(t.amount).toFixed(2)}`,
                    meta: new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                }))
            })
        }

        // Discretionary Spending — split into two independent budgets
        const essentialCategories = ['groceries', 'eating out', 'transport', 'personal care', 'convenience']
        const lifestyleCategories = ['shopping', 'entertainment']

        const scoreSpendBucket = (
            label: string,
            penaltyLabel: string,
            categories: string[],
            budget: number
        ) => {
            const txns = transactions.filter(
                (t: any) => t.type === 'spend' && categories.includes(t.category?.toLowerCase()) && isThisWeek(t.date)
            )
            const total = txns.reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
            if (total === 0) return

            const remaining = budget - total
            const details: DetailItem[] = [
                {
                    label: remaining >= 0
                        ? `Under budget by £${remaining.toFixed(2)} → bonus`
                        : `Over budget by £${Math.abs(remaining).toFixed(2)} → penalty`,
                    value: `£${total.toFixed(2)} / £${budget}`
                },
                ...txns.map((t: any) => ({
                    label: t.description || t.merchant || t.category,
                    value: `-£${Math.abs(t.amount).toFixed(2)}`,
                    meta: `${t.category} · ${new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                }))
            ]

            const val = Math.floor(remaining * 0.5) // positive if under, negative if over
            if (val === 0) return
            financePts += val
            financeBd.push({ label: val > 0 ? label : penaltyLabel, points: val, details })
        }

        scoreSpendBucket(
            'Essentials Surplus',
            'Essentials Overspend',
            essentialCategories,
            100
        )
        scoreSpendBucket(
            'Lifestyle Surplus',
            'Lifestyle Overspend',
            lifestyleCategories,
            100
        )



        // ---------------------------------------------------------
        // 2. Ops (Tasks) Points
        // ---------------------------------------------------------
        let opsPts = 0
        const opsBd: PointBreakdown[] = []
        let opsBonusSum = 0
        let opsPenaltySum = 0

        const completedTaskDetails: DetailItem[] = []
        const lingeringTaskDetails: DetailItem[] = []

        allTasks.forEach(task => {
            const created = new Date(task.created_at).getTime()
            
            // Penalty: -1 point for every day it lingers (max 10 points)
            if (!task.is_completed) {
                const daysOld = Math.floor((now.getTime() - created) / (1000 * 60 * 60 * 24))
                if (daysOld > 1) {
                    const penalty = Math.min(10, daysOld - 1)
                    opsPts -= penalty
                    opsPenaltySum -= penalty
                    lingeringTaskDetails.push({ label: task.title, value: `-${penalty} pts`, meta: `${daysOld}d old` })
                }
                return
            }

            if (!isThisWeek((task as any).updated_at)) return

            let taskScore = 5 
            if (task.priority === 'super') taskScore *= 3
            if (task.priority === 'high') taskScore *= 2
            if (task.priority === 'low') taskScore *= 0.5
            if ((task as any).work_type === 'deep') taskScore += 10
            else if ((task as any).work_type === 'light') taskScore += 3
            const completed = new Date((task as any).updated_at!).getTime()
            const hoursToComplete = (completed - created) / (1000 * 60 * 60)
            if (hoursToComplete <= 24) taskScore += 5
            if (task.notes?.type === 'checklist' && Array.isArray(task.notes.content)) {
                const completedSub = task.notes.content.filter((c: any) => c.completed).length
                taskScore += (completedSub * 2)
            }
            if (task.impact_score && task.impact_score > 0) taskScore += task.impact_score * 2

            opsPts += taskScore
            opsBonusSum += taskScore
            completedTaskDetails.push({
                label: task.title,
                value: `+${Math.floor(taskScore)} pts`,
                meta: [task.priority, (task as any).work_type].filter(Boolean).join(' · ')
            })
        })

        if (opsBonusSum > 0) opsBd.push({ label: 'Completed Actions', points: Math.floor(opsBonusSum), details: completedTaskDetails })
        if (opsPenaltySum < 0) opsBd.push({ label: 'Stagnation Penalty', points: Math.floor(opsPenaltySum), details: lingeringTaskDetails })


        // ---------------------------------------------------------
        // 3. Studio Points
        // ---------------------------------------------------------
        let studioPts = 0
        const studioBd: PointBreakdown[] = []
        const createdItems = [
            ...projects.filter(p => isThisWeek(p.created_at)),
            ...content.filter(c => isThisWeek(c.created_at)),
            ...sparks.filter(s => isThisWeek(s.created_at)),
            ...networks.filter(n => isThisWeek(n.created_at)),
            ...press.filter(p => isThisWeek(p.created_at))
        ]

        if (createdItems.length > 0) {
            const val = createdItems.length * 2
            studioPts += val
            studioBd.push({
                label: 'Items Created', points: val,
                details: createdItems.map((item: any) => ({ label: item.title || item.name, value: '+2 pts', meta: item.type || item.status }))
            })
        }

        // Milestones 
        const completedMilestones = milestones.filter(m => m.status === 'completed' && isThisWeek(m.completed_at || m.updated_at))
        if (completedMilestones.length > 0) {
            const val = completedMilestones.length * 15
            studioPts += val
            studioBd.push({
                label: 'Milestones Conquered', points: val,
                details: completedMilestones.map(m => ({ label: m.title, value: '+15 pts' }))
            })
        }

        // Shipped/Published
        const shippedItems = [
            ...projects.filter(p => p.status === 'shipped' && isThisWeek(p.updated_at)),
            ...content.filter(c => c.status === 'published' && isThisWeek(c.publish_date || c.updated_at)),
            ...press.filter(p => p.status === 'published' && isThisWeek(p.updated_at))
        ]
        if (shippedItems.length > 0) {
            const val = shippedItems.length * 50
            studioPts += val
            studioBd.push({
                label: 'Shipped to Production', points: val,
                details: shippedItems.map((item: any) => ({ label: item.title || item.name, value: '+50 pts', meta: item.status }))
            })
        }


        // ---------------------------------------------------------
        // 4. Wellbeing Points
        // ---------------------------------------------------------
        let wellPts = 0
        const wellBd: PointBreakdown[] = []

        // Gym Sessions & Intensity
        const gymLogs = wellbeing?.workoutLogs?.filter(l => isThisWeek(l.date)) || []
        if (gymLogs.length > 0) {
            let sessionPts = 0
            const sessionDetails: DetailItem[] = []
            
            gymLogs.forEach((log: any) => {
                const routine = wellbeing?.routines?.find((r: any) => r.id === log.routineId)
                const routineName = routine?.name || log.note || 'Training Session'
                
                // Base Points for showing up
                let logPts = 30
                
                // Volume Points: 1 pt per 200kg moved
                const sessionVolume = log.exercises.reduce((acc: number, ex: any) => 
                    acc + ex.sets.reduce((sacc: number, set: any) => sacc + ((set.weight || 0) * (set.reps || 0)), 0), 0)
                
                const volumePts = Math.floor(sessionVolume / 200)
                logPts += volumePts
                sessionPts += logPts
                
                sessionDetails.push({
                    label: `${routineName} (${Math.round(sessionVolume).toLocaleString()}kg volume)`,
                    value: `+${Math.floor(logPts)} pts`,
                    meta: new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                })
            })
            
            wellPts += sessionPts
            wellBd.push({
                label: 'Physical Training Intensity',
                points: Math.floor(sessionPts),
                details: sessionDetails
            })
        }

        // Fitness Milestones (PBs / Overload Achievements)
        const newFitnessMilestones = wellbeing?.milestones?.filter(m => m.completed && isThisWeek(m.dateCompleted)) || []
        if (newFitnessMilestones.length > 0) {
            const val = newFitnessMilestones.length * 20
            wellPts += val
            wellBd.push({
                label: 'Physical Milestones Conquered',
                points: val,
                details: newFitnessMilestones.map(m => ({ 
                    label: m.title, 
                    value: '+20 pts',
                    meta: `Target: ${m.targetValue}${m.unit || 'kg'}`
                }))
            })
        }

        // Macros
        const macroLogs = wellbeing?.mealLogs?.filter(l => isThisWeek(l.date)) || []
        if (wellbeing?.dailyNutrition && wellbeing.dailyNutrition.calories > 0) {
            wellPts += 10
            wellBd.push({ label: 'Nutrition Tracked', points: 10, details: [{ label: 'Today\'s nutrition logged', value: `${Math.round(wellbeing.dailyNutrition.calories)} kcal` }] })
        }

        // Mood
        const moodLogs = wellbeing?.moodLogs?.filter(l => isThisWeek(l.date)) || []
        if (moodLogs.length > 0) {
            const val = moodLogs.length * 5 + moodLogs.reduce((acc: number, log: any) => acc + (log.activities?.length || 0) * 2, 0)
            wellPts += val
            wellBd.push({
                label: 'Mood & Activity Logging', points: val,
                details: moodLogs.map((l: any) => ({
                    label: `Mood: ${l.value}`,
                    value: `+${5 + (l.activities?.length || 0) * 2} pts`,
                    meta: new Date(l.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                }))
            })
        }

        // Journal
        const journalLogs = wellbeing?.reflections?.filter(e => isThisWeek(e.date)) || []
        if (journalLogs.length > 0) {
            const val = journalLogs.reduce((acc: number, entry: any) => {
                const words = (entry.content || '').split(' ').length
                return acc + 5 + Math.floor(words / 10)
            }, 0)
            wellPts += val
            wellBd.push({
                label: 'Daily Reflections', points: val,
                details: journalLogs.map((e: any) => ({
                    label: (e.content || '').slice(0, 60) + ((e.content || '').length > 60 ? '…' : ''),
                    value: `${(e.content || '').split(' ').length} words`,
                    meta: new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                }))
            })
        }

        // ---------------------------------------------------------
        // 5. Manifest Points
        // ---------------------------------------------------------
        let manifestPts = 0
        const manifestBd: PointBreakdown[] = []

        const goalMilestones = goals.flatMap(g => g.milestones || []).filter(m => m.is_completed && isThisWeek((m as any).updated_at || m.created_at))
        if (goalMilestones.length > 0) {
            const val = goalMilestones.length * 25
            manifestPts += val
            manifestBd.push({ label: 'Goal Milestones Met', points: val })
        }

        const acquiredWishlist = wishlist.filter(w => w.status === 'acquired' && isThisWeek((w as any).updated_at || w.created_at))
        if (acquiredWishlist.length > 0) {
            const val = acquiredWishlist.length * 15
            manifestPts += val
            manifestBd.push({ label: 'Wishlist Acquisitions', points: val })
        }

        return {
            timestamp: now.toISOString(),
            weekId,
            finance: { points: Math.max(0, financePts), breakdown: financeBd },
            tasks: { points: Math.max(0, Math.floor(opsPts)), breakdown: opsBd, summaryValue: `${Math.floor(opsPts)} pts` },
            studio: { points: Math.max(0, studioPts), breakdown: studioBd },
            wellbeing: { points: Math.max(0, wellPts), breakdown: wellBd },
            manifestation: { points: Math.max(0, manifestPts), breakdown: manifestBd },
            totalPoints: Math.max(0, financePts) + Math.max(0, opsPts) + Math.max(0, studioPts) + Math.max(0, wellPts) + Math.max(0, manifestPts)
        }
    }, [allTasks, transactions, pots, projects, sparks, milestones, content, press, networks, goals, wishlist, wellbeing])
}
