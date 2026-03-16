'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useWellbeing } from '@/features/wellbeing/contexts/WellbeingContext'
import { Plus, Layout, Dumbbell, Utensils, Brain, Settings, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { KarrFooter } from '@/components/KarrFooter'
import { ProfileSetup } from '@/features/wellbeing/components/ProfileSetup'
import { GymConnectionModal } from '@/features/wellbeing/components/GymConnectionModal'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { QuickLogModal } from '@/features/wellbeing/components/QuickLogModal'
import { NutritionLibraryModal } from '@/features/wellbeing/components/NutritionLibraryModal'
import { NutritionFridgeModal } from '@/features/wellbeing/components/NutritionFridgeModal'

import { ChevronRight } from 'lucide-react'
import type { TheGymGroupStats, GymBusyness } from '@/features/wellbeing/types'

const TABS = [
    { id: 'fitness', label: 'Fitness', icon: Dumbbell, href: '/health/fitness' },
    { id: 'nutrition', label: 'Nutrition', icon: Utensils, href: '/health/nutrition' },
    { id: 'mind', label: 'Mind', icon: Brain, href: '/health/mind' },
]

// Gets a short display name from a full gym name
function shortGymName(name: string) {
    return name.replace(/the gym group[\s\-–]*/i, '').trim() || name
}

// Color-codes busyness level
function busynessColor(pct?: number) {
    if (!pct) return 'bg-black/10 text-black/30'
    if (pct < 40) return 'bg-emerald-500'
    if (pct < 70) return 'bg-amber-500'
    return 'bg-rose-500'
}

function GymOccupancySwitcher({ allBusyness, gymLocationId, gymStats }: {
    allBusyness: Record<string, GymBusyness>
    gymLocationId?: string
    gymStats: TheGymGroupStats
}) {
    const locationIds = Object.keys(allBusyness)

    // Derive a label: prefer name from visitHistory location names, fallback to index
    const labelFor = (id: string) => {
        // Try to find a match from recent visit history
        const visit = gymStats.visitHistory?.find(v => v.locationName)
        if (locationIds.length === 1 && visit) return shortGymName(visit.locationName)
        const idx = locationIds.indexOf(id)
        return `Gym ${idx + 1}`
    }

    return (
        <div className="flex items-center bg-white border border-black/5 rounded-2xl shadow-sm overflow-hidden">
            {locationIds.map((id, i) => {
                const b = allBusyness[id]
                return (
                    <div key={id} className="flex items-center">
                        <div className="flex items-center gap-2 px-4 py-3">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", busynessColor(b?.currentPercentage), "animate-pulse")} />
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] font-black uppercase tracking-tight text-black flex items-center gap-1.5">
                                    <span>{b?.currentCapacity ?? '—'} Inside</span>
                                    <span className="text-black/20">•</span>
                                    <span className={busynessColor(b?.currentPercentage).replace('bg-', 'text-')}>{b?.currentPercentage ?? 0}%</span>
                                </span>
                                <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5 text-black/30">
                                    {gymStats.gymLocationNames?.[id] || labelFor(id)}
                                </span>
                            </div>
                        </div>
                        {i < locationIds.length - 1 && (
                            <div className="w-px h-8 bg-black/5" />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function HealthLayoutContent({ children }: { children: React.ReactNode }) {
    const { profile, syncGymData, gymStats, weightHistory, loading, isSyncingGym, activeSession, routines, startSession } = useWellbeing()
    const [isGymModalOpen, setIsGymModalOpen] = useState(false)
    const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
    const [isLibraryOpen, setIsLibraryOpen] = useState(false)
    const [isFridgeOpen, setIsFridgeOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()

    const [justSynced, setJustSynced] = useState(false)

    // Open modal based on ?open= query param (from GlobalQuickAction FAB)
    useEffect(() => {
        const openParam = searchParams.get('open')
        const routineParam = searchParams.get('routine')
        if (openParam === 'workout' && routineParam) {
            // Find the matching routine by name keyword, then start the session
            const matchingRoutine = routines.find(r =>
                r.name.toLowerCase().includes(routineParam.toLowerCase())
            )
            if (matchingRoutine) {
                startSession(matchingRoutine.id)
                router.replace('/health/fitness/session', { scroll: false })
            } else if (routines.length > 0) {
                // Fallback to first routine
                startSession(routines[0].id)
                router.replace('/health/fitness/session', { scroll: false })
            }
        } else if (openParam === 'quicklog') { setIsQuickLogOpen(true) }
        else if (openParam === 'library') { setIsLibraryOpen(true) }
        else if (openParam === 'fridge') { setIsFridgeOpen(true) }
        if (openParam && openParam !== 'workout') {
            // Clean up the URL without re-navigating
            router.replace(pathname, { scroll: false })
        }
    }, [searchParams, routines])

    useEffect(() => {
        if (gymStats.isIntegrated && !loading) {
            syncGymData()
        }
    }, [gymStats.isIntegrated, loading])

    useEffect(() => {
        if (!isSyncingGym && gymStats.lastSyncTime) {
            const syncTime = new Date(gymStats.lastSyncTime).getTime()
            const now = new Date().getTime()
            if (now - syncTime < 2000) { // If synced in last 2 seconds
                setJustSynced(true)
                const timer = setTimeout(() => setJustSynced(false), 5000)
                return () => clearTimeout(timer)
            }
        }
    }, [isSyncingGym, gymStats.lastSyncTime])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="space-y-4 text-center">
                    <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mx-auto" />
                    <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Syncing Protocol</p>
                </div>
            </div>
        )
    }

    if (!profile) {
        return <ProfileSetup />
    }

    const latestWeight = weightHistory.length > 0
        ? weightHistory[weightHistory.length - 1].weight
        : profile.weight

    const isSessionRoute = pathname.includes('/session')

    return (
        <div className="bg-[#FAFAFA] flex flex-col min-h-screen">
            <div 
                className={cn(
                    "max-w-7xl mx-auto w-full flex-grow flex flex-col",
                    isSessionRoute ? "h-[100dvh] fixed inset-0 overflow-hidden bg-white" : "px-6 md:px-10 pb-10 space-y-8"
                )}
                style={isSessionRoute ? { 
                    paddingTop: 'calc(env(safe-area-inset-top) + 40px)', 
                    paddingBottom: 'env(safe-area-inset-bottom)' 
                } : {}}
            >
                {isSessionRoute && (
                    <style jsx global>{`
                        html, body {
                            overflow: hidden !important;
                            height: 100% !important;
                        }
                        *::-webkit-scrollbar {
                            display: none !important;
                            width: 0 !important;
                        }
                        * {
                            -ms-overflow-style: none !important;
                            scrollbar-width: none !important;
                        }
                    `}</style>
                )}

                {/* Gym Info & Tabs (Shared Actions) */}
                {!isSessionRoute && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-10">
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
                                        <tab.icon className={cn("w-4 h-4", isTabActive ? "text-rose-500" : "text-black/20")} />
                                        {tab.label}
                                    </Link>
                                )
                            })}
                        </div>

                        {gymStats.isIntegrated ? (
                            <div className="flex items-center gap-3">
                                {/* Multi-gym occupancy switcher */}
                                {gymStats.allBusyness && Object.keys(gymStats.allBusyness).length > 0 && (
                                    <GymOccupancySwitcher
                                        allBusyness={gymStats.allBusyness}
                                        gymLocationId={gymStats.gymLocationId}
                                        gymStats={gymStats}
                                    />
                                )}
                                {/* Single-gym fallback */}
                                {gymStats.busyness && !gymStats.allBusyness && (
                                    <div className="flex items-center gap-3 px-5 py-3 bg-white border border-black/5 rounded-2xl shadow-sm">
                                        <div className={cn("w-2 h-2 rounded-full shrink-0 animate-pulse", busynessColor(gymStats.busyness.currentPercentage))} />
                                        <div className="flex flex-col leading-none">
                                            <span className="text-[10px] font-black text-black uppercase tracking-tight flex items-center gap-1.5">
                                                <span>{gymStats.busyness.currentCapacity} Inside</span>
                                                <span className="text-black/20">•</span>
                                                <span className={busynessColor(gymStats.busyness.currentPercentage).replace('bg-', 'text-')}>{gymStats.busyness.currentPercentage ?? 0}%</span>
                                            </span>
                                            <span className="text-[8px] font-bold text-black/30 uppercase tracking-widest mt-1">Live Occupancy</span>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => syncGymData()}
                                    disabled={isSyncingGym}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-3 rounded-2xl shadow-sm transition-all duration-300 border",
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
                        ) : (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsGymModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-white border border-black/5 hover:bg-black/[0.02] rounded-2xl shadow-sm transition-all text-black/40 hover:text-black group"
                                >
                                    <Settings className="w-4 h-4 transition-transform group-hover:rotate-180" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Connect Gym</span>
                                </button>
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
                        )}
                    </div>
                )}

                {/* Tab Content */}
                <div className={cn("flex-grow flex flex-col", !isSessionRoute && "pt-6")}>
                    {children}
                </div>

                {!isSessionRoute && (
                    <div className="mt-auto pt-10">
                        <KarrFooter />
                    </div>
                )}
            </div>


            <GymConnectionModal
                isOpen={isGymModalOpen}
                onClose={() => setIsGymModalOpen(false)}
            />
            <QuickLogModal
                isOpen={isQuickLogOpen}
                onClose={() => setIsQuickLogOpen(false)}
            />
            <NutritionLibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
            />
            <NutritionFridgeModal
                isOpen={isFridgeOpen}
                onClose={() => setIsFridgeOpen(false)}
            />
        </div>
    )
}

export default function HealthLayout({ children }: { children: React.ReactNode }) {
    return (
        <HealthLayoutContent>
            {children}
        </HealthLayoutContent>
    )
}
