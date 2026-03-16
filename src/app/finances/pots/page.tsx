'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X, Loader2, Settings, ArrowUp, ArrowDown } from 'lucide-react'
import { usePots } from '@/features/finance/hooks/usePots'
import { useSettings } from '@/features/finance/hooks/useSettings'
import type { Pot } from '@/features/finance/types/finance.types'
import { useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import { Section, Spinner } from '@/features/finance/components/SharedSettingsUI'
import { KarrFooter } from '@/components/KarrFooter'

export default function SettingsPage() {
    const { activeProfile, setProfile } = useFinanceProfile()
    return (
        <div className="h-screen bg-[#fafafa] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 md:px-6 py-4 md:py-5 border-b border-black/[0.06] bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center flex-shrink-0">
                        <Settings className="w-4 h-4 text-black/40" />
                    </div>
                    <div>
                        <h1 className="text-[20px] font-bold text-black">Pots</h1>
                        <p className="text-[12px] text-black/35">Manage your liquid allocations and budgets</p>
                    </div>
                </div>
                <div className="md:ml-auto flex bg-black/[0.04] p-1 rounded-xl border border-black/[0.06] w-fit">
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
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pt-8">
                <div className="max-w-7xl mx-auto w-full px-6 md:px-10 pb-10 flex-1 space-y-8">
                    <GlobalSettings />
                    <PotsSettings />
                </div>
                <div className="max-w-7xl mx-auto w-full px-6 md:px-10 pb-10">
                    <KarrFooter />
                </div>
            </div>
        </div>
    )
}

/* ─── Global Settings ────────────────────────────── */
function GlobalSettings() {
    const { settings, setSetting, loading } = useSettings()
    const [income, setIncome] = useState('')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        await setSetting('weekly_income_baseline', income || '0')
        setSaving(false)
    }

    return (
        <Section title="Income Baseline" desc="Set your standard expected weekly income">
            {loading ? <Spinner /> : (
                <div className="flex items-end gap-3 max-w-xs">
                    <div className="flex-1">
                        <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-1.5 block">
                            Weekly Income (£)
                        </label>
                        <input
                            type="number"
                            placeholder={settings['weekly_income_baseline'] ?? '0'}
                            value={income}
                            onChange={(e) => setIncome(e.target.value)}
                            className="input-field"
                        />
                    </div>
                    <button onClick={handleSave} disabled={saving} className="btn-primary h-10 px-4">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                </div>
            )}
            {settings['weekly_income_baseline'] && (
                <p className="text-[12px] text-black/35 mt-2">
                    Current baseline: <span className="text-black/60 font-medium privacy-blur">£{settings['weekly_income_baseline']}/week</span>
                </p>
            )}
        </Section>
    )
}

