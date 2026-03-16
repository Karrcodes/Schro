'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Dumbbell, Utensils, Brain } from 'lucide-react'

const TABS = [
    { id: 'fitness', label: 'Fitness', icon: Dumbbell, href: '/health/fitness', color: 'text-rose-500' },
    { id: 'nutrition', label: 'Nutrition', icon: Utensils, href: '/health/nutrition', color: 'text-emerald-500' },
    { id: 'mind', label: 'Mind', icon: Brain, href: '/health/mind', color: 'text-indigo-500' },
]

export function WellbeingTabs() {
    const pathname = usePathname()

    return (
        <div className="flex items-center gap-1.5 p-1 bg-black/[0.03] rounded-[20px] w-fit border border-black/[0.05]">
            {TABS.map((tab) => {
                const isTabActive = pathname.startsWith(tab.href)
                return (
                    <Link
                        key={tab.id}
                        href={tab.href}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                            isTabActive
                                ? "bg-white text-black shadow-sm border border-black/5"
                                : "text-black/30 hover:text-black/60 hover:bg-white/50"
                        )}
                    >
                        <tab.icon className={cn("w-3.5 h-3.5", isTabActive ? tab.color : "text-black/20")} />
                        {tab.label}
                    </Link>
                )
            })}
        </div>
    )
}
