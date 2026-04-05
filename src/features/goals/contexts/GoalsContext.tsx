'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_GOALS, MOCK_MILESTONES, MOCK_ASPIRATIONS } from '@/lib/demoData'
import type { Goal, Milestone, CreateGoalData, WishlistItem, CreateWishlistItemData, Aspiration, CreateAspirationData } from '../types/goals.types'

interface GoalsContextType {
    goals: Goal[]
    wishlist: WishlistItem[]
    aspirations: Aspiration[]
    loading: boolean
    error: string | null
    fetchGoals: () => Promise<void>
    createGoal: (data: CreateGoalData, imageFile?: File) => Promise<void>
    updateGoal: (id: string, updates: Partial<CreateGoalData>, imageFile?: File) => Promise<void>
    deleteGoal: (id: string) => Promise<void>
    toggleMilestone: (milestoneId: string, isCompleted: boolean) => Promise<void>
    updateMilestone: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
    toggleAspirationMilestone: (milestoneId: string, isCompleted: boolean) => Promise<void>
    updateAspirationMilestone: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
    createWishlistItem: (data: CreateWishlistItemData, imageFile?: File) => Promise<void>
    updateWishlistItem: (id: string, updates: Partial<WishlistItem>, imageFile?: File) => Promise<void>
    deleteWishlistItem: (id: string) => Promise<void>
    regenerateWishlistCover: (id: string) => Promise<void>
    regenerateGoalCover: (id: string) => Promise<void>
    regenerateAspirationCover: (id: string) => Promise<void>
    createAspiration: (data: CreateAspirationData, imageFile?: File) => Promise<void>
    updateAspiration: (id: string, updates: Partial<CreateAspirationData>, imageFile?: File) => Promise<void>
    deleteAspiration: (id: string) => Promise<void>
    suggestWishlistDetails: (title: string) => Promise<Array<{
        title: string,
        price?: number,
        description?: string,
        url?: string,
        category?: string,
        priority?: string,
        image_search_term?: string
    }>>
    generatingWishlistIds: string[]
    generatingGoalIds: string[]
    generatingAspirationIds: string[]
    debugLogs: Array<{time: string, msg: string, type: 'info' | 'error' | 'success'}>
    addDebugLog: (msg: string, type?: 'info' | 'error' | 'success') => void
    convertGoalToWishlist: (goalId: string) => Promise<void>
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = 'schrö_demo_goals_v1'
const WISHLIST_LOCAL_STORAGE_KEY = 'schrö_demo_wishlist_v1'
const ASPIRATIONS_LOCAL_STORAGE_KEY = 'schrö_demo_aspirations_v1'

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = error => reject(error)
    })
}

