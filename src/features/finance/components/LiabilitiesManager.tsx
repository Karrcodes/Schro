'use client'

import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X, Loader2, LayoutGrid, List, Sparkles } from 'lucide-react'
import DatePickerInput from '@/components/DatePickerInput'
import { cn } from '@/lib/utils'
import { useRecurring } from '@/features/finance/hooks/useRecurring'
import type { RecurringObligation } from '@/features/finance/types/finance.types'
import { getLenderLogo } from '@/features/finance/utils/lenderLogos'
import { Section, Spinner } from '@/features/finance/components/SharedSettingsUI'
import { LiabilitiesServiceGrid } from './LiabilitiesServiceGrid'
import { AikinChat } from './AikinChat'

const LENDERS = [
    { id: 'klarna', name: 'Klarna', emoji: '💗', color: '#ffb3c7' },
    { id: 'clearpay', name: 'Clearpay', emoji: '💚', color: '#b2fce1' },
    { id: 'currys', name: 'Currys Flexipay', emoji: '💜', color: '#6c3082' },
    { id: 'other', name: 'Other / Subscription', emoji: '💸', color: '#f3f4f6' },
]

export function LiabilitiesManager() {
    const { obligations, loading, createObligation, updateObligation, deleteObligation, markObligationAsPaid } = useRecurring()
    const [adding, setAdding] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<RecurringObligation>>({
        frequency: 'monthly',
        amount: 0,
        category: 'other',
        emoji: '💸',
        payments_left: null
    })

    const [selectedLenderId, setSelectedLenderId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [viewFilter, setViewFilter] = useState<'all' | 'debt' | 'subs'>('all')
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
    const [showAI, setShowAI] = useState(false)

    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
        confirmText: string;
        type: 'danger' | 'warning';
    }>({
        open: false,
        title: '',
        message: '',
        action: async () => { },
        confirmText: 'Confirm',
        type: 'danger'
    })

    const calculateEndDate = (startDate: string, frequency: string, paymentsLeft: number) => {
        if (!startDate || paymentsLeft <= 0) return null
        const date = new Date(startDate)
        const totalPayments = paymentsLeft - 1
        if (totalPayments <= 0) return startDate

        if (frequency === 'weekly') date.setDate(date.getDate() + (totalPayments * 7))
        else if (frequency === 'bi-weekly') date.setDate(date.getDate() + (totalPayments * 14))
        else if (frequency === 'monthly') date.setMonth(date.getMonth() + totalPayments)
        else if (frequency === 'yearly') date.setFullYear(date.getFullYear() + totalPayments)

        return date.toISOString().split('T')[0]
    }

    const handleSave = async (isEdit: boolean = false) => {
        if (!form.name || !form.amount || !form.next_due_date || !form.frequency) return
        setSaving(true)

        let endDate = form.end_date || null
        if (form.payments_left && form.payments_left > 0) {
            endDate = calculateEndDate(form.next_due_date, form.frequency, form.payments_left)
        }

        try {
            const data = {
                name: form.name,
                amount: form.amount,
                frequency: form.frequency,
                next_due_date: form.next_due_date,
                end_date: endDate,
                group_name: form.group_name || null,
                category: form.category || 'other',
                emoji: form.emoji || '💸',
                description: form.description || null,
                payments_left: form.payments_left || null
            }

            if (isEdit && editId) {
                await updateObligation(editId, data)
                setEditId(null)
            } else {
                await createObligation(data)
                setAdding(false)
            }
            setForm({ frequency: 'monthly', amount: 0, category: 'other', emoji: '💸', payments_left: null })
        } catch (e: any) {
            alert(`Failed to save liability: ${e.message || 'Unknown error'}`)
        } finally {
            setSaving(false)
        }
    }

    const startAdd = () => {
        setAdding(true)
        setEditId(null)
        setSelectedLenderId('other')
        setForm({
            frequency: 'monthly',
            amount: 0,
            category: 'other',
            emoji: '💸',
            payments_left: null,
            name: '',
            description: '',
            group_name: '',
            next_due_date: new Date().toISOString().split('T')[0]
        })
    }

    const startEdit = (o: RecurringObligation) => {
        setEditId(o.id)
        setAdding(false)
        const lender = LENDERS.find(l => l.name === o.name)
        setSelectedLenderId(lender ? lender.id : 'other')
        setForm({
            name: o.name,
            amount: o.amount,
            frequency: o.frequency,
            next_due_date: o.next_due_date,
            end_date: o.end_date,
            group_name: o.group_name,
            category: o.category || 'other',
            emoji: o.emoji || '💸',
            description: o.description,
            payments_left: o.payments_left
        })
    }

    const handleDeleteClick = (o: RecurringObligation) => {
        setConfirmModal({
            open: true,
            title: 'Cancel Liability?',
            message: `Are you sure you want to cancel and delete "${o.name}"? This will stop tracking its payments.`,
            confirmText: 'Yes, Cancel',
            type: 'danger',
            action: async () => {
                await deleteObligation(o.id)
                setConfirmModal(prev => ({ ...prev, open: false }))
            }
        })
    }

    const LiabilityForm = ({ isEdit }: { isEdit: boolean }) => (
        <div className="bg-white p-8 space-y-6">
            <h3 className="text-xl font-black text-black border-b border-black/[0.04] pb-4 mb-4">
                {isEdit ? 'Edit Liability' : 'New Liability'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <div className="sm:col-span-2">
                    <label className="text-[11px] uppercase tracking-wider text-black/30 font-bold mb-3 block">Provider</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {LENDERS.map(l => (
                            <button key={l.id}
                                onClick={() => {
                                    setSelectedLenderId(l.id)
                                    setForm({ ...form, name: l.id === 'other' ? '' : l.name, emoji: l.emoji, category: l.id === 'other' ? 'other' : 'bills' });
                                }}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 ${selectedLenderId === l.id ? 'bg-black text-white border-black scale-[1.02] shadow-xl' : 'bg-white border-black/[0.05] hover:border-black/20'}`}>
                                {getLenderLogo(l.name) ? (
                                    <img src={getLenderLogo(l.name)!} alt={l.name} className="w-6 h-6 object-contain" />
                                ) : (
                                    <span className="text-xl">{l.emoji}</span>
                                )}
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedLenderId === l.id ? 'text-white/60' : 'text-black/40'}`}>{l.name}</span>
                            </button>
                        ))}
                    </div>
                    {selectedLenderId === 'other' && (
                        <input className="input-field w-full mt-4 bg-black/[0.03] border-none" placeholder="Service Name (e.g. Netflix)" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    )}
                </div>

                {/* Amount & Next Payment */}
                <div>
                    <label className="text-[11px] uppercase tracking-wider text-black/30 font-bold mb-2 block">Amount</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-black/40">£</span>
                        <input className="input-field w-full pl-8 bg-black/[0.03] border-none text-[18px] font-black" type="number" step="0.01" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })} />
                    </div>
                </div>

                <div>
                    <label className="text-[11px] uppercase tracking-wider text-black/30 font-bold mb-2 block">Next Payment</label>
                    <DatePickerInput value={form.next_due_date ?? ''} onChange={val => setForm({ ...form, next_due_date: val })} />
                </div>

                {/* Frequency & Payments Left / End Date */}
                <div>
                    <label className="text-[11px] uppercase tracking-wider text-black/30 font-bold mb-2 block">Frequency</label>
                    <select className="input-field w-full bg-black/[0.03] border-none font-bold" value={form.frequency ?? 'monthly'} onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}>
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>

                <div>
                    {(selectedLenderId === 'klarna' || selectedLenderId === 'clearpay') ? (
                        <>
                            <label className="text-[11px] uppercase tracking-wider text-black/30 font-bold mb-2 block">Payments Remaining</label>
                            <input className="input-field w-full bg-black/[0.03] border-none font-bold" type="number" placeholder="e.g. 3" value={form.payments_left ?? ''} onChange={(e) => setForm({ ...form, payments_left: parseInt(e.target.value) })} />
                        </>
                    ) : (
                        <>
                            <label className="text-[11px] uppercase tracking-wider text-black/30 font-bold mb-2 block">End Date (optional)</label>
                            <DatePickerInput value={form.end_date ?? ''} onChange={val => setForm({ ...form, end_date: val })} />
                        </>
                    )}
                </div>

                {/* Meta: Description & Grouping */}
                <div>
                    <label className="text-[11px] uppercase tracking-wider text-black/30 font-bold mb-2 block">Description / Note</label>
                    <input className="input-field w-full bg-black/[0.03] border-none font-bold" placeholder="e.g. Amazon purchase" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div>
                    <label className="text-[11px] uppercase tracking-wider text-black/30 font-bold mb-2 block">Grouping Name</label>
                    <input className="input-field w-full bg-black/[0.03] border-none font-bold" placeholder="e.g. Tech Purchases" value={form.group_name ?? ''} onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
                </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-black/[0.04] mt-8">
                <button onClick={() => handleSave(isEdit)} disabled={saving} className="flex-1 bg-black text-white h-14 rounded-2xl font-black text-[13px] uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Create Liability'}
                </button>
                <button onClick={() => {
                    setAdding(false);
                    setEditId(null);
                    setSelectedLenderId(null);
                    setForm({ frequency: 'monthly', amount: 0, category: 'other', emoji: '💸', payments_left: null });
                }} className="px-8 bg-black/[0.05] text-black h-14 rounded-2xl font-black text-[13px] uppercase tracking-widest hover:bg-black/[0.1] transition-all">
                    Cancel
                </button>
            </div>
        </div>
    )

    return (
        <Section title="Active Liabilities" desc="Track active subscriptions and debt schedules">
            {/* Confirmation Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))} />
                    <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-8 text-center animate-in zoom-in-95 duration-200">
                        <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
                            confirmModal.type === 'danger' ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                        )}>
                            <Trash2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-black mb-2">{confirmModal.title}</h3>
                        <p className="text-[14px] font-medium text-black/40 mb-8 leading-relaxed">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                                className="flex-1 py-4 rounded-2xl bg-black/[0.05] text-black font-black text-[12px] uppercase tracking-widest hover:bg-black/[0.1] transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmModal.action}
                                className={cn(
                                    "flex-1 py-4 rounded-2xl text-white font-black text-[12px] uppercase tracking-widest transition-all shadow-xl active:scale-95",
                                    confirmModal.type === 'danger' ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"
                                )}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal (Add/Edit) */}
            {(adding || editId) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" 
                        onClick={() => { setAdding(false); setEditId(null); }} />
                    <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 border border-black/5">
                        <LiabilityForm isEdit={!!editId} />
                    </div>
                </div>
            )}

            {/* AI Suggestions Modal */}
            {showAI && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" 
                        onClick={() => setShowAI(false)} />
                    <div className="relative w-full max-w-xl bg-black rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 border border-white/10 p-6">
                        <AikinChat initialMessage="I've analyzed your liabilities. I've noted your Klarna schedules and subscriptions. How can I help you optimize these payments today?" />
                        <button 
                            onClick={() => setShowAI(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/40 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {loading ? <Spinner /> : (
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        {/* Tab Controls */}
                        <div className="flex gap-1 bg-black/[0.03] p-1.5 rounded-[20px] border border-black/[0.04]">
                            {(['all', 'debt', 'subs'] as const).map(id => (
                                <button
                                    key={id}
                                    onClick={() => setViewFilter(id)}
                                    className={cn(
                                        "px-6 py-2 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all",
                                        viewFilter === id ? "bg-white text-black shadow-lg shadow-black/5" : "text-black/30 hover:text-black/50"
                                    )}
                                >
                                    {id === 'all' ? 'All' : id === 'debt' ? 'Debt' : 'Subs'}
                                </button>
                            ))}
                        </div>

                        {/* Layout Switcher */}
                        <div className="flex gap-1 bg-black/[0.03] p-1.5 rounded-[20px] border border-black/[0.04]">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2.5 rounded-[14px] transition-all",
                                    viewMode === 'grid' ? "bg-white text-black shadow-lg shadow-black/5" : "text-black/30 hover:text-black/50"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2.5 rounded-[14px] transition-all",
                                    viewMode === 'list' ? "bg-white text-black shadow-lg shadow-black/5" : "text-black/30 hover:text-black/50"
                                )}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        {viewMode === 'grid' ? (
                            <LiabilitiesServiceGrid
                                obligations={obligations.filter(o => {
                                    if (viewFilter === 'all') return true
                                    const isDebt = (o.payments_left != null && o.payments_left > 0) || o.end_date != null
                                    if (viewFilter === 'debt') return isDebt
                                    return !isDebt
                                })}
                                loading={loading}
                                onAdd={startAdd}
                                onEdit={startEdit}
                                onDelete={handleDeleteClick}
                                onShowSuggestions={() => setShowAI(true)}
                            />
                        ) : (
                            <div className="space-y-3">
                                {obligations
                                    .filter(o => {
                                        if (viewFilter === 'all') return true
                                        const isDebt = (o.payments_left != null && o.payments_left > 0) || o.end_date != null
                                        if (viewFilter === 'debt') return isDebt
                                        return !isDebt
                                    })
                                    .map((o) => (
                                        <div key={o.id} className="group flex items-center gap-4 bg-white p-4 rounded-[24px] border border-black/[0.04] hover:border-black/10 transition-all hover:shadow-xl hover:shadow-black/5">
                                            {(() => {
                                                const logo = getLenderLogo(o.name)
                                                return logo ? (
                                                    <div className="w-12 h-12 rounded-[18px] bg-black/[0.02] p-2 flex items-center justify-center shrink-0">
                                                        <img src={logo} alt={o.name} className="w-full h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-[18px] bg-black/[0.02] flex items-center justify-center text-xl shrink-0">
                                                        {o.emoji || '💸'}
                                                    </div>
                                                )
                                            })()}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-black tracking-tight truncate">{o.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 bg-black/[0.03] px-2 py-0.5 rounded-full">
                                                        Next: {new Date(o.next_due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                    {(o.payments_left ?? 0) > 0 && (
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                            {o.payments_left} left
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-black tracking-tighter text-lg">£{o.amount.toFixed(2)}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-black/20">{o.frequency}</p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                                <button onClick={() => markObligationAsPaid(o)} className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-500 hover:scale-110 transition-all"><Check className="w-4 h-4" /></button>
                                                <button onClick={() => startEdit(o)} className="p-2 rounded-xl hover:bg-black/5 text-black/40 hover:text-black transition-all"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteClick(o)} className="p-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                
                                {!adding && (
                                    <button onClick={() => {
                                        setAdding(true);
                                        setEditId(null);
                                        setSelectedLenderId('other');
                                        setForm({ frequency: 'monthly', amount: 0, category: 'other', emoji: '💸', payments_left: null });
                                    }} className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-black/[0.06] rounded-[32px] hover:border-black/20 hover:bg-black/[0.01] transition-all group gap-2 mt-4">
                                        <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Plus className="w-5 h-5 text-black/40" />
                                        </div>
                                        <span className="text-[12px] font-black uppercase tracking-widest text-black/30">Add Liability</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Section>
    )
}
