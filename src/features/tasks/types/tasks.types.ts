export type Category = 'todo' | 'grocery' | 'reminder'
export type StrategicCategory = 'finance' | 'career' | 'health' | 'personal' | 'rnd' | 'production' | 'media' | 'growth' | 'general'
export type Priority = 'super' | 'high' | 'mid' | 'low'
export type RecurrenceMode = 'none' | 'daily' | 'work_days' | 'off_days' | 'custom'

export interface Task {
    id: string
    profile: string
    title: string
    is_completed: boolean
    category: Category
    strategic_category?: StrategicCategory
    priority: Priority
    amount?: string
    due_date?: string
    due_date_mode?: 'on' | 'before' | 'range'
    end_date?: string
    recurrence_config?: {
        type: 'none' | 'daily' | 'work_days' | 'off_days' | 'custom'
        days_of_week?: number[]   // 0=Sun,1=Mon...6=Sat (used for weekly/custom)
        time?: string             // "HH:MM" for planner placement e.g. "07:00"
        duration_minutes?: number // e.g. 90 for planner block sizing
        // Legacy fields
        interval?: number
        target?: 'on_days' | 'off_days'
        constraint?: 'within_window'
    } | null
    created_at: string
    position: number
    notes?: {
        type: 'text' | 'bullets' | 'checklist'
        content: any // string for 'text'/'bullets', Array of items for 'checklist'
    }
    ai_position_x?: number
    ai_position_y?: number

    // Algorithmic scheduling parameters
    estimated_duration?: number // In minutes
    time_bound?: boolean
    deadline_type?: 'hard' | 'soft'
    recurrence_type?: 'habit' | 'task'
    energy_requirement?: 'high' | 'medium' | 'low'
    impact_score?: number
    project_id?: string | null
    travel_to_duration?: number // In minutes
    travel_from_duration?: number // In minutes
    start_time?: string // "HH:MM" fixed appointment time
    location?: string
    origin_location?: string
    price?: number
    content_id?: string | null
}

export interface GroceryLibraryItem {
    id: string
    user_id?: string
    name: string
    price: number
    store: string
    last_bought_at?: string
    created_at: string
}

export interface RoutineAnchor {
    id: string
    name: string
    start_time: string // "HH:MM"
    end_time: string // "HH:MM"
    type: 'routine' | 'transit' | 'sleep' | 'meal'
    is_flexible?: boolean
}

export interface DayPlannerSettings {
    profile: string
    wake_up_time_work: string
    wake_up_time_off: string
    bed_time_work: string
    bed_time_off: string
    meal_times: {
        breakfast: string
        lunch: string
        dinner: string
    }
    workout_duration: number
    shower_duration: number
    meal_prep_duration: number

    // Planner Overhaul Extensions
    roster_config?: {
        type: '3-on-3-off'
        anchor_date: string
        shift_start: string
        shift_end: string
    }
    routine_defaults?: {
        gym: { duration: number, preferred_window: [string, string] }
        walk: { duration: number, auto_inject: boolean }
        meal_prep: { duration: number, required: boolean }
    }
    evening_constraints?: {
        allowed_categories: string[]
        max_duration_minutes: number
    }
    chill_mode_active?: boolean

    // Flow Planner Anchors
    anchors_work?: RoutineAnchor[]
    anchors_off?: RoutineAnchor[]
}

export interface PlannerInitialization {
    date: string
    t_zero: string // ISO timestamp
    created_at: string
}

export interface TaskTemplate {
    id: string
    profile: 'personal' | 'business'
    title: string
    category: 'todo' | 'grocery' | 'reminder'
    priority: 'super' | 'high' | 'mid' | 'low'
    strategic_category?: 'finance' | 'career' | 'health' | 'personal' | 'rnd' | 'production' | 'media' | 'growth' | 'general'
    amount?: string
    due_date_mode?: 'on' | 'before' | 'range'
    content_id?: string
    project_id?: string
    recurrence_config?: Task['recurrence_config']
    estimated_duration?: number
    travel_to_duration?: number
    travel_from_duration?: number
    impact_score?: number
    start_time?: string
    location?: string
    origin_location?: string
    notes?: Task['notes']
    created_at: string
    updated_at: string
}
