'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
export type TasksProfile = 'personal' | 'business'

interface TasksProfileContextType {
    activeProfile: TasksProfile
    setActiveProfile: (profile: TasksProfile) => void
}

const TasksProfileContext = createContext<TasksProfileContextType | undefined>(undefined)

export function TasksProfileProvider({ children }: { children: ReactNode }) {
    // Default to 'personal', but this could be read from localStorage later if desired
    const [activeProfile, setActiveProfile] = useState<TasksProfile>('personal')

    return (
        <TasksProfileContext.Provider value={{ activeProfile, setActiveProfile }}>
            {children}
        </TasksProfileContext.Provider>
    )
}

export function useTasksProfile() {
    const context = useContext(TasksProfileContext)
    if (context === undefined) {
        throw new Error('useTasksProfile must be used within a TasksProfileProvider')
    }
    return context
}