/* ─── Pots ─────────────────────────────────────── */
function PotsSettings() {
    const { pots, loading, createPot, updatePot, deletePot, updatePotsOrder } = usePots()
    const [adding, setAdding] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<Pot>>({ type: 'general', target_budget: 0, current_balance: 0, balance: 0 })
    const [saving, setSaving] = useState(false)

    const handleAdd = async () => {
        if (!form.name) return
        setSaving(true)
        try {
            await createPot({
                name: form.name!,
                target_budget: form.target_budget ?? 0,
                target_amount: 0, // Manual pots start with 0 target
                current_balance: form.current_balance ?? 0,
                balance: form.balance ?? 0,
                sort_order: pots.length,
                type: (form.type as Pot['type']) ?? 'general'
            })
            setForm({ type: 'general', target_budget: 0, current_balance: 0, balance: 0 })
            setAdding(false)
        } catch (e: any) {
            alert(`Failed to create pot: ${e.message || 'Unknown error'}`)
        } finally {
            setSaving(false)
        }
    }

    const movePot = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === pots.length - 1) return;

        const newPots = [...pots];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        const temp = newPots[index];
        newPots[index] = newPots[swapIndex];
        newPots[swapIndex] = temp;

        const updates = newPots.map((p, i) => ({ id: p.id, sort_order: i }));
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
            await updatePot(id, { name: form.name, target_budget: form.target_budget, type: form.type as Pot['type'], balance: form.balance })
            setEditId(null)
        } catch (e: any) {
            alert(`Failed to update pot: ${e.message || 'Unknown error'}`)
        } finally {
            setSaving(false)
        }
    }

    const startEdit = (p: Pot) => {
        setEditId(p.id)
        setForm({ name: p.name, target_budget: p.target_budget, type: p.type, balance: p.balance })
    }

    return (
        <Section title="Spending Pots" desc="Create and manage your spending allocations (General & Buffer)">
            {loading ? <Spinner /> : (
                <div className="space-y-2">
                    {pots.filter(p => p.type !== 'savings').map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3 rounded-xl border border-black/[0.07] bg-white p-3">
                            {editId === p.id ? (
                                <>
                                    <input className="input-field flex-1" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                    <input className="input-field w-24 text-blue-600 font-medium" type="number" value={form.balance ?? 0} onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) })} title="Live Balance" />
                                    <input className="input-field w-28" type="number" value={form.target_budget ?? 0} onChange={(e) => setForm({ ...form, target_budget: parseFloat(e.target.value) })} title="Weekly Target" />
                                    <select className="input-field w-28" value={form.type ?? 'general'} onChange={(e) => setForm({ ...form, type: e.target.value as Pot['type'] })}>
                                        <option value="general">General</option>
                                        <option value="buffer">Buffer</option>
                                        <option value="savings">Savings</option>
                                    </select>
                                    <button onClick={() => handleUpdate(p.id)} disabled={saving} className="icon-btn text-emerald-600"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setEditId(null)} className="icon-btn text-black/30"><X className="w-4 h-4" /></button>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-0.5 mr-2">
                                        <button onClick={() => movePot(i, 'up')} disabled={i === 0 || saving} className="text-black/20 hover:text-black/60 disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                                        <button onClick={() => movePot(i, 'down')} disabled={i === pots.length - 1 || saving} className="text-black/20 hover:text-black/60 disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                                    </div>
                                    <span className="flex-1 text-[13px] text-black/80 font-medium">{p.name} <span className="text-[11px] text-black/40 font-normal ml-1 privacy-blur">£{(p.balance || 0).toFixed(2)}</span></span>
                                    <span className="text-[11px] text-black/35 capitalize">{p.type}</span>
                                    <span className="text-[12px] text-black/45 w-32 text-right">Weekly alloc: <span className="privacy-blur">£{p.target_budget.toFixed(2)}</span></span>
                                    <button onClick={() => startEdit(p)} className="icon-btn text-black/25 hover:text-black/60"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deletePot(p.id)} className="icon-btn text-black/20 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                            )}
                        </div>
                    ))}

                    {adding ? (
                        <div className="flex items-center gap-3 rounded-xl border border-black/20 bg-black/5 p-3">
                            <input className="input-field flex-1" placeholder="Pot name" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            <input className="input-field w-24 text-blue-600 font-medium" type="number" placeholder="Start £" value={form.balance ?? ''} onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) })} title="Starting Balance" />
                            <input className="input-field w-28" type="number" placeholder="Weekly £" value={form.target_budget ?? ''} onChange={(e) => setForm({ ...form, target_budget: parseFloat(e.target.value) })} title="Weekly Target" />
                            <select className="input-field w-28" value={form.type ?? 'general'} onChange={(e) => setForm({ ...form, type: e.target.value as Pot['type'] })}>
                                <option value="general">General</option>
                                <option value="buffer">Buffer</option>
                                <option value="savings">Savings</option>
                            </select>
                            <button onClick={handleAdd} disabled={saving} className="icon-btn text-emerald-600"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setAdding(false)} className="icon-btn text-black/30"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-[12px] text-black/35 hover:text-black/60 transition-colors px-2 py-1.5">
                            <Plus className="w-3.5 h-3.5" /> Add pot
                        </button>
                    )}
                </div>
            )}
        </Section>
    )
}
