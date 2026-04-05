'use client'

import { useTransactions } from '../hooks/useTransactions'
import { ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import { usePots } from '../hooks/usePots'
import { getCategoryById } from '../constants/categories'
import Link from 'next/link'

export function TransactionLedger() {
    const { transactions, loading } = useTransactions()
    const { pots, loading: potsLoading } = usePots()
    const { isSyncing } = useFinanceProfile()

    if (loading || potsLoading) {
        return (
            <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-black/[0.03] rounded-xl border border-black/[0.05]" />
                ))}
            </div>
        )
    }

    const recentTransactions = transactions.slice(0, 5)

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex gap-y-2 items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-[11px] uppercase tracking-wider font-bold text-black/40">Recent Transactions</h3>
                </div>
                {/* Open Monzo deep-link button */}
                <Link
                    href="/finances/transactions"
                    title="View your full transaction history"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/[0.04] text-black border border-black/[0.06] hover:bg-black/[0.08] transition-all text-[11px] font-bold"
                >
                    <ExternalLink className="w-3 h-3" />
                    <span className="hidden sm:inline">View All</span>
                </Link>
            </div>

            {/* Transaction List */}
            <div className="rounded-2xl overflow-hidden">
                <div className="space-y-2">
                    {recentTransactions.length === 0 ? (
                        <>
                            <div className="h-14 rounded-xl bg-black/[0.02] border border-black/[0.04]" />
                            <div className="h-14 rounded-xl bg-black/[0.02] border border-black/[0.04]" />
                            <div className="h-14 rounded-xl bg-black/[0.02] border border-black/[0.04]" />
                        </>
                    ) : (
                        recentTransactions.map((t) => (
                            <div
                                key={t.id}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-black/[0.04] bg-white"
                            >
                                <div className="w-10 h-10 rounded-xl bg-black/[0.03] border border-black/[0.05] flex items-center justify-center flex-shrink-0 px-1">
                                    <span className="text-lg leading-none">
                                        {t.category ? getCategoryById(t.category).emoji : (t.emoji || '💸')}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[13px] font-bold text-black truncate">{t.description || 'Transaction'}</p>
                                        <p className={`text-[13px] font-bold ${t.type === 'spend' ? 'text-black' : 'text-[#059669]'}`}>
                                            {t.type === 'spend' ? '-' : '+'}£{t.amount.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] uppercase font-bold tracking-wider text-black/30">
                                            {t.category ? getCategoryById(t.category).label : 'other'}
                                        </p>
                                        <span className="w-1 h-1 rounded-full bg-black/10" />
                                        <p className="text-[10px] font-medium text-black/25">
                                            {new Date(t.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {t.type === 'transfer' && <ArrowUpRight className="w-2.5 h-2.5 text-blue-500" />}
                                        {t.type === 'allocate' && <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-500" />}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
