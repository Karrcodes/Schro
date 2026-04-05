'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Pane = 'left' | 'right'

interface MultitaskingContextType {
    isMultitasking: boolean
    leftUrl: string
    rightUrl: string
    focusedPane: Pane
    splitPosition: number
    toggleMultitasking: (initialRightUrl?: string) => void
    setPaneUrl: (pane: Pane, url: string) => void
    setFocusedPane: (pane: Pane) => void
    setSplitPosition: (pos: number) => void
}

const MultitaskingContext = createContext<MultitaskingContextType | undefined>(undefined)

export function MultitaskingProvider({ children }: { children: React.ReactNode }) {
    const [isMultitasking, setIsMultitasking] = useState(false)
    const [leftUrl, setLeftUrl] = useState('/system/control-centre')
    const [rightUrl, setRightUrl] = useState('/tasks/todo')
    const [focusedPane, setFocusedPane] = useState<Pane>('left')
    const [splitPosition, setSplitPosition] = useState(50)

    // Load state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('schro_multitasking')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setIsMultitasking(parsed.isMultitasking ?? false)
                setLeftUrl(parsed.leftUrl ?? '/system/control-centre')
                setRightUrl(parsed.rightUrl ?? '/tasks/todo')
                setFocusedPane(parsed.focusedPane ?? 'left')
                setSplitPosition(parsed.splitPosition ?? 50)
            } catch (e) {
                console.error('Failed to parse multitasking state', e)
            }
        }
    }, [])

    // Save state to localStorage on change
    useEffect(() => {
        localStorage.setItem('schro_multitasking', JSON.stringify({
            isMultitasking,
            leftUrl,
            rightUrl,
            focusedPane,
            splitPosition
        }))
    }, [isMultitasking, leftUrl, rightUrl, focusedPane, splitPosition])

    const toggleMultitasking = useCallback((initialRightUrl?: string) => {
        setIsMultitasking(prev => {
            const next = !prev
            if (next && initialRightUrl) {
                setLeftUrl('/system/control-centre')
                setRightUrl(initialRightUrl)
                setFocusedPane('right') // Focus the current page pane by default
            }
            return next
        })
    }, [])

    const setPaneUrl = useCallback((pane: Pane, url: string) => {
        if (pane === 'left') setLeftUrl(url)
        else setRightUrl(url)
    }, [])

    return (
        <MultitaskingContext.Provider value={{
            isMultitasking,
            leftUrl,
            rightUrl,
            focusedPane,
            splitPosition,
            toggleMultitasking,
            setPaneUrl,
            setFocusedPane,
            setSplitPosition
        }}>
            {children}
        </MultitaskingContext.Provider>
    )
}

export function useMultitasking() {
    const context = useContext(MultitaskingContext)
    if (context === undefined) {
        throw new Error('useMultitasking must be used within a MultitaskingProvider')
    }
    return context
}
