'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X, Loader2, PiggyBank } from 'lucide-react'
import { useGoals } from '@/features/finance/hooks/useGoals'
import { usePots } from '@/features/finance/hooks/usePots'
import { useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import type { Goal } from '@/features/finance/types/finance.types'
import { Section, Spinner } from '@/features/finance/components/SharedSettingsUI'
import { cn } from '@/lib/utils'

export function SavingsManager() {
    const { goals, loading: gLoading, createGoal, updateGoal, deleteGoal } = useGoals()
    const { pots, loading: pLoading } = usePots()
    const { isPrivacyEnabled } = useFinanceProfile()
    const [adding, setAdding] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<Goal>>({ current_amount: 0, is_recurring: false })
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
        ...goals.map(g => ({ ...g, type: 'manual' as const })),
        ...monzoGoals.map(p => ({
            id: p.id,
            name: `${p.name} 🏡`,
            current_amount: p.balance,
            target_amount: p.target_amount || p.balance, // Fallback to balance if no target set in Monzo
            deadline: null,
            is_recurring: p.name.toLowerCase().includes('rent') || p.name.toLowerCase().includes('bills'),
            type: 'monzo' as const
        }))
    ]

    const handleAdd = async () => {
        if (!form.name || !form.target_amount) return
        setSaving(true)
        await createGoal({
            name: form.name!,
            target_amount: form.target_amount!,
            current_amount: form.current_amount ?? 0,
            deadline: form.deadline ?? null,
            is_recurring: form.is_recurring ?? false,
        })
        setForm({ current_amount: 0, is_recurring: false })
        setAdding(false)
        setSaving(false)
    }

    const handleUpdate = async (id: string) => {
        setSaving(true)
        await updateGoal(id, { name: form.name, target_amount: form.target_amount, current_amount: form.current_amount, deadline: form.deadline, is_recurring: form.is_recurring })
        setEditId(null)
        setSaving(false)
    }

    const startEdit = (g: Goal) => {
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
                                {editId === g.id && !isMonzo ? (
                                    <div className="flex flex-wrap items-center gap-3">
                                        <input className="input-field flex-1 min-w-[120px]" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                        <input className="input-field w-full sm:w-28" type="number" placeholder="Total target £" value={form.target_amount ?? 0} onChange={(e) => setForm({ ...form, target_amount: parseFloat(e.target.value) })} />
                                        <input className="input-field w-full sm:w-28" type="number" placeholder="Already saved £" value={form.current_amount ?? 0} onChange={(e) => setForm({ ...form, current_amount: parseFloat(e.target.value) })} />
                                        <input className="input-field w-full sm:w-32" type="date" value={form.deadline ?? ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                                        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 bg-black/[0.03] p-1.5 rounded-lg border border-black/[0.05]">
                                            <input type="checkbox" checked={form.is_recurring || false} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="accent-black w-3 h-3 cursor-pointer" />
                                            <span className="text-[10px] font-bold text-black/60 uppercase tracking-widest">Recurring</span>
                                        </label>
                                        <button onClick={() => handleUpdate(g.id)} disabled={saving} className="icon-btn text-emerald-600"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setEditId(null)} className="icon-btn text-black/30"><X className="w-4 h-4" /></button>
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
                                            {!isMonzo && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => startEdit(g as any)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/20 hover:text-black/60 hover:bg-black/5 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => deleteGoal(g.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/20 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            )}
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

                    {adding ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm">
                            <h3 className="text-[14px] font-bold text-black border-b border-black/[0.06] pb-3 sm:col-span-2">
                                Add New Goal
                            </h3>
                            <div className="sm:col-span-2">
                                <label className="text-[11px] uppercase tracking-wider text-black/40 font-bold mb-2 block">Goal Name</label>
                                <input className="input-field w-full bg-white" placeholder="e.g. UK GTV Visa" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[11px] uppercase tracking-wider text-black/40 font-bold mb-2 block">Target Amount (£)</label>
                                <input className="input-field w-full bg-white font-bold" type="number" placeholder="Total target amount £" value={form.target_amount ?? ''} onChange={(e) => setForm({ ...form, target_amount: parseFloat(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-[11px] uppercase tracking-wider text-black/40 font-bold mb-2 block">Already Saved (£)</label>
                                <input className="input-field w-full bg-white" type="number" placeholder="Amount already saved £" value={form.current_amount ?? ''} onChange={(e) => setForm({ ...form, current_amount: parseFloat(e.target.value) })} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-[11px] uppercase tracking-wider text-black/40 font-bold mb-2 block">Target Deadline (Optional)</label>
                                <input className="input-field w-full bg-white" type="date" value={form.deadline ?? ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                            </div>

                            <div className="sm:col-span-2 flex items-center mt-2">
                                <label className="flex items-center gap-3 cursor-pointer bg-white border border-black/[0.08] p-4 rounded-xl hover:border-black/30 hover:bg-black/5 transition-all w-full">
                                    <input type="checkbox" checked={form.is_recurring || false} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="w-5 h-5 accent-black cursor-pointer" />
                                    <div>
                                        <span className="text-[13px] font-bold text-black block">Recurring Target</span>
                                        <span className="text-[11px] text-black/50 block">Check this if it is a cyclical target rather than a fixed one-time goal (e.g. Rent, Bills, SINK fund)</span>
                                    </div>
                                </label>
                            </div>

                            <div className="sm:col-span-2 flex gap-3 pt-4 border-t border-black/[0.06] mt-4">
                                <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1 h-12 text-[14px]">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Goal'}
                                </button>
                                <button onClick={() => { setAdding(false); setForm({ current_amount: 0, is_recurring: false }) }} className="btn-secondary px-8 h-12 text-[14px]">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-[13px] text-black/60 hover:text-emerald-600 hover:bg-emerald-50 font-bold transition-all border-2 border-dashed border-black/[0.08] hover:border-emerald-300 w-full p-6 rounded-2xl justify-center bg-white shadow-sm">
                            <Plus className="w-5 h-5" /> Add new savings goal
                        </button>
                    )}
                </div>
            )}
        </Section>
    )
}
