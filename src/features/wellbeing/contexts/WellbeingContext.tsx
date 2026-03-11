import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import type { WellbeingProfile, MetricEntry, MacroTargets, WellbeingState, WellbeingGoal, ActivityLevel, WorkoutRoutine, WorkoutLog, WorkoutSession, WorkoutSet, TheGymGroupStats, MealLog, MoodValue, MoodEntry, Reflection, GymBusyness, GymVisit, DashboardLayout, LibraryMeal, FridgeItem, Milestone } from '../types'
import { GymService } from '../services/gymService'
import { supabase } from '@/lib/supabase'
import { getGymRecommendation } from '../utils/fitness-utils'
import { getMonthlyRoutine } from '../utils/routine-generator'
import { getOverloadTarget } from '../utils/progressiveOverload'
import type { RotaOverride } from '@/features/finance/types/finance.types'

interface WellbeingContextType extends WellbeingState {
    updateProfile: (profile: WellbeingProfile) => Promise<void>
    logWeight: (weight: number) => Promise<void>
    calculateTDEE: (profile: WellbeingProfile) => number
    logWorkout: (log: WorkoutLog) => Promise<void>
    connectGym: (username: string, pin: string, locationId: string, locationIds?: string[]) => Promise<void>
    syncGymData: () => Promise<void>
    disconnectGym: () => Promise<void>
    addRoutine: (routine: WorkoutRoutine) => Promise<void>
    updateGymStats: (stats: Partial<TheGymGroupStats>) => Promise<void>
    logMeal: (meal: Omit<MealLog, 'id'>) => Promise<void>
    updateMealLog: (id: string, updates: Partial<MealLog>) => Promise<void>
    deleteMealLog: (id: string) => Promise<void>
    saveRecipe: (recipeId: string) => Promise<void>
    logMood: (value: MoodValue, note?: string) => Promise<void>
    saveReflection: (content: string) => Promise<void>
    updateLayout: (layout: DashboardLayout) => Promise<void>
    addMealToLibrary: (meal: Omit<LibraryMeal, 'id'>) => Promise<void>
    removeMealFromLibrary: (id: string) => Promise<void>
    updateLibraryMeal: (id: string, updates: Partial<LibraryMeal>) => Promise<void>
    createCombo: (name: string, itemIds: { id: string, quantity: number }[], type: ('dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack')[]) => Promise<void>
    addPrepToFridge: (mealId: string, portions: number) => Promise<void>
    updateFridgePortions: (fridgeId: string, portions: number) => Promise<void>
    consumeFromFridge: (fridgeId: string, mealType?: 'dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack') => Promise<void>
    removeFromFridge: (fridgeId: string) => Promise<void>
    addMilestone: (milestone: Omit<Milestone, 'id' | 'completed'>) => Promise<void>
    bulkAddMilestones: (milestones: Milestone[]) => Promise<void>
    updateMilestone: (id: string, updates: Partial<Milestone>) => Promise<void>
    deleteMilestone: (id: string) => Promise<void>
    macros: MacroTargets
    dailyNutrition: MacroTargets
    gymRecommendation: { status: string; reason: string }
    isSyncingGym: boolean
    activeSession: WorkoutSession | null
    startSession: (routineId: string) => void
    updateSessionSet: (exerciseId: string, setIndex: number, updates: Partial<WorkoutSet>) => void
    finishSession: () => Promise<void>
    cancelSession: () => void
    setActiveRoutineId: (id: string) => Promise<void>
    updateRoutine: (id: string, updates: Partial<WorkoutRoutine>) => Promise<void>
    deleteRoutine: (id: string) => Promise<void>
}

export const WellbeingContext = createContext<WellbeingContextType | undefined>(undefined)

const INITIAL_STATE: WellbeingState = {
    profile: null,
    weightHistory: [],
    routines: [],
    activeRoutineId: null,
    workoutLogs: [],
    gymStats: {
        totalVisits: 0,
        lastVisit: null,
        isIntegrated: false,
        weeklyVisits: 0,
        visitHistory: [],
        lastSyncTime: null
    },
    mealLogs: [],
    library: [],
    fridge: [],
    savedRecipes: [],
    moodLogs: [],
    reflections: [],
    milestones: [],
    dashboardLayout: {
        main: [
            { id: 'macros', isVisible: true },
            { id: 'weight_trends', isVisible: true },
            { id: 'active_protocol', isVisible: true },
            { id: 'meal_planner', isVisible: true },
            { id: 'mood_reflection', isVisible: true },
        ],
        sidebar: [
            { id: 'nutritional_trends', isVisible: true },
            { id: 'workout_consistency', isVisible: true },
            { id: 'gym_activity', isVisible: true },
        ]
    },
    activeSession: null,
    isSyncingGym: false,
    loading: true
}

