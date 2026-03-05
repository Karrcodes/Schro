'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CanvasConnection, StudioCanvasEntry, CanvasColor, CanvasMap, CanvasMapNode } from '../types/studio.types'

export function useCanvas() {
    const [entries, setEntries] = useState<StudioCanvasEntry[]>([])
    const [connections, setConnections] = useState<CanvasConnection[]>([])
    const [maps, setMaps] = useState<CanvasMap[]>([])
    const [currentMapId, setCurrentMapId] = useState<string | null>(null)
    const [mapNodes, setMapNodes] = useState<CanvasMapNode[]>([])
    const [loading, setLoading] = useState(true)
    const posDebounce = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    const fetchEntries = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('studio_canvas_entries')
            .select('*')
            .eq('is_archived', false)
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
        if (error) console.error('Canvas fetch error:', error.message)
        else setEntries((data || []) as StudioCanvasEntry[])
        setLoading(false)
    }, [])

    const fetchMaps = useCallback(async () => {
        const { data, error } = await supabase.from('studio_canvas_maps').select('*').order('created_at', { ascending: false })
        if (error) console.error('Canvas fetch maps error:', error.message)
        else {
            setMaps(data as CanvasMap[])
            if (data && data.length > 0 && !currentMapId) setCurrentMapId(data[0].id)
        }
    }, [currentMapId])

    const fetchMapNodes = useCallback(async () => {
        if (!currentMapId) return
        const { data, error } = await supabase.from('studio_canvas_map_nodes').select('*').eq('map_id', currentMapId)
        if (error) console.error('Canvas fetch map nodes error:', error.message)
        else setMapNodes(data as CanvasMapNode[])
    }, [currentMapId])

    const fetchConnections = useCallback(async () => {
        const query = supabase.from('studio_canvas_connections').select('*').order('created_at', { ascending: true })
        if (currentMapId) query.eq('map_id', currentMapId)
        else query.is('map_id', null)

        const { data, error } = await query
        if (error) console.error('Canvas connections fetch error:', error.message)
        else setConnections((data || []) as CanvasConnection[])
    }, [currentMapId])

    useEffect(() => {
        fetchMaps()
        fetchEntries()
    }, [fetchMaps, fetchEntries])

    useEffect(() => {
        if (currentMapId) {
            fetchMapNodes()
            fetchConnections()
        }
    }, [currentMapId, fetchMapNodes, fetchConnections])

    const createEntry = useCallback(async (data: { title: string; body?: string; tags?: string[]; color?: CanvasColor; x?: number; y?: number }) => {
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
            await fetchEntries()
            return
        }
        const newEntry = inserted?.[0]
        if (newEntry) {
            setEntries(prev => [newEntry as StudioCanvasEntry, ...prev])
            // If we have map context and coordinates, link it immediately
            if (currentMapId && data.x !== undefined && data.y !== undefined) {
                await supabase.from('studio_canvas_map_nodes').insert([{
                    map_id: currentMapId,
                    entry_id: newEntry.id,
                    x: data.x,
                    y: data.y
                }])
                fetchMapNodes()
            }
        }
        else await fetchEntries()
    }, [fetchEntries, currentMapId, fetchMapNodes])

    const updateEntry = useCallback(async (id: string, updates: Partial<StudioCanvasEntry>) => {
        const { data, error } = await supabase
            .from('studio_canvas_entries')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
        if (error) { console.error('Canvas update error:', error.message); return }
        const updated = data?.[0]
        if (updated) setEntries(prev => prev.map(e => e.id === id ? updated as StudioCanvasEntry : e))
    }, [])

    // Debounced position save
    const updateNodePosition = useCallback((id: string, x: number, y: number) => {
        if (!currentMapId) {
            setEntries(prev => prev.map(e => e.id === id ? { ...e, web_x: x, web_y: y } : e))
            if (posDebounce.current[id]) clearTimeout(posDebounce.current[id])
            posDebounce.current[id] = setTimeout(async () => {
                await supabase.from('studio_canvas_entries').update({ web_x: x, web_y: y, updated_at: new Date().toISOString() }).eq('id', id)
            }, 400)
        } else {
            setMapNodes(prev => prev.map(n => n.entry_id === id ? { ...n, x, y } : n))
            if (posDebounce.current[id]) clearTimeout(posDebounce.current[id])
            posDebounce.current[id] = setTimeout(async () => {
                await supabase.from('studio_canvas_map_nodes').upsert([{
                    map_id: currentMapId,
                    entry_id: id,
                    x, y
                }], { onConflict: 'map_id,entry_id' })
            }, 400)
        }
    }, [currentMapId])

    const deleteEntry = useCallback(async (id: string) => {
        const { error } = await supabase.from('studio_canvas_entries').delete().eq('id', id)
        if (error) { console.error('Canvas delete error:', error.message); return }
        setEntries(prev => prev.filter(e => e.id !== id))
        setConnections(prev => prev.filter(c => c.from_id !== id && c.to_id !== id))
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

    // Connections
    const createConnection = useCallback(async (fromId: string, toId: string) => {
        if (fromId === toId) return
        const { data, error } = await supabase
            .from('studio_canvas_connections')
            .insert([{ from_id: fromId, to_id: toId, map_id: currentMapId }])
            .select()
        if (error) { console.error('Canvas connection error:', error.message); return }
        const conn = data?.[0]
        if (conn) setConnections(prev => [...prev, conn as CanvasConnection])
    }, [currentMapId])

    // Map Management
    const createMap = useCallback(async (name: string) => {
        const { data, error } = await supabase.from('studio_canvas_maps').insert([{ name }]).select()
        if (error) { console.error('Create map error:', error.message); return }
        const newMap = data?.[0] as CanvasMap
        if (newMap) {
            setMaps(prev => [newMap, ...prev])
            setCurrentMapId(newMap.id)
        }
    }, [])

    const addNodeToMap = useCallback(async (entryId: string, x: number = 100, y: number = 100) => {
        if (!currentMapId) return
        const { error } = await supabase.from('studio_canvas_map_nodes').insert([{
            map_id: currentMapId,
            entry_id: entryId,
            x, y
        }])
        if (error) console.error('Add node to map error:', error.message)
        else fetchMapNodes()
    }, [currentMapId, fetchMapNodes])

    const deleteMapNode = useCallback(async (entryId: string) => {
        if (!currentMapId) return
        const { error } = await supabase.from('studio_canvas_map_nodes').delete().eq('map_id', currentMapId).eq('entry_id', entryId)
        if (error) console.error('Delete map node error:', error.message)
        else fetchMapNodes()
    }, [currentMapId, fetchMapNodes])

    const deleteConnection = useCallback(async (id: string) => {
        const { error } = await supabase.from('studio_canvas_connections').delete().eq('id', id)
        if (error) { console.error('Canvas delete connection error:', error.message); return }
        setConnections(prev => prev.filter(c => c.id !== id))
    }, [])

    return {
        entries, connections, loading,
        maps, currentMapId, setCurrentMapId, mapNodes,
        createEntry, updateEntry, updateNodePosition, deleteEntry, archiveEntry, togglePin,
        createConnection, deleteConnection,
        createMap, addNodeToMap, deleteMapNode,
        refresh: fetchEntries
    }
}
