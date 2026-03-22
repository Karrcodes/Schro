'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Loader2 } from 'lucide-react'
import DatePickerInput from '@/components/DatePickerInput'
import { supabase } from '@/lib/supabase'
import type { Pot, Goal, RecurringObligation } from '../types/finance.types'
import { FINANCE_CATEGORIES, getCategoryById } from '../constants/categories'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import { usePayslips } from '../hooks/usePayslips'
import { useIncome } from '../hooks/useIncome'
import { useRecurring } from '../hooks/useRecurring'
import { useRouter } from 'next/navigation'
import { getLenderLogo } from '../utils/lenderLogos'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'

const LENDERS = [
    { id: 'klarna', name: 'Klarna', emoji: '💗', color: '#ffb3c7' },
    { id: 'clearpay', name: 'Clearpay', emoji: '💚', color: '#b2fce1' },
    { id: 'currys', name: 'Currys Flexipay', emoji: '💜', color: '#6c3082' },
    { id: 'other', name: 'Other / Subscription', emoji: '💸', color: '#f3f4f6' },
]

interface QuickActionFABProps {
    pots?: Pot[]
    goals?: Goal[]
    obligations?: RecurringObligation[]
    onSuccess: () => void
}

type Tab = 'spend' | 'income' | 'liability' | 'transfer'

