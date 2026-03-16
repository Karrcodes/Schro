'use client'

import { useState } from 'react'
import { Pencil, Check, X, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { usePots } from '@/features/finance/hooks/usePots'
import type { Pot } from '@/features/finance/types/finance.types'
import { Section, Spinner } from './SharedSettingsUI'

export function SavingsPotsSettings() {
    const { pots, loading, updatePot, updatePotsOrder } = usePots()
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<Pot>>({ type: 'savings', target_budget: 0, current_balance: 0, balance: 0 })
    const [saving, setSaving] = useState(false)

    const savingsPots = pots.filter(p => p.type === 'savings')


    const movePot = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === savingsPots.length - 1) return;

        const newSavingsPots = [...savingsPots];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        const temp = newSavingsPots[index];
        newSavingsPots[index] = newSavingsPots[swapIndex];
        newSavingsPots[swapIndex] = temp;

        // Map back to global pots order
        const allPotsCopy = [...pots];
        const p1 = savingsPots[index];
        const p2 = savingsPots[swapIndex];

        const idx1 = allPotsCopy.findIndex(p => p.id === p1.id);
        const idx2 = allPotsCopy.findIndex(p => p.id === p2.id);

        const tempSort = allPotsCopy[idx1].sort_order;
        allPotsCopy[idx1].sort_order = allPotsCopy[idx2].sort_order;
        allPotsCopy[idx2].sort_order = tempSort;

        const updates = [
            { id: p1.id, sort_order: allPotsCopy[idx1].sort_order },
            { id: p2.id, sort_order: allPotsCopy[idx2].sort_order }
        ];

        setSaving(true);
        try {
            await updatePotsOrder(updates);
        } catch (e: any) {
            alert(`Failed to reorder: ${e.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id: string) => {
        setSaving(true)
        try {
            await updatePot(id, {
                name: form.name,
                target_budget: form.target_budget,
                target_amount: form.target_amount,
                balance: form.balance
            })
            setEditId(null)
        } catch (e: any) {
            alert(`Failed to update pot: ${e.message || 'Unknown error'}`)
        } finally {
            setSaving(false)
        }
    }

    const startEdit = (p: Pot) => {
        setEditId(p.id)
        setForm({
            name: p.name,
            target_budget: p.target_budget,
            target_amount: p.target_amount,
            type: p.type,
            balance: p.balance
        })
    }

    return (
        <Section title="Manage Savings Pots" desc="Configure your long-term savings allocations and targets">
            {loading ? <Spinner /> : (
                <div className="space-y-2">
                    {savingsPots.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3 rounded-xl border border-black/[0.07] bg-white p-3">
                            {editId === p.id ? (
                                <>
                                    <input className="input-field flex-1" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pot Name" />
                                    <input className="input-field w-28" type="number" value={form.target_amount ?? 0} onChange={(e) => setForm({ ...form, target_amount: parseFloat(e.target.value) })} title="Total Goal Target" placeholder="Target £" />
                                    <input className="input-field w-24" type="number" value={form.target_budget ?? 0} onChange={(e) => setForm({ ...form, target_budget: parseFloat(e.target.value) })} title="Weekly Allocation" placeholder="Weekly £" />
                                    <button onClick={() => handleUpdate(p.id)} disabled={saving} className="icon-btn text-emerald-600"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setEditId(null)} className="icon-btn text-black/30"><X className="w-4 h-4" /></button>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-0.5 mr-2">
                                        <button onClick={() => movePot(i, 'up')} disabled={i === 0 || saving} className="text-black/20 hover:text-black/60 disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                                        <button onClick={() => movePot(i, 'down')} disabled={i === savingsPots.length - 1 || saving} className="text-black/20 hover:text-black/60 disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <span className="text-[13px] text-black/80 font-medium">{p.name}</span>
                                        <span className="text-[11px] text-black/40 font-normal privacy-blur">Balance: £{(p.balance || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[12px] text-black/45">Target: <span className="privacy-blur font-medium text-black/60">£{(p.target_amount || 0).toFixed(2)}</span></div>
                                        <div className="text-[10px] text-black/30">Weekly: <span className="privacy-blur font-medium">£{p.target_budget.toFixed(2)}</span></div>
                                    </div>
                                    <button onClick={() => startEdit(p)} className="icon-btn text-black/25 hover:text-black/60"><Pencil className="w-3.5 h-3.5" /></button>
                                </>
                            )}
                        </div>
                    ))}

                    {savingsPots.length === 0 && (
                        <p className="text-[12px] text-black/30 text-center py-6 border-2 border-dashed border-black/[0.05] rounded-xl">
                            Connect your Monzo account to manage savings pockets.
                        </p>
                    )}
                </div>
            )}
        </Section>
    )
}
