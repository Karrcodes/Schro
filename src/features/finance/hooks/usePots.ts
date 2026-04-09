'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Pot } from '../types/finance.types'
import { useFinanceProfile } from '../contexts/FinanceProfileContext'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_FINANCE, MOCK_BUSINESS } from '@/lib/demoData'

import { ProfileType } from '../types/finance.types'
import { isTauri } from '@/lib/utils'
import { LocalFinanceService } from '../services/localFinanceService'

// Module-level locks to prevent race conditions across multiple hook instances
const ensuringProfiles = new Set<string>()

const GET_LOCAL_KEY = (profile: string) => `schrö_demo_finance_pockets_${profile}_v2`

export function usePots(profileOverride?: ProfileType) {
    const [pots, setPots] = useState<Pot[]>([])
    const [loading, setLoading] = useState(true)
    const [isMonzoConnected, setIsMonzoConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { activeProfile: contextProfile, refreshTrigger, globalRefresh, isSyncing, setSyncing } = useFinanceProfile()
    const activeProfile = profileOverride || contextProfile
    const { settings } = useSystemSettings()

    const isCheckingMonzo = useRef(false)
    const lastMonzoCheck = useRef(0)

    const checkMonzoConnection = async () => {
        // Debounce and prevent concurrent checks
        const now = Date.now()
        if (isCheckingMonzo.current || (now - lastMonzoCheck.current < 10000)) return
        
        isCheckingMonzo.current = true
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            if (!user) {
                setIsMonzoConnected(false)
                return
            }

            const { data, error } = await supabase
                .from('fin_secrets')
                .select('service')
                .eq('user_id', user.id)
                .eq('service', 'monzo')
                .single()

            setIsMonzoConnected(!!data && !error)
            lastMonzoCheck.current = Date.now()
        } finally {
            isCheckingMonzo.current = false
        }
    }

    const fetchPots = async () => {
        if (settings.is_demo_mode) {
            const key = GET_LOCAL_KEY(activeProfile || 'personal')
            const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null
            if (stored) {
                setPots(JSON.parse(stored))
            } else {
                const mockData = activeProfile === 'business' ? MOCK_BUSINESS.pockets : MOCK_FINANCE.pockets
                setPots(mockData as any)
                if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(mockData))
            }
            setLoading(false)
            return
        }
        // 1. Check local SQLite Cache first (Instant)
        if (isTauri()) {
            const locPockets = await LocalFinanceService.getPockets(activeProfile)
            if (locPockets.length > 0) setPots(locPockets)
            if (locPockets.length === 0) setLoading(true)
            
            // Background Sync
            checkMonzoConnection()
            const { data, error } = await supabase
                .from('fin_pockets')
                .select('*')
                .eq('profile', activeProfile)
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true })

            if (!error && data) {
                await LocalFinanceService.syncPockets(data)
                setPots(data)
            } else if (error) {
                setError(error.message)
            }
            setLoading(false)
            return
        }

        // --- STANDARD WEB STRATEGY ---
        // Only show loading spinner on initial load (when there's no data yet)
        if (pots.length === 0) setLoading(true)
    }

    const createPot = async (pot: Omit<Pot, 'id' | 'created_at' | 'profile'>) => {
        if (settings.is_demo_mode) {
            const newPot = {
                ...pot,
                id: `demo-p-${Date.now()}`,
                created_at: new Date().toISOString(),
                profile: activeProfile || 'personal'
            } as Pot
            const updatedPots = [...pots, newPot]
            setPots(updatedPots)
            const key = GET_LOCAL_KEY(activeProfile || 'personal')
            if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(updatedPots))
            globalRefresh()
            return
        }
        const { error } = await supabase.from('fin_pockets').insert({ ...pot, profile: activeProfile })
        if (error) throw error
        globalRefresh()
    }

    const updatePot = async (id: string, updates: Partial<Pot>) => {
        if (settings.is_demo_mode) {
            const updatedPots = pots.map(p => p.id === id ? { ...p, ...updates } : p)
            setPots(updatedPots)
            const key = GET_LOCAL_KEY(activeProfile || 'personal')
            if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(updatedPots))
            globalRefresh()
            return
        }
        const { error } = await supabase.from('fin_pockets').update(updates).eq('id', id)
        if (error) throw error
        globalRefresh()
    }

    const deletePot = async (id: string) => {
        const pot = pots.find(p => p.id === id)
        if (pot) {
            const systemKeywords = ['general', 'liabilities']
            const nameLower = pot.name.toLowerCase()
            const keyword = systemKeywords.find(key => nameLower.includes(key))

            if (keyword) {
                const count = pots.filter(p => p.name.toLowerCase().includes(keyword)).length
                if (count <= 1) {
                    throw new Error(`The "${pot.name}" pot is your only ${keyword} pot and cannot be deleted.`)
                }
            }
        }

        if (settings.is_demo_mode) {
            const updatedPots = pots.filter(p => p.id !== id)
            setPots(updatedPots)
            const key = GET_LOCAL_KEY(activeProfile || 'personal')
            if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(updatedPots))
            globalRefresh()
            return
        }
        const { error } = await supabase.from('fin_pockets').delete().eq('id', id)
        if (error) throw error
        globalRefresh()
    }

    const updatePotsOrder = async (updates: { id: string; sort_order: number }[]) => {
        // Run updates sequentially to avoid complex batching for now
        for (const update of updates) {
            await supabase.from('fin_pockets').update({ sort_order: update.sort_order }).eq('id', update.id)
        }
        globalRefresh()
    }

    const ensureSystemPots = async () => {
        if (settings.is_demo_mode || !activeProfile || ensuringProfiles.has(activeProfile)) return

        // Prevent other instances from running this concurrently for this profile
        ensuringProfiles.add(activeProfile)

        try {
            const systemPots = [
                { name: 'General', type: 'general' as const, sort_order: 0 }
            ]

            for (const sp of systemPots) {
                // Check local state first
                const existsLocally = pots.some(p => p.name.toLowerCase().includes(sp.name.toLowerCase()))

                if (!existsLocally && !loading) {
                    // Double check with DB to be absolutely sure before inserting
                    const { data: dbCheck } = await supabase
                        .from('fin_pockets')
                        .select('id')
                        .eq('profile', activeProfile)
                        .ilike('name', `%${sp.name}%`)
                        .limit(1)

                    if (!dbCheck || dbCheck.length === 0) {
                        await supabase.from('fin_pockets').insert({
                            ...sp,
                            balance: 0,
                            current_balance: 0,
                            target_budget: 0,
                            target_amount: 0,
                            profile: activeProfile
                        })
                    }
                }
            }
        } finally {
            // Give some time for DB to propagate before allowing another check
            setTimeout(() => ensuringProfiles.delete(activeProfile!), 5000)
        }
    }

    useEffect(() => {
        fetchPots()
    }, [activeProfile, refreshTrigger, settings.is_demo_mode])

    useEffect(() => {
        // Run ensure logic whenever loading finishes or profile changes
        if (!loading) {
            ensureSystemPots()

            // Auto-Sync: If any pot has a Monzo ID and last sync was > 5 mins ago, trigger sync
            // This makes it feel "automatic" without a server cron.
            const now = new Date().getTime()
            const fiveMins = 5 * 60 * 1000
            const needsSync = pots.some(p => p.monzo_id && p.last_synced_at && (now - new Date(p.last_synced_at).getTime() > fiveMins))
            const neverSynced = pots.some(p => p.monzo_id && !p.last_synced_at)

            if ((needsSync || neverSynced) && isMonzoConnected && !loading) {
                console.log('Schrö: Auto-syncing Monzo data...')
                syncMonzo()
            }
        }
    }, [loading, activeProfile, isMonzoConnected])

    const syncMonzo = async () => {
        setSyncing(true)
        try {
            // Run both sync (pot balances) and poll (missed card transactions) in parallel
            const [syncRes, pollRes] = await Promise.all([
                fetch('/api/finance/monzo/sync', { method: 'POST' }),
                fetch('/api/finance/monzo/poll')
            ])
            const syncData = await syncRes.json()
            if (syncData.error) throw new Error(syncData.error)
            await fetchPots()
            globalRefresh()
        } catch (err: any) {
            setError(err.message)
            throw err
        } finally {
            setSyncing(false)
        }
    }

    return { pots, loading, isSyncing, isMonzoConnected, error, createPot, updatePot, deletePot, updatePotsOrder, refetch: fetchPots, syncMonzo }
}
