'use client'

import { useState } from 'react'
import { Pencil, Check, X, Loader2, PiggyBank } from 'lucide-react'
import { useGoals } from '@/features/finance/hooks/useGoals'
import { usePots } from '@/features/finance/hooks/usePots'
import { useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import type { Goal } from '@/features/finance/types/finance.types'
import { Section, Spinner } from '@/features/finance/components/SharedSettingsUI'
import { cn } from '@/lib/utils'

export function SavingsManager() {
    const { goals, loading: gLoading, updateGoal, deleteGoal } = useGoals()
    const { pots, loading: pLoading, updatePot } = usePots()
    const { isPrivacyEnabled } = useFinanceProfile()
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<Goal>>({ name: '', target_amount: 0, current_amount: 0, deadline: '', is_recurring: false })
    const [saving, setSaving] = useState(false)

    const loading = gLoading || pLoading

    // Logic to map Monzo pots to "Goals" if they have a target or a specific name
    const monzoGoals = pots.filter(p =>
        p.type === 'savings' ||
        p.target_amount > 0 ||
        p.name.toLowerCase().includes('goal') ||
        p.name.toLowerCase().includes('challenge')
    )

    const allGoals = [
        ...monzoGoals.map(p => ({
            id: p.id,
            name: p.name,
            current_amount: p.balance,
            target_amount: p.target_amount > 0 ? p.target_amount : p.balance,
            deadline: null,
            is_recurring: p.name.toLowerCase().includes('rent') || p.name.toLowerCase().includes('bills'),
            type: 'monzo' as const,
            monzo_id: p.id,
            profile: p.profile,
            created_at: p.created_at
        }))
    ]


    const handleUpdate = async (id: string, type: 'manual' | 'monzo') => {
        if (!form.name) return
        setSaving(true)
        try {
            if (type === 'manual') {
                await updateGoal(id, {
                    name: form.name,
                    target_amount: form.target_amount,
                    deadline: form.deadline
                })
            } else {
                // For Monzo goals, we update the underlying Pocket (Pot)
                await updatePot(id, {
                    target_amount: form.target_amount
                })
            }
            setEditId(null)
        } catch (err) {
            console.error('Failed to update goal:', err)
        } finally {
            setSaving(false)
        }
    }

    const startEdit = (g: Goal & { type: 'manual' | 'monzo' }) => {
        setEditId(g.id)
        setForm({ name: g.name, target_amount: g.target_amount, current_amount: g.current_amount, deadline: g.deadline, is_recurring: g.is_recurring })
    }

    return (
        <Section title="Active Savings Goals" desc="Define long-term targets and regular allocations">
            {loading ? <Spinner /> : (
                <div className="space-y-4">
                    {allGoals.map((g) => {
                        const progress = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0
                        const isMonzo = 'type' in g && g.type === 'monzo'

                        return (
                            <div key={g.id} className={cn(
                                "flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition-all",
                                isMonzo ? "bg-emerald-50/30 border-emerald-500/10 hover:border-emerald-500/30" : "bg-white border-black/[0.07] hover:shadow-md"
                            )}>
                                {editId === g.id ? (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 space-y-3">
                                            <input
                                                className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-[14px] font-medium outline-none"
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                disabled={isMonzo}
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] text-black/40 font-bold uppercase mb-1 block">Goal Target (£)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-[14px] outline-none"
                                                        value={form.target_amount}
                                                        onChange={e => setForm({ ...form, target_amount: parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                                {!isMonzo && (
                                                    <div>
                                                        <label className="text-[10px] text-black/40 font-bold uppercase mb-1 block">Deadline</label>
                                                        <input
                                                            type="date"
                                                            className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-[14px] outline-none"
                                                            value={form.deadline || ''}
                                                            onChange={e => setForm({ ...form, deadline: e.target.value })}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleUpdate(g.id, g.type)}
                                                disabled={saving}
                                                className="bg-black text-white p-2 rounded-lg hover:bg-black/80 transition-colors"
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => setEditId(null)} className="bg-black/5 text-black/40 p-2 rounded-lg hover:bg-black/10 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[15px] text-black/90 font-bold">{g.name}</span>
                                                    {g.is_recurring && <span className="text-[9px] font-bold bg-black/10 text-black px-1.5 py-0.5 rounded tracking-widest uppercase">Recurring Target</span>}
                                                    {isMonzo && <span className="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded tracking-widest uppercase flex items-center gap-1"><PiggyBank className="w-2.5 h-2.5" /> Monzo</span>}
                                                </div>
                                                {g.deadline && <span className="text-[12px] text-black/40 mt-0.5">Deadline: {new Date(g.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                                {isMonzo && <span className="text-[11px] text-emerald-600/60 font-medium mt-0.5 italic">Synced from bank pot</span>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => startEdit(g)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/20 hover:text-black/60 hover:bg-black/5 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between text-[13px] mb-2">
                                                <span className="font-bold text-black"><span className={cn(isPrivacyEnabled && "privacy-blur")}>£{g.current_amount.toFixed(2)}</span> <span className="text-black/40 font-medium">saved</span></span>
                                                <span className="text-black/40 font-medium whitespace-nowrap">of <span className={cn(isPrivacyEnabled && "privacy-blur")}>£{g.target_amount.toFixed(2)}</span></span>
                                            </div>
                                            <div className="h-2 w-full bg-black/[0.04] rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        isMonzo ? "bg-emerald-500" : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}

                    {allGoals.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-black/[0.08] rounded-2xl">
                            <PiggyBank className="w-10 h-10 text-black/10 mb-4" />
                            <p className="text-[14px] font-bold text-black/60">No goals synced yet.</p>
                            <p className="text-[12px] text-black/30 mt-1 max-w-[240px] text-center">Create a pot with a target in your Monzo app and it will appear here automatically.</p>
                        </div>
                    )}
                </div>
            )}
        </Section>
    )
}
