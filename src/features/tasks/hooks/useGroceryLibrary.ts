'use client'

import { useGroceryLibraryContext } from '../contexts/GroceryLibraryContext'
import type { GroceryLibraryItem } from '../types/tasks.types'

export function useGroceryLibrary() {
    const context = useGroceryLibraryContext()

    const getSuggestions = (query: string) => {
        if (!query || query.length < 2) return []
        return context.library.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.store.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5)
    }

    return {
        library: context.library,
        loading: context.loading,
        error: context.error,
        fetchLibrary: context.fetchLibrary,
        saveToLibrary: context.saveToLibrary,
        deleteFromLibrary: context.deleteFromLibrary,
        processReceipt: context.processReceipt,
        clearLibrary: context.clearLibrary,
        getSuggestions
    }
}
