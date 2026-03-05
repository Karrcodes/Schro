'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StudioCanvasEntry, CanvasColor } from '../types/studio.types'

export function useCanvas() {
    const [entries, setEntries] = useState<StudioCanvasEntry[]>([])
    const [loading, setLoading] = useState(true)

    const fetchEntries = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('studio_canvas_entries')
            .select('*')
            .eq('is_archived', false)
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
        if (error) {
            console.error('Canvas fetch error:', error)
        } else {
            setEntries((data || []) as StudioCanvasEntry[])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchEntries()
    }, [fetchEntries])

    const createEntry = useCallback(async (data: { title: string; body?: string; tags?: string[]; color?: CanvasColor }) => {
        // Don't manually resolve user — insert directly like StudioContext does.
        // user_id is set by a Postgres trigger (DEFAULT auth.uid()).
        const { data: inserted, error } = await supabase
            .from('studio_canvas_entries')
            .insert([{
                title: data.title.trim(),
                body: data.body?.trim() || null,
                tags: data.tags || [],
                color: data.color || 'default',
                pinned: false,
            }])
            .select()

        if (error) {
            console.error('Canvas insert error:', error.message, error.code, (error as any).details, (error as any).hint)
            // Fallback: re-fetch so we at least see it if the insert did succeed
            await fetchEntries()
            return
        }

        const newEntry = inserted?.[0]
        if (newEntry) {
            setEntries(prev => [newEntry as StudioCanvasEntry, ...prev])
        } else {
            await fetchEntries()
        }
    }, [fetchEntries])

    const updateEntry = useCallback(async (id: string, updates: Partial<StudioCanvasEntry>) => {
        const { data, error } = await supabase
            .from('studio_canvas_entries')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()

        if (error) {
            console.error('Canvas update error:', error)
            return
        }

        const updated = data?.[0]
        if (updated) {
            setEntries(prev => prev.map(e => e.id === id ? updated as StudioCanvasEntry : e))
        }
    }, [])

    const deleteEntry = useCallback(async (id: string) => {
        const { error } = await supabase.from('studio_canvas_entries').delete().eq('id', id)
        if (error) { console.error('Canvas delete error:', error); return }
        setEntries(prev => prev.filter(e => e.id !== id))
    }, [])

    const archiveEntry = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('studio_canvas_entries')
            .update({ is_archived: true, updated_at: new Date().toISOString() })
            .eq('id', id)
        if (error) { console.error('Canvas archive error:', error.message); return }
        setEntries(prev => prev.filter(e => e.id !== id))
    }, [])

    const togglePin = useCallback(async (id: string, current: boolean) => {
        await updateEntry(id, { pinned: !current })
    }, [updateEntry])

    return { entries, loading, createEntry, updateEntry, deleteEntry, archiveEntry, togglePin, refresh: fetchEntries }
}
