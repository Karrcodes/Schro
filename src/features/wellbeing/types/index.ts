export type WellbeingGoal = 'bulk' | 'cut' | 'maintenance'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Gender = 'male' | 'female' | 'other'

export interface WellbeingProfile {
    age: number
    weight: number // in kg
    height: number // in cm
    gender: Gender
    activityLevel: ActivityLevel
    goal: WellbeingGoal
    goalWeight?: number
    updatedAt: string
}

export interface MetricEntry {
    date: string
    weight: number
}

export interface MacroTargets {
    calories: number
    protein: number
    fat: number
    carbs: number
}

export interface Exercise {
    id: string
    name: string
    muscleGroup: string
    muscleGroups?: string[] // Detailed mapping for visuals
    suggestedReps: number
    suggestedSets: number
    suggestedWeight?: number
    isBodyweight?: boolean
    icon?: string
}

export interface WorkoutRoutine {
    id: string
    name: string
    day?: string
    exercises: Exercise[]
}

export interface WorkoutSet {
    reps: number
    weight: number
}

export interface ExerciseLog {
    exerciseId: string
    sets: WorkoutSet[]
}

export interface WorkoutLog {
    id: string
    date: string
    routineId: string
    exercises: ExerciseLog[]
    gymVisitId?: string
    duration?: number // in minutes
    note?: string
}

export interface WorkoutSession extends WorkoutLog {
    startTime: string
    isPaused: boolean
    completedExerciseIds: string[]
    skippedExerciseIds: string[]
}

export interface GymBusyness {
    status: string
    currentCount: number
    currentPercentage: number
    currentCapacity: number
    lastUpdated: string
}

export interface GymVisit {
    id: string
    date: string
    time: string
    duration?: number // in minutes
    locationName: string
}

export interface TheGymGroupStats {
    totalVisits: number
    lastVisit: GymVisit | null
    isIntegrated: boolean
    busyness?: GymBusyness
    allBusyness?: Record<string, GymBusyness>  // keyed by locationId
    weeklyVisits: number
    visitHistory: GymVisit[]
    gymLocationId?: string
    gymLocationIds?: string[]   // all accessible locations
    gymLocationNames?: Record<string, string> // optional custom labels user sets for locations
    userUuid?: string
    memberId?: string
    accessToken?: string
    cookie?: string
    debug_raw_history?: any
    debug_raw_busyness?: any
    debug_raw_user?: any
    lastSyncTime?: string | null
}

export interface Ingredient {
    name: string
    amount: string
    calories: number
    protein: number
    fat: number
    carbs: number
}

export interface Recipe {
    id: string
    name: string
    type: 'dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
    prepTime: string
    calories: number
    protein: number
    fat: number
    carbs: number
    ingredients: Ingredient[]
    instructions: string[]
    goal?: 'bulk' | 'cut' | 'all'
    image?: string
}

export interface ComboContent {
    id: string
    comboId: string
    itemId: string
    quantity: number
    // Denormalized for easier UI
    meal?: LibraryMeal 
}

export interface LibraryMeal {
    id: string
    name: string
    type: ('dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack')[]
    emoji?: string
    calories: number
    protein: number
    carbs: number
    fat: number
    ingredients: any[]
    isCombo?: boolean
    contents?: ComboContent[]
}

export interface FridgeItem {
    id: string
    mealId: string
    portions: number
    prepDate: string
}

export interface MealLog {
    id: string
    date: string // ISO string for the day
    time: string // HH:mm
    type: 'dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
    name: string
    emoji?: string
    calories: number
    protein: number
    fat: number
    carbs: number
    isRecipe?: boolean
    recipeId?: string
    isCombo?: boolean
    contents?: ComboContent[]
}

export type MoodValue = 'excellent' | 'good' | 'neutral' | 'low' | 'bad'

export interface MoodEntry {
    id: string
    date: string
    time: string
    value: MoodValue
    note?: string
    activities?: string[]
}

export interface Reflection {
    id: string
    date: string
    content: string
}

export type DashboardComponentId =
    | 'macros'
    | 'weight_trends'
    | 'active_protocol'
    | 'meal_planner'
    | 'mood_reflection'
    | 'nutritional_trends'
    | 'workout_consistency'
    | 'gym_activity'

export interface DashboardLayout {
    main: { id: DashboardComponentId; isVisible: boolean }[]
    sidebar: { id: DashboardComponentId; isVisible: boolean }[]
}

export interface Milestone {
    id: string
    title: string
    exerciseId?: string
    description?: string
    targetValue: number
    currentValue: number
    unit: string
    type: 'weight' | 'lift' | 'consistency'
    completed: boolean
    dateCompleted?: string
    parentId?: string
}

export interface WellbeingState {
    profile: WellbeingProfile | null
    weightHistory: MetricEntry[]
    routines: WorkoutRoutine[]
    activeRoutineId: string | null
    workoutLogs: WorkoutLog[]
    gymStats: TheGymGroupStats
    mealLogs: MealLog[]
    library: LibraryMeal[]
    fridge: FridgeItem[]
    savedRecipes: string[] // Array of recipe IDs
    moodLogs: MoodEntry[]
    reflections: Reflection[]
    milestones: Milestone[]
    dashboardLayout: DashboardLayout
    activeSession: WorkoutSession | null
    isSyncingGym: boolean
    isGymModalOpen: boolean
    requiresGymReauth: boolean
    loading: boolean
    gymOverrides?: Record<string, 'force' | 'skip'>
}
