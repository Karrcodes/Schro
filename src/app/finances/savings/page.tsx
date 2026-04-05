'use client'

import { FinanceProfileProvider, useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import { SavingsManager } from '@/features/finance/components/SavingsManager'
import { KarrFooter } from '@/components/KarrFooter'
import { ArrowLeft } from 'lucide-react'

function SavingsPage() {
    const { activeProfile, setProfile } = useFinanceProfile()

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                <div className="flex-1 p-6 md:p-10">
                    <div className="max-w-7xl mx-auto w-full space-y-12 pb-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between z-10 gap-6 w-full flex-shrink-0">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <a href="/finances" className="w-9 h-9 rounded-xl bg-black/[0.03] flex items-center justify-center hover:bg-black/[0.06] transition-colors flex-shrink-0">
                                <ArrowLeft className="w-4 h-4 text-black/40" />
                            </a>
                            <div className="min-w-0 flex-1 space-y-1">
                                <h2 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">{activeProfile} Matrix</h2>
                                <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tighter uppercase grayscale truncate">Savings Goals</h1>
                            </div>
                        </div>
                        <div className="flex bg-black/[0.04] p-1 rounded-xl border border-black/[0.06] w-fit">
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
                    {/* Main Content */}
                    <div className="w-full flex-1 flex flex-col space-y-6">
                        <SavingsManager />
                    </div>
                    </div>
                </div>
                <KarrFooter />
            </div>
        </div>
    )
}

export default function SavingsPageWrapper() {
    return <SavingsPage />
}
