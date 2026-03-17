'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_GOALS, MOCK_MILESTONES } from '@/lib/demoData'
import type { Goal, Milestone, CreateGoalData, WishlistItem, CreateWishlistItemData } from '../types/goals.types'

interface GoalsContextType {
    goals: Goal[]
    wishlist: WishlistItem[]
    loading: boolean
    error: string | null
    fetchGoals: () => Promise<void>
    createGoal: (data: CreateGoalData, imageFile?: File) => Promise<void>
    updateGoal: (id: string, updates: Partial<CreateGoalData>, imageFile?: File) => Promise<void>
    deleteGoal: (id: string) => Promise<void>
    toggleMilestone: (milestoneId: string, isCompleted: boolean) => Promise<void>
    updateMilestone: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
    createWishlistItem: (data: CreateWishlistItemData) => Promise<void>
    updateWishlistItem: (id: string, updates: Partial<WishlistItem>) => Promise<void>
    deleteWishlistItem: (id: string) => Promise<void>
    convertWishlistToGoal: (id: string) => Promise<void>
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = 'schrö_demo_goals_v1'
const WISHLIST_LOCAL_STORAGE_KEY = 'schrö_demo_wishlist_v1'

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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const getSessionGoals = useCallback(() => {
        if (typeof window === 'undefined') return null
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    }, [])

    const saveSessionGoals = useCallback((data: Goal[]) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
    }, [])

    const getSessionWishlist = useCallback(() => {
        if (typeof window === 'undefined') return null
        const stored = localStorage.getItem(WISHLIST_LOCAL_STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    }, [])

    const saveSessionWishlist = useCallback((data: WishlistItem[]) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(WISHLIST_LOCAL_STORAGE_KEY, JSON.stringify(data))
    }, [])

    const fetchGoals = useCallback(async () => {
        setError(null)
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

                let wishlistSession = getSessionWishlist()
                if (!wishlistSession) {
                    wishlistSession = []
                    saveSessionWishlist(wishlistSession)
                }
                setWishlist(wishlistSession)
                setLoading(false)
                return
            }

            const [{ data: goalsData, error: goalsError }, { data: wishlistData, error: wishlistError }] = await Promise.all([
                supabase
                    .from('sys_goals')
                    .select('*, milestones:sys_milestones(*)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('sys_wishlist')
                    .select('*')
                    .order('created_at', { ascending: false })
            ])

            if (goalsError) throw goalsError
            if (wishlistError) throw wishlistError

            const sortedGoals = (goalsData || []).map((goal: any) => ({
                ...goal,
                milestones: (goal.milestones || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
            }))

            setGoals(sortedGoals)
            setWishlist(wishlistData || [])
        } catch (err: any) {
            console.error('Error fetching data:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [settings.is_demo_mode, getSessionGoals, saveSessionGoals, getSessionWishlist, saveSessionWishlist])

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

            const { data: goal, error: goalError } = await supabase
                .from('sys_goals')
                .insert([{
                    user_id: userId,
                    title: data.title,
                    description: data.description,
                    category: data.category || 'personal',
                    target_date: data.target_date,
                    priority: data.priority || 'mid',
                    timeframe: data.timeframe || 'short',
                    vision_image_url: finalImageUrl
                }])
                .select()
                .single()

            if (goalError) throw goalError

            if (data.milestones && data.milestones.length > 0) {
                const milestones = data.milestones.map((m, idx) => ({
                    goal_id: goal.id,
                    title: m.title,
                    is_completed: m.is_completed || false,
                    impact_score: m.impact_score || 5,
                    position: idx
                }))
                await supabase.from('sys_milestones').insert(milestones)
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

            const { error: goalError } = await supabase
                .from('sys_goals')
                .update({
                    title: updates.title,
                    description: updates.description,
                    category: updates.category,
                    target_date: updates.target_date,
                    priority: updates.priority,
                    timeframe: updates.timeframe,
                    vision_image_url: finalImageUrl,
                    status: updates.status
                })
                .eq('id', id)

            if (goalError) throw goalError

            if (updates.milestones) {
                await supabase.from('sys_milestones').delete().eq('goal_id', id)
                if (updates.milestones.length > 0) {
                    const milestonesToInsert = updates.milestones.map((m, idx) => ({
                        goal_id: id,
                        title: m.title,
                        is_completed: m.is_completed || false,
                        impact_score: m.impact_score || 5,
                        position: idx
                    }))
                    await supabase.from('sys_milestones').insert(milestonesToInsert)
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

    const createWishlistItem = async (data: CreateWishlistItemData) => {
        try {
            if (settings.is_demo_mode) {
                const newItem: WishlistItem = {
                    id: Math.random().toString(36).substring(2, 9),
                    user_id: 'demo-user',
                    title: data.title,
                    description: data.description || null,
                    price: data.price || null,
                    url: data.url || null,
                    image_url: data.image_url || null,
                    category: data.category || 'personal',
                    priority: data.priority || 'mid',
                    status: data.status || 'wanted',
                    created_at: new Date().toISOString()
                }
                const session = getSessionWishlist() || []
                const updated = [newItem, ...session]
                saveSessionWishlist(updated)
                setWishlist(updated)
                return
            }

            const { data: { session } } = await supabase.auth.getSession()
            const { error: insertError } = await supabase
                .from('sys_wishlist')
                .insert([{
                    user_id: session?.user?.id,
                    ...data
                }])

            if (insertError) throw insertError
            await fetchGoals()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateWishlistItem = async (id: string, updates: Partial<WishlistItem>) => {
        try {
            if (settings.is_demo_mode) {
                const session = getSessionWishlist() || []
                const updated = session.map((item: WishlistItem) => 
                    item.id === id ? { ...item, ...updates } : item
                )
                saveSessionWishlist(updated)
                setWishlist(updated)
                return
            }

            const { error: updateError } = await supabase
                .from('sys_wishlist')
                .update(updates)
                .eq('id', id)

            if (updateError) throw updateError
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

    const convertWishlistToGoal = async (id: string) => {
        const item = wishlist.find(i => i.id === id)
        if (!item) return

        try {
            await createGoal({
                title: item.title,
                description: item.description || `Converted from wishlist item: ${item.title}`,
                category: item.category,
                vision_image_url: item.image_url || undefined,
            })
            await deleteWishlistItem(id)
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    return (
        <GoalsContext.Provider value={{
            goals,
            wishlist,
            loading,
            error,
            fetchGoals,
            createGoal,
            updateGoal,
            deleteGoal,
            toggleMilestone,
            updateMilestone,
            createWishlistItem,
            updateWishlistItem,
            deleteWishlistItem,
            convertWishlistToGoal
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