const MULTIPLIERS: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
}

import { getNextProgressiveMilestone } from '../utils/milestoneGenerator'

export function WellbeingProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<WellbeingState>(INITIAL_STATE)
    const [rotaOverrides, setRotaOverrides] = useState<RotaOverride[]>([])

    // Load Initial Data
    useEffect(() => {
        const loadInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('wellbeing_state')
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved)
                        setState(prev => ({ ...prev, ...parsed, loading: user ? prev.loading : false }))
                    } catch (e) {
                        console.error('Failed to parse local wellbeing state:', e)
                    }
                }
            }

            if (user) {
                try {
                    const [profileRes, dataRes, libraryRes, comboContentsRes, fridgeRes, rotaRes] = await Promise.all([
                        supabase.from('wellbeing_profiles').select('*').eq('user_id', user.id).single(),
                        supabase.from('wellbeing_data').select('*').eq('user_id', user.id).single(),
                        supabase.from('nutrition_library').select('*').eq('user_id', user.id),
                        supabase.from('nutrition_combo_contents').select('*'),
                        supabase.from('nutrition_fridge').select('*').eq('user_id', user.id),
                        supabase.from('fin_rota_overrides').select('*').eq('profile', 'Personal')
                    ])

                    const comboMap = (comboContentsRes.data || []).reduce((acc: any, curr) => {
                        if (!acc[curr.combo_id]) acc[curr.combo_id] = []
                        acc[curr.combo_id].push({
                            id: curr.id,
                            comboId: curr.combo_id,
                            itemId: curr.item_id,
                            quantity: curr.quantity
                        })
                        return acc
                    }, {})

                    const baseLibrary = libraryRes.data?.map(m => ({
                        id: m.id,
                        name: m.name,
                        type: m.type || 'snack',
                        emoji: m.emoji,
                        calories: m.calories,
                        protein: m.protein,
                        carbs: m.carbs,
                        fat: m.fat,
                        ingredients: m.ingredients,
                        isCombo: m.is_combo,
                        contents: comboMap[m.id] || []
                    })) || []

                    const library = baseLibrary.map(m => {
                        if (m.isCombo && m.contents) {
                            return {
                                ...m,
                                contents: m.contents.map((c: any) => ({
                                    ...c,
                                    meal: baseLibrary.find(l => l.id === c.itemId)
                                }))
                            }
                        }
                        return m
                    })

                    const newState: Partial<WellbeingState> = {
                        library,
                        fridge: fridgeRes.data?.map(f => ({
                            id: f.id,
                            mealId: f.meal_id,
                            portions: f.portions,
                            prepDate: f.prep_date
                        })) || []
                    }

                    if (profileRes.data) {
                        newState.profile = {
                            age: profileRes.data.age,
                            weight: profileRes.data.weight,
                            height: profileRes.data.height,
                            gender: profileRes.data.gender,
                            activityLevel: profileRes.data.activity_level,
                            goal: profileRes.data.goal,
                            goalWeight: profileRes.data.goal_weight,
                            updatedAt: profileRes.data.updated_at
                        }
                    }

                    if (dataRes.data) {
                        newState.weightHistory = dataRes.data.weight_history || []
                        newState.routines = dataRes.data.routines || []
                        newState.activeRoutineId = dataRes.data.active_routine_id || null
                        newState.workoutLogs = dataRes.data.workout_logs || []
                        newState.gymStats = dataRes.data.gym_stats || INITIAL_STATE.gymStats
                        
                        // Resolve emojis for meals from the library
                        newState.mealLogs = (dataRes.data.meal_logs || []).map((meal: any) => {
                            if (meal.isCombo && meal.contents) {
                                return {
                                    ...meal,
                                    contents: meal.contents.map((c: any) => ({
                                        ...c,
                                        meal: library.find(l => l.id === c.itemId) || c.meal
                                    }))
                                }
                            }
                            return meal
                        })

                        newState.savedRecipes = dataRes.data.saved_recipes || []
                        newState.moodLogs = dataRes.data.mood_logs || []
                        newState.reflections = dataRes.data.reflections || []
                        newState.milestones = dataRes.data.milestones || []
                        if (dataRes.data.dashboard_layout) {
                            newState.dashboardLayout = dataRes.data.dashboard_layout
                        }
                        if (dataRes.data.active_session) {
                            newState.activeSession = dataRes.data.active_session
                        }
                    }

                    if (rotaRes.data) {
                        setRotaOverrides(rotaRes.data)
                    }

                    setState(prev => {
                        const updatedState = { ...prev, ...newState, loading: false }
                        if (updatedState.routines.length === 0) {
                            updatedState.routines = getMonthlyRoutine(new Date())
                            updatedState.activeRoutineId = updatedState.routines[0].id
                        }
                        return updatedState
                    })
                } catch (e) {
                    console.error('Failed to sync with Supabase:', e)
                    setState(prev => ({ ...prev, loading: false }))
                }
            } else {
                setState(prev => ({ ...prev, loading: false }))
            }
        }
        loadInitialData()
    }, [])

    useEffect(() => {
        if (!state.loading) {
            localStorage.setItem('wellbeing_state', JSON.stringify(state))
        }
    }, [state])

    const persistData = async (data: Partial<WellbeingState>) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        try {
            if (data.profile) {
                await supabase.from('wellbeing_profiles').upsert({
                    user_id: user.id,
                    age: data.profile.age,
                    weight: data.profile.weight,
                    height: data.profile.height,
                    gender: data.profile.gender,
                    activity_level: data.profile.activityLevel,
                    goal: data.profile.goal,
                    goal_weight: data.profile.goalWeight,
                    updated_at: new Date().toISOString()
                })
            }
            if (data.weightHistory || data.routines || data.activeRoutineId !== undefined || data.workoutLogs || data.gymStats || data.mealLogs || data.savedRecipes || data.moodLogs || data.reflections || data.milestones || data.dashboardLayout) {
                const update: any = { user_id: user.id, updated_at: new Date().toISOString() }
                if (data.weightHistory) update.weight_history = data.weightHistory
                if (data.routines) update.routines = data.routines
                if (data.activeRoutineId !== undefined) update.active_routine_id = data.activeRoutineId
                if (data.workoutLogs) update.workout_logs = data.workoutLogs
                if (data.gymStats) update.gym_stats = data.gymStats
                if (data.mealLogs) update.meal_logs = data.mealLogs
                if (data.savedRecipes) update.saved_recipes = data.savedRecipes
                if (data.moodLogs) update.mood_logs = data.moodLogs
                if (data.reflections) update.reflections = data.reflections
                if (data.milestones) update.milestones = data.milestones
                if (data.dashboardLayout) update.dashboard_layout = data.dashboardLayout
                if (data.activeSession !== undefined) update.active_session = data.activeSession
                await supabase.from('wellbeing_data').upsert(update)
            }
        } catch (e) { console.error('Persistence error:', e) }
    }

    const calculateTDEE = (p: WellbeingProfile) => {
        const activeWeight = p.goalWeight || p.weight
        const bmr = p.gender === 'male' 
            ? (10 * activeWeight) + (6.25 * p.height) - (5 * p.age) + 5
            : (10 * activeWeight) + (6.25 * p.height) - (5 * p.age) - 161
        return Math.round(bmr * (MULTIPLIERS[p.activityLevel] || MULTIPLIERS.sedentary))
    }

    const macros = useMemo(() => {
        if (!state.profile) return { calories: 0, protein: 0, fat: 0, carbs: 0 }
        const tdee = calculateTDEE(state.profile)
        let calories = tdee
        if (state.profile.goal === 'bulk') calories += 300
        if (state.profile.goal === 'cut') calories -= 500
        return {
            calories,
            protein: Math.round((calories * 0.3) / 4),
            fat: Math.round((calories * 0.25) / 9),
            carbs: Math.round((calories * 0.45) / 4)
        }
    }, [state.profile])

    const dailyNutrition = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]
        const todayMeals = state.mealLogs.filter(m => m.date === today)
        return todayMeals.reduce((acc, meal) => ({
            calories: acc.calories + meal.calories,
            protein: acc.protein + meal.protein,
            fat: acc.fat + meal.fat,
            carbs: acc.carbs + meal.carbs
        }), { calories: 0, protein: 0, fat: 0, carbs: 0 })
    }, [state.mealLogs])

    const gymRecommendation = useMemo(() => {
        return getGymRecommendation(new Date(), rotaOverrides, state.workoutLogs)
    }, [rotaOverrides, state.workoutLogs])

    const updateProfile = async (profile: WellbeingProfile) => {
        setState(prev => ({ ...prev, profile }))
        await persistData({ profile })
    }

    const logWeight = async (weight: number) => {
        const date = new Date().toISOString().split('T')[0]
        const weightHistory = [...state.weightHistory.filter(w => w.date !== date), { date, weight }]
        const profile = state.profile ? { ...state.profile, weight } : null
        setState(prev => ({ ...prev, weightHistory, profile }))
        await persistData({ weightHistory, profile: profile || undefined })
    }

    const logWorkout = async (log: WorkoutLog) => {
        // Ascribe to gym visit if possible
        const today = new Date().toISOString().split('T')[0]
        const todayVisit = state.gymStats.visitHistory?.find(v => v.date === today)
        
        const finalLog = {
            ...log,
            gymVisitId: todayVisit?.id || log.gymVisitId
        }
        
        let updatedMilestones = [...state.milestones]
        let milestonesChanged = false

        // Progression Engine: Check if any logged sets hit active milestone targets
        finalLog.exercises.forEach(exLog => {
            const bestSetWeight = Math.max(...exLog.sets.map(s => s.weight || 0))
            
            updatedMilestones = updatedMilestones.map(m => {
                // If it's a lift milestone for this exercise (fuzzy name matching for now)
                if (m.type === 'lift' && !m.completed && m.title.toLowerCase().includes(exLog.exerciseId.toLowerCase())) {
                    if (bestSetWeight > m.currentValue) {
                        m.currentValue = bestSetWeight
                        milestonesChanged = true
                    }
                    
                    if (m.currentValue >= m.targetValue) {
                        m.completed = true
                        m.dateCompleted = new Date().toISOString()
                        milestonesChanged = true
                        
                        // Push next logical milestone immediately
                        const nextM = getNextProgressiveMilestone(m)
                        updatedMilestones.push(nextM)
                    }
                }
                return m
            })
        })
        
        const workoutLogs = [...state.workoutLogs, finalLog]
        setState(prev => ({ 
            ...prev, 
            workoutLogs, 
            milestones: milestonesChanged ? updatedMilestones : prev.milestones 
        }))
        
        const persistenceData: any = { workoutLogs }
        if (milestonesChanged) persistenceData.milestones = updatedMilestones
        await persistData(persistenceData)
    }

    const bulkAddMilestones = async (newMilestones: Milestone[]) => {
        const milestones = [...state.milestones, ...newMilestones]
        setState(prev => ({ ...prev, milestones }))
        await persistData({ milestones })
    }

    const addRoutine = async (routine: WorkoutRoutine) => {
        const routines = [...state.routines, routine]
        const activeRoutineId = state.activeRoutineId || routine.id
        setState(prev => ({ ...prev, routines, activeRoutineId }))
        await persistData({ routines, activeRoutineId })
    }

    const updateRoutine = async (id: string, updates: Partial<WorkoutRoutine>) => {
        const routines = state.routines.map(r => r.id === id ? { ...r, ...updates } : r)
        setState(prev => ({ ...prev, routines }))
        await persistData({ routines })
    }

    const deleteRoutine = async (id: string) => {
        const routines = state.routines.filter(r => r.id !== id)
        const activeRoutineId = state.activeRoutineId === id 
            ? (routines.length > 0 ? routines[0].id : null)
            : state.activeRoutineId
        setState(prev => ({ ...prev, routines, activeRoutineId }))
        await persistData({ routines, activeRoutineId })
    }

    const setActiveRoutineId = async (id: string) => {
        setState(prev => ({ ...prev, activeRoutineId: id }))
        await persistData({ activeRoutineId: id })
    }

    const updateGymStats = async (stats: Partial<TheGymGroupStats>) => {
        const gymStats = { ...state.gymStats, ...stats }
        setState(prev => ({ ...prev, gymStats }))
        await persistData({ gymStats })
    }

    const logMeal = async (meal: Omit<MealLog, 'id'>) => {
        const newMeal: MealLog = {
            ...meal,
            id: Math.random().toString(36).substring(2, 9),
            date: new Date().toISOString().split('T')[0]
        }
        const mealLogs = [...state.mealLogs, newMeal]
        setState(prev => ({ ...prev, mealLogs }))
        await persistData({ mealLogs })
    }

    const deleteMealLog = async (id: string) => {
        const mealLogs = state.mealLogs.filter(m => m.id !== id)
        setState(prev => ({ ...prev, mealLogs }))
        await persistData({ mealLogs })
    }

    const updateMealLog = async (id: string, updates: Partial<MealLog>) => {
        const mealLogs = state.mealLogs.map(m => m.id === id ? { ...m, ...updates } : m)
        setState(prev => ({ ...prev, mealLogs }))
        await persistData({ mealLogs })
    }

    const saveRecipe = async (recipeId: string) => {
        const savedRecipes = state.savedRecipes.includes(recipeId) ? state.savedRecipes : [...state.savedRecipes, recipeId]
        setState(prev => ({ ...prev, savedRecipes }))
        await persistData({ savedRecipes })
    }

    const logMood = async (value: MoodValue, note?: string) => {
        const newEntry: MoodEntry = {
            id: Math.random().toString(36).substring(2, 9),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value,
            note
        }
        const moodLogs = [newEntry, ...state.moodLogs].slice(0, 100)
        setState(prev => ({ ...prev, moodLogs }))
        await persistData({ moodLogs })
    }

    const saveReflection = async (content: string) => {
        const newReflection: Reflection = {
            id: Math.random().toString(36).substring(2, 9),
            date: new Date().toISOString().split('T')[0],
            content
        }
        const reflections = [newReflection, ...state.reflections].slice(0, 50)
        setState(prev => ({ ...prev, reflections }))
        await persistData({ reflections })
    }

    const updateLayout = async (dashboardLayout: DashboardLayout) => {
        setState(prev => ({ ...prev, dashboardLayout }))
        await persistData({ dashboardLayout })
    }

    const addMilestone = async (milestone: Omit<Milestone, 'id' | 'completed'>) => {
        const newMilestone: Milestone = {
            ...milestone,
            id: Math.random().toString(36).substring(2, 9),
            completed: false
        }
        const milestones = [...state.milestones, newMilestone]
        setState(prev => ({ ...prev, milestones }))
        await persistData({ milestones })
    }

    const updateMilestone = async (id: string, updates: Partial<Milestone>) => {
        const milestones = state.milestones.map(m => m.id === id ? { ...m, ...updates } : m)
        setState(prev => ({ ...prev, milestones }))
        await persistData({ milestones })
    }

    const deleteMilestone = async (id: string) => {
        const milestones = state.milestones.filter(m => m.id !== id)
        setState(prev => ({ ...prev, milestones }))
        await persistData({ milestones })
    }

    const addMealToLibrary = async (meal: Omit<LibraryMeal, 'id'>) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data, error } = await supabase.from('nutrition_library').insert({
            user_id: user.id,
            ...meal,
            calories: Math.round(Number(meal.calories) || 0),
            protein: Math.round(Number(meal.protein) || 0),
            carbs: Math.round(Number(meal.carbs) || 0),
            fat: Math.round(Number(meal.fat) || 0)
        }).select().single()
        if (!error && data) {
            setState(prev => ({ ...prev, library: [...prev.library, data] }))
        }
    }

    const removeMealFromLibrary = async (id: string) => {
        await supabase.from('nutrition_library').delete().eq('id', id)
        setState(prev => ({ ...prev, library: prev.library.filter(m => m.id !== id) }))
    }

    const updateLibraryMeal = async (id: string, updates: Partial<LibraryMeal>) => {
        await supabase.from('nutrition_library').update(updates).eq('id', id)
        setState(prev => ({ ...prev, library: prev.library.map(m => m.id === id ? { ...m, ...updates } : m) }))
    }

    const createCombo = async (name: string, items: { id: string, quantity: number }[], type: ('dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack')[]) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        try {
            // Calculate total macros
            let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0
            items.forEach(item => {
                const libraryItem = state.library.find(l => l.id === item.id)
                if (libraryItem) {
                    totalCalories += libraryItem.calories * item.quantity
                    totalProtein += libraryItem.protein * item.quantity
                    totalCarbs += libraryItem.carbs * item.quantity
                    totalFat += libraryItem.fat * item.quantity
                }
            })

            // Create the library entry for the combo
            const { data: comboData, error: comboError } = await supabase.from('nutrition_library').insert({
                user_id: user.id,
                name,
                type,
                calories: Math.round(totalCalories),
                protein: Math.round(totalProtein),
                carbs: Math.round(totalCarbs),
                fat: Math.round(totalFat),
                is_combo: true,
                emoji: '📦'
            }).select().single()

            if (comboError || !comboData) {
                console.error('Error creating combo header:', comboError)
                throw comboError || new Error('Failed to create combo header')
            }

            // Create combo contents
            const contentsToInsert = items.map(item => ({
                combo_id: comboData.id,
                item_id: item.id,
                quantity: item.quantity
            }))

            const { data: contentsData, error: contentsError } = await supabase.from('nutrition_combo_contents').insert(contentsToInsert).select()

            if (contentsError) {
                console.error('Error creating combo contents:', contentsError)
                // Cleanup header if contents fail
                await supabase.from('nutrition_library').delete().eq('id', comboData.id)
                throw contentsError
            }

            // Update local state
            const newCombo: LibraryMeal = {
                id: comboData.id,
                name: comboData.name,
                type: comboData.type,
                emoji: comboData.emoji,
                calories: comboData.calories,
                protein: comboData.protein,
                carbs: comboData.carbs,
                fat: comboData.fat,
                ingredients: comboData.ingredients || [],
                isCombo: true,
                contents: (contentsData || []).map(c => ({
                    id: c.id,
                    comboId: c.combo_id,
                    itemId: c.item_id,
                    quantity: c.quantity,
                    meal: state.library.find(l => l.id === c.item_id)
                }))
            }

            setState(prev => ({ ...prev, library: [...prev.library, newCombo] }))
            console.log('Combo created successfully:', newCombo)
        } catch (e) {
            console.error('createCombo failed:', e)
            alert('Failed to save combo. Please ensure database migrations were applied.')
            throw e
        }
    }

    const addPrepToFridge = async (mealId: string, portions: number) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data, error } = await supabase.from('nutrition_fridge').insert({ user_id: user.id, meal_id: mealId, portions }).select().single()
        if (!error && data) {
            setState(prev => ({ ...prev, fridge: [...prev.fridge, { id: data.id, mealId: data.meal_id, portions: data.portions, prepDate: data.prep_date }] }))
        }
    }

    const updateFridgePortions = async (fridgeId: string, portions: number) => {
        if (portions <= 0) {
            await removeFromFridge(fridgeId)
            return
        }
        const { error } = await supabase.from('nutrition_fridge').update({ portions }).eq('id', fridgeId)
        if (!error) {
            setState(prev => ({ ...prev, fridge: prev.fridge.map(f => f.id === fridgeId ? { ...f, portions } : f) }))
        }
    }

    const consumeFromFridge = async (fridgeId: string, mealType?: 'dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
        const item = state.fridge.find(f => f.id === fridgeId)
        if (!item || item.portions <= 0) return
        const meal = state.library.find(m => m.id === item.mealId)
        if (!meal) return
        if (item.portions === 1) {
            await supabase.from('nutrition_fridge').delete().eq('id', fridgeId)
            setState(prev => ({ ...prev, fridge: prev.fridge.filter(f => f.id !== fridgeId) }))
        } else {
            await supabase.from('nutrition_fridge').update({ portions: item.portions - 1 }).eq('id', fridgeId)
            setState(prev => ({ ...prev, fridge: prev.fridge.map(f => f.id === fridgeId ? { ...f, portions: f.portions - 1 } : f) }))
        }
        await logMeal({
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: mealType || (Array.isArray(meal.type) ? (meal.type[0] || 'snack') : (meal.type as any)),
            name: meal.name,
            emoji: meal.emoji || '🍽️',
            calories: meal.calories,
            protein: meal.protein,
            fat: meal.fat,
            carbs: meal.carbs,
            isCombo: meal.isCombo,
            contents: meal.contents
        })
    }

    const removeFromFridge = async (fridgeId: string) => {
        await supabase.from('nutrition_fridge').delete().eq('id', fridgeId)
        setState(prev => ({ ...prev, fridge: prev.fridge.filter(f => f.id !== fridgeId) }))
    }

    const syncGymData = async () => {
        const auth = typeof window !== 'undefined' ? localStorage.getItem('gym_auth') : null
        if (!auth || !state.gymStats.isIntegrated) return
        
        setState(prev => ({ ...prev, isSyncingGym: true }))
        
        try {
            const { uuid, cookie, memberId, accessToken } = JSON.parse(auth)

            // Fetch busyness for ALL accessible gym locations in parallel
            const locationIds = state.gymStats.gymLocationIds?.length
                ? state.gymStats.gymLocationIds
                : state.gymStats.gymLocationId
                    ? [state.gymStats.gymLocationId]
                    : []

            const [busynessResults, historyRes] = await Promise.allSettled([
                Promise.allSettled(
                    locationIds.map(locId =>
                        GymService.getBusyness(uuid, locId, cookie, memberId, accessToken)
                            .then(data => ({ locId, data }))
                            .catch(() => ({ locId, data: null }))
                    )
                ),
                GymService.getHistory(uuid, cookie)
            ])

            // Build allBusyness map
            let allBusyness: Record<string, GymBusyness> = state.gymStats.allBusyness || {}
            let primaryBusyness = state.gymStats.busyness
            const primaryId = state.gymStats.gymLocationId

            if (busynessResults.status === 'fulfilled') {
                busynessResults.value.forEach(result => {
                    if (result.status === 'fulfilled' && result.value.data) {
                        allBusyness = { ...allBusyness, [result.value.locId]: result.value.data }
                        if (result.value.locId === primaryId) {
                            primaryBusyness = result.value.data
                        }
                    }
                })
                // Fallback: use first successful result as primary
                if (!primaryBusyness) {
                    const first = Object.values(allBusyness)[0]
                    if (first) primaryBusyness = first
                }
            }

            let visitHistory = state.gymStats.visitHistory || []
            if (historyRes.status === 'fulfilled') {
                const rawData = historyRes.value
                const checks = Array.isArray(rawData) ? rawData : (rawData.checkIns || [])
                visitHistory = checks.map((v: any) => {
                    const dateStr = v.checkInDate || ''
                    const [datePart, timePart] = dateStr.split('T')
                    return {
                        id: dateStr, // checkinId is null, use timestamp as ID
                        date: datePart,
                        time: timePart || '',
                        locationName: v.gymLocationName
                    }
                })
            }

            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            const weekAgoStr = weekAgo.toISOString().split('T')[0]
            const weeklyVisits = visitHistory.filter(v => v.date >= weekAgoStr).length

            const gymStats = { 
                ...state.gymStats, 
                busyness: primaryBusyness || state.gymStats.busyness,
                allBusyness,
                visitHistory, 
                weeklyVisits,
                totalVisits: visitHistory.length,
                lastVisit: visitHistory[0] || null,
                lastSyncTime: new Date().toISOString()
            }
            
            setState(prev => ({ ...prev, gymStats, isSyncingGym: false }))
            await persistData({ gymStats })
        } catch (e) { 
            console.error('Gym sync failed:', e) 
            setState(prev => ({ ...prev, isSyncingGym: false }))
        }
    }

    // Periodic Resync (Every 30 mins)
    useEffect(() => {
        if (state.gymStats.isIntegrated && !state.loading) {
            const interval = setInterval(() => {
                syncGymData()
            }, 30 * 60 * 1000)
            return () => clearInterval(interval)
        }
    }, [state.gymStats.isIntegrated, state.loading])

    const connectGym = async (username: string, pin: string, locationId: string, locationIds?: string[]) => {
        const data = await GymService.login(username, pin)
        localStorage.setItem('gym_auth', JSON.stringify({ uuid: data.uuid, cookie: data.cookie, member_id: data.memberId, accessToken: data.accessToken }))
        const primaryId = data.homeGymId || locationId
        const allIds = locationIds?.length ? locationIds : [primaryId]
        const gymStats = { 
            ...state.gymStats, 
            isIntegrated: true, 
            gymLocationId: primaryId, 
            gymLocationIds: allIds,
            userUuid: data.uuid, 
            memberId: data.memberId 
        }
        setState(prev => ({ ...prev, gymStats }))
        await persistData({ gymStats })
    }

    const disconnectGym = async () => {
        localStorage.removeItem('gym_auth')
        const gymStats = { 
            ...state.gymStats, 
            isIntegrated: false, 
            gymLocationId: undefined, 
            gymLocationIds: [],
            gymLocationNames: {},
            allBusyness: undefined,
            busyness: undefined,
            userUuid: undefined, 
            memberId: undefined,
            accessToken: undefined
        }
        setState(prev => ({ ...prev, gymStats }))
        await persistData({ gymStats })
    }

    const startSession = (routineId: string) => {
        const routine = state.routines.find(r => r.id === routineId)
        if (!routine) return

        const session: WorkoutSession = {
            id: Math.random().toString(36).substring(2, 9),
            date: new Date().toISOString().split('T')[0],
            routineId: routine.id,
            startTime: new Date().toISOString(),
            isPaused: false,
            completedExerciseIds: [],
            skippedExerciseIds: [],
            exercises: routine.exercises.map(ex => {
                const target = getOverloadTarget(ex, state.profile, state.workoutLogs)
                return {
                    exerciseId: ex.id,
                    sets: Array(target.suggestedSets).fill(null).map(() => ({
                        reps: target.suggestedReps,
                        weight: target.suggestedWeight
                    }))
                }
            })
        }

        setState(prev => ({ ...prev, activeSession: session }))
        persistData({ activeSession: session })
    }

    const updateSessionSet = (exerciseId: string, setIndex: number, updates: Partial<WorkoutSet>) => {
        if (!state.activeSession) return
        
        const activeSession: WorkoutSession = { 
            ...state.activeSession,
            exercises: state.activeSession.exercises.map(ex => 
                ex.exerciseId === exerciseId 
                    ? { ...ex, sets: ex.sets.map((s, i) => i === setIndex ? { ...s, ...updates } : s) }
                    : ex
            )
        }
        
        setState(prev => ({ ...prev, activeSession }))
    }

    const finishSession = async () => {
        if (!state.activeSession) return

        const duration = Math.round((new Date().getTime() - new Date(state.activeSession.startTime).getTime()) / 60000)
        
        // Finalize the log
        const log: WorkoutLog = {
            id: state.activeSession.id,
            date: state.activeSession.date,
            routineId: state.activeSession.routineId,
            exercises: state.activeSession.exercises,
            duration
        }

        await logWorkout(log)
        setState(prev => ({ ...prev, activeSession: null }))
        persistData({ activeSession: null })
    }

    const cancelSession = () => {
        setState(prev => ({ ...prev, activeSession: null }))
        persistData({ activeSession: null })
    }

    const value = useMemo(() => ({
        ...state,
        updateProfile,
        logWeight,
        calculateTDEE,
        logWorkout,
        connectGym,
        disconnectGym,
        syncGymData,
        addRoutine,
        updateGymStats,
        logMeal,
        updateMealLog,
        deleteMealLog,
        saveRecipe,
        logMood,
        saveReflection,
        addMilestone,
        bulkAddMilestones,
        updateMilestone,
        deleteMilestone,
        updateLayout,
        addMealToLibrary,
        removeMealFromLibrary,
        updateLibraryMeal,
        createCombo,
        addPrepToFridge,
        updateFridgePortions,
        consumeFromFridge,
        removeFromFridge,
        startSession,
        updateSessionSet,
        finishSession,
        cancelSession,
        setActiveRoutineId,
        updateRoutine,
        deleteRoutine,
        macros,
        dailyNutrition,
        gymRecommendation,
        isSyncingGym: state.isSyncingGym
    }), [state, macros, dailyNutrition, gymRecommendation])

    return <WellbeingContext.Provider value={value}>{children}</WellbeingContext.Provider>
}

export function useWellbeing() {
    const context = useContext(WellbeingContext)
    if (context === undefined) throw new Error('useWellbeing must be used within a WellbeingProvider')
    return context
}
