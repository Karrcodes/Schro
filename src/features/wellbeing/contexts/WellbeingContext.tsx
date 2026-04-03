'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import type { WellbeingProfile, MetricEntry, MacroTargets, WellbeingState, WellbeingGoal, ActivityLevel, WorkoutRoutine, WorkoutLog, WorkoutSession, WorkoutSet, ExerciseLog, TheGymGroupStats, MealLog, MoodValue, MoodEntry, Reflection, GymBusyness, GymVisit, DashboardLayout, LibraryMeal, FridgeItem, Milestone, Exercise } from '../types'
import { GymService } from '../services/gymService'
import { supabase } from '@/lib/supabase'
import { getGymRecommendation } from '../utils/fitness-utils'
import { getMonthlyRoutine } from '../utils/routine-generator'
import { getOverloadTarget } from '../utils/progressiveOverload'
import { EXERCISES } from '../constants/exercises'
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
    logMood: (value: MoodValue, note?: string, activities?: string[], date?: string) => Promise<void>
    deleteMood: (id: string) => Promise<void>
    clearMoodsByDate: (date: string) => Promise<void>
    saveReflection: (content: string, id?: string) => Promise<void>
    deleteReflection: (id: string) => Promise<void>
    updateLayout: (layout: DashboardLayout) => Promise<void>
    addMealToLibrary: (meal: Omit<LibraryMeal, 'id'>) => Promise<void>
    removeMealFromLibrary: (id: string) => Promise<void>
    updateLibraryMeal: (id: string, updates: Partial<LibraryMeal>) => Promise<void>
    createCombo: (name: string, itemIds: { id: string, quantity: number }[], type: ('dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack')[]) => Promise<void>
    updateCombo: (id: string, name: string, itemIds: { id: string, quantity: number }[], type: ('dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack')[]) => Promise<void>
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
    isGymModalOpen: boolean
    setIsGymModalOpen: (open: boolean) => void
    requiresGymReauth: boolean
    activeSession: WorkoutSession | null
    startSession: (routineId: string) => void
    startDynamicSession: (muscleGroups: string[], exerciseCount: number) => void
    updateSessionSet: (exerciseId: string, setIndex: number, updates: Partial<WorkoutSet>) => void
    togglePauseSession: () => void
    finishSession: () => Promise<void>
    cancelSession: () => void
    swapSessionExercise: (oldId: string, newExercise: Exercise) => void
    randomizeSessionExercise: (id: string) => void
    setActiveRoutineId: (id: string) => Promise<void>
    updateRoutine: (id: string, updates: Partial<WorkoutRoutine>) => Promise<void>
    deleteRoutine: (id: string) => Promise<void>
    deleteWorkoutLog: (id: string) => Promise<void>
    clearWorkoutLogs: () => Promise<void>
    bulkAddWorkoutLogs: (logs: WorkoutLog[]) => Promise<void>
    rotaOverrides: RotaOverride[]
    setGymOverride: (date: string, type: 'force' | 'skip' | null) => Promise<void>
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
    isGymModalOpen: false,
    requiresGymReauth: false,
    loading: true,
    gymOverrides: {}
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
                        const auth = localStorage.getItem('gym_auth')
                        const requiresGymReauth = parsed.gymStats?.isIntegrated && !auth
                        setState(prev => ({ 
                            ...prev, 
                            ...parsed, 
                            requiresGymReauth,
                            loading: user ? prev.loading : false 
                        }))
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
                        supabase.from('fin_rota_overrides').select('*').eq('profile', 'personal')
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
                        
                        // Check if we need to re-authenticate across devices
                        if (newState.gymStats?.isIntegrated) {
                            const hasDbAuth = !!newState.gymStats.cookie && !!newState.gymStats.userUuid;
                            const localAuth = typeof window !== 'undefined' ? localStorage.getItem('gym_auth') : null
                            if (!hasDbAuth && !localAuth) {
                                newState.requiresGymReauth = true
                            }
                        }
                        
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
                        
                        // Patch existing routines to ensure isBodyweight flag is set for known exercises
                        const bodyweightKeywords = ['pullups', 'pushups', 'dips', 'plank', 'squats (bodyweight)']
                        updatedState.routines = updatedState.routines.map(routine => ({
                            ...routine,
                            exercises: routine.exercises.map(ex => ({
                                ...ex,
                                isBodyweight: ex.isBodyweight || bodyweightKeywords.some(kw => ex.name.toLowerCase().includes(kw))
                            }))
                        }))

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

    const isLogEmpty = (log: WorkoutLog | WorkoutSession) => {
        const volume = log.exercises.reduce((acc: number, ex) => 
            acc + ex.sets.reduce((sacc: number, set) => sacc + (set.weight * (set.reps || 0)), 0), 0)
        return volume === 0
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
        return getGymRecommendation(new Date(), rotaOverrides, state.workoutLogs, state.gymOverrides)
    }, [rotaOverrides, state.workoutLogs, state.gymOverrides])

    const setGymOverride = async (date: string, type: 'force' | 'skip' | null) => {
        const newOverrides = { ...(state.gymOverrides || {}) }
        if (type === null) {
            delete newOverrides[date]
        } else {
            newOverrides[date] = type
        }
        setState(prev => ({ ...prev, gymOverrides: newOverrides }))
        await persistData({ gymOverrides: newOverrides })
    }

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
        const today = new Date().toISOString().split('T')[0]
        
        // Calculate all updates outside setState for reliable persistence
        const todayVisit = state.gymStats.visitHistory?.find(v => v.date === today)
        const finalLog = {
            ...log,
            gymVisitId: todayVisit?.id || log.gymVisitId
        }

        let milestonesChanged = false
        const updatedMilestones = state.milestones.map(m => {
            const exLog = finalLog.exercises.find(e => m.type === 'lift' && m.title.toLowerCase().includes(e.exerciseId.toLowerCase()))
            if (exLog && !m.completed) {
                const bestSetWeight = Math.max(...exLog.sets.map(s => s.weight || 0))
                if (bestSetWeight > m.currentValue) {
                    m.currentValue = bestSetWeight
                    milestonesChanged = true
                }
                if (m.currentValue >= m.targetValue) {
                    m.completed = true
                    m.dateCompleted = new Date().toISOString()
                    milestonesChanged = true
                }
            }
            return m
        })

        // Progressive milestone generation
        if (milestonesChanged) {
            const newMilestonesToAdd: Milestone[] = []
            updatedMilestones.forEach(m => {
                if (m.completed && !state.milestones.find(sm => sm.parentId === m.id)) {
                    newMilestonesToAdd.push(getNextProgressiveMilestone(m))
                }
            })
            updatedMilestones.push(...newMilestonesToAdd)
        }

        // Refined Deduplication: Allow multiple manual sessions, but prune baselines
        let workoutLogs = state.workoutLogs.filter(l => l.id !== finalLog.id) // Remove self if update
        const logIsBaseline = finalLog.note?.includes('baseline')
        
        if (!logIsBaseline) {
            // If adding a manual log, remove any baseline or empty logs for this date
            workoutLogs = workoutLogs.filter(l => !(l.date === finalLog.date && (l.note?.includes('baseline') || isLogEmpty(l))))
        }
        workoutLogs.push(finalLog)
        workoutLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setState(prev => ({ 
            ...prev, 
            workoutLogs, 
            milestones: updatedMilestones 
        }))

        // Persistence happens outside setState for atomicity
        const persistenceData: any = { workoutLogs }
        if (milestonesChanged) persistenceData.milestones = updatedMilestones
        await persistData(persistenceData)
    }

    const bulkAddWorkoutLogs = async (logs: WorkoutLog[]) => {
        const today = new Date().toISOString().split('T')[0]
        const todayVisit = state.gymStats.visitHistory?.find(v => v.date === today)
        
        const finalLogs = logs.map(log => ({
            ...log,
            gymVisitId: todayVisit?.id || log.gymVisitId
        }))
        
        const workoutLogs = [...state.workoutLogs, ...finalLogs]
        setState(prev => ({ ...prev, workoutLogs }))
        await persistData({ workoutLogs })
    }

    const clearWorkoutLogs = async () => {
        setState(prev => ({ ...prev, workoutLogs: [] }))
        await persistData({ workoutLogs: [] })
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

    const logMood = async (value: MoodValue, note?: string, activities?: string[], date?: string) => {
        const targetDate = date || new Date().toISOString().split('T')[0]
        const newEntry: MoodEntry = {
            id: Math.random().toString(36).substring(2, 9),
            date: targetDate,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value,
            note,
            activities
        }
        
        // Filter out existing mood for the same day if we're logging fresh
        const filteredLogs = state.moodLogs.filter(m => m.date !== targetDate)
        const moodLogs = [newEntry, ...filteredLogs].slice(0, 100)
        
        setState(prev => ({ ...prev, moodLogs }))
        await persistData({ moodLogs })
    }

    const deleteMood = async (id: string) => {
        const moodLogs = state.moodLogs.filter(m => m.id !== id)
        setState(prev => ({ ...prev, moodLogs }))
        await persistData({ moodLogs })
    }

    const clearMoodsByDate = async (date: string) => {
        const moodLogs = state.moodLogs.filter(m => m.date !== date)
        setState(prev => ({ ...prev, moodLogs }))
        await persistData({ moodLogs })
    }

    const saveReflection = async (content: string, id?: string) => {
        let reflections = [...state.reflections]
        const existingIndex = id ? reflections.findIndex(r => r.id === id) : -1

        if (existingIndex > -1) {
            reflections[existingIndex] = {
                ...reflections[existingIndex],
                content
            }
        } else {
            const newReflection: Reflection = {
                id: Math.random().toString(36).substring(2, 9),
                date: new Date().toISOString().split('T')[0],
                content
            }
            reflections = [newReflection, ...reflections].slice(0, 50)
        }

        setState(prev => ({ ...prev, reflections }))
        await persistData({ reflections })
    }

    const deleteReflection = async (id: string) => {
        const reflections = state.reflections.filter(r => r.id !== id)
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
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Ensure numeric fields are rounded before updating
        const updatedFields: Partial<LibraryMeal> = { ...updates }
        if (updatedFields.calories !== undefined) updatedFields.calories = Math.round(Number(updatedFields.calories) || 0)
        if (updatedFields.protein !== undefined) updatedFields.protein = Math.round(Number(updatedFields.protein) || 0)
        if (updatedFields.carbs !== undefined) updatedFields.carbs = Math.round(Number(updatedFields.carbs) || 0)
        if (updatedFields.fat !== undefined) updatedFields.fat = Math.round(Number(updatedFields.fat) || 0)

        const { error } = await supabase.from('nutrition_library').update(updatedFields).eq('id', id)
        if (!error) {
            setState(prev => ({ ...prev, library: prev.library.map(m => m.id === id ? { ...m, ...updatedFields } : m) }))
        } else {
            console.error('Error updating library meal:', error)
            throw error
        }
    }

    const updateCombo = async (id: string, name: string, items: { id: string, quantity: number }[], type: ('dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack')[]) => {
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

            // 1. Update the library header
            const { error: comboError } = await supabase.from('nutrition_library').update({
                name,
                type,
                calories: Math.round(totalCalories),
                protein: Math.round(totalProtein),
                carbs: Math.round(totalCarbs),
                fat: Math.round(totalFat),
            }).eq('id', id)

            if (comboError) throw comboError

            // 2. Clear old contents
            await supabase.from('nutrition_combo_contents').delete().eq('combo_id', id)

            // 3. Insert new contents
            const contentsToInsert = items.map(item => ({
                combo_id: id,
                item_id: item.id,
                quantity: item.quantity
            }))

            const { data: contentsData, error: contentsError } = await supabase.from('nutrition_combo_contents').insert(contentsToInsert).select()

            if (contentsError) throw contentsError

            // 4. Update local state
            const updatedCombo: LibraryMeal = {
                id,
                name,
                type,
                emoji: state.library.find(m => m.id === id)?.emoji || '📦',
                calories: Math.round(totalCalories),
                protein: Math.round(totalProtein),
                carbs: Math.round(totalCarbs),
                fat: Math.round(totalFat),
                ingredients: [],
                isCombo: true,
                contents: (contentsData || []).map(c => ({
                    id: c.id,
                    comboId: c.combo_id,
                    itemId: c.item_id,
                    quantity: c.quantity,
                    meal: state.library.find(l => l.id === c.item_id)
                }))
            }

            setState(prev => ({ ...prev, library: prev.library.map(m => m.id === id ? updatedCombo : m) }))
        } catch (e) {
            console.error('updateCombo failed:', e)
            throw e
        }
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

    const setIsGymModalOpen = (isGymModalOpen: boolean) => {
        setState(prev => ({ ...prev, isGymModalOpen }))
    }

    const syncGymData = React.useCallback(async () => {
        console.log('Initiating Gym Sync...')
        
        if (!state.gymStats.isIntegrated) {
            console.warn('Sync called but gym is not integrated in state')
            return
        }

        const { cookie, accessToken, userUuid: uuid, memberId } = state.gymStats

        // Also check localStorage for backwards compatibility / local testing explicitly if DB missing it
        let activeCookie = cookie
        let activeAccessToken = accessToken
        let activeUuid = uuid
        let activeMemberId = memberId

        if (!activeCookie || !activeAccessToken) {
            const localAuth = typeof window !== 'undefined' ? localStorage.getItem('gym_auth') : null
            if (localAuth) {
                try {
                    const parsed = JSON.parse(localAuth)
                    activeCookie = parsed.cookie || activeCookie
                    activeAccessToken = parsed.accessToken || activeAccessToken
                    activeUuid = parsed.uuid || activeUuid
                    activeMemberId = parsed.memberId || parsed.member_id || activeMemberId
                } catch(e) {}
            }
        }

        if (!activeCookie || !activeUuid) {
            console.warn('Gym auth missing from state and localStorage')
            if (state.gymStats.isIntegrated) {
                console.log('Stats show integrated but auth is missing - marking for reauth.')
                setState(prev => ({ ...prev, requiresGymReauth: true }))
            }
            return
        }
        
        setState(prev => ({ ...prev, isSyncingGym: true, requiresGymReauth: false }))
        console.log('isSyncingGym set to true, requiresGymReauth cleared')
        
        try {
            console.log('Syncing for UUID:', activeUuid)

            // Capture location IDs at the start of sync
            const locationIds = state.gymStats.gymLocationIds?.length
                ? state.gymStats.gymLocationIds
                : state.gymStats.gymLocationId
                    ? [state.gymStats.gymLocationId]
                    : []

            console.log('Fetching data for locations:', locationIds)

            const [busynessResults, historyRes] = await Promise.allSettled([
                Promise.allSettled(
                    locationIds.map(locId =>
                        GymService.getBusyness(activeUuid!, locId, activeCookie, activeMemberId, activeAccessToken)
                            .then(data => ({ locId, data }))
                            .catch(err => {
                                console.error(`Failed to fetch busyness for ${locId}:`, err)
                                return { locId, data: null }
                            })
                    )
                ),
                GymService.getHistory(activeUuid!, activeCookie)
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

            // Perform auto-logging BASELINE logic inside a functional update to ensure we have the absolute latest logs
            setState(prev => {
                const gymStats = { 
                    ...prev.gymStats, 
                    busyness: primaryBusyness || prev.gymStats.busyness,
                    allBusyness,
                    visitHistory, 
                    weeklyVisits,
                    totalVisits: visitHistory.length,
                    lastVisit: visitHistory[0] || null,
                    lastSyncTime: new Date().toISOString()
                }

                // Check for unassociated visits using the absolute latest logs (prev.workoutLogs)
                // A visit is "unassociated" if there is no log for that date/ID, OR if the log is empty (0 volume)
                const isLogEmpty = (log: WorkoutLog) => {
                    const volume = log.exercises.reduce((acc, ex) => 
                        acc + ex.sets.reduce((sacc, set) => sacc + (set.weight * (set.reps || 0)), 0), 0)
                    return volume === 0
                }

                const unassociatedVisits = visitHistory.filter(v => 
                    !prev.workoutLogs.some(log => (log.gymVisitId === v.id || log.date === v.date) && !isLogEmpty(log))
                )

                const newLogs: WorkoutLog[] = []
                for (const visit of unassociatedVisits) {
                    const routine = prev.routines.find(r => r.id === prev.activeRoutineId) || prev.routines[0]
                    if (!routine) continue

                    const prevSession = [...prev.workoutLogs]
                        .reverse()
                        .find(l => l.routineId === routine.id && !isLogEmpty(l))

                    const log: WorkoutLog = {
                        id: Math.random().toString(36).substring(2, 9),
                        date: visit.date,
                        routineId: routine.id,
                        gymVisitId: visit.id,
                        duration: 60,
                        note: 'no session recorded, baseline used',
                        exercises: routine.exercises.map(ex => {
                            const prevEx = prevSession?.exercises.find(pe => pe.exerciseId === ex.id)
                            return {
                                exerciseId: ex.id,
                                sets: prevEx ? prevEx.sets : Array(ex.suggestedSets).fill(null).map(() => ({
                                    reps: ex.suggestedReps,
                                    weight: ex.isBodyweight ? 0 : (ex.muscleGroup?.toLowerCase().includes('legs') ? 60 : 40)
                                }))
                            }
                        })
                    }
                    newLogs.push(log)
                }

                const combinedLogs = [...prev.workoutLogs, ...newLogs]
                
                // Group by date to handle deduplication per-day
                const logsByDate: Record<string, WorkoutLog[]> = {}
                combinedLogs.forEach(log => {
                    if (!logsByDate[log.date]) logsByDate[log.date] = []
                    logsByDate[log.date].push(log)
                })

                const deduplicated: WorkoutLog[] = []
                Object.values(logsByDate).forEach(dayLogs => {
                    // 1. Capture all manual (non-baseline) non-empty sessions
                    const manualSessions = dayLogs.filter(l => !l.note?.includes('baseline') && !isLogEmpty(l))
                    
                    // 2. Identify if we have any manual sessions for this day
                    if (manualSessions.length > 0) {
                        // Preserve all unique manual sessions
                        const seenIds = new Set()
                        manualSessions.forEach(m => {
                            if (!seenIds.has(m.id)) {
                                deduplicated.push(m)
                                seenIds.add(m.id)
                            }
                        })
                    } else {
                        // 3. Fallback: Keep one baseline session or the first empty manual session
                        const baseline = dayLogs.find(l => l.note?.includes('baseline') && !isLogEmpty(l))
                        if (baseline) {
                            deduplicated.push(baseline)
                        } else if (dayLogs.length > 0) {
                            // If only empty sessions exist, keep the first one
                            deduplicated.push(dayLogs[0])
                        }
                    }
                })

                const workoutLogs = deduplicated.sort((a, b) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )

                persistData({ gymStats, workoutLogs })
                return { ...prev, gymStats, workoutLogs, isSyncingGym: false }
            })
        } catch (e: any) { 
            console.error('Gym sync failed:', e) 
            if (e.message?.includes('403') || e.message?.includes('401')) {
                // If token is invalid across devices, forcibly disconnect to prompt a re-link
                disconnectGym()
            }
        } finally {
            setState(prev => ({ ...prev, isSyncingGym: false }))
        }
    }, [state.gymStats.isIntegrated, state.gymStats.gymLocationId, state.gymStats.gymLocationIds])

    // Periodic Resync (Every 30 mins)
    useEffect(() => {
        if (state.gymStats.isIntegrated && !state.loading) {
            // Run once on load
            syncGymData()
            
            const interval = setInterval(() => {
                syncGymData()
            }, 30 * 60 * 1000)
            return () => clearInterval(interval)
        }
    }, [state.gymStats.isIntegrated, state.loading])

    const connectGym = async (username: string, pin: string, locationId: string, locationIds?: string[]) => {
        const data = await GymService.login(username, pin)
        localStorage.setItem('gym_auth', JSON.stringify({ uuid: data.uuid, cookie: data.cookie, memberId: data.memberId, accessToken: data.accessToken }))
        const primaryId = data.homeGymId || locationId
        const allIds = locationIds?.length ? locationIds : [primaryId]
        const gymStats: typeof state.gymStats = { 
            ...state.gymStats, 
            isIntegrated: true, 
            gymLocationId: primaryId, 
            gymLocationIds: allIds,
            userUuid: data.uuid, 
            memberId: data.memberId,
            cookie: data.cookie,
            accessToken: data.accessToken
        }
        setState(prev => ({ ...prev, gymStats, requiresGymReauth: false }))
        await persistData({ gymStats })
    }

    const disconnectGym = async () => {
        localStorage.removeItem('gym_auth')
        const gymStats: typeof state.gymStats = { 
            ...state.gymStats, 
            isIntegrated: false, 
            gymLocationId: undefined, 
            gymLocationIds: [],
            gymLocationNames: {},
            allBusyness: undefined,
            busyness: undefined,
            userUuid: undefined, 
            memberId: undefined,
            accessToken: undefined,
            cookie: undefined
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
            plannedExercises: routine.exercises,
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

    const startDynamicSession = (muscleGroups: string[], exerciseCount: number) => {
        const availableExercises = EXERCISES.filter(ex => muscleGroups.includes(ex.muscleGroup))
        const shuffled = [...availableExercises].sort(() => 0.5 - Math.random())
        const selectedExercises = shuffled.slice(0, Math.min(exerciseCount, shuffled.length))

        if (selectedExercises.length === 0) return

        const tempRoutine: WorkoutRoutine = {
            id: `dynamic-${Date.now()}`,
            name: `Dynamic: ${muscleGroups.join(', ')}`,
            day: 'Custom',
            exercises: selectedExercises
        }

        const session: WorkoutSession = {
            id: Math.random().toString(36).substring(2, 9),
            date: new Date().toISOString().split('T')[0],
            routineId: tempRoutine.id,
            startTime: new Date().toISOString(),
            isPaused: false,
            completedExerciseIds: [],
            skippedExerciseIds: [],
            plannedExercises: selectedExercises,
            exercises: selectedExercises.map(ex => {
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

        setState(prev => ({ 
            ...prev, 
            routines: [...prev.routines, tempRoutine], 
            activeSession: session,
            activeRoutineId: tempRoutine.id
        }))
        persistData({ routines: [...state.routines, tempRoutine], activeSession: session, activeRoutineId: tempRoutine.id })
    }

    const updateSessionSet = (exerciseId: string, setIndex: number, updates: Partial<WorkoutSet>) => {
        if (!state.activeSession) return
        
        const activeSession: WorkoutSession = { 
            ...state.activeSession,
            exercises: state.activeSession.exercises.map((ex: ExerciseLog) => 
                ex.exerciseId === exerciseId 
                    ? { ...ex, sets: ex.sets.map((s: WorkoutSet, i: number) => i === setIndex ? { ...s, ...updates } : s) }
                    : ex
            )
        }
        
        setState(prev => ({ ...prev, activeSession }))
        persistData({ activeSession })
    }

    const togglePauseSession = () => {
        if (!state.activeSession) return
        const activeSession = { ...state.activeSession, isPaused: !state.activeSession.isPaused }
        setState(prev => ({ ...prev, activeSession }))
        persistData({ activeSession })
    }
    
    const swapSessionExercise = (oldId: string, newExercise: Exercise) => {
        if (!state.activeSession) return
        
        const target = getOverloadTarget(newExercise, state.profile, state.workoutLogs)
        const activeSession: WorkoutSession = {
            ...state.activeSession,
            plannedExercises: (state.activeSession.plannedExercises || []).map(ex => 
                ex.id === oldId ? newExercise : ex
            ),
            exercises: state.activeSession.exercises.map((ex: ExerciseLog) => 
                ex.exerciseId === oldId 
                    ? { 
                        exerciseId: newExercise.id, 
                        sets: Array(target.suggestedSets).fill(null).map(() => ({
                            reps: target.suggestedReps,
                            weight: target.suggestedWeight
                        }))
                      }
                    : ex
            )
        }
        
        setState(prev => ({ ...prev, activeSession }))
        persistData({ activeSession })
    }

    const randomizeSessionExercise = (id: string) => {
        if (!state.activeSession) return
        
        const currentEx = state.activeSession.plannedExercises?.find(ex => ex.id === id)
        if (!currentEx) return
        
        const alternatives = EXERCISES.filter(ex => 
            ex.muscleGroup === currentEx.muscleGroup && 
            ex.id !== currentEx.id
        )
        
        if (alternatives.length === 0) return
        
        const randomEx = alternatives[Math.floor(Math.random() * alternatives.length)]
        swapSessionExercise(id, randomEx)
    }

    const finishSession = async (isAutoFinish = false) => {
        const session = state.activeSession
        if (!session) return

        const duration = Math.round((new Date().getTime() - new Date(session.startTime).getTime()) / 60000)
        
        setState(prev => {
            const today = session.date
            const todayVisit = prev.gymStats.visitHistory?.find(v => v.date === today)
            const routine = prev.routines.find(r => r.id === session.routineId)

            const isLogEmpty = (log: WorkoutLog | WorkoutSession) => {
                const volume = log.exercises.reduce((acc: number, ex) => 
                    acc + ex.sets.reduce((sacc: number, set) => sacc + (set.weight * (set.reps || 0)), 0), 0)
                return volume === 0
            }

            const prevSessionForBaseline = [...prev.workoutLogs]
                .reverse()
                .find(l => l.routineId === session.routineId && !isLogEmpty(l))

            const finalizedExercises = routine?.exercises.map(routineEx => {
                const recordedEx = session.exercises.find(se => se.exerciseId === routineEx.id)
                const hasRecordedSets = recordedEx && recordedEx.sets.length > 0

                if (hasRecordedSets) {
                    return recordedEx
                }

                const prevEx = prevSessionForBaseline?.exercises.find(pe => pe.exerciseId === routineEx.id)
                return {
                    exerciseId: routineEx.id,
                    sets: prevEx ? prevEx.sets : Array(routineEx.suggestedSets).fill(null).map(() => ({
                        reps: routineEx.suggestedReps,
                        weight: routineEx.isBodyweight ? 0 : (routineEx.suggestedWeight || (routineEx.muscleGroup?.toLowerCase().includes('legs') ? 60 : 40))
                    }))
                }
            }) || session.exercises

            const log: WorkoutLog = {
                id: session.id,
                date: session.date,
                routineId: session.routineId,
                exercises: finalizedExercises,
                gymVisitId: todayVisit?.id,
                duration: Math.max(duration, 45),
                note: isAutoFinish 
                    ? 'session auto-recovered with baseline'
                    : (todayVisit ? 'data synced with live session' : 'manual session recorded')
            }

            // Trigger logWorkout logic via state bypass or just call it after?
            // Actually, we should call logWorkout(log) but logWorkout is async and uses state.
            // To be safe, we'll finish this update then call logWorkout.
            return { ...prev, activeSession: null }
        })

        // Re-construct the log outside for logWorkout
        const today = session.date
        const todayVisit = state.gymStats.visitHistory?.find(v => v.date === today)
        const routine = state.routines.find(r => r.id === session.routineId)
        
        const isLogEmptyLocal = (log: WorkoutLog | WorkoutSession) => {
            const volume = log.exercises.reduce((acc: number, ex) => 
                acc + ex.sets.reduce((sacc: number, set) => sacc + (set.weight * (set.reps || 0)), 0), 0)
            return volume === 0
        }
        const prevSessionForBaselineLocal = [...state.workoutLogs]
            .reverse()
            .find(l => l.routineId === session.routineId && !isLogEmptyLocal(l))

        const finalizedExercisesLocal = routine?.exercises.map(routineEx => {
            const recordedEx = session.exercises.find(se => se.exerciseId === routineEx.id)
            if (recordedEx && recordedEx.sets.length > 0) return recordedEx
            const prevEx = prevSessionForBaselineLocal?.exercises.find(pe => pe.exerciseId === routineEx.id)
            return {
                exerciseId: routineEx.id,
                sets: prevEx ? prevEx.sets : Array(routineEx.suggestedSets).fill(null).map(() => ({
                    reps: routineEx.suggestedReps,
                    weight: routineEx.isBodyweight ? 0 : (routineEx.suggestedWeight || (routineEx.muscleGroup?.toLowerCase().includes('legs') ? 60 : 40))
                }))
            }
        }) || session.exercises

        const logToRecord: WorkoutLog = {
            id: session.id,
            date: session.date,
            routineId: session.routineId,
            exercises: finalizedExercisesLocal,
            gymVisitId: todayVisit?.id,
            duration: Math.max(duration, 45),
            note: isAutoFinish 
                ? 'session auto-recovered with baseline'
                : (todayVisit ? 'data synced with live session' : 'manual session recorded')
        }

        await logWorkout(logToRecord)
        persistData({ activeSession: null })
    }

    // Auto-recover orphaned sessions (sessions from previous days)
    useEffect(() => {
        if (!state.loading && state.activeSession) {
            const sessionDate = state.activeSession.date
            const today = new Date().toISOString().split('T')[0]
            if (sessionDate < today) {
                console.log('Auto-recovering orphaned session from', sessionDate)
                finishSession(true)
            }
        }
    }, [state.loading, state.activeSession?.date])

    const cancelSession = () => {
        setState(prev => ({ ...prev, activeSession: null }))
        persistData({ activeSession: null })
    }

    const deleteWorkoutLog = async (id: string) => {
        setState(prev => {
            const workoutLogs = prev.workoutLogs.filter(l => l.id !== id)
            persistData({ workoutLogs })
            return { ...prev, workoutLogs }
        })
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
        setIsGymModalOpen,
        addRoutine,
        updateGymStats,
        logMeal,
        updateMealLog,
        deleteMealLog,
        saveRecipe,
        logMood,
        saveReflection,
        deleteReflection,
        addMilestone,
        bulkAddMilestones,
        updateMilestone,
        deleteMilestone,
        updateLayout,
        addMealToLibrary,
        removeMealFromLibrary,
        updateLibraryMeal,
        createCombo,
        updateCombo, // Added updateCombo
        addPrepToFridge,
        updateFridgePortions,
        consumeFromFridge,
        removeFromFridge,
        startSession,
        startDynamicSession,
        updateSessionSet,
        togglePauseSession,
        finishSession,
        cancelSession,
        swapSessionExercise,
        randomizeSessionExercise,
        setActiveRoutineId,
        updateRoutine,
        deleteRoutine,
        deleteWorkoutLog,
        clearWorkoutLogs,
        bulkAddWorkoutLogs,
        macros,
        dailyNutrition,
        gymRecommendation,
        rotaOverrides,
        setGymOverride,
        deleteMood,
        clearMoodsByDate,
        isSyncingGym: state.isSyncingGym,
    }), [state, macros, dailyNutrition, gymRecommendation, rotaOverrides, clearWorkoutLogs, bulkAddWorkoutLogs, setIsGymModalOpen])

    return <WellbeingContext.Provider value={value}>{children}</WellbeingContext.Provider>
}

export function useWellbeing() {
    const context = useContext(WellbeingContext)
    if (context === undefined) throw new Error('useWellbeing must be used within a WellbeingProvider')
    return context
}
