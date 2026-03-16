'use client'

import ManifestDashboard from '@/features/goals/components/ManifestDashboard'
import { Target, ArrowRight, Compass } from 'lucide-react'
import Link from 'next/link'
import { KarrFooter } from '@/components/KarrFooter'

export default function ManifestPage() {
    return (
        <div className="flex flex-col space-y-12">
            {/* Manifest Central Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-2">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Protocol: Manifest</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale leading-none">Command Center</h1>
                    <p className="text-[11px] font-bold text-black/30 uppercase tracking-widest mt-2">
                        Curation of strategic objectives and anchored manifestations.
                    </p>
                </div>

                <div className="flex gap-4 mb-1">
                    <Link 
                        href="/goals/mission"
                        className="group flex items-center gap-3 px-6 py-3 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10"
                    >
                        Strategic Goals <Target className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </Link>
                </div>
            </header>

            <ManifestDashboard />
        </div>
    )
}
