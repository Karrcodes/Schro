'use client'

import { useEffect, useCallback, useMemo } from 'react'
import type { Task } from '../types/tasks.types'
import { useTasksProfile } from '@/features/tasks/contexts/TasksProfileContext'
import { useTasksContext } from '../contexts/TasksContext'

export function useTasks(category: 'todo' | 'grocery' | 'reminder' | 'essential', profileOverride?: string) {
    const { activeProfile: contextProfile } = useTasksProfile()
    const activeProfile = profileOverride || contextProfile
    const { 
        tasks: allTasks, 
        loading: allLoading, 
        errors, 
        fetchTasks: contextFetchTasks,
        createTask: contextCreateTask,
        createTasks: contextCreateTasks,
        toggleTask: contextToggleTask,
        deleteTask: contextDeleteTask,
        clearAllTasks: contextClearAllTasks,
        clearCompletedTasks: contextClearCompletedTasks,
        editTask: contextEditTask,
        updateTaskPositions: contextUpdateTaskPositions
    } = useTasksContext()

    const tasks = useMemo(() => {
        const categoryTasks = allTasks[category] || []
        if (activeProfile === 'all') return categoryTasks
        return categoryTasks.filter((t: Task) => t.profile === activeProfile)
    }, [allTasks, category, activeProfile])

    const fetchTasks = useCallback(() => contextFetchTasks(category), [contextFetchTasks, category])

    useEffect(() => {
        if (!allTasks[category]) {
            fetchTasks()
        }
    }, [category, fetchTasks, allTasks])

    return {
        tasks,
        loading: allLoading[category] ?? true,
        error: errors[category] ?? null,
        createTask: (taskData: Partial<Task>) => contextCreateTask(category, taskData, activeProfile as string),
        createTasks: (tasksData: Partial<Task>[]) => contextCreateTasks(category, tasksData, activeProfile as string),
        toggleTask: (id: string, is_completed: boolean) => contextToggleTask(category, id, is_completed),
        deleteTask: (id: string) => contextDeleteTask(category, id),
        clearAllTasks: () => contextClearAllTasks(category, activeProfile as string),
        clearCompletedTasks: () => contextClearCompletedTasks(category, activeProfile as string),
        editTask: (id: string, updates: Partial<Task>) => contextEditTask(category, id, updates),
        updateTaskPositions: (orderedTasks: Task[]) => contextUpdateTaskPositions(category, orderedTasks),
        refetch: fetchTasks
    }
}
