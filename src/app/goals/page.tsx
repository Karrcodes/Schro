'use client'

import ManifestDashboard from '@/features/goals/components/ManifestDashboard'
import { Target, Sparkles, Star } from 'lucide-react'
import Link from 'next/link'

export default function ManifestPage() {
    return (
        <div className="flex flex-col space-y-12">
            {/* Manifest Central Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-2">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Strategic Alignment</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale leading-none">Manifest Dashboard</h1>
                </div>

                {/* Sub-page navigation */}
                <div className="flex p-1 bg-black/[0.03] rounded-xl border border-black/5 w-fit">
                    {[
                        { label: 'Targets', href: '/goals/mission', icon: Target },
                        { label: 'Dreams', href: '/goals/dreams', icon: Sparkles },
                        { label: 'Wishlist', href: '/goals/wishlist', icon: Star },
                    ].map(({ label, href, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all text-black/30 hover:text-black/70 hover:bg-white/60"
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </Link>
                    ))}
                </div>
            </header>

            <ManifestDashboard />
        </div>
    )
}