export function GoalsProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useSystemSettings()
    const [goals, setGoals] = useState<Goal[]>([])
    const [wishlist, setWishlist] = useState<WishlistItem[]>([])
    const [aspirations, setAspirations] = useState<Aspiration[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [generatingWishlistIds, setGeneratingWishlistIds] = useState<string[]>([])
    const [generatingGoalIds, setGeneratingGoalIds] = useState<string[]>([])
    const [generatingAspirationIds, setGeneratingAspirationIds] = useState<string[]>([])
    const [debugLogs, setDebugLogs] = useState<Array<{time: string, msg: string, type: 'info'|'error'|'success'}>>([])

    const addDebugLog = useCallback((msg: string, type: 'info'|'error'|'success' = 'info') => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })
        setDebugLogs(prev => [...prev, { time, msg, type }])
    }, [])

    const getSessionGoals = useCallback(() => {
        if (typeof window === 'undefined') return null
        const current = localStorage.getItem(LOCAL_STORAGE_KEY)
        
        // Scavenger hunt for any goals data
        let allGoals: Goal[] = []
        if (current) {
            try {
                allGoals = JSON.parse(current)
            } catch(e) {}
        }

        if (allGoals.length === 0) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && (key.includes('goals') || key.includes('milestones')) && key !== LOCAL_STORAGE_KEY) {
                    try {
                        const oldData = localStorage.getItem(key)
                        if (oldData) {
                            const parsed = JSON.parse(oldData)
                            if (Array.isArray(parsed)) allGoals = [...allGoals, ...parsed]
                        }
                    } catch(e) {}
                }
            }
            if (allGoals.length > 0) {
                // Deduplicate
                allGoals = Array.from(new Map(allGoals.map(g => [g.id, g])).values())
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allGoals))
            }
        }
        
        return allGoals.length > 0 ? allGoals : null
    }, [])

    const saveSessionGoals = useCallback((data: Goal[]) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
    }, [])

    const getSessionWishlist = useCallback(() => {
        if (typeof window === 'undefined') return null
        const current = localStorage.getItem(WISHLIST_LOCAL_STORAGE_KEY)
        
        // Scavenger hunt for any wishlist data
        let allItems: WishlistItem[] = []
        if (current) {
            try {
                allItems = JSON.parse(current)
            } catch(e) {}
        }

        // Even if we have some, check if others exist from other names
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes('wishlist') || key.includes('desires')) && key !== WISHLIST_LOCAL_STORAGE_KEY) {
                try {
                    const oldData = localStorage.getItem(key)
                    if (oldData) {
                        const parsed = JSON.parse(oldData)
                        if (Array.isArray(parsed)) allItems = [...allItems, ...parsed]
                    }
                } catch(e) {}
            }
        }

        if (allItems.length > 0) {
            // Deduplicate by ID
            const unique = Array.from(new Map(allItems.map(item => [item.id || item.title, item])).values())
            const processed = unique.map((item: any) => ({
                ...item,
                status: item.status || 'abandoned'
            }))
            localStorage.setItem(WISHLIST_LOCAL_STORAGE_KEY, JSON.stringify(processed))
            return processed
        }
        
        return null
    }, [])

    const saveSessionWishlist = useCallback((data: WishlistItem[]) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(WISHLIST_LOCAL_STORAGE_KEY, JSON.stringify(data))
    }, [])

    const getSessionAspirations = useCallback(() => {
        if (typeof window === 'undefined') return null
        const current = localStorage.getItem(ASPIRATIONS_LOCAL_STORAGE_KEY)
        if (current) {
            try {
                return JSON.parse(current) as Aspiration[]
            } catch(e) {}
        }
        return null
    }, [])

    const saveSessionAspirations = useCallback((data: Aspiration[]) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(ASPIRATIONS_LOCAL_STORAGE_KEY, JSON.stringify(data))
    }, [])

    const fetchGoals = useCallback(async () => {
        setError(null)
        setLoading(true)
        
        // 1. Fetch Goals (Independent)
        try {
            if (settings.is_demo_mode) {
                let session = getSessionGoals()
                if (!session) {
                    session = MOCK_GOALS.map((goal: any) => ({
                        ...goal,
                        milestones: MOCK_MILESTONES.filter((m: any) => m.goal_id === goal.id)
                    }))
                    saveSessionGoals(session as Goal[])
                }
                setGoals(session as Goal[])
            } else {
                const { data: goalsData, error: goalsError } = await supabase
                    .from('sys_goals')
                    .select('*, sys_milestones(*)')
                    .order('created_at', { ascending: false })

                if (goalsError) throw goalsError
                const sortedGoals = (goalsData || []).map((goal: any) => ({
                    ...goal,
                    milestones: (goal.sys_milestones || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                }))
                setGoals(sortedGoals)
            }
        } catch (err: any) {
            console.error('Schrö: Error fetching goals:', err.message, err)
            addDebugLog(`❌ Failed to fetch Destination Goals: ${err.message}`, 'error')
        }

        // 2. Fetch Wishlist (Independent)
        try {
            if (settings.is_demo_mode) {
                let wishlistSession = getSessionWishlist()
                if (!wishlistSession) {
                    wishlistSession = []
                    saveSessionWishlist(wishlistSession)
                }
                setWishlist(wishlistSession)
            } else {
                const { data: wishlistData, error: wishlistError } = await supabase
                    .from('sys_wishlist')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (wishlistError) throw wishlistError
                
                // Sync / Migration logic
                const localWishlist = getSessionWishlist() || []
                let currentWishlist = wishlistData || []

                if (localWishlist.length > 0) {
                    const { data: { session: authSession } } = await supabase.auth.getSession()
                    if (authSession?.user) {
                        const userId = authSession.user.id
                        const itemsToMigrate = localWishlist.filter(localItem => 
                            !currentWishlist.some(s => s.id === localItem.id || s.title === localItem.title)
                        )

                        if (itemsToMigrate.length > 0) {
                            const { data: migratedData, error: migrationError } = await supabase
                                .from('sys_wishlist')
                                .insert(itemsToMigrate.map(item => ({
                                    user_id: userId,
                                    title: item.title,
                                    description: item.description,
                                    price: item.price,
                                    url: item.url,
                                    image_url: item.image_url,
                                    category: item.category || 'personal',
                                    priority: item.priority || 'mid',
                                    status: item.status || 'abandoned'
                                })))
                                .select()
                            
                            if (!migrationError && migratedData) {
                                currentWishlist = [...currentWishlist, ...migratedData]
                                localStorage.removeItem(WISHLIST_LOCAL_STORAGE_KEY)
                            }
                        }
                    } else {
                        localWishlist.forEach(localItem => {
                            if (!currentWishlist.some(s => s.id === localItem.id || s.title === localItem.title)) {
                                currentWishlist.push(localItem)
                            }
                        })
                    }
                }
                setWishlist(currentWishlist)
            }
        } catch (err: any) {
            console.error('Schrö: Error fetching wishlist:', err.message, err)
            addDebugLog(`❌ Failed to fetch Wishlist: ${err.message}`, 'error')
        }

        // 3. Fetch Aspirations (Independent)
        try {
            if (settings.is_demo_mode) {
                let aspirationsSession = getSessionAspirations()
                if (!aspirationsSession) {
                    aspirationsSession = MOCK_ASPIRATIONS.map((asp: any) => ({
                        ...asp,
                        milestones: MOCK_MILESTONES.filter((m: any) => m.aspiration_id === asp.id)
                    }))
                    saveSessionAspirations(aspirationsSession as Aspiration[])
                }
                if (aspirationsSession) {
                    setAspirations(aspirationsSession as Aspiration[])
                }
            } else {
                const { data: aspirationsData, error: aspirationsError } = await supabase
                    .from('sys_aspirations')
                    .select('*, sys_milestones(*)')
                    .order('created_at', { ascending: false })

                if (aspirationsError) throw aspirationsError

                const sortedAspirations = (aspirationsData || []).map((asp: any) => ({
                    ...asp,
                    priority: asp.priority || 'mid',
                    milestones: (asp.sys_milestones || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                }))
                setAspirations(sortedAspirations)
            }
        } catch (err: any) {
            console.error('Schrö: Error fetching aspirations:', err.message, err)
            addDebugLog(`❌ Failed to fetch Visionary Vectors: ${err.message}. Ensure database migration is applied.`, 'error')
            // If it fails because of missing columns, we still want to show the rest of the board.
        }

        setLoading(false)
    }, [settings.is_demo_mode, getSessionGoals, saveSessionGoals, getSessionWishlist, saveSessionWishlist, getSessionAspirations, saveSessionAspirations, addDebugLog])

    useEffect(() => {
        fetchGoals()
    }, [fetchGoals])

    const createGoal = async (data: CreateGoalData, imageFile?: File) => {
        try {
            if (settings.is_demo_mode) {
                let vision_image_url = data.vision_image_url
                if (imageFile) {
                    try {
                        vision_image_url = await fileToBase64(imageFile)
                    } catch (e) {
                        vision_image_url = URL.createObjectURL(imageFile)
                    }
                }

                const newGoal: Goal = {
                    id: Math.random().toString(36).substring(2, 9),
                    user_id: 'demo-user',
                    title: data.title,
                    description: data.description || null,
                    category: data.category || 'personal',
                    status: 'active',
                    target_date: data.target_date || null,
                    priority: data.priority || 'mid',
                    timeframe: data.timeframe || 'short',
                    vision_image_url: vision_image_url,
                    linked_savings_id: data.linked_savings_id || null,
                    linked_savings_type: data.linked_savings_type || null,
                    created_at: new Date().toISOString(),
                    milestones: data.milestones?.map((m, idx) => ({
                        id: Math.random().toString(36).substring(2, 9),
                        goal_id: 'new-id',
                        title: m.title,
                        is_completed: m.is_completed || false,
                        impact_score: m.impact_score || 5,
                        position: idx,
                        created_at: new Date().toISOString()
                    })) || []
                }
                const session = getSessionGoals() || []
                const updated = [newGoal, ...session]
                saveSessionGoals(updated)
                setGoals(updated)
                return
            }

            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id
            let finalImageUrl = data.vision_image_url

            if (imageFile) {
                const storageFolder = userId || 'public'
                const ext = imageFile.name.split('.').pop() || 'jpg'
                const path = `goals/${storageFolder}/${Date.now()}.${ext}`
                await supabase.storage.from('goal-images').upload(path, imageFile, { upsert: true })
                const { data: urlData } = supabase.storage.from('goal-images').getPublicUrl(path)
                finalImageUrl = urlData.publicUrl
            }

            // Construct update object and remove undefined values to avoid Supabase errors
            const goalData: any = {
                user_id: userId,
                title: data.title,
                description: data.description,
                category: data.category || 'personal',
                target_date: data.target_date,
                priority: data.priority || 'mid',
                timeframe: data.timeframe || 'short',
                vision_image_url: finalImageUrl,
                linked_savings_id: data.linked_savings_id,
                linked_savings_type: data.linked_savings_type
            }
            Object.keys(goalData).forEach(key => goalData[key] === undefined && delete goalData[key])

            const { data: goal, error: goalError } = await supabase
                .from('sys_goals')
                .insert([goalData])
                .select()
                .single()

            if (goalError) throw goalError
            if (!goal) throw new Error("Failed to retrieve created goal")

            console.log('Goal created, inserting milestones for:', goal.id, data.milestones)

            if (data.milestones && data.milestones.length > 0) {
                const milestonesToInsert = data.milestones.map((m, idx) => ({
                    goal_id: goal.id,
                    title: m.title,
                    is_completed: m.is_completed || false,
                    impact_score: m.impact_score || 5,
                    position: idx
                }))
                
                const { error: msError } = await supabase
                    .from('sys_milestones')
                    .insert(milestonesToInsert)
                
                if (msError) {
                    console.error('Milestone insert error:', msError)
                    throw msError
                }
            }

            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateGoal = async (id: string, updates: Partial<CreateGoalData>, imageFile?: File) => {
        try {
            if (settings.is_demo_mode) {
                let vision_image_url = updates.vision_image_url
                if (imageFile) {
                    vision_image_url = await fileToBase64(imageFile)
                }

                const session = getSessionGoals() || []
                const updated = session.map((g: any) => {
                    if (g.id === id) {
                        return {
                            ...g,
                            ...updates,
                            vision_image_url: vision_image_url !== undefined ? vision_image_url : g.vision_image_url,
                            linked_savings_id: updates.linked_savings_id !== undefined ? updates.linked_savings_id : g.linked_savings_id,
                            linked_savings_type: updates.linked_savings_type !== undefined ? updates.linked_savings_type : g.linked_savings_type,
                            milestones: updates.milestones ? updates.milestones.map((m: any, idx: number) => ({
                                id: m.id || Math.random().toString(36).substring(2, 9),
                                goal_id: id,
                                title: m.title,
                                is_completed: m.is_completed || false,
                                impact_score: m.impact_score || 5,
                                position: idx,
                                created_at: new Date().toISOString()
                            })) : g.milestones
                        }
                    }
                    return g
                })
                saveSessionGoals(updated)
                setGoals(updated)
                return
            }

            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id
            let finalImageUrl = updates.vision_image_url

            if (imageFile) {
                const storageFolder = userId || 'public'
                const ext = imageFile.name.split('.').pop() || 'jpg'
                const path = `goals/${storageFolder}/${Date.now()}.${ext}`
                await supabase.storage.from('goal-images').upload(path, imageFile, { upsert: true })
                const { data: urlData } = supabase.storage.from('goal-images').getPublicUrl(path)
                finalImageUrl = urlData.publicUrl
            }

            const fieldsToUpdate: any = {
                title: updates.title,
                description: updates.description,
                category: updates.category,
                target_date: updates.target_date,
                priority: updates.priority,
                timeframe: updates.timeframe,
                vision_image_url: finalImageUrl,
                status: updates.status,
                linked_savings_id: updates.linked_savings_id,
                linked_savings_type: updates.linked_savings_type
            }
            Object.keys(fieldsToUpdate).forEach(key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key])

            const { error: goalError } = await supabase
                .from('sys_goals')
                .update(fieldsToUpdate)
                .eq('id', id)

            if (goalError) throw goalError

            console.log('Goal updated, checking milestones for:', id, updates.milestones)

            if (updates.milestones) {
                // Delete and re-insert to keep it simple and clean
                const { error: delError } = await supabase.from('sys_milestones').delete().eq('goal_id', id)
                if (delError) {
                    console.error('Milestone delete error:', delError)
                    throw delError
                }

                if (updates.milestones.length > 0) {
                    const milestonesToInsert = updates.milestones.map((m, idx) => ({
                        goal_id: id,
                        title: m.title,
                        is_completed: m.is_completed || false,
                        impact_score: m.impact_score || 5,
                        position: idx
                    }))
                    
                    const { error: insError } = await supabase
                        .from('sys_milestones')
                        .insert(milestonesToInsert)
                    
                    if (insError) {
                        console.error('Milestone insert error:', insError)
                        throw insError
                    }
                }
            }

            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const deleteGoal = async (id: string) => {
        try {
            if (settings.is_demo_mode) {
                const session = getSessionGoals() || []
                const updated = session.filter((g: any) => g.id !== id)
                saveSessionGoals(updated)
                setGoals(updated)
                return
            }

            const { error: goalError } = await supabase.from('sys_goals').delete().eq('id', id)
            if (goalError) throw goalError
            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const toggleMilestone = async (milestoneId: string, isCompleted: boolean) => {
        if (settings.is_demo_mode) {
            const session = getSessionGoals() || []
            const updated = session.map((goal: any) => ({
                ...goal,
                milestones: goal.milestones?.map((m: any) =>
                    m.id === milestoneId ? { ...m, is_completed: isCompleted } : m
                )
            }))
            saveSessionGoals(updated)
            setGoals(updated)
            return
        }

        const { error: mError } = await supabase
            .from('sys_milestones')
            .update({ is_completed: isCompleted })
            .eq('id', milestoneId)

        if (mError) throw mError
        await fetchGoals()
    }

    const updateMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
        if (settings.is_demo_mode) {
            const session = getSessionGoals() || []
            const updated = session.map((goal: any) => ({
                ...goal,
                milestones: goal.milestones?.map((m: any) =>
                    m.id === milestoneId ? { ...m, ...updates } : m
                )
            }))
            saveSessionGoals(updated)
            setGoals(updated)
            return
        }

        const { error: mError } = await supabase
            .from('sys_milestones')
            .update(updates)
            .eq('id', milestoneId)

        if (mError) throw mError
        await fetchGoals()
    }

    const toggleAspirationMilestone = async (milestoneId: string, isCompleted: boolean) => {
        if (settings.is_demo_mode) {
            const session = getSessionAspirations() || []
            const updated = session.map((asp: any) => ({
                ...asp,
                milestones: asp.milestones?.map((m: any) =>
                    m.id === milestoneId ? { ...m, is_completed: isCompleted } : m
                )
            }))
            saveSessionAspirations(updated)
            setAspirations(updated)
            return
        }

        const { error: mError } = await supabase
            .from('sys_milestones')
            .update({ is_completed: isCompleted })
            .eq('id', milestoneId)

        if (mError) throw mError
        await fetchGoals()
    }

    const updateAspirationMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
        if (settings.is_demo_mode) {
            const session = getSessionAspirations() || []
            const updated = session.map((asp: any) => ({
                ...asp,
                milestones: asp.milestones?.map((m: any) =>
                    m.id === milestoneId ? { ...m, ...updates } : m
                )
            }))
            saveSessionAspirations(updated)
            setAspirations(updated)
            return
        }

        const { error: mError } = await supabase
            .from('sys_milestones')
            .update(updates)
            .eq('id', milestoneId)

        if (mError) throw mError
        await fetchGoals()
    }

    const createWishlistItem = async (data: CreateWishlistItemData, imageFile?: File) => {
        try {
            if (settings.is_demo_mode) {
                let image_url = data.image_url
                if (imageFile) {
                    try {
                        image_url = await fileToBase64(imageFile)
                    } catch (e) {
                        image_url = URL.createObjectURL(imageFile)
                    }
                }

                const newItem: WishlistItem = {
                    id: Math.random().toString(36).substring(2, 9),
                    user_id: 'demo-user',
                    title: data.title,
                    description: data.description || null,
                    price: data.price || null,
                    url: data.url || null,
                    image_url: image_url || null,
                    category: data.category || 'personal',
                    priority: data.priority || 'mid',
                    status: data.status || 'incoming',
                    linked_savings_id: data.linked_savings_id || null,
                    linked_savings_type: data.linked_savings_type || null,
                    created_at: new Date().toISOString()
                }
                const session = getSessionWishlist() || []
                const updated = [newItem, ...session]
                saveSessionWishlist(updated)
                setWishlist(updated)
                return
            }

            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id
            let finalImageUrl = data.image_url

            if (imageFile) {
                const storageFolder = userId || 'public'
                const ext = imageFile.name.split('.').pop() || 'jpg'
                const path = `wishlist/${storageFolder}/${Date.now()}.${ext}`
                await supabase.storage.from('goal-images').upload(path, imageFile, { upsert: true })
                const { data: urlData } = supabase.storage.from('goal-images').getPublicUrl(path)
                finalImageUrl = urlData.publicUrl
            }

            const { data: insertedData, error: insertError } = await supabase
                .from('sys_wishlist')
                .insert([{
                    user_id: userId,
                    ...data,
                    linked_savings_id: data.linked_savings_id,
                    linked_savings_type: data.linked_savings_type,
                    image_url: finalImageUrl
                }])
                .select()

            if (insertError) throw insertError
            
            
            // Trigger AI cover generation if no image provided
            if (!finalImageUrl && insertedData?.[0]?.id) {
                const newId = insertedData[0].id;
                setGeneratingWishlistIds(prev => [...prev, newId]);
                
                // Fire and forget, but update state when done
                fetch(`/api/studio/cover?title=${encodeURIComponent(data.title)}&tagline=${encodeURIComponent(data.category || '')}&type=wishlist&productUrl=${encodeURIComponent(data.url || '')}&id=${newId}`)
                    .finally(() => {
                        fetchGoals().finally(() => {
                            setGeneratingWishlistIds(prev => prev.filter(id => id !== newId));
                        });
                    });
            }

            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateWishlistItem = async (id: string, updates: Partial<WishlistItem>, imageFile?: File) => {
        try {
            if (settings.is_demo_mode) {
                let image_url = updates.image_url
                if (imageFile) {
                    image_url = await fileToBase64(imageFile)
                }

                const session = getSessionWishlist() || []
                const updated = session.map((item: WishlistItem) => 
                    item.id === id ? { 
                        ...item, 
                        ...updates,
                        linked_savings_id: updates.linked_savings_id !== undefined ? updates.linked_savings_id : item.linked_savings_id,
                        linked_savings_type: updates.linked_savings_type !== undefined ? updates.linked_savings_type : item.linked_savings_type,
                        image_url: image_url !== undefined ? image_url : item.image_url
                    } : item
                )
                saveSessionWishlist(updated)
                setWishlist(updated)
                return
            }

            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id
            let finalImageUrl = updates.image_url

            if (imageFile) {
                const storageFolder = userId || 'public'
                const ext = imageFile.name.split('.').pop() || 'jpg'
                const path = `wishlist/${storageFolder}/${Date.now()}.${ext}`
                await supabase.storage.from('goal-images').upload(path, imageFile, { upsert: true })
                const { data: urlData } = supabase.storage.from('goal-images').getPublicUrl(path)
                finalImageUrl = urlData.publicUrl
            }

            const { error: updateError } = await supabase
                .from('sys_wishlist')
                .update({
                    ...updates,
                    linked_savings_id: updates.linked_savings_id,
                    linked_savings_type: updates.linked_savings_type,
                    image_url: finalImageUrl
                })
                .eq('id', id)

            if (updateError) throw updateError

            // Trigger AI cover generation only if content that informs the visual changed,
            // and we still don't have an image. This prevents re-triggering on drag (status update).
            const isContentUpdate = updates.title !== undefined || updates.category !== undefined || updates.image_url === '' || (updates.url !== undefined && !finalImageUrl);
            
            if (!finalImageUrl && isContentUpdate) {
                const item = wishlist.find(i => i.id === id)
                const title = updates.title || item?.title || ''
                const cat = updates.category || item?.category || ''
                const productUrl = updates.url || item?.url || ''
                
                setGeneratingWishlistIds(prev => [...prev, id]);
                
                fetch(`/api/studio/cover?title=${encodeURIComponent(title)}&tagline=${encodeURIComponent(cat)}&type=wishlist&productUrl=${encodeURIComponent(productUrl)}&id=${id}`)
                    .finally(() => {
                        fetchGoals().finally(() => {
                            setGeneratingWishlistIds(prev => prev.filter(gid => gid !== id));
                        });
                    });
            }

            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const deleteWishlistItem = async (id: string) => {
        try {
            if (settings.is_demo_mode) {
                const session = getSessionWishlist() || []
                const updated = session.filter((item: WishlistItem) => item.id !== id)
                saveSessionWishlist(updated)
                setWishlist(updated)
                return
            }

            const { error: deleteError } = await supabase
                .from('sys_wishlist')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }


    const regenerateGoalCover = async (id: string) => {
        const goal = goals.find(g => g.id === id)
        if (!goal) return

        setGeneratingGoalIds(prev => [...prev, id])
        addDebugLog(`🔮 Initiating Imagen 4.0 for Goal: ${goal.title}`, 'info')

        try {
            if (!settings.is_demo_mode) {
                const res = await fetch(`/api/studio/cover?title=${encodeURIComponent(goal.title)}&tagline=${encodeURIComponent(goal.category || '')}&type=goal&id=${id}&json=true&t=${Date.now()}`)
                const responseData = await res.json()
                
                if (responseData.debug && Array.isArray(responseData.debug)) {
                    responseData.debug.forEach((msg: string) => addDebugLog(msg, msg.includes('❌') ? 'error' : msg.includes('✅') ? 'success' : 'info'))
                }

                if (res.ok && responseData.url) {
                    const { data } = await supabase.from('sys_goals').select('*').eq('id', id).single()
                    if (data) {
                        setGoals(prev => prev.map(g => g.id === id ? { ...data, milestones: g.milestones } : g))
                    }
                } else {
                    addDebugLog(`❌ API Rejected: ${res.statusText}`, 'error')
                }
            } else {
                await new Promise(r => setTimeout(r, 2000))
                addDebugLog(`✅ Demo Mode: Cover updated virtually`, 'success')
            }
        } catch (err: any) {
            console.error('Goal cover regeneration failed:', err)
            addDebugLog(`❌ Critical Fail: ${err.message}`, 'error')
        } finally {
            setGeneratingGoalIds(prev => prev.filter(gid => gid !== id))
        }
    }

    const regenerateWishlistCover = async (id: string) => {
        const item = wishlist.find(i => i.id === id);
        if (!item) return;
        
        setGeneratingWishlistIds(prev => [...prev, id]);
        addDebugLog(`🔮 Initiating Imagen 4.0 for Wishlist: ${item.title}`, 'info')
        
        try {
            if (!settings.is_demo_mode) {
                const res = await fetch(`/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.category || '')}&type=wishlist&productUrl=${encodeURIComponent(item.url || '')}&id=${id}&json=true&t=${Date.now()}`);
                const responseData = await res.json()
                
                if (responseData.debug && Array.isArray(responseData.debug)) {
                    responseData.debug.forEach((msg: string) => addDebugLog(msg, msg.includes('❌') ? 'error' : msg.includes('✅') ? 'success' : 'info'))
                }

                if (res.ok && responseData.url) {
                    const { data } = await supabase.from('sys_wishlist').select('*').eq('id', id).single()
                    if (data) {
                        setWishlist(prev => prev.map(w => w.id === id ? data : w))
                    }
                } else {
                    addDebugLog(`❌ API Rejected: ${res.statusText}`, 'error')
                }
            } else {
                await new Promise(r => setTimeout(r, 2000));
                addDebugLog(`✅ Demo Mode: Cover updated virtually`, 'success')
            }
        } catch (err: any) {
            console.error('Regeneration failed:', err);
            addDebugLog(`❌ Critical Fail: ${err.message}`, 'error')
        } finally {
            setGeneratingWishlistIds(prev => prev.filter(gid => gid !== id));
        }
    }

    const suggestWishlistDetails = async (title: string) => {
        try {
            const res = await fetch(`/api/studio/wishlist/suggest?title=${encodeURIComponent(title)}`)
            const data = await res.json()
            if (!res.ok) {
                console.error('AI Suggestion API Error:', data.error, data.raw)
                return []
            }
            return Array.isArray(data) ? data : []
        } catch (err) {
            console.error('Suggest error:', err)
            return []
        }
    }

    const createAspiration = async (data: CreateAspirationData, imageFile?: File) => {
        try {
            if (settings.is_demo_mode) {
                let vision_image_url = data.vision_image_url
                if (imageFile) {
                    try {
                        vision_image_url = await fileToBase64(imageFile)
                    } catch (e) {
                        vision_image_url = URL.createObjectURL(imageFile)
                    }
                }

                const aspirationId = Math.random().toString(36).substring(2, 9)
                const newAspiration: Aspiration = {
                    id: aspirationId,
                    user_id: 'demo-user',
                    title: data.title,
                    description: data.description || null,
                    category: data.category || 'personal',
                    vision_image_url: vision_image_url || null,
                    horizon: data.horizon || 'medium',
                    priority: data.priority || 'mid',
                    status: data.status || 'active',
                    created_at: new Date().toISOString(),
                    milestones: data.milestones?.map((m, idx) => ({
                        id: Math.random().toString(36).substring(2, 9),
                        goal_id: '', // Not used for aspirations
                        aspiration_id: aspirationId,
                        title: m.title,
                        is_completed: m.is_completed || false,
                        impact_score: m.impact_score || 5,
                        position: idx,
                        created_at: new Date().toISOString()
                    })) || []
                }
                const session = getSessionAspirations() || []
                const updated = [newAspiration, ...session]
                saveSessionAspirations(updated)
                setAspirations(updated)
                return
            }

            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id
            let finalImageUrl = data.vision_image_url

            if (imageFile) {
                const storageFolder = userId || 'public'
                const ext = imageFile.name.split('.').pop() || 'jpg'
                const path = `aspirations/${storageFolder}/${Date.now()}.${ext}`
                await supabase.storage.from('goal-images').upload(path, imageFile, { upsert: true })
                const { data: urlData } = supabase.storage.from('goal-images').getPublicUrl(path)
                finalImageUrl = urlData.publicUrl
            }

            const aspirationData: any = {
                user_id: userId,
                title: data.title,
                description: data.description,
                category: data.category || 'personal',
                horizon: data.horizon || 'medium',
                priority: data.priority || 'mid',
                status: data.status || 'active',
                vision_image_url: finalImageUrl
            }
            Object.keys(aspirationData).forEach(key => aspirationData[key] === undefined && delete aspirationData[key])

            const { data: asp, error: aspError } = await supabase
                .from('sys_aspirations')
                .insert([aspirationData])
                .select()
                .single()

            if (aspError) throw aspError
            if (!asp) throw new Error("Failed to retrieve created aspiration")

            if (data.milestones && data.milestones.length > 0) {
                const milestonesToInsert = data.milestones.map((m, idx) => ({
                    aspiration_id: asp.id,
                    title: m.title,
                    is_completed: m.is_completed || false,
                    impact_score: m.impact_score || 5,
                    position: idx
                }))
                
                const { error: msError } = await supabase
                    .from('sys_milestones')
                    .insert(milestonesToInsert)
                
                if (msError) throw msError
            }

            // Trigger AI cover generation if no image provided
            if (!finalImageUrl && asp.id) {
                setGeneratingAspirationIds(prev => [...prev, asp.id])
                fetch(`/api/studio/cover?title=${encodeURIComponent(data.title)}&tagline=${encodeURIComponent(data.category || 'Visionary Aspiration')}&type=aspiration&id=${asp.id}`)
                    .finally(() => {
                        fetchGoals().finally(() => {
                            setGeneratingAspirationIds(prev => prev.filter(id => id !== asp.id))
                        })
                    })
            }

            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateAspiration = async (id: string, updates: Partial<CreateAspirationData>, imageFile?: File) => {
        try {
            if (settings.is_demo_mode) {
                let vision_image_url = updates.vision_image_url
                if (imageFile) {
                    vision_image_url = await fileToBase64(imageFile)
                }

                const session = getSessionAspirations() || []
                const updated = session.map((item: Aspiration) =>
                    item.id === id ? {
                        ...item,
                        ...updates,
                        vision_image_url: vision_image_url !== undefined ? vision_image_url : item.vision_image_url,
                        milestones: updates.milestones ? updates.milestones.map((m: any, idx: number) => ({
                            id: m.id || Math.random().toString(36).substring(2, 9),
                            goal_id: '',
                            aspiration_id: id,
                            title: m.title,
                            is_completed: m.is_completed || false,
                            impact_score: m.impact_score || 5,
                            position: idx,
                            created_at: new Date().toISOString()
                        })) : item.milestones
                    } : item
                )
                saveSessionAspirations(updated)
                setAspirations(updated)
                return
            }

            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id
            let finalImageUrl = updates.vision_image_url

            if (imageFile) {
                const storageFolder = userId || 'public'
                const ext = imageFile.name.split('.').pop() || 'jpg'
                const path = `aspirations/${storageFolder}/${Date.now()}.${ext}`
                await supabase.storage.from('goal-images').upload(path, imageFile, { upsert: true })
                const { data: urlData } = supabase.storage.from('goal-images').getPublicUrl(path)
                finalImageUrl = urlData.publicUrl
            }

            const fieldsToUpdate: any = {
                title: updates.title,
                description: updates.description,
                category: updates.category,
                horizon: updates.horizon,
                priority: updates.priority,
                status: updates.status,
                vision_image_url: finalImageUrl
            }
            Object.keys(fieldsToUpdate).forEach(key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key])

            const { error: updateError } = await supabase
                .from('sys_aspirations')
                .update(fieldsToUpdate)
                .eq('id', id)

            if (updateError) throw updateError

            if (updates.milestones) {
                // Delete and re-insert for aspirations
                await supabase.from('sys_milestones').delete().eq('aspiration_id', id)

                if (updates.milestones.length > 0) {
                    const milestonesToInsert = updates.milestones.map((m, idx) => ({
                        aspiration_id: id,
                        title: m.title,
                        is_completed: m.is_completed || false,
                        impact_score: m.impact_score || 5,
                        position: idx
                    }))
                    
                    const { error: insError } = await supabase
                        .from('sys_milestones')
                        .insert(milestonesToInsert)
                    
                    if (insError) throw insError
                }
            }

            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const deleteAspiration = async (id: string) => {
        try {
            if (settings.is_demo_mode) {
                const session = getSessionAspirations() || []
                const updated = session.filter((item: Aspiration) => item.id !== id)
                saveSessionAspirations(updated)
                setAspirations(updated)
                return
            }

            const { error: deleteError } = await supabase
                .from('sys_aspirations')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const regenerateAspirationCover = async (id: string) => {
        const item = aspirations.find(a => a.id === id)
        if (!item) return

        setGeneratingAspirationIds(prev => [...prev, id])
        addDebugLog(`🔮 Initiating Imagen 5.0 for Aspiration: ${item.title}`, 'info')

        try {
            if (!settings.is_demo_mode) {
                const res = await fetch(`/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent('Visionary Aspiration')}&type=aspiration&id=${id}&json=true&t=${Date.now()}`)
                const responseData = await res.json()

                if (res.ok && responseData.url) {
                    const { data } = await supabase.from('sys_aspirations').select('*').eq('id', id).single()
                    if (data) {
                        setAspirations(prev => prev.map(a => a.id === id ? data : a))
                    }
                }
            } else {
                await new Promise(r => setTimeout(r, 2000))
                addDebugLog(`✅ Demo Mode: Aspiration cover updated virtually`, 'success')
            }
        } catch (err: any) {
            console.error('Aspiration cover regeneration failed:', err)
        } finally {
            setGeneratingAspirationIds(prev => prev.filter(gid => gid !== id))
        }
    }

    const convertGoalToWishlist = async (goalId: string) => {
        try {
            const goal = goals.find(g => g.id === goalId)
            if (!goal) return

            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id

            const wishlistData: CreateWishlistItemData = {
                title: goal.title,
                description: goal.description || '',
                category: goal.category,
                priority: goal.priority,
                image_url: goal.vision_image_url || '',
                status: 'incoming'
            }

            if (settings.is_demo_mode) {
                const newItem: WishlistItem = {
                    id: Math.random().toString(36).substring(2, 9),
                    user_id: 'demo-user',
                    ...wishlistData,
                    price: null,
                    url: null,
                    image_url: wishlistData.image_url || null,
                    description: wishlistData.description || null,
                    category: wishlistData.category || 'personal',
                    priority: wishlistData.priority || 'mid',
                    status: wishlistData.status || 'incoming',
                    created_at: new Date().toISOString()
                }
                const currentWishlist = getSessionWishlist() || []
                const updatedWishlist = [newItem, ...currentWishlist]
                saveSessionWishlist(updatedWishlist)
                setWishlist(updatedWishlist)
                
                const currentGoals = getSessionGoals() || []
                const filteredGoals = currentGoals.filter(g => g.id !== goalId)
                saveSessionGoals(filteredGoals)
                setGoals(filteredGoals)
                addDebugLog(`🔄 [Demo] Converted goal "${goal.title}" to wishlist`, 'success')
                return
            }

            // Live mode
            const { error: insertError } = await supabase
                .from('sys_wishlist')
                .insert([{
                    user_id: userId,
                    ...wishlistData
                }])

            if (insertError) throw insertError

            const { error: deleteError } = await supabase
                .from('sys_goals')
                .delete()
                .eq('id', goalId)

            if (deleteError) throw deleteError

            await fetchGoals()
            addDebugLog(`🔄 Converted goal "${goal.title}" to wishlist item`, 'success')
        } catch (err: any) {
            console.error('Conversion failed:', err)
            setError(err.message)
            addDebugLog(`❌ Conversion failed: ${err.message}`, 'error')
        }
    }

    return (
        <GoalsContext.Provider value={{
            goals,
            wishlist,
            aspirations,
            loading,
            error,
            fetchGoals,
            createGoal,
            updateGoal,
            deleteGoal,
            toggleMilestone,
            updateMilestone,
            toggleAspirationMilestone,
            updateAspirationMilestone,
            createWishlistItem,
            updateWishlistItem,
            deleteWishlistItem,
            regenerateWishlistCover,
            regenerateGoalCover,
            regenerateAspirationCover,
            createAspiration,
            updateAspiration,
            deleteAspiration,
            suggestWishlistDetails,
            generatingWishlistIds,
            generatingGoalIds,
            generatingAspirationIds,
            debugLogs,
            addDebugLog,
            convertGoalToWishlist
        }}>
            {children}
        </GoalsContext.Provider>
    )
}

export function useGoalsContext() {
    const context = useContext(GoalsContext)
    if (context === undefined) {
        throw new Error('useGoalsContext must be used within a GoalsProvider')
    }
    return context
}
