'use client'

import { useGoalsContext } from '../contexts/GoalsContext'

export function useGoals() {
    return useGoalsContext()
}
