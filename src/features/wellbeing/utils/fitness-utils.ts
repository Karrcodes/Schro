import { isShiftDay } from '@/lib/rota-utils'
import type { WorkoutLog, WorkoutRoutine } from '../types'
import type { RotaOverride } from '@/features/finance/types/finance.types'

/**
 * Validates if the user can/should go to the gym on a given date
 * based on their warehouse work schedule and sequential rest rules.
 */
export function getGymRecommendation(
    date: Date,
    overrides: RotaOverride[],
    workoutLogs: WorkoutLog[]
) {
    const dateStr = date.toISOString().split('T')[0]
    const override = overrides.find(o => o.date === dateStr)
    const isWork = isShiftDay(date, overrides)
    
    // User Rules:
    // 1. Holiday -> Go
    // 2. Absence -> Try to go
    // 3. Overtime -> Won't go
    // 4. Working -> Won't go
    
    let status: 'can_go' | 'work_day' | 'overtime' | 'rest_needed' | 'pending' | 'completed' = 'can_go'
    let reason = 'Day off'

    if (override) {
        if (override.type === 'overtime') {
            status = 'overtime'
            reason = 'Working overtime'
        } else if (override.type === 'holiday') {
            status = 'can_go'
            reason = 'On holiday'
        } else if (override.type === 'absence') {
            status = 'can_go'
            reason = 'Absent from work'
        }
    } else if (isWork) {
        status = 'work_day'
        reason = 'Working at warehouse'
    }

    // Rule: No more than 3 days in a row
    if (status === 'can_go') {
        const consecutiveDays = getConsecutiveGymDays(date, workoutLogs)
        if (consecutiveDays >= 3) {
            status = 'rest_needed'
            reason = 'Rest needed after 3 consecutive gym days'
        }
    }

    // Check if we've already been today regardless of recommendation
    const todayWorkout = workoutLogs.find(l => l.date === dateStr)
    if (todayWorkout) {
        status = 'completed'
        reason = 'Session logged for today'
    } else if (status === 'can_go') {
        status = 'pending'
        reason = 'Gym session pending'
    }

    return { status, reason }
}

function getConsecutiveGymDays(date: Date, logs: WorkoutLog[]): number {
    let count = 0
    let current = new Date(date)
    current.setDate(current.getDate() - 1)

    while (count < 3) {
        const dStr = current.toISOString().split('T')[0]
        const hadWorkout = logs.some(l => l.date === dStr)
        if (!hadWorkout) break
        count++
        current.setDate(current.getDate() - 1)
    }
    return count
}

/**
 * PPL Split Analysis for Warehouse Worker:
 * Day 1: Push (Chest, Triceps, Shoulders)
 * Day 2: Pull (Back, Biceps)
 * Day 3: Legs (Lower Body)
 * 
 * Recommendation:
 * - PPL is excellent for a 3-day-off window.
 * - Since you work in a warehouse, focus on "Maintenance" or "Hypertrophy" rather than "Max Strength" 
 *   to avoid central nervous system fatigue on work days.
 * - Ensure Leg day isn't scheduled right before a 3-day work block if possible, 
 *   as sore legs in a warehouse can be brutal.
 */

export const MUSCLE_GROUPS = {
    CHEST: ['Bench Press', 'Incline Press', 'Dips', 'Chest Flys'],
    SHOULDERS: ['Overhead Press', 'Lateral Raises', 'Front Raises'],
    TRICEPS: ['Tricep Pushdowns', 'Skullcrushers', 'Dips'],
    BACK: ['Deadlift', 'Pullups', 'Rows', 'Lat Pulldowns'],
    BICEPS: ['Curls', 'Hammer Curls', 'Preacher Curls'],
    LEGS: ['Squats', 'Leg Press', 'Lunges', 'Leg Extension', 'Leg Curls', 'Calf Raises'],
}

export type MuscleGroup = keyof typeof MUSCLE_GROUPS

export function getMuscleGroupsForExercise(exerciseName: string): MuscleGroup[] {
    const groups: MuscleGroup[] = []
    for (const [group, exercises] of Object.entries(MUSCLE_GROUPS)) {
        if (exercises.some(ex => exerciseName.toLowerCase().includes(ex.toLowerCase()))) {
            groups.push(group as MuscleGroup)
        }
    }
    return groups
}
