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
