'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, FileText, Search, Filter, RefreshCw, Trash2 } from 'lucide-react'
import { useTransactions } from '@/features/finance/hooks/useTransactions'
import { usePots } from '@/features/finance/hooks/usePots'
import { useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import { KarrFooter } from '@/components/KarrFooter'
import { TransactionDetailsModal } from '@/features/finance/components/TransactionDetailsModal'
import { getCategoryById, FINANCE_CATEGORIES } from '@/features/finance/constants/categories'
import { useBank } from '@/features/finance/hooks/useBank'
import { RevolutImportModal } from '@/features/finance/components/RevolutImportModal'
import { MonzoSyncControls } from '@/features/finance/components/MonzoSyncControls'
import type { Transaction } from '@/features/finance/types/finance.types'

export default function TransactionsPage() {
    const { transactions, loading, refetch, clearTransactions } = useTransactions()
    const { pots } = usePots()
    const { loading: bankSyncLoading } = useBank()
    const { activeProfile, setProfile: setActiveProfile } = useFinanceProfile()
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedPot, setSelectedPot] = useState<string>('all')
    const [timeFilter, setTimeFilter] = useState<string>('all')
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)

    const handleSyncSuccess = (count: number) => {
        alert(`Successfully synced ${count} new transactions!`)
        refetch()
    }

    const filtered = transactions.filter(t => {
        const matchesSearch = t.description?.toLowerCase().includes(search.toLowerCase()) ||
            t.category?.toLowerCase().includes(search.toLowerCase()) || false

        const matchesCat = selectedCategory === 'all' || t.category === selectedCategory
        const matchesPot = selectedPot === 'all' ||
            (selectedPot === 'null' ? t.pocket_id === null : t.pocket_id === selectedPot)

        let matchesTime = true
        if (timeFilter !== 'all') {
            const txDate = new Date(t.date)
            const now = new Date()
            const diffTime = Math.abs(now.getTime() - txDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (timeFilter === '30days') matchesTime = diffDays <= 30
            if (timeFilter === '3months') matchesTime = diffDays <= 90
            if (timeFilter === '6months') matchesTime = diffDays <= 180
            if (timeFilter === '1year') matchesTime = diffDays <= 365
        }

        return matchesSearch && matchesCat && matchesPot && matchesTime
    })

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            <div className="flex-1 overflow-y-auto bg-[#fafafa] flex flex-col p-6 md:p-10">
                <div className="max-w-7xl mx-auto w-full space-y-12 pb-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between z-10 gap-6 w-full flex-shrink-0">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <a href="/finances" className="w-9 h-9 rounded-xl bg-black/[0.03] flex items-center justify-center hover:bg-black/[0.06] transition-colors flex-shrink-0">
                                <ArrowLeft className="w-4 h-4 text-black/40" />
                            </a>
                            <div className="min-w-0 flex-1 space-y-1">
                                <h2 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">{activeProfile} Matrix</h2>
                                <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tighter uppercase grayscale truncate">Transactions</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <MonzoSyncControls />
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                disabled={bankSyncLoading}
                                className="flex items-center gap-1.5 text-[12px] font-bold text-black bg-black/5 px-3 py-1.5 rounded-xl hover:bg-black/10 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${bankSyncLoading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">{bankSyncLoading ? 'Syncing...' : 'Sync CSV'}</span>
                            </button>

                            <button
                                onClick={() => { if (confirm('Clear all transactions in this profile?')) clearTransactions() }}
                                className="flex items-center gap-1.5 text-[12px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Clear All</span>
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="w-full space-y-4">
                        {/* Filters & Search */}
                        <div className="bg-white p-4 rounded-3xl border border-black/[0.06] shadow-sm flex flex-col gap-3 mb-2">
                            {/* Profile Toggle */}
                            <div className="flex bg-black/[0.03] p-1 rounded-xl w-full">
                                <button
                                    onClick={() => setActiveProfile('personal')}
                                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all ${activeProfile === 'personal' ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/50'}`}
                                >
                                    Personal
                                </button>
                                <button
                                    onClick={() => setActiveProfile('business')}
                                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all ${activeProfile === 'business' ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/50'}`}
                                >
                                    Business
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    value={timeFilter}
                                    onChange={e => setTimeFilter(e.target.value)}
                                    className="bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-black/30 transition-colors w-full cursor-pointer font-bold text-black/60"
                                >
                                    <option value="all">All Time</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="3months">Last 3 Months</option>
                                    <option value="6months">Last 6 Months</option>
                                    <option value="1year">Last 1 Year</option>
                                </select>
                                <select
                                    value={selectedPot}
                                    onChange={e => setSelectedPot(e.target.value)}
                                    className="bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-black/30 transition-colors w-full cursor-pointer font-bold text-black/60"
                                >
                                    <option value="all">All Pots</option>
                                    {pots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    <option value="null">Unassigned</option>
                                </select>
                                <select
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    className="bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-black/30 transition-colors w-full cursor-pointer font-bold text-black/60 capitalize"
                                >
                                    <option value="all">All Categories</option>
                                    {FINANCE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                                </select>
                            </div>

                            <div className="relative w-full">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/20" />
                                <input
                                    type="text"
                                    placeholder="Search transactions..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-black/[0.03] border border-black/[0.06] rounded-xl pl-9 pr-4 py-2 text-[13px] outline-none focus:border-black/30 transition-colors w-full"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-16 bg-white rounded-2xl border border-black/[0.05]" />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="w-16 h-16 bg-black/[0.03] rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-black/20" />
                                </div>
                                <p className="text-[15px] font-medium text-black/40">No transactions found.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTx(t)}
                                        className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-black/[0.04] bg-white hover:bg-black/[0.01] transition-colors group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-black/[0.02] border border-black/[0.05] flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                                            {t.category ? getCategoryById(t.category).emoji : (t.emoji || '💸')}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <p className="text-[14px] font-bold text-black truncate">{t.description || 'Transaction'}</p>
                                                    {t.provider === 'revolut_csv' && (
                                                        <span className="text-[9px] font-bold text-black bg-black/5 px-1.5 py-0.5 rounded border border-black/10 tracking-widest uppercase shrink-0">Sync</span>
                                                    )}
                                                </div>
                                                <p className={`text-[15px] font-bold shrink-0 privacy-blur ${t.type === 'spend' ? 'text-black' : 'text-[#059669]'}`}>
                                                    {t.type === 'spend' ? '-' : '+'}£{t.amount.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-black/40 truncate">
                                                        {t.category ? getCategoryById(t.category).label : 'Other'}
                                                    </p>
                                                    <span className="w-1 h-1 rounded-full bg-black/10 flex-shrink-0" />
                                                    <p className="text-[11px] font-medium text-black/25 truncate">
                                                        {new Date(t.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {t.type === 'transfer' && (
                                                        <ArrowUpRight className="w-3 h-3 text-blue-500 ml-1 shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-bold text-black/40 truncate text-right ml-1 shrink-0 max-w-[100px]">
                                                    {(() => {
                                                        if (!t.pocket_id) return 'Unassigned'
                                                        const pot = pots.find(p => p.id === t.pocket_id)
                                                        return pot ? pot.name : 'Unknown'
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <KarrFooter />
                </div>
            </div>
            <TransactionDetailsModal
                transaction={selectedTx}
                pots={pots}
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
            />

            <RevolutImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={handleSyncSuccess}
            />
        </div>
    )
}
