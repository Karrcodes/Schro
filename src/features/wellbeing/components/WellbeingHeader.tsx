'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useWellbeing } from '../contexts/WellbeingContext'
import { usePathname, useRouter } from 'next/navigation'

interface WellbeingHeaderProps {
    title: string
    subtitle: string
    activeColor: string
}

export function WellbeingHeader({ title, subtitle, activeColor }: WellbeingHeaderProps) {
    const { gymStats, isSyncingGym } = useWellbeing()
    const pathname = usePathname()
    const router = useRouter()
    const [justSynced, setJustSynced] = useState(false)

    useEffect(() => {
        if (!isSyncingGym && gymStats.lastSyncTime) {
            const syncTime = new Date(gymStats.lastSyncTime).getTime()
            const now = new Date().getTime()
            if (now - syncTime < 2000) {
                setJustSynced(true)
                const timer = setTimeout(() => setJustSynced(false), 5000)
                return () => clearTimeout(timer)
            }
        }
    }, [isSyncingGym, gymStats.lastSyncTime])

    return (
        <header className="pb-2 z-10 w-full flex-shrink-0">
            <div className="space-y-1">
                <h2 className={cn("text-[11px] font-black uppercase tracking-[0.3em]", activeColor)}>{subtitle}</h2>
                <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">{title}</h1>
            </div>
        </header>
    )
}
