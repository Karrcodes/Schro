export type GoalCategory = 'finance' | 'health' | 'career' | 'personal'
export type GoalStatus = 'active' | 'completed' | 'archived'
export type GoalPriority = 'super' | 'high' | 'mid' | 'low'
export type GoalTimeframe = 'short' | 'medium' | 'long'
export type WishlistStatus = 'incoming' | 'queue' | 'acquired' | 'abandoned'

export interface Milestone {
    id: string
    goal_id: string
    aspiration_id?: string
    title: string
    is_completed: boolean
    position: number
    impact_score?: number
    created_at: string
}

export interface Goal {
    id: string
    user_id: string
    title: string
    description: string | null
    category: GoalCategory
    status: GoalStatus
    target_date: string | null
    priority: GoalPriority
    timeframe: GoalTimeframe
    vision_image_url?: string
    linked_savings_id?: string | null
    linked_savings_type?: 'manual' | 'monzo' | null
    created_at: string
    milestones?: Milestone[]
}

export interface CreateGoalData {
    title: string
    description?: string
    category?: GoalCategory
    status?: GoalStatus
    target_date?: string
    priority?: GoalPriority
    timeframe?: GoalTimeframe
    vision_image_url?: string
    linked_savings_id?: string | null
    linked_savings_type?: 'manual' | 'monzo' | null
    milestones?: { title: string; is_completed?: boolean; impact_score?: number }[]
}

export interface WishlistItem {
    id: string
    user_id: string
    title: string
    description: string | null
    price: number | null
    url: string | null
    image_url: string | null
    category: GoalCategory
    priority: GoalPriority
    status: WishlistStatus
    linked_savings_id?: string | null
    linked_savings_type?: 'manual' | 'monzo' | null
    created_at: string
}

export interface CreateWishlistItemData {
    title: string
    description?: string
    price?: number
    url?: string
    image_url?: string
    category?: GoalCategory
    priority?: GoalPriority
    status?: WishlistStatus
    linked_savings_id?: string | null
    linked_savings_type?: 'manual' | 'monzo' | null
}
export interface Aspiration {
    id: string
    user_id: string
    title: string
    description: string | null
    category: GoalCategory
    vision_image_url: string | null
    horizon: GoalTimeframe
    priority: GoalPriority
    status: 'active' | 'integrated' | 'archived'
    created_at: string
    milestones?: Milestone[]
}

export interface CreateAspirationData {
    title: string
    description?: string | null
    category?: GoalCategory
    vision_image_url?: string | null
    horizon?: GoalTimeframe
    priority?: GoalPriority
    status?: 'active' | 'integrated' | 'archived'
    milestones?: { title: string; is_completed?: boolean; impact_score?: number }[]
}