export function QuickActionFAB({ pots = [], goals = [], onSuccess }: QuickActionFABProps) {
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('spend')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const [amount, setAmount] = useState('')
    const [selectedPot, setSelectedPot] = useState('')
    const [toPot, setToPot] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('other')
    const [description, setDescription] = useState('')
    const { activeProfile, globalRefresh } = useFinanceProfile()
    const { settings } = useSystemSettings()
    const router = useRouter()

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    // Payday Allocation State
    const { logIncome } = useIncome()
    const { logPayslip } = usePayslips()
    const { createObligation } = useRecurring()
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [grossPay, setGrossPay] = useState('')
    const [taxPaid, setTaxPaid] = useState('')
    const [pension, setPension] = useState('')
    const [studentLoan, setStudentLoan] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [allocating, setAllocating] = useState(false)
    const [allocations, setAllocations] = useState<{ [key: string]: number }>({})

    // Liability State
    const [libName, setLibName] = useState('')
    const [libFreq, setLibFreq] = useState<'weekly' | 'bi-weekly' | 'monthly' | 'yearly'>('monthly')
    const [libDate, setLibDate] = useState(new Date().toISOString().split('T')[0])
    const [libDesc, setLibDesc] = useState('')
    const [libGroup, setLibGroup] = useState('')
    const [libEndDate, setLibEndDate] = useState('')
    const [libPaymentsLeft, setLibPaymentsLeft] = useState('')
    const [selectedLenderId, setSelectedLenderId] = useState<string>('other')
    const [libEmoji, setLibEmoji] = useState('💸')

    const reset = () => {
        setAmount(''); setSelectedPot(''); setToPot(''); setSelectedCategory('other');
        setDescription(''); setError(null); setSuccessMessage(null);
        setDate(new Date().toISOString().split('T')[0]);
        setGrossPay(''); setTaxPaid(''); setPension(''); setStudentLoan('');
        setAllocating(false); setAllocations({});
        setLibName(''); setLibFreq('monthly'); setLibDate(new Date().toISOString().split('T')[0]);
        setLibDesc(''); setLibGroup(''); setLibEndDate(''); setLibPaymentsLeft('');
        setSelectedLenderId('other'); setLibEmoji('💸');
    }
    const handleClose = () => { setOpen(false); reset() }
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab); reset()
    }

    const handleSubmit = async () => {
        const amt = parseFloat(amount)
        if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
        setLoading(true); setError(null)

        try {
            // SPEND TAB
            if (activeTab === 'spend') {
                if (!selectedPot) { setError('Select a source.'); setLoading(false); return }

                const isGoal = selectedPot.startsWith('goal_')
                const actualId = isGoal ? selectedPot.replace('goal_', '') : selectedPot

                const cat = getCategoryById(selectedCategory)

                if (isGoal) {
                    const goal = goals?.find((g) => g.id === actualId)
                    if (goal && amt > goal.current_amount) { setError(`Insufficient balance in ${goal.name}.`); setLoading(false); return }

                    await supabase.from('fin_transactions').insert({
                        type: 'spend',
                        amount: amt,
                        pocket_id: null,
                        description: `[Goal: ${goal?.name}] ${description || 'Expense'}`,
                        date: new Date().toISOString().split('T')[0],
                        category: cat.id,
                        emoji: cat.emoji,
                        profile: activeProfile
                    })
                    if (goal) await supabase.from('fin_goals').update({ current_amount: goal.current_amount - amt }).eq('id', actualId)
                } else {
                    const pot = pots.find((p) => p.id === actualId)
                    if (pot && amt > pot.balance) { setError(`Insufficient balance in ${pot.name}. Available: £${pot.balance.toFixed(2)}`); setLoading(false); return }

                    await supabase.from('fin_transactions').insert({
                        type: 'spend',
                        amount: amt,
                        pocket_id: actualId,
                        description: description || 'Expense',
                        date: new Date().toISOString().split('T')[0],
                        category: cat.id,
                        emoji: cat.emoji,
                        profile: activeProfile
                    })
                    if (pot) await supabase.from('fin_pockets').update({ balance: pot.balance - amt }).eq('id', actualId)
                }
            }
            // TRANSFER TAB
            if (activeTab === 'transfer') {
                if (!selectedPot || !toPot) { setError('Select both sources/destinations.'); setLoading(false); return }
                if (selectedPot === toPot) { setError('Cannot transfer to same place.'); setLoading(false); return }

                const fromIsGoal = selectedPot.startsWith('goal_')
                const fromId = fromIsGoal ? selectedPot.replace('goal_', '') : selectedPot
                const fromName = fromIsGoal ? goals?.find(g => g.id === fromId)?.name : pots.find(p => p.id === fromId)?.name

                const toIsGoal = toPot.startsWith('goal_')
                const toId = toIsGoal ? toPot.replace('goal_', '') : toPot
                const toName = toIsGoal ? goals?.find(g => g.id === toId)?.name : pots.find(p => p.id === toId)?.name

                const fromPot = !fromIsGoal ? pots.find(p => p.id === fromId) : null
                const fromGoal = fromIsGoal ? goals?.find(g => g.id === fromId) : null

                const fromBalance = fromIsGoal ? (fromGoal?.current_amount || 0) : (fromPot?.balance || 0)
                if (amt > fromBalance) { setError(`Insufficient balance in ${fromName}.`); setLoading(false); return }

                // Record two transaction rows for double entry
                await supabase.from('fin_transactions').insert([
                    {
                        type: 'transfer',
                        amount: amt,
                        pocket_id: fromIsGoal ? null : fromId,
                        description: `Transfer to ${toName || 'destination'}${fromIsGoal ? ` (from Goal: ${fromName})` : ''}`,
                        date: new Date().toISOString().split('T')[0],
                        category: 'transfer',
                        emoji: '🔄',
                        profile: activeProfile
                    },
                    {
                        type: 'allocate',
                        amount: amt,
                        pocket_id: toIsGoal ? null : toId,
                        description: `Transfer from ${fromName || 'source'}${toIsGoal ? ` (to Goal: ${toName})` : ''}`,
                        date: new Date().toISOString().split('T')[0],
                        category: 'transfer',
                        emoji: '🔄',
                        profile: activeProfile
                    }
                ])

                if (fromIsGoal && fromGoal) await supabase.from('fin_goals').update({ current_amount: fromGoal.current_amount - amt }).eq('id', fromId)
                if (!fromIsGoal && fromPot) await supabase.from('fin_pockets').update({ balance: fromPot.balance - amt }).eq('id', fromId)

                const toPotObj = !toIsGoal ? pots.find(p => p.id === toId) : null
                const toGoalObj = toIsGoal ? goals?.find(g => g.id === toId) : null

                if (toIsGoal && toGoalObj) await supabase.from('fin_goals').update({ current_amount: toGoalObj.current_amount + amt }).eq('id', toId)
                if (!toIsGoal && toPotObj) await supabase.from('fin_pockets').update({ balance: toPotObj.balance + amt }).eq('id', toId)

                // 3. Optional: Sync with Monzo if it's a Monzo pot
                try {
                    const fromMonzoId = fromPot?.monzo_id
                    const toMonzoId = toPotObj?.monzo_id
                    const fromIsGeneral = fromPot?.type === 'general'
                    const toIsGeneral = toPotObj?.type === 'general'

                    if (!settings.is_demo_mode) {
                        if (fromIsGeneral && toMonzoId) {
                            // Deposit to Pot
                            await fetch('/api/finance/monzo/transfer', {
                                method: 'POST',
                                body: JSON.stringify({ action: 'deposit', potId: toMonzoId, amount: amt })
                            })
                        } else if (fromMonzoId && toIsGeneral) {
                            // Withdraw from Pot
                            await fetch('/api/finance/monzo/transfer', {
                                method: 'POST',
                                body: JSON.stringify({ action: 'withdraw', potId: fromMonzoId, amount: amt })
                            })
                        } else if (fromMonzoId && toMonzoId) {
                            // Pot to Pot (Withdraw then Deposit)
                            await fetch('/api/finance/monzo/transfer', {
                                method: 'POST',
                                body: JSON.stringify({ action: 'withdraw', potId: fromMonzoId, amount: amt })
                            })
                            await fetch('/api/finance/monzo/transfer', {
                                method: 'POST',
                                body: JSON.stringify({ action: 'deposit', potId: toMonzoId, amount: amt })
                            })
                            setSuccessMessage(`Bank transfer successful: £${amt.toFixed(2)} moved to ${toPotObj?.name}`)
                        }
                    }
                } catch (monzoErr) {
                    console.error('Monzo sync failed:', monzoErr)
                    setError('Local transfer saved, but Monzo bank sync failed. Check your connection.')
                }
            }
            if (activeTab === 'liability') {
                if (!libName) { setError('Enter a name for the liability.'); setLoading(false); return }

                const calculateEndDate = (startDate: string, frequency: string, paymentsLeftStr: string) => {
                    const paymentsLeft = parseInt(paymentsLeftStr)
                    if (!startDate || isNaN(paymentsLeft) || paymentsLeft <= 0) return null
                    const dateObj = new Date(startDate)
                    const totalPayments = paymentsLeft - 1
                    if (totalPayments <= 0) return startDate

                    if (frequency === 'weekly') dateObj.setDate(dateObj.getDate() + (totalPayments * 7))
                    else if (frequency === 'bi-weekly') dateObj.setDate(dateObj.getDate() + (totalPayments * 14))
                    else if (frequency === 'monthly') dateObj.setMonth(dateObj.getMonth() + totalPayments)
                    else if (frequency === 'yearly') dateObj.setFullYear(dateObj.getFullYear() + totalPayments)

                    return dateObj.toISOString().split('T')[0]
                }

                let finalEndDate = libEndDate || null
                const parsedPaymentsLeft = parseInt(libPaymentsLeft) || null

                if (parsedPaymentsLeft && parsedPaymentsLeft > 0) {
                    finalEndDate = calculateEndDate(libDate, libFreq, libPaymentsLeft)
                }

                await createObligation({
                    name: libName,
                    amount: amt,
                    frequency: libFreq,
                    next_due_date: libDate,
                    category: selectedLenderId === 'other' ? 'other' : 'bills',
                    emoji: libEmoji,
                    description: libDesc || null,
                    end_date: finalEndDate,
                    group_name: libGroup || null,
                    payments_left: parsedPaymentsLeft
                })
            }
            globalRefresh(); onSuccess(); handleClose()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally { setLoading(false) }
    }

    const startAllocation = () => {
        const amt = parseFloat(amount)
        if (!amt || amt <= 0) { setError('Please enter a valid income amount.'); return }
        if (!description) { setError('Please specify an income source.'); return }
        setError(null)

        const defaultAllocations: { [key: string]: number } = {}
        pots.forEach(p => { defaultAllocations[p.id] = p.target_budget })
        if (goals && Array.isArray(goals)) { goals.forEach(g => { defaultAllocations[g.id] = 0 }) }
        setAllocations(defaultAllocations)
        setAllocating(true)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        setUploading(true)
        setError(null)
        setSuccessMessage(null)

        if (files.length === 1) {
            const formData = new FormData()
            formData.append('file', files[0])

            try {
                const res = await fetch('/api/ai/payslip', { method: 'POST', body: formData })
                if (!res.ok) throw new Error('Failed to parse payslip')

                const data = await res.json()
                if (data.error) throw new Error(data.error)

                if (data.netPay) setAmount(data.netPay.toString())
                if (data.employer) setDescription(data.employer)
                if (data.date) setDate(data.date)

                if (data.grossPay) setGrossPay(data.grossPay.toString())
                if (data.tax) setTaxPaid(data.tax.toString())
                if (data.pension) setPension(data.pension.toString())
                if (data.studentLoan) setStudentLoan(data.studentLoan.toString())

            } catch (err: any) {
                setError(err.message || 'AI processing failed')
            } finally {
                setUploading(false)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        } else {
            let successCount = 0
            for (const file of files) {
                const formData = new FormData()
                formData.append('file', file)

                try {
                    const res = await fetch('/api/ai/payslip', { method: 'POST', body: formData })
                    if (!res.ok) continue

                    const data = await res.json()
                    if (data.error) continue

                    if (data.netPay && data.date) {
                        await logPayslip({
                            date: data.date, employer: data.employer || 'Salary', net_pay: parseFloat(data.netPay),
                            gross_pay: data.grossPay ? parseFloat(data.grossPay) : null, tax_paid: data.tax ? parseFloat(data.tax) : null,
                            pension_contributions: data.pension ? parseFloat(data.pension) : null, student_loan: data.studentLoan ? parseFloat(data.studentLoan) : null
                        })
                        successCount++
                    }
                } catch (err: any) { }
            }

            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
            if (successCount > 0) {
                setSuccessMessage(`Successfully processed & saved ${successCount} payslips.`)
                onSuccess()
            } else { setError('Failed to process any uploaded payslips.') }
        }
    }

    const unallocated = parseFloat(amount || '0') - Object.values(allocations).reduce((sum, curr) => sum + (curr || 0), 0)

    const handleConfirmAllocations = async () => {
        if (unallocated < 0) { setError('You have allocated more than your income.'); return }
        setLoading(true); setError(null)

        try {
            const amt = parseFloat(amount)
            await logPayslip({
                date: date, employer: description, net_pay: amt,
                gross_pay: grossPay ? parseFloat(grossPay) : null,
                tax_paid: taxPaid ? parseFloat(taxPaid) : null,
                pension_contributions: pension ? parseFloat(pension) : null,
                student_loan: studentLoan ? parseFloat(studentLoan) : null
            }, true) // Skip automatic routing, we handle it below

            const transactionPromises: any[] = []
            const pocketUpdatePromises: any[] = []

            // Find General pocket for unallocated remainder using hyper-strict priority:
            // 1. Exact name match 'General'
            // 2. Exact type match 'general'
            // 3. Inclusion match 'General'
            const generalPot = pots.find(p => p.name.toLowerCase() === 'general')
                || pots.find(p => p.type === 'general')
                || pots.find(p => p.name.toLowerCase().includes('general'))
            const handledIds = new Set<string>()

            for (const [itemId, allocAmt] of Object.entries(allocations)) {
                if (allocAmt > 0) {
                    const pot = pots.find(p => p.id === itemId)
                    if (pot) {
                        let finalAlloc = allocAmt
                        // If this is the general pot, add the unallocated remainder to it
                        if (generalPot && itemId === generalPot.id && unallocated > 0) {
                            finalAlloc += unallocated
                            handledIds.add(itemId)
                        }

                        transactionPromises.push(
                            supabase.from('fin_transactions').insert({
                                type: 'allocate', amount: finalAlloc, pocket_id: itemId, description: `Payday allocation (${description})`, date: date, profile: activeProfile
                            }).then(res => res)
                        )
                        pocketUpdatePromises.push(
                            supabase.from('fin_pockets').update({
                                balance: (pot.balance ?? 0) + finalAlloc,
                                current_balance: (pot.current_balance ?? pot.balance ?? 0) + finalAlloc
                            }).eq('id', itemId).then(res => res)
                        )
                    } else if (goals && Array.isArray(goals)) {
                        const goal = goals.find(g => g.id === itemId)
                        if (goal) {
                            pocketUpdatePromises.push(
                                supabase.from('fin_goals').update({ current_amount: goal.current_amount + allocAmt }).eq('id', itemId).then(res => res)
                            )
                        }
                    }
                }
            }

            // If general pot wasn't in allocations but there is unallocated money
            if (generalPot && !handledIds.has(generalPot.id) && unallocated > 0) {
                transactionPromises.push(
                    supabase.from('fin_transactions').insert({
                        type: 'allocate', amount: unallocated, pocket_id: generalPot.id, description: `Payday remainder (${description})`, date: date, profile: activeProfile
                    }).then(res => res)
                )
                pocketUpdatePromises.push(
                    supabase.from('fin_pockets').update({
                        balance: (generalPot.balance ?? 0) + unallocated,
                        current_balance: (generalPot.current_balance ?? generalPot.balance ?? 0) + unallocated
                    }).eq('id', generalPot.id).then(res => res)
                )
            }

            await Promise.all([...transactionPromises, ...pocketUpdatePromises])
            globalRefresh(); onSuccess(); handleClose()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to save allocations.')
        } finally { setLoading(false) }
    }

    const handleSaveIncomeWithoutAssigning = async () => {
        const amt = parseFloat(amount)
        if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
        if (!description) { setError('Specify an income source.'); return }
        setLoading(true); setError(null)

        try {
            await logPayslip({
                date: date, employer: description, net_pay: amt,
                gross_pay: grossPay ? parseFloat(grossPay) : null, tax_paid: taxPaid ? parseFloat(taxPaid) : null,
                pension_contributions: pension ? parseFloat(pension) : null, student_loan: studentLoan ? parseFloat(studentLoan) : null
            })
            globalRefresh(); onSuccess(); handleClose()
        } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to save income.') } finally { setLoading(false) }
    }


    const tabs: { id: Tab; label: string; icon: typeof Plus; color: string }[] = [
        { id: 'spend', label: 'Log Spend', icon: ArrowUpFromLine, color: '#dc2626' },
        { id: 'income', label: 'Add Income', icon: ArrowDownToLine, color: '#059669' },
        { id: 'liability', label: 'Add Liability', icon: Plus, color: '#f59e0b' },
        { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight, color: '#2563eb' },
    ]

    return (
        <>
            {/* FAB */}
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-black shadow-lg shadow-black/25 flex items-center justify-center hover:bg-neutral-800 active:scale-95 transition-all z-40"
            >
                <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
            </button>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose} />
                    <div className="relative w-[calc(100%-2rem)] max-w-md mx-4 rounded-2xl bg-white border border-black/[0.08] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
                            <p className="text-[15px] font-bold text-black">Quick Action</p>
                            <button onClick={handleClose} className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center hover:bg-black/[0.08] transition-colors">
                                <X className="w-4 h-4 text-black/40" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border-b border-black/[0.06]">
                            {tabs.map(({ id, label, icon: Icon, color }) => (
                                <button
                                    key={id}
                                    onClick={() => handleTabChange(id)}
                                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[12px] font-semibold transition-all ${activeTab === id ? 'bg-black/[0.05] text-black' : 'text-black/40 hover:text-black/60'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" style={{ color: activeTab === id ? color : undefined }} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Form Body Contexts */}
                        {allocating && activeTab === 'income' ? (
                            <div className="p-5 flex flex-col overflow-y-auto no-scrollbar pb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-[16px] font-bold text-[#059669]">Distribute Income</h2>
                                        <p className="text-[12px] text-black/60 mt-0.5">Allocate your £{parseFloat(amount).toFixed(2)} {description}</p>
                                    </div>
                                    <div className={`text-right ${unallocated < 0 ? 'text-red-600' : unallocated === 0 ? 'text-[#059669]' : 'text-black'}`}>
                                        <div className="text-[18px] font-bold">£{unallocated.toFixed(2)}</div>
                                        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60">To Assign</div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-5 max-h-[300px] overflow-y-auto pr-1">
                                    {pots.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-[11px] font-bold text-black/40 uppercase tracking-wider mb-2">Pots</h3>
                                            {pots.map(p => (
                                                <div key={p.id} className="flex items-center gap-3 bg-white border border-black/[0.06] rounded-xl p-3">
                                                    <div className="flex-1">
                                                        <div className="text-[13px] font-semibold text-black/80">{p.name}</div>
                                                        <div className="text-[11px] text-black/40">Current: £{(p.balance ?? 0).toFixed(2)} • Target: £{p.target_budget.toFixed(2)}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[14px] font-bold text-black/40">+£</span>
                                                        <input type="number" value={allocations[p.id] ?? ''} onChange={(e) => setAllocations(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                                                            className="w-20 bg-black/[0.04] border border-black/[0.08] rounded-lg px-2 py-1.5 text-[14px] font-bold text-black text-right outline-none focus:border-[#059669]/40" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {goals && Array.isArray(goals) && goals.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-[11px] font-bold text-black/40 uppercase tracking-wider mb-2 mt-4">Savings Goals</h3>
                                            {goals.map((g) => (
                                                <div key={g.id} className="flex items-center gap-3 bg-white border border-black/[0.06] rounded-xl p-3">
                                                    <div className="flex-1">
                                                        <div className="text-[13px] font-semibold text-black/80">{g.name}</div>
                                                        <div className="text-[11px] text-black/40">Saved: £{g.current_amount.toFixed(2)} • Target: £{g.target_amount.toFixed(2)}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[14px] font-bold text-black/40">+£</span>
                                                        <input type="number" value={allocations[g.id] ?? ''} onChange={(e) => setAllocations(prev => ({ ...prev, [g.id]: parseFloat(e.target.value) || 0 }))}
                                                            className="w-20 bg-black/[0.04] border border-black/[0.08] rounded-lg px-2 py-1.5 text-[14px] font-bold text-black text-right outline-none focus:border-[#059669]/40" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {error && <p className="text-[12px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 mb-4">{error}</p>}

                                <div className="flex gap-2">
                                    <button onClick={handleConfirmAllocations} disabled={loading || unallocated < 0}
                                        className="flex-[2] py-3 rounded-xl bg-[#059669] text-white font-bold text-[14px] hover:bg-[#047857] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Allocations'}
                                    </button>
                                    <button onClick={() => setAllocating(false)} disabled={loading}
                                        className="flex-1 py-3 px-4 rounded-xl border border-black/[0.1] text-black/60 font-semibold text-[14px] hover:bg-black/[0.05] transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 space-y-4 overflow-y-auto overflow-x-hidden no-scrollbar pb-8">

                                {/* AI Payslip Block */}
                                {activeTab === 'income' && (
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-black/[0.06]">
                                        <div>
                                            <p className="text-[13px] font-bold text-black">Log with AI</p>
                                            <p className="text-[11px] text-black/50">Upload a single or batch of payslips</p>
                                        </div>
                                        <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-black bg-black/[0.05] px-3 py-2 rounded-lg hover:bg-black/[0.1] transition-colors disabled:opacity-50">
                                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                                            {uploading ? 'Parsing...' : 'Upload'}
                                        </button>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-1.5 block">Amount (£)</label>
                                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                                        className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 h-[46px] text-xl font-bold text-black placeholder-black/20 outline-none focus:border-black/40 transition-colors box-border" />
                                </div>

                                {activeTab !== 'income' && activeTab !== 'liability' && (
                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-1.5 block">
                                            {activeTab === 'transfer' ? 'From' : 'Source'}
                                        </label>
                                        <select value={selectedPot} onChange={(e) => setSelectedPot(e.target.value)}
                                            className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 h-[46px] text-[14px] text-black outline-none focus:border-black/40 appearance-none box-border">
                                            <option value="">Select source…</option>
                                            <optgroup label="Pots">
                                                {pots.map((p) => <option key={p.id} value={p.id}>{p.name} — £{p.balance?.toFixed(2) ?? '0.00'}</option>)}
                                            </optgroup>
                                            {activeTab === 'spend' && goals && goals.length > 0 && (
                                                <optgroup label="Savings Goals">
                                                    {goals.map((g) => <option key={`goal_${g.id}`} value={`goal_${g.id}`}>{g.name} — £{g.current_amount?.toFixed(2) ?? '0.00'}</option>)}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                )}

                                {activeTab === 'transfer' && (
                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-1.5 block">To</label>
                                        <select value={toPot} onChange={(e) => setToPot(e.target.value)}
                                            className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 h-[46px] text-[14px] text-black outline-none focus:border-black/40 appearance-none box-border">
                                            <option value="">Select destination…</option>
                                            <optgroup label="Pots">
                                                {pots.filter((p) => p.id !== selectedPot).map((p) => <option key={p.id} value={p.id}>{p.name} — £{p.balance?.toFixed(2) ?? '0.00'}</option>)}
                                            </optgroup>
                                            {goals && goals.length > 0 && (
                                                <optgroup label="Savings Goals">
                                                    {goals.filter(g => `goal_${g.id}` !== selectedPot).map((g) => <option key={`goal_${g.id}`} value={`goal_${g.id}`}>{g.name} — £{g.current_amount?.toFixed(2) ?? '0.00'}</option>)}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                )}

                                {activeTab === 'liability' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-2 block">Provider / Tag</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                                                {LENDERS.map(l => (
                                                    <button key={l.id}
                                                        onClick={() => {
                                                            setSelectedLenderId(l.id)
                                                            setLibName(l.id === 'other' ? '' : l.name)
                                                            setLibEmoji(l.emoji)
                                                        }}
                                                        className={`flex items-center gap-2 px-3 h-[46px] rounded-xl border transition-all box-border overflow-hidden ${selectedLenderId === l.id ? 'bg-white border-black shadow-[0_2px_10px_rgba(124,58,237,0.1)] ring-1 ring-black/20' : 'bg-black/[0.03] border-black/[0.05] hover:border-black/[0.15] hover:bg-black/[0.05]'}`}>
                                                        {getLenderLogo(l.name) ? (
                                                            <div className="w-5 h-5 rounded bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                <img src={getLenderLogo(l.name)!} alt={l.name} className="w-full h-full object-contain" />
                                                            </div>
                                                        ) : (
                                                            <span className="text-lg leading-none">{l.emoji}</span>
                                                        )}
                                                        <span className="text-[12px] font-bold text-black/70 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{l.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {selectedLenderId === 'other' && (
                                                <input value={libName} onChange={(e) => setLibName(e.target.value)} placeholder="e.g. Netflix, Gym"
                                                    className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 h-[46px] text-[14px] text-black outline-none focus:border-black/40 transition-colors box-border" />
                                            )}
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-3">
                                            <div className="flex-1 min-w-0">
                                                <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-1.5 block">Frequency</label>
                                                <select value={libFreq} onChange={(e) => setLibFreq(e.target.value as any)}
                                                    className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 h-[46px] text-[14px] text-black outline-none focus:border-black/40 appearance-none box-border">
                                                    <option value="weekly">Weekly</option>
                                                    <option value="bi-weekly">Bi-weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                    <option value="yearly">Yearly</option>
                                                </select>
                                            </div>
                                            <div className="flex-[1.5] min-w-0">
                                                <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-1.5 block">Next Payment</label>
                                                <DatePickerInput value={libDate ?? ''} onChange={val => setLibDate(val)} />
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-black/[0.06]">
                                            <div>
                                                <label className="text-[11px] uppercase tracking-wider text-black/40 font-bold mb-1.5 block">Description / Note</label>
                                                <input value={libDesc} onChange={(e) => setLibDesc(e.target.value)} placeholder="e.g. Monitor, Deliveroo"
                                                    className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 h-[46px] text-[14px] text-black outline-none focus:border-black/40 transition-colors box-border" />
                                            </div>

                                            {(selectedLenderId === 'klarna' || selectedLenderId === 'clearpay') ? (
                                                <div>
                                                    <label className="text-[11px] uppercase tracking-wider text-black/40 font-bold mb-1.5 block">Payments Left</label>
                                                    <input type="number" value={libPaymentsLeft} onChange={(e) => setLibPaymentsLeft(e.target.value)} placeholder="e.g. 3"
                                                        className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 h-[46px] text-[14px] text-black outline-none focus:border-black/40 transition-colors box-border" />
                                                </div>
                                            ) : (
                                                <div className={`min-w-0 ${selectedLenderId === 'currys' ? '' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0 focus-within:opacity-100 focus-within:grayscale-0 transition-all'}`}>
                                                    <label className="text-[11px] uppercase tracking-wider text-black/40 font-bold mb-1.5 block">End Date (Optional)</label>
                                                    <DatePickerInput value={libEndDate ?? ''} onChange={val => setLibEndDate(val)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab !== 'liability' && (
                                    <div className={`flex flex-col md:flex-row ${activeTab === 'income' ? 'gap-3' : ''}`}>
                                        <div className="flex-1 min-w-0">
                                            <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-1.5 block">
                                                {activeTab === 'income' ? 'Source' : 'Note (optional)'}
                                            </label>
                                            <input value={description} onChange={(e) => setDescription(e.target.value)}
                                                placeholder={activeTab === 'income' ? 'Salary' : 'What was this for?'}
                                                className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 h-[46px] text-[14px] text-black placeholder-black/20 outline-none focus:border-black/40 transition-colors box-border" />
                                        </div>

                                        {activeTab === 'income' && (
                                            <div className="w-full md:w-[150px] shrink-0 min-w-0">
                                                <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-1.5 block">Date</label>
                                                <DatePickerInput value={date ?? ''} onChange={val => setDate(val)} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'spend' && (
                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-black/40 font-semibold mb-1.5 block">Category</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {FINANCE_CATEGORIES.filter(c => c.id !== 'income' && c.id !== 'transfer').map((cat) => (
                                                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${selectedCategory === cat.id ? 'bg-black/10 border-black/30 shadow-sm' : 'bg-black/[0.02] border-black/[0.05] hover:bg-black/[0.05]'}`}>
                                                    <span className="text-xl mb-1">{cat.emoji}</span>
                                                    <span className="text-[9px] font-bold text-black/60 truncate w-full text-center uppercase tracking-tight">{cat.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {error && <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                                {successMessage && <p className="text-[12px] text-[#059669] mt-1 w-full bg-[#059669]/10 py-1.5 px-3 rounded-lg font-medium">{successMessage}</p>}

                                {activeTab === 'income' ? (
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={handleSaveIncomeWithoutAssigning} disabled={loading || !amount}
                                            className="flex-[1] py-3 rounded-xl border border-black/[0.1] bg-white text-black/60 font-semibold text-[13px] hover:bg-black/[0.03] transition-colors disabled:opacity-50">
                                            Save Only
                                        </button>
                                        <button onClick={startAllocation} disabled={loading || !amount}
                                            className="flex-[2] py-3 rounded-xl bg-[#059669] text-white font-semibold text-[13px] hover:bg-[#047857] transition-colors disabled:opacity-50 flex items-center justify-center">
                                            Add & Assign
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={handleSubmit} disabled={loading}
                                        className="w-full py-3 rounded-xl bg-black text-white font-semibold text-[14px] hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : activeTab === 'spend' ? 'Log Spend' : activeTab === 'liability' ? 'Add Liability' : 'Transfer'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
