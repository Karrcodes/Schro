'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import type { GroceryLibraryItem } from '../types/tasks.types'

interface GroceryLibraryContextType {
    library: GroceryLibraryItem[]
    loading: boolean
    error: string | null
    fetchLibrary: () => Promise<void>
    saveToLibrary: (items: Omit<GroceryLibraryItem, 'id' | 'created_at'>[]) => Promise<void>
    deleteFromLibrary: (id: string) => Promise<void>
    processReceipt: (file: File) => Promise<GroceryLibraryItem[]>
    clearLibrary: () => Promise<void>
}

const GroceryLibraryContext = createContext<GroceryLibraryContextType | undefined>(undefined)

const LIBRARY_LOCAL_STORAGE_KEY = 'schrö_grocery_library'

export function GroceryLibraryProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useSystemSettings()
    const [library, setLibrary] = useState<GroceryLibraryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLibrary = useCallback(async () => {
        if (settings.is_demo_mode) {
            const stored = localStorage.getItem(LIBRARY_LOCAL_STORAGE_KEY)
            setLibrary(stored ? JSON.parse(stored) : [])
            setLoading(false)
            return
        }

        setLoading(true)
        const { data, error } = await supabase
            .from('grocery_library')
            .select('*')
            .order('name', { ascending: true })

        if (error) setError(error.message)
        else setLibrary(data ?? [])
        setLoading(false)
    }, [settings.is_demo_mode])

    useEffect(() => {
        fetchLibrary()
    }, [fetchLibrary])

    const saveToLibrary = async (items: Omit<GroceryLibraryItem, 'id' | 'created_at'>[]) => {
        if (settings.is_demo_mode) {
            const stored = localStorage.getItem(LIBRARY_LOCAL_STORAGE_KEY)
            const current: GroceryLibraryItem[] = stored ? JSON.parse(stored) : []
            
            items.forEach(newItem => {
                const existing = current.findIndex(i => i.name.toLowerCase() === newItem.name.toLowerCase() && i.store.toLowerCase() === newItem.store.toLowerCase())
                if (existing >= 0) {
                    current[existing] = { ...current[existing], ...newItem }
                } else {
                    current.push({
                        ...newItem,
                        id: `lib-${Date.now()}-${Math.random()}`,
                        created_at: new Date().toISOString()
                    } as GroceryLibraryItem)
                }
            })

            localStorage.setItem(LIBRARY_LOCAL_STORAGE_KEY, JSON.stringify(current))
            setLibrary(current)
            return
        }

        const { error } = await supabase
            .from('grocery_library')
            .upsert(items.map(item => ({
                name: item.name,
                price: item.price,
                store: item.store,
                last_bought_at: new Date().toISOString()
            })), { onConflict: 'name, store' })

        if (!error) await fetchLibrary()
    }

    const deleteFromLibrary = async (id: string) => {
        if (settings.is_demo_mode) {
            const stored = localStorage.getItem(LIBRARY_LOCAL_STORAGE_KEY)
            const current: GroceryLibraryItem[] = stored ? JSON.parse(stored) : []
            const updated = current.filter(i => i.id !== id)
            localStorage.setItem(LIBRARY_LOCAL_STORAGE_KEY, JSON.stringify(updated))
            setLibrary(updated)
            return
        }

        const { error } = await supabase
            .from('grocery_library')
            .delete()
            .eq('id', id)

        if (!error) await fetchLibrary()
    }

    const clearLibrary = async () => {
        if (settings.is_demo_mode) {
            localStorage.removeItem(LIBRARY_LOCAL_STORAGE_KEY)
            setLibrary([])
            return
        }

        const { error } = await supabase
            .from('grocery_library')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Efficient "Delete All" for Supabase

        if (!error) await fetchLibrary()
    }

    const processReceipt = async (file: File) => {
        setLoading(true)
        try {
            console.log('Processing receipt:', file.name, 'Type:', file.type)

            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/ai/receipt', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || `Server error: ${res.status}`)
            }

            const items = await res.json()
            if (Array.isArray(items)) {
                await saveToLibrary(items)
                return items
            }
            throw new Error('Could not parse receipt data from AI response.')
        } catch (error: any) {
            console.error('Error processing receipt:', error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    return (
        <GroceryLibraryContext.Provider value={{
            library,
            loading,
            error,
            fetchLibrary,
            saveToLibrary,
            deleteFromLibrary,
            processReceipt,
            clearLibrary
        }}>
            {children}
        </GroceryLibraryContext.Provider>
    )
}

export function useGroceryLibraryContext() {
    const context = useContext(GroceryLibraryContext)
    if (context === undefined) {
        throw new Error('useGroceryLibraryContext must be used within a GroceryLibraryProvider')
    }
    return context
}
