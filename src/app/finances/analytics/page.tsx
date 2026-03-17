'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft, Wallet, TrendingUp, Receipt, PieChart, FileText, Trash2 } from 'lucide-react'
import { useTransactions } from '@/features/finance/hooks/useTransactions'
import { usePayslips } from '@/features/finance/hooks/usePayslips'
import { usePots } from '@/features/finance/hooks/usePots'
import { useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import { SpendingAnalytics } from '@/features/finance/components/SpendingAnalytics'
import { PayslipUploader } from '@/features/finance/components/PayslipUploader'
import { Skeleton } from '@/features/finance/components/Skeleton'
import { MonzoSyncControls } from '@/features/finance/components/MonzoSyncControls'
import { cn } from '@/lib/utils'
import { KarrFooter } from '@/components/KarrFooter'

export default function FinanceAnalyticsPage() {
    const [activeTab, setActiveTab] = useState<'salary' | 'spending'>('salary')
    const { payslips, loading: payslipsLoading, isLogging, deletePayslip, refetch: refetchPayslips } = usePayslips()
    const { transactions, loading: txLoading } = useTransactions()
    const { pots, loading: pLoading } = usePots()
    const { activeProfile, setProfile } = useFinanceProfile()

    const loading = activeTab === 'salary' ? payslipsLoading : (txLoading || pLoading)

    const salaryStats = useMemo(() => {
        if (payslips.length === 0) return null

        const totalGross = payslips.reduce((s, p) => s + (p.gross_pay || 0), 0)
        const totalNet = payslips.reduce((s, p) => s + p.net_pay, 0)
        const totalTax = payslips.reduce((s, p) => s + (p.tax_paid || 0), 0)
        const totalPension = payslips.reduce((s, p) => s + (p.pension_contributions || 0), 0)

        const avgNet = totalNet / payslips.length
        const highestNet = Math.max(...payslips.map(p => p.net_pay))

        const trendMap: Record<string, { month: string, net: number, gross: number, sortKey: string }> = {}
        payslips.forEach(p => {
            const date = new Date(p.date)
            const monthStr = date.toLocaleDateString('en-GB', { month: 'short' })
            const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

            if (!trendMap[sortKey]) {
                trendMap[sortKey] = { month: monthStr, net: 0, gross: 0, sortKey }
            }
            trendMap[sortKey].net += p.net_pay
            trendMap[sortKey].gross += (p.gross_pay || 0)
        })

        const monthlyTrend = Object.values(trendMap)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .slice(-6)

        return { totalGross, totalNet, totalTax, totalPension, avgNet, highestNet, monthlyTrend }
    }, [payslips])

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
                                <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tighter uppercase grayscale truncate">Analytics</h1>
                            </div>
                        </div>

                        {/* Tab Switcher & Sync */}
                        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 shrink-0">
                            {activeProfile === 'personal' && (
                                <div className="flex bg-black/[0.03] p-1 rounded-xl w-[max-content] max-w-full overflow-x-auto no-scrollbar self-start xl:self-auto shrink-0 border border-black/[0.06]">
                                    <button
                                        onClick={() => setActiveTab('salary')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                                            activeTab === 'salary' ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                        )}
                                    >
                                        Salary Hub
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('spending')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                                            activeTab === 'spending' ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                        )}
                                    >
                                        Spending
                                    </button>
                                </div>
                            )}

                            {/* Profile Toggle */}
                            <div className="flex bg-black/[0.03] p-1 rounded-xl w-[max-content] shrink-0 border border-black/[0.06]">
                                <button
                                    onClick={() => {
                                        setProfile('personal')
                                    }}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                                        activeProfile === 'personal' ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                    )}
                                >
                                    Personal
                                </button>
                                <button
                                    onClick={() => {
                                        setProfile('business')
                                        setActiveTab('spending')
                                    }}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                                        activeProfile === 'business' ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                    )}
                                >
                                    Business
                                </button>
                            </div>

                            <MonzoSyncControls />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="w-full flex-1 flex flex-col space-y-6">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-32 bg-white rounded-2xl border border-black/[0.05] animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {activeTab === 'salary' ? (
                                    !salaryStats ? (
                                        <div className="space-y-6">
                                            <div className="py-10 text-center bg-white rounded-3xl border border-black/[0.05] shadow-sm">
                                                <div className="w-16 h-16 bg-black/[0.03] rounded-3xl flex items-center justify-center mx-auto mb-4">
                                                    <TrendingUp className="w-8 h-8 text-black/20" />
                                                </div>
                                                <h3 className="text-[16px] font-bold text-black">No Salary Data Yet</h3>
                                                <p className="text-[13px] text-black/40 mt-1 max-w-xs mx-auto">Upload your first payslip to see professional income analytics.</p>
                                            </div>
                                            <PayslipUploader onSuccess={refetchPayslips} />
                                        </div>
                                    ) : (
                                        <>
                                            <PayslipUploader onSuccess={refetchPayslips} />
                                            {/* Top Stats Cards */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm">
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-black/30 uppercase tracking-widest mb-3">
                                                        <Wallet className="w-3.5 h-3.5" /> Avg. Take Home
                                                    </div>
                                                    <div className="text-[24px] font-bold text-black group flex items-baseline gap-1 privacy-blur leading-none">
                                                        <Skeleton show={isLogging} className="h-8">
                                                            <span className="text-[18px] opacity-30">£</span>
                                                            {salaryStats.avgNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </Skeleton>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm">
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-black/30 uppercase tracking-widest mb-3">
                                                        <TrendingUp className="w-3.5 h-3.5" /> Peak Month
                                                    </div>
                                                    <div className="text-[24px] font-bold text-[#059669] flex items-baseline gap-1 privacy-blur leading-none">
                                                        <Skeleton show={isLogging} className="h-8">
                                                            <span className="text-[18px] opacity-30">£</span>
                                                            {salaryStats.highestNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </Skeleton>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm">
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-black/30 uppercase tracking-widest mb-3">
                                                        <Receipt className="w-3.5 h-3.5" /> Total Tax Paid
                                                    </div>
                                                    <div className="text-[24px] font-bold text-[#dc2626] flex items-baseline gap-1 privacy-blur leading-none">
                                                        <Skeleton show={isLogging} className="h-8">
                                                            <span className="text-[18px] opacity-30">£</span>
                                                            {salaryStats.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </Skeleton>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm">
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-black/30 uppercase tracking-widest mb-3">
                                                        <PieChart className="w-3.5 h-3.5" /> Pension Savings
                                                    </div>
                                                    <div className="text-[24px] font-bold text-black flex items-baseline gap-1 privacy-blur">
                                                        <span className="text-[18px] opacity-30">£</span>
                                                        {salaryStats.totalPension.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Charts Row */}
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-black/[0.06] shadow-sm">
                                                    <h3 className="text-[15px] font-bold text-black mb-6">Take-Home Trend (Recent 6)</h3>
                                                    <div className="h-48 flex items-end gap-3 px-2">
                                                        {salaryStats.monthlyTrend.map((m, i) => {
                                                            const max = Math.max(...salaryStats.monthlyTrend.map(x => x.gross), 1)
                                                            return (
                                                                <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group">
                                                                    <div className="w-full relative flex items-end justify-center h-full">
                                                                        <div
                                                                            className="w-full max-w-[40px] bg-black/[0.03] rounded-t-lg absolute bottom-0"
                                                                            style={{ height: `${(m.gross / max) * 100}%` }}
                                                                        />
                                                                        <div
                                                                            className="w-full max-w-[24px] bg-[#059669]/80 rounded-t-md relative z-10 group-hover:bg-[#059669] transition-all"
                                                                            style={{ height: `${(m.net / max) * 100}%` }}
                                                                        >
                                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 font-bold privacy-blur">
                                                                                £{m.net.toFixed(0)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[10px] uppercase font-bold text-black/30 tracking-widest">{m.month}</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="bg-white p-6 rounded-3xl border border-black/[0.06] shadow-sm flex flex-col">
                                                    <h3 className="text-[15px] font-bold text-black mb-6">Lifetime Efficiency</h3>
                                                    <div className="flex-1 flex flex-col justify-center gap-6">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[12px] font-bold">
                                                                <span className="text-black/40 uppercase tracking-wider text-[10px]">Retention Rate</span>
                                                                <span className="text-[#059669]">{((salaryStats.totalNet / salaryStats.totalGross) * 100).toFixed(1)}%</span>
                                                            </div>
                                                            <div className="h-3 bg-black/[0.03] rounded-full overflow-hidden">
                                                                <div className="h-full bg-[#059669]" style={{ width: `${(salaryStats.totalNet / salaryStats.totalGross) * 100}%` }} />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[12px] font-bold">
                                                                <span className="text-black/40 uppercase tracking-wider text-[10px]">Effective Tax Rate</span>
                                                                <span className="text-[#dc2626]">{((salaryStats.totalTax / salaryStats.totalGross) * 100).toFixed(1)}%</span>
                                                            </div>
                                                            <div className="h-3 bg-black/[0.03] rounded-full overflow-hidden">
                                                                <div className="h-full bg-[#dc2626]" style={{ width: `${(salaryStats.totalTax / salaryStats.totalGross) * 100}%` }} />
                                                            </div>
                                                        </div>

                                                        <p className="text-[11px] text-black/30 mt-4 italic">Analysis based on {payslips.length} verified records.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Detailed List */}
                                            <div className="bg-white rounded-3xl border border-black/[0.06] shadow-sm overflow-hidden">
                                                <div className="px-6 py-5 border-b border-black/[0.04] bg-black/[0.01] flex items-center justify-between">
                                                    <h3 className="text-[14px] font-bold text-black">Verified Payslip Vault</h3>
                                                    <div className="text-[10px] font-bold text-black/30 uppercase tracking-wider bg-white px-2 py-1 rounded-lg border border-black/[0.04]">
                                                        {payslips.length} Records
                                                    </div>
                                                </div>
                                                <div className="divide-y divide-black/[0.04]">
                                                    {payslips.map((p) => (
                                                        <div key={p.id} className="p-5 flex items-center gap-6 hover:bg-black/[0.01] transition-colors group">
                                                            <div className="w-12 h-12 rounded-2xl bg-black/[0.03] border border-black/[0.05] flex items-center justify-center flex-shrink-0">
                                                                <FileText className="w-6 h-6 text-black/30" />
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-black text-[15px]">{p.employer || 'Unknown Company'}</p>
                                                                    <span className="w-1 h-1 rounded-full bg-black/10" />
                                                                    <p className="text-[12px] font-medium text-black/30">
                                                                        {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-4 mt-1.5 overflow-x-auto no-scrollbar py-0.5">
                                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                        <span className="text-[9px] font-bold text-black/25 uppercase tracking-wider">Gross</span>
                                                                        <span className="text-[12px] font-bold text-black/40 privacy-blur">£{p.gross_pay?.toFixed(2) || '---'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                        <span className="text-[9px] font-bold text-[#dc2626]/40 uppercase tracking-wider">Tax</span>
                                                                        <span className="text-[12px] font-bold text-[#dc2626]/60 privacy-blur">£{p.tax_paid?.toFixed(2) || '---'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                        <span className="text-[9px] font-bold text-black/40 uppercase tracking-wider">Pension</span>
                                                                        <span className="text-[12px] font-bold text-black/60 privacy-blur">£{p.pension_contributions?.toFixed(2) || '---'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="text-right flex flex-col items-end gap-2">
                                                                <div className="text-[16px] font-bold text-[#059669] privacy-blur">
                                                                    +£{p.net_pay.toFixed(2)}
                                                                </div>
                                                                <button
                                                                    onClick={() => { if (confirm('Delete record?')) deletePayslip(p.id) }}
                                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-all opacity-100"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )
                                ) : (
                                    <SpendingAnalytics transactions={transactions} pots={pots} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <KarrFooter />
            </div>
        </div>
    )
}
