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
    createWishlistItem: (data: CreateWishlistItemData, imageFile?: File) => Promise<void>
    updateWishlistItem: (id: string, updates: Partial<WishlistItem>, imageFile?: File) => Promise<void>
    deleteWishlistItem: (id: string) => Promise<void>
    convertWishlistToGoal: (id: string) => Promise<void>
    regenerateWishlistCover: (id: string) => Promise<void>
    regenerateGoalCover: (id: string) => Promise<void>
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
    const [generatingWishlistIds, setGeneratingWishlistIds] = useState<string[]>([])
    const [generatingGoalIds, setGeneratingGoalIds] = useState<string[]>([])

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

            const { data: goalsData, error: goalsError } = await supabase
                .from('sys_goals')
                .select('*, sys_milestones(*)')
                .order('created_at', { ascending: false })

            const { data: wishlistData, error: wishlistError } = await supabase
                .from('sys_wishlist')
                .select('*')
                .order('created_at', { ascending: false })

            if (goalsError) throw goalsError
            if (wishlistError) throw wishlistError

            const sortedGoals = (goalsData || []).map((goal: any) => ({
                ...goal,
                milestones: (goal.sys_milestones || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
            }))

            setGoals(sortedGoals)
            
            // Sync logic: If we have items in localStorage and we're in live mode,
            // we should migrate them to Supabase to be sure they're saved.
            const localWishlist = getSessionWishlist() || []
            let currentWishlist = wishlistData || []

            if (localWishlist.length > 0) {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    const userId = session.user.id
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
                            // Once migrated, we can clear the local storage version
                            // to avoid redundant sync attempts.
                            localStorage.removeItem(WISHLIST_LOCAL_STORAGE_KEY)
                        }
                    }
                } else {
                    // If not logged in but in live mode, just merge for visual consistency
                    localWishlist.forEach(localItem => {
                        if (!currentWishlist.some(s => s.id === localItem.id || s.title === localItem.title)) {
                            currentWishlist.push(localItem)
                        }
                    })
                }
            }
            setWishlist(currentWishlist)
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
    const regenerateGoalCover = async (id: string) => {
        const goal = goals.find(g => g.id === id)
        if (!goal) return

        setGeneratingGoalIds(prev => [...prev, id])

        try {
            if (!settings.is_demo_mode) {
                await supabase.from('sys_goals').update({ vision_image_url: '' }).eq('id', id)
                await fetch(`/api/studio/cover?title=${encodeURIComponent(goal.title)}&tagline=${encodeURIComponent(goal.category || '')}&type=goal&id=${id}`)
            } else {
                await new Promise(r => setTimeout(r, 2000))
            }
            await fetchGoals()
        } catch (err) {
            console.error('Goal cover regeneration failed:', err)
        } finally {
            setGeneratingGoalIds(prev => prev.filter(gid => gid !== id))
        }
    }

    const regenerateWishlistCover = async (id: string) => {
        const item = wishlist.find(i => i.id === id);
        if (!item) return;
        
        setGeneratingWishlistIds(prev => [...prev, id]);
        
        try {
            if (!settings.is_demo_mode) {
                // 1. Clear current image in DB
                await supabase.from('sys_wishlist').update({ image_url: '' }).eq('id', id);
                
                // 2. Trigger AI
                await fetch(`/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.category || '')}&type=wishlist&productUrl=${encodeURIComponent(item.url || '')}&id=${id}`);
            } else {
                // Mock delay for demo mode
                await new Promise(r => setTimeout(r, 2000));
            }
            
            await fetchGoals();
        } catch (err) {
            console.error('Regeneration failed:', err);
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
            convertWishlistToGoal,
            regenerateWishlistCover,
            regenerateGoalCover,
            suggestWishlistDetails,
            generatingWishlistIds,
            generatingGoalIds
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
