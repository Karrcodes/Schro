'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useWellbeing } from '../contexts/WellbeingContext'
import { Dumbbell, Utensils, Brain, Settings, RefreshCw, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { GymBusyness, TheGymGroupStats } from '../types'

const TABS = [
    { id: 'fitness', label: 'Fitness', icon: Dumbbell, href: '/health/fitness', color: 'text-rose-500' },
    { id: 'nutrition', label: 'Nutrition', icon: Utensils, href: '/health/nutrition', color: 'text-emerald-500' },
    { id: 'mind', label: 'Mind', icon: Brain, href: '/health/mind', color: 'text-indigo-500' },
]

function busynessColor(pct?: number) {
    if (!pct) return 'bg-black/10 text-black/30'
    if (pct < 40) return 'bg-emerald-500'
    if (pct < 70) return 'bg-amber-500'
    return 'bg-rose-500'
}

function shortGymName(name: string) {
    return name.replace(/the gym group[\s\-–]*/i, '').trim() || name
}

function GymOccupancySwitcher({ allBusyness, gymLocationId, gymStats }: {
    allBusyness: Record<string, GymBusyness>
    gymLocationId?: string
    gymStats: TheGymGroupStats
}) {
    const locationIds = Object.keys(allBusyness)

    const labelFor = (id: string) => {
        const visit = gymStats.visitHistory?.find(v => v.locationName)
        if (locationIds.length === 1 && visit) return shortGymName(visit.locationName)
        const idx = locationIds.indexOf(id)
        return `Gym ${idx + 1}`
    }

    return (
        <div className="flex items-center bg-white border border-black/5 rounded-2xl shadow-sm overflow-hidden h-11">
            {locationIds.map((id, i) => {
                const b = allBusyness[id]
                return (
                    <div key={id} className="flex items-center">
                        <div className="flex items-center gap-2 px-4">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", busynessColor(b?.currentPercentage), "animate-pulse")} />
                            <div className="flex flex-col leading-none">
                                <span className="text-[9px] font-black uppercase tracking-tight text-black flex items-center gap-1">
                                    <span>{b?.currentCapacity ?? '—'} In</span>
                                    <span className="text-black/20">•</span>
                                    <span className={busynessColor(b?.currentPercentage).replace('bg-', 'text-')}>{b?.currentPercentage ?? 0}%</span>
                                </span>
                                <span className="text-[7px] font-bold uppercase tracking-widest mt-0.5 text-black/30">
                                    {gymStats.gymLocationNames?.[id] || labelFor(id)}
                                </span>
                            </div>
                        </div>
                        {i < locationIds.length - 1 && (
                            <div className="w-px h-6 bg-black/5" />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

interface WellbeingHeaderProps {
    title: string
    subtitle: string
    activeColor: string
}

export function WellbeingHeader({ title, subtitle, activeColor }: WellbeingHeaderProps) {
    const { gymStats, syncGymData, isSyncingGym } = useWellbeing()
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
        <header className="px-6 md:px-10 py-8 md:py-10 z-10 max-w-7xl mx-auto w-full space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className={cn("text-[11px] font-black uppercase tracking-[0.3em]", activeColor)}>{subtitle}</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">{title}</h1>
                </div>

                <div className="flex items-center gap-6 h-fit mb-1">
                    {/* Gym Integration Actions */}
                    {gymStats.isIntegrated ? (
                        <div className="flex items-center gap-3">
                            {gymStats.allBusyness && Object.keys(gymStats.allBusyness).length > 0 && (
                                <GymOccupancySwitcher
                                    allBusyness={gymStats.allBusyness}
                                    gymLocationId={gymStats.gymLocationId}
                                    gymStats={gymStats}
                                />
                            )}
                            
                            <button
                                onClick={() => syncGymData()}
                                disabled={isSyncingGym}
                                className={cn(
                                    "flex items-center gap-2 px-5 h-11 rounded-2xl shadow-sm transition-all duration-300 border",
                                    isSyncingGym ? "bg-white border-black/5 cursor-not-allowed opacity-50" : 
                                    (justSynced || gymStats.lastSyncTime) ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 group" :
                                    "bg-white border-black/5 hover:bg-black/[0.02] group"
                                )}
                            >
                                {justSynced ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in duration-300" />
                                ) : (
                                    <RefreshCw className={cn(
                                        "w-4 h-4 transition-transform duration-500",
                                        isSyncingGym ? "animate-spin text-black/40" : 
                                        gymStats.lastSyncTime ? "text-emerald-500 group-hover:rotate-180" : "text-black/40 group-hover:rotate-180"
                                    )} />
                                )}
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
                                    (justSynced || gymStats.lastSyncTime) ? "text-emerald-700" : "text-black"
                                )}>
                                    {isSyncingGym ? 'Syncing...' : (justSynced || gymStats.lastSyncTime) ? 'Synced' : 'Sync'}
                                </span>
                            </button>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-black/20 uppercase tracking-widest">
                            <span>Sensors Offline</span>
                        </div>
                    )}

                    <div className="text-[11px] text-black/25 uppercase tracking-[0.2em] font-black hidden sm:block">
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>
            </div>

            {/* Tab Navigation & Settings Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-black/[0.03] p-1.5 rounded-[24px] w-fit border border-black/5">
                    {TABS.map((tab) => {
                        const isTabActive = pathname.startsWith(tab.href)
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                                    isTabActive
                                        ? "bg-white text-black shadow-sm border border-black/5"
                                        : "text-black/40 hover:text-black hover:bg-white/50"
                                )}
                            >
                                <tab.icon className={cn("w-4 h-4", isTabActive ? tab.color : "text-black/20")} />
                                {tab.label}
                            </Link>
                        )
                    })}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/health/settings')}
                        className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center transition-all border",
                            pathname.includes('/settings')
                                ? "bg-black text-white border-black"
                                : "bg-white border-black/5 text-black/30 hover:text-black/60 shadow-sm"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>
    )
}
