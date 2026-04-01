'use client'

import { useMemo } from 'react'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { useTransactions } from '@/features/finance/hooks/useTransactions'
import { usePots } from '@/features/finance/hooks/usePots'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { useGoals } from '@/features/goals/hooks/useGoals'
import { WellbeingContext } from '@/features/wellbeing/contexts/WellbeingContext'
import { useContext } from 'react'

export interface LifeMetrics {
    timestamp: string
    finance: {
        totalLiquid: number
        totalLiabilities: number
        monthlyInflow: number
        monthlyOutflow: number
        savingsRate: number
        budgetScore: number
    }
    tasks: {
        totalActive: number
        completionRate: number
        priorityDistribution: Record<string, number>
        nextCriticalAction: string | null
    }
    studio: {
        activeProjects: number
        completedProjects: number
        totalSparks: number
    }
    wellbeing: {
        weeklyWorkoutCount: number
        dailyCalorieAdherence: number
        averageMoodScore: number
        latestWeight: number | null
    }
    manifestation: {
        wishlistValue: number
        goalMilestoneCompletion: number
    }
}

export function useLifeMetricsAggregator() {
    const { tasks } = useTasks('todo', 'all')
    const { transactions } = useTransactions('all')
    const { pots } = usePots()
    const { projects, sparks } = useStudio()
    const { goals, wishlist } = useGoals()
    const wellbeing = useContext(WellbeingContext)

    return useMemo((): LifeMetrics => {
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        // Finance Metrics
        const monthlyInflow = transactions
            .filter((t: any) => t.type === 'income' && new Date(t.date) >= thirtyDaysAgo)
            .reduce((s: number, t: any) => s + t.amount, 0)
        const monthlyOutflow = transactions
            .filter((t: any) => t.type === 'spend' && new Date(t.date) >= thirtyDaysAgo)
            .reduce((s: number, t: any) => s + t.amount, 0)
        const savingsRate = monthlyInflow > 0 ? ((monthlyInflow - monthlyOutflow) / monthlyInflow) * 100 : 0
        const budgetScore = monthlyInflow > 0 ? Math.max(0, 100 - (monthlyOutflow / monthlyInflow) * 100) : 0
        const totalLiquid = pots.filter((p: any) => p.type !== 'savings' && p.type !== 'buffer').reduce((acc: number, p: any) => acc + p.balance, 0)
        const totalLiabilities = pots.filter((p: any) => p.type === 'buffer').reduce((acc: number, p: any) => acc + p.balance, 0)

        // Task Metrics
        const activeTasks = tasks.filter(t => !t.is_completed)
        const weeklyTasks = tasks.filter(t => new Date(t.created_at) >= sevenDaysAgo)
        const completionRate = weeklyTasks.length > 0
            ? (weeklyTasks.filter(t => t.is_completed).length / weeklyTasks.length) * 100
            : 0
        const priorityDistribution = activeTasks.reduce((acc: Record<string, number>, t) => {
            acc[t.priority] = (acc[t.priority] || 0) + 1
            return acc
        }, {})
        const highPriorityTask = activeTasks.find(t => t.priority === 'super' || t.priority === 'high')

        // Studio Metrics
        const activeProjects = projects.filter((p: any) => p.status === 'active').length
        const completedProjects = projects.filter((p: any) => p.status === 'complete').length

        // Wellbeing Metrics (Consolidating from Context)
        const workoutCount = wellbeing?.workoutLogs?.filter(l => new Date(l.date) >= sevenDaysAgo).length || 0
        const moodLogs = wellbeing?.moodLogs?.filter(l => new Date(l.date) >= sevenDaysAgo) || []
        const avgMood = moodLogs.length > 0 
            ? moodLogs.reduce((acc, l) => acc + l.value, 0) / moodLogs.length 
            : 0
        const latestWeight = wellbeing?.weightHistory?.[wellbeing.weightHistory.length - 1]?.weight || null
        
        // Manifestation Metrics
        const wishlistValue = wishlist.reduce((acc, item) => acc + (item.price || 0), 0)
        const allMilestones = goals.flatMap(g => g.milestones || [])
        const goalMilestoneCompletion = allMilestones.length > 0
            ? (allMilestones.filter(m => m.is_completed).length / allMilestones.length) * 100
            : 0

        return {
            timestamp: now.toISOString(),
            finance: {
                totalLiquid,
                totalLiabilities,
                monthlyInflow,
                monthlyOutflow,
                savingsRate,
                budgetScore
            },
            tasks: {
                totalActive: activeTasks.length,
                completionRate,
                priorityDistribution,
                nextCriticalAction: highPriorityTask?.title || null
            },
            studio: {
                activeProjects,
                completedProjects,
                totalSparks: sparks.length
            },
            wellbeing: {
                weeklyWorkoutCount: workoutCount,
                dailyCalorieAdherence: wellbeing?.dailyNutrition?.calories || 0,
                averageMoodScore: avgMood,
                latestWeight
            },
            manifestation: {
                wishlistValue,
                goalMilestoneCompletion
            }
        }
    }, [tasks, transactions, pots, projects, sparks, goals, wishlist, wellbeing])
}
