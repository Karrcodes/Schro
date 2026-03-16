'use client'

import { useState } from 'react'
import { Target, CalendarDays, RefreshCw, Loader2 } from 'lucide-react'
import { Skeleton } from './Skeleton'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import type { Goal } from '../types/finance.types'
import { useGoals } from '../hooks/useGoals'

interface GoalsListProps {
    goals: Goal[]
    onRefresh?: () => void
}

function ProgressBar({ value, max }: { value: number; max: number }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
    return (
        <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
            <div
                className="h-full bg-[#2563eb] rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
            />
        </div>
    )
}

function daysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function GoalsList({ goals, onRefresh }: GoalsListProps) {
    const { updateGoal } = useGoals()
    const { isSyncing, isLogging } = useFinanceProfile()
    const [resettingId, setResettingId] = useState<string | null>(null)

    const handleReset = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setResettingId(id)
        await updateGoal(id, { current_amount: 0 })
        onRefresh?.()
        setResettingId(null)
    }

    if (goals.length === 0) {
        return (
            <div className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-6 text-center">
                <p className="text-black/30 text-sm">No savings goals yet — create a pot with a target in Monzo.</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {goals.map((goal) => {
                const pct = goal.target_amount > 0
                    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                    : 0
                const days = daysUntil(goal.deadline)

                return (
                    <div
                        key={goal.id}
                        className="rounded-xl border border-black/[0.07] bg-white p-4 hover:bg-black/[0.01] transition-colors shadow-sm"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Target className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-black/90 flex items-center gap-2">
                                        {goal.name}
                                        {goal.is_recurring && <span className="text-[9px] bg-black/10 text-black px-1 rounded font-bold uppercase tracking-widest">Recurring</span>}
                                    </p>
                                    {days !== null && (
                                        <p className={`text-[10px] flex items-center gap-1 ${days < 30 ? 'text-amber-500' : 'text-black/35'}`}>
                                            <CalendarDays className="w-3 h-3" />
                                            {days > 0 ? `${days} days remaining` : 'Deadline passed'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[14px] font-bold text-black privacy-blur">
                                    <Skeleton as="span" show={isSyncing || isLogging}>£{goal.current_amount.toFixed(2)}</Skeleton>
                                </p>
                                <p className="text-[10px] text-black/35">of <Skeleton as="span" show={isSyncing || isLogging}><span className="privacy-blur">£{goal.target_amount.toFixed(2)}</span></Skeleton></p>
                            </div>
                        </div>
                        <ProgressBar value={goal.current_amount} max={goal.target_amount} />
                        <div className="flex justify-between items-center mt-2.5">
                            <span className="text-[10px] text-black/35 font-medium">{pct.toFixed(0)}% saved</span>

                            {goal.is_recurring && pct >= 100 ? (
                                <button
                                    onClick={(e) => handleReset(goal.id, e)}
                                    disabled={resettingId === goal.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                >
                                    {resettingId === goal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Restart Cycle
                                </button>
                            ) : (
                                <span className="text-[10px] text-black/35 font-medium flex gap-1">
                                    <span className="privacy-blur">£{Math.max(0, goal.target_amount - goal.current_amount).toFixed(2)}</span> to go
                                </span>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
