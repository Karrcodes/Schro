'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface AdvisorOverride {
    disregarded?: boolean
    manualAmount?: number
    manualFulfilled?: boolean
}

// Record<weekId, Record<itemName, AdvisorOverride>>
type OverridesState = Record<string, Record<string, AdvisorOverride>>

interface FinanceAdvisorContextType {
    overrides: OverridesState
    setOverride: (weekId: string, itemName: string, override: AdvisorOverride) => void
    batchUpdateOverrides: (weekId: string, updates: Record<string, AdvisorOverride>) => void
}

const FinanceAdvisorContext = createContext<FinanceAdvisorContextType | undefined>(undefined)

export function FinanceAdvisorProvider({ children }: { children: React.ReactNode }) {
    const [overrides, setOverrides] = useState<OverridesState>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('schro_finance_advisor_overrides')
            return saved ? JSON.parse(saved) : {}
        }
        return {}
    })

    useEffect(() => {
        localStorage.setItem('schro_finance_advisor_overrides', JSON.stringify(overrides))
    }, [overrides])

    const setOverride = (weekId: string, itemName: string, override: AdvisorOverride) => {
        setOverrides(prev => ({
            ...prev,
            [weekId]: {
                ...(prev[weekId] || {}),
                [itemName]: {
                    ...(prev[weekId]?.[itemName] || {}),
                    ...override
                }
            }
        }))
    }

    const batchUpdateOverrides = (weekId: string, updates: Record<string, AdvisorOverride>) => {
        setOverrides(prev => ({
            ...prev,
            [weekId]: {
                ...(prev[weekId] || {}),
                ...updates
            }
        }))
    }

    return (
        <FinanceAdvisorContext.Provider value={{ overrides, setOverride, batchUpdateOverrides }}>
            {children}
        </FinanceAdvisorContext.Provider>
    )
}

export function useFinanceAdvisor() {
    const context = useContext(FinanceAdvisorContext)
    if (context === undefined) {
        throw new Error('useFinanceAdvisor must be used within a FinanceAdvisorProvider')
    }
    return context
}
