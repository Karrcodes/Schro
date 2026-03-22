'use client'

import ManifestDashboard from '@/features/goals/components/ManifestDashboard'
import { Target, ArrowRight, Compass } from 'lucide-react'
import Link from 'next/link'
import ManifestDebugger from '@/features/goals/components/ManifestDebugger'
import { KarrFooter } from '@/components/KarrFooter'

export default function ManifestPage() {
    return (
        <div className="flex flex-col space-y-12">
            {/* Manifest Central Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-2">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Strategic Alignment</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale leading-none">Manifest Dashboard</h1>
                </div>

            </header>

            <ManifestDashboard />
            
            <ManifestDebugger />
        </div>
    )
}
