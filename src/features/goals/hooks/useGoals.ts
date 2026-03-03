'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_GOALS, MOCK_MILESTONES } from '@/lib/demoData'
import type { Goal, Milestone, CreateGoalData } from '../types/goals.types'

export function useGoals() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { settings } = useSystemSettings()

    const fetchGoals = useCallback(async () => {
        if (goals.length === 0) setLoading(true)
        setError(null)

        try {
            if (settings.is_demo_mode) {
                // In demo mode, we simulate fetching goals with their milestones
                const transformedGoals = MOCK_GOALS.map(goal => ({
                    ...goal,
                    milestones: MOCK_MILESTONES.filter(m => m.goal_id === goal.id)
                })) as Goal[]
                setGoals(transformedGoals)
                setLoading(false)
                return
            }

            // Real data fetch from Supabase
            const { data: goalsData, error: goalsError } = await supabase
                .from('sys_goals')
                .select('*, milestones:sys_milestones(*)')
                .order('created_at', { ascending: false })

            if (goalsError) throw goalsError

            // Sort milestones by position safely
            const sortedGoals = (goalsData || []).map((goal: any) => ({
                ...goal,
                milestones: (goal.milestones || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
            }))

            setGoals(sortedGoals)
        } catch (err: any) {
            console.error('Error fetching goals:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [settings.is_demo_mode, goals.length])

    const createGoal = async (data: CreateGoalData, imageFile?: File) => {
        try {
            if (settings.is_demo_mode) {
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
                    vision_image_url: imageFile ? URL.createObjectURL(imageFile) : data.vision_image_url,
                    created_at: new Date().toISOString(),
                    milestones: data.milestones?.map((m, idx) => ({
                        id: Math.random().toString(36).substring(2, 9),
                        goal_id: 'new-id',
                        title: m.title,
                        is_completed: m.is_completed || false,
                        impact_score: m.impact_score || 5,
                        position: idx,
                        created_at: new Date().toISOString()
                    }))
                }
                setGoals(prev => [newGoal, ...prev])
                return
            }

            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            if (sessionError) console.error('Session retrieval error:', sessionError)

            const userId = session?.user?.id
            console.log('Creation check - Session:', !!session, 'User ID:', userId, 'Role:', session?.user?.role)

            let finalImageUrl = data.vision_image_url
            if (imageFile) {
                // Use userId or 'public' as top-level folder
                const storageFolder = userId || 'public'
                console.log(`Attempting storage upload for: ${imageFile.name} to bucket: goal-images (folder: ${storageFolder})`)

                const ext = imageFile.name.split('.').pop() || 'jpg'
                const path = `goals/${storageFolder}/${Date.now()}.${ext}`

                const { error: uploadError } = await supabase.storage
                    .from('goal-images')
                    .upload(path, imageFile, { upsert: true, cacheControl: '3600' })

                if (uploadError) {
                    console.error('Storage Upload Error Detail:', uploadError)
                    throw new Error(`Upload failed: ${uploadError.message}. Check if "goal-images" bucket exists and policies are public.`)
                }

                const { data: urlData } = supabase.storage.from('goal-images').getPublicUrl(path)
                finalImageUrl = urlData.publicUrl
                console.log('Image uploaded successfully:', finalImageUrl)
            }

            const { data: goal, error: goalError } = await supabase
                .from('sys_goals')
                .insert([{
                    user_id: session?.user?.id || undefined,
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
                setGoals(prev => prev.map(g => {
                    if (g.id === id) {
                        return {
                            ...g,
                            ...updates,
                            vision_image_url: imageFile ? URL.createObjectURL(imageFile) :
                                (updates.vision_image_url !== undefined ? updates.vision_image_url : g.vision_image_url),
                            milestones: updates.milestones ? updates.milestones.map((m, idx) => ({
                                id: Math.random().toString(36).substring(2, 9),
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
                }))
                return
            }

            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            if (sessionError) console.error('Update session retrieval error:', sessionError)

            const userId = session?.user?.id
            console.log('Update check - Session:', !!session, 'User ID:', userId, 'Role:', session?.user?.role)

            // Fetch the existing goal to get the current vision_image_url if needed
            const { data: existingGoal } = await supabase.from('sys_goals').select('vision_image_url').eq('id', id).single()

            let finalImageUrl = imageFile ? undefined : (updates.vision_image_url !== undefined ? updates.vision_image_url : existingGoal?.vision_image_url)
            if (imageFile) {
                const storageFolder = userId || 'public'
                console.log(`Attempting storage update for: ${imageFile.name} (folder: ${storageFolder})`)

                const ext = imageFile.name.split('.').pop() || 'jpg'
                const path = `goals/${storageFolder}/${Date.now()}.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('goal-images')
                    .upload(path, imageFile, { upsert: true, cacheControl: '3600' })

                if (uploadError) {
                    console.error('Image upload failed during update:', uploadError)
                    throw new Error(`Upload failed: ${uploadError.message}. Ensure bucket policies are public.`)
                }

                const { data: urlData } = supabase.storage.from('goal-images').getPublicUrl(path)
                finalImageUrl = urlData.publicUrl
                console.log('Image updated successfully:', finalImageUrl)
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
                setGoals(prev => prev.filter(g => g.id !== id))
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
        const originalGoals = [...goals]
        setGoals(prev => prev.map(goal => ({
            ...goal,
            milestones: goal.milestones?.map(m =>
                m.id === milestoneId ? { ...m, is_completed: isCompleted } : m
            )
        })))

        try {
            if (settings.is_demo_mode) return

            const { error: mError } = await supabase
                .from('sys_milestones')
                .update({ is_completed: isCompleted })
                .eq('id', milestoneId)

            if (mError) throw mError
            await fetchGoals()
        } catch (err: any) {
            setGoals(originalGoals)
            setError(err.message)
            throw err
        }
    }
    const updateMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
        const originalGoals = [...goals]
        setGoals(prev => prev.map(goal => ({
            ...goal,
            milestones: goal.milestones?.map(m =>
                m.id === milestoneId ? { ...m, ...updates } : m
            )
        })))

        try {
            if (settings.is_demo_mode) return

            const { error: mError } = await supabase
                .from('sys_milestones')
                .update(updates)
                .eq('id', milestoneId)

            if (mError) throw mError
            await fetchGoals()
        } catch (err: any) {
            setGoals(originalGoals)
            setError(err.message)
            throw err
        }
    }

    useEffect(() => {
        fetchGoals()
    }, [fetchGoals])

    return {
        goals,
        loading,
        error,
        createGoal,
        updateGoal,
        deleteGoal,
        toggleMilestone,
        updateMilestone,
        refetch: fetchGoals
    }
}
