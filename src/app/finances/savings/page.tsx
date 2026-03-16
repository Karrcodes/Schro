'use client'

import { FinanceProfileProvider, useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import { SavingsManager } from '@/features/finance/components/SavingsManager'
import { SavingsPotsSettings } from '@/features/finance/components/SavingsPotsSettings'
import { KarrFooter } from '@/components/KarrFooter'

function SavingsPage() {
    const { activeProfile, setProfile } = useFinanceProfile()

    return (
        <div className="h-screen bg-[#fafafa] flex flex-col overflow-hidden">
            <div className="bg-white border-b border-black/[0.06] px-6 py-5 z-20 shadow-sm flex-shrink-0">
                <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[20px] font-bold text-black tracking-tight">Savings Goals</h1>
                        <p className="text-[12px] text-black/35 mt-0.5">
                            Define long-term targets and regular allocations · {activeProfile === 'personal' ? 'Personal' : 'Studio Karrtesian'}
                        </p>
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
            </div>
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pt-8">
                <div className="w-full max-w-7xl mx-auto px-6 md:px-10 pb-10 flex-1 space-y-12">
                    <SavingsManager />
                    <div className="border-t border-black/[0.06] pt-12">
                        <SavingsPotsSettings />
                    </div>
                </div>
                <div className="max-w-7xl mx-auto w-full px-6 md:px-10 pb-10">
                    <KarrFooter />
                </div>
            </div>
        </div>
    )
}

export default function SavingsPageWrapper() {
    return <SavingsPage />
}
