'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_STUDIO } from '@/lib/demoData'
import type { CanvasConnection, StudioCanvasEntry, CanvasColor, CanvasMap, CanvasMapNode } from '../types/studio.types'

const LOCAL_STORAGE_KEY = 'schrö_demo_canvas_v1'

export function useCanvas() {
    const [entries, setEntries] = useState<StudioCanvasEntry[]>([])
    const [connections, setConnections] = useState<CanvasConnection[]>([])
    const [maps, setMaps] = useState<CanvasMap[]>([])
    const [currentMapId, setCurrentMapId] = useState<string | null>(null)
    const [mapNodes, setMapNodes] = useState<CanvasMapNode[]>([])
    const [loading, setLoading] = useState(true)
    const { settings } = useSystemSettings()
    const posDebounce = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    const getSessionCanvas = useCallback(() => {
        if (typeof window === 'undefined') return null
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    }, [])

    const saveSessionCanvas = useCallback((data: any) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
    }, [])

    const fetchEntries = useCallback(async () => {
        setLoading(true)
        if (settings.is_demo_mode) {
            let session = getSessionCanvas()
            if (!session) {
                session = {
                    entries: MOCK_STUDIO.canvas || [],
                    maps: MOCK_STUDIO.maps || [],
                    mapNodes: MOCK_STUDIO.map_nodes || [],
                    connections: MOCK_STUDIO.connections || []
                }
                saveSessionCanvas(session)
            }
            setEntries(session.entries)
            setLoading(false)
            return
        }
        const { data, error } = await supabase
            .from('studio_canvas_entries')
            .select('*')
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
        if (error) console.error('Canvas fetch error:', error.message)
        else setEntries((data || []) as StudioCanvasEntry[])
        setLoading(false)
    }, [settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const fetchMaps = useCallback(async (showArchived = false) => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            const filtered = session?.maps?.filter((m: any) => m.is_archived === showArchived) || []
            setMaps(filtered)
            if (filtered.length > 0 && !currentMapId) setCurrentMapId(filtered[0].id)
            return
        }
        let query = supabase.from('studio_canvas_maps').select('*')
        query = query.eq('is_archived', showArchived)

        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) console.error('Canvas fetch maps error:', error.message)
        else {
            setMaps(data as CanvasMap[])
            if (data && data.length > 0 && !currentMapId) setCurrentMapId(data[0].id)
        }
    }, [currentMapId, settings.is_demo_mode, getSessionCanvas])

    const fetchMapNodes = useCallback(async () => {
        if (!currentMapId) { setMapNodes([]); return }
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            const filtered = session?.mapNodes?.filter((n: any) => n.map_id === currentMapId) || []
            setMapNodes(filtered)
            return
        }
        const { data, error } = await supabase.from('studio_canvas_map_nodes').select('*').eq('map_id', currentMapId)
        if (error) console.error('Canvas fetch map nodes error:', error.message)
        else setMapNodes(data as CanvasMapNode[])
    }, [currentMapId, settings.is_demo_mode, getSessionCanvas])

    const fetchConnections = useCallback(async () => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            let filtered = session?.connections || []
            if (currentMapId) filtered = filtered.filter((c: any) => c.map_id === currentMapId)
            else filtered = filtered.filter((c: any) => !c.map_id)
            setConnections(filtered)
            return
        }
        const query = supabase.from('studio_canvas_connections').select('*').order('created_at', { ascending: true })
        if (currentMapId) query.eq('map_id', currentMapId)
        else query.is('map_id', null)

        const { data, error } = await query
        if (error) console.error('Canvas connections fetch error:', error.message)
        else setConnections((data || []) as CanvasConnection[])
    }, [currentMapId, settings.is_demo_mode, getSessionCanvas])

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
        if (settings.is_demo_mode) {
            const newEntry = {
                id: `demo-ce-${Date.now()}`,
                title: data.title.trim(),
                body: data.body?.trim() || null,
                tags: data.tags || [],
                color: data.color || 'default',
                pinned: false,
                created_at: new Date().toISOString()
            } as StudioCanvasEntry

            const session = getSessionCanvas()
            session.entries = [newEntry, ...session.entries]

            if (currentMapId && data.x !== undefined && data.y !== undefined) {
                const newNode = {
                    id: `demo-cn-${Date.now()}`,
                    map_id: currentMapId,
                    entry_id: newEntry.id,
                    x: data.x,
                    y: data.y
                } as CanvasMapNode
                session.mapNodes = [...session.mapNodes, newNode]
            }

            saveSessionCanvas(session)
            setEntries(session.entries)
            if (currentMapId && data.x !== undefined && data.y !== undefined) {
                setMapNodes(prev => [...prev, session.mapNodes[session.mapNodes.length - 1]])
            }
            return newEntry
        }
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
            return null
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
            return newEntry as StudioCanvasEntry
        }
        else {
            await fetchEntries()
            return null
        }
    }, [fetchEntries, currentMapId, fetchMapNodes, settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const updateEntry = useCallback(async (id: string, updates: Partial<StudioCanvasEntry>) => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            session.entries = session.entries.map((e: any) => e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e)
            saveSessionCanvas(session)
            setEntries(session.entries)
            return
        }
        const { data, error } = await supabase
            .from('studio_canvas_entries')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
        if (error) { console.error('Canvas update error:', error.message); return }
        const updated = data?.[0]
        if (updated) setEntries(prev => prev.map(e => e.id === id ? updated as StudioCanvasEntry : e))
    }, [settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    // Debounced position save
    const updateNodePosition = useCallback((id: string, x: number, y: number) => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            if (!currentMapId) {
                session.entries = session.entries.map((e: any) => e.id === id ? { ...e, web_x: x, web_y: y } : e)
                setEntries(session.entries)
            } else {
                session.mapNodes = session.mapNodes.map((n: any) => {
                    const isMatch = n.entry_id === id || n.project_id === id || n.content_id === id
                    return isMatch ? { ...n, x, y } : n
                })
                setMapNodes(prev => prev.map(n => {
                    const isMatch = n.entry_id === id || n.project_id === id || n.content_id === id
                    return isMatch ? { ...n, x, y } : n
                }))
            }
            saveSessionCanvas(session)
            return
        }
        if (!currentMapId) {
            setEntries(prev => prev.map(e => e.id === id ? { ...e, web_x: x, web_y: y } : e))
            if (posDebounce.current[id]) clearTimeout(posDebounce.current[id])
            posDebounce.current[id] = setTimeout(async () => {
                await supabase.from('studio_canvas_entries').update({ web_x: x, web_y: y, updated_at: new Date().toISOString() }).eq('id', id)
            }, 400)
        } else {
            setMapNodes(prev => prev.map(n => {
                const isMatch = n.entry_id === id || n.project_id === id || n.content_id === id
                return isMatch ? { ...n, x, y } : n
            }))
            if (posDebounce.current[id]) clearTimeout(posDebounce.current[id])
            posDebounce.current[id] = setTimeout(async () => {
                const node = mapNodes.find(n => n.entry_id === id || n.project_id === id || n.content_id === id)
                if (!node) return

                await supabase.from('studio_canvas_map_nodes').update({ x, y }).eq('id', node.id)
            }, 400)
        }
    }, [currentMapId, mapNodes, settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const deleteEntry = useCallback(async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            session.connections = session.connections.filter((c: any) => c.from_id !== id && c.to_id !== id)
            session.entries = session.entries.filter((e: any) => e.id !== id)
            session.mapNodes = session.mapNodes.filter((n: any) => n.entry_id !== id)
            saveSessionCanvas(session)
            setEntries(session.entries)
            setConnections(session.connections)
            setMapNodes(session.mapNodes)
            return
        }
        // Clear connections first
        await supabase.from('studio_canvas_connections').delete().or(`from_id.eq.${id},to_id.eq.${id}`)

        const { error } = await supabase.from('studio_canvas_entries').delete().eq('id', id)
        if (error) { console.error('Canvas delete error:', error.message); return }
        setEntries(prev => prev.filter(e => e.id !== id))
        setConnections(prev => prev.filter(c => c.from_id !== id && c.to_id !== id))
    }, [settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const archiveEntry = useCallback(async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            session.connections = session.connections.filter((c: any) => c.from_id !== id && c.to_id !== id)
            session.entries = session.entries.map((e: any) => e.id === id ? { ...e, is_archived: true, updated_at: new Date().toISOString() } : e)
            saveSessionCanvas(session)
            setEntries(prev => prev.filter(e => e.id !== id))
            setConnections(prev => prev.filter(c => c.from_id !== id && c.to_id !== id))
            return
        }
        // Clear connections for archived nodes as requested
        await supabase.from('studio_canvas_connections').delete().or(`from_id.eq.${id},to_id.eq.${id}`)

        const { error } = await supabase
            .from('studio_canvas_entries')
            .update({ is_archived: true, updated_at: new Date().toISOString() })
            .eq('id', id)
        if (error) { console.error('Canvas archive error:', error.message); return }
        setEntries(prev => prev.filter(e => e.id !== id))
        setConnections(prev => prev.filter(c => c.from_id !== id && c.to_id !== id))
    }, [settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const togglePin = useCallback(async (id: string, current: boolean) => {
        await updateEntry(id, { pinned: !current })
    }, [updateEntry])

    // Connections
    const createConnection = useCallback(async (fromId: string, toId: string) => {
        if (fromId === toId) return
        if (settings.is_demo_mode) {
            const newConn = {
                id: `demo-cc-${Date.now()}`,
                from_id: fromId,
                to_id: toId,
                map_id: currentMapId,
                created_at: new Date().toISOString()
            } as CanvasConnection
            const session = getSessionCanvas()
            session.connections = [...session.connections, newConn]
            saveSessionCanvas(session)
            setConnections(session.connections)
            return
        }
        const { data, error } = await supabase
            .from('studio_canvas_connections')
            .insert([{ from_id: fromId, to_id: toId, map_id: currentMapId }])
            .select()
        if (error) { console.error('Canvas connection error:', error.message); return }
        const conn = data?.[0]
        if (conn) setConnections(prev => [...prev, conn as CanvasConnection])
    }, [currentMapId, settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    // Map Management
    const createMap = useCallback(async (name: string) => {
        if (settings.is_demo_mode) {
            const newMap = {
                id: `demo-map-${Date.now()}`,
                name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_archived: false
            } as CanvasMap
            const session = getSessionCanvas()
            session.maps = [newMap, ...session.maps]
            saveSessionCanvas(session)
            setMaps(session.maps)
            setCurrentMapId(newMap.id)
            return
        }
        const { data, error } = await supabase.from('studio_canvas_maps').insert([{ name }]).select()
        if (error) { console.error('Create map error:', error.message); return }
        const newMap = data?.[0] as CanvasMap
        if (newMap) {
            setMaps(prev => [newMap, ...prev])
            setCurrentMapId(newMap.id)
        }
    }, [settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const addNodeToMap = useCallback(async (id: string, type: 'entry' | 'project' | 'content' = 'entry', x: number = 100, y: number = 100) => {
        if (!currentMapId) return
        if (settings.is_demo_mode) {
            const newNode: any = { id: `demo-mn-${Date.now()}`, map_id: currentMapId, x, y }
            if (type === 'entry') newNode.entry_id = id
            else if (type === 'project') newNode.project_id = id
            else if (type === 'content') newNode.content_id = id

            const session = getSessionCanvas()
            session.mapNodes = [...session.mapNodes, newNode]
            saveSessionCanvas(session)
            setMapNodes(session.mapNodes.filter((n: any) => n.map_id === currentMapId))
            return
        }
        const nodeData: any = { map_id: currentMapId, x, y }
        if (type === 'entry') nodeData.entry_id = id
        else if (type === 'project') nodeData.project_id = id
        else if (type === 'content') nodeData.content_id = id

        const { error } = await supabase.from('studio_canvas_map_nodes').insert([nodeData])
        if (error) console.error('Add node to map error:', error.message)
        else await fetchMapNodes()
    }, [currentMapId, fetchMapNodes, settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const deleteMapNode = useCallback(async (id: string) => {
        if (!currentMapId) return
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            session.connections = session.connections.filter((c: any) => (c.from_id !== id && c.to_id !== id) || c.map_id !== currentMapId)
            session.mapNodes = session.mapNodes.filter((n: any) => !((n.entry_id === id || n.project_id === id || n.content_id === id) && n.map_id === currentMapId))
            saveSessionCanvas(session)
            setConnections(session.connections.filter((c: any) => c.map_id === currentMapId))
            setMapNodes(session.mapNodes.filter((n: any) => n.map_id === currentMapId))
            return
        }
        const node = mapNodes.find(n => (n.entry_id === id || n.project_id === id || n.content_id === id) && n.map_id === currentMapId)
        if (!node) return

        // Cleanup connections involving this node to prevent dangling lines
        const { error: connError } = await supabase.from('studio_canvas_connections').delete().or(`from_id.eq.${id},to_id.eq.${id}`)
        if (connError) console.error('Clear connections error:', connError.message)

        const { error } = await supabase.from('studio_canvas_map_nodes').delete().eq('id', node.id)
        if (error) console.error('Delete map node error:', error.message)
        else {
            setConnections(prev => prev.filter(c => c.from_id !== id && c.to_id !== id))
            await fetchMapNodes()
        }
    }, [currentMapId, mapNodes, fetchMapNodes, settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const deleteMap = useCallback(async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            session.maps = session.maps.filter((m: any) => m.id !== id)
            session.mapNodes = session.mapNodes.filter((n: any) => n.map_id !== id)
            session.connections = session.connections.filter((c: any) => c.map_id !== id)
            saveSessionCanvas(session)
            setMaps(session.maps)
            if (currentMapId === id) setCurrentMapId(session.maps[0]?.id || null)
            return
        }
        const { error } = await supabase.from('studio_canvas_maps').delete().eq('id', id)
        if (error) { console.error('Delete map error:', error.message); return }
        setMaps(prev => prev.filter(m => m.id !== id))
        if (currentMapId === id) setCurrentMapId(maps.find(m => m.id !== id)?.id || null)
    }, [currentMapId, maps, settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const renameMap = useCallback(async (id: string, name: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            session.maps = session.maps.map((m: any) => m.id === id ? { ...m, name, updated_at: new Date().toISOString() } : m)
            saveSessionCanvas(session)
            setMaps(session.maps)
            return
        }
        const { error } = await supabase.from('studio_canvas_maps').update({ name }).eq('id', id)
        if (error) { console.error('Rename map error:', error.message); return }
        setMaps(prev => prev.map(m => m.id === id ? { ...m, name } : m))
    }, [settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const archiveMap = useCallback(async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            session.maps = session.maps.map((m: any) => m.id === id ? { ...m, is_archived: true, updated_at: new Date().toISOString() } : m)
            saveSessionCanvas(session)
            setMaps(session.maps.filter((m: any) => !m.is_archived))
            if (currentMapId === id) setCurrentMapId(null)
            return
        }
        const { error } = await supabase.from('studio_canvas_maps').update({ is_archived: true }).eq('id', id)
        if (error) { console.error('Archive map error:', error.message); return }
        setMaps(prev => prev.filter(m => m.id !== id))
        if (currentMapId === id) setCurrentMapId(null)
    }, [currentMapId, settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    const deleteConnection = useCallback(async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionCanvas()
            session.connections = session.connections.filter((c: any) => c.id !== id)
            saveSessionCanvas(session)
            setConnections(session.connections)
            return
        }
        const { error } = await supabase.from('studio_canvas_connections').delete().eq('id', id)
        if (error) { console.error('Canvas delete connection error:', error.message); return }
        setConnections(prev => prev.filter(c => c.id !== id))
    }, [settings.is_demo_mode, getSessionCanvas, saveSessionCanvas])

    return {
        entries, connections, loading,
        maps, currentMapId, setCurrentMapId, mapNodes,
        createEntry, updateEntry, updateNodePosition, deleteEntry, archiveEntry, togglePin,
        createConnection, deleteConnection,
        createMap, fetchMaps, addNodeToMap, deleteMapNode, deleteMap, archiveMap, renameMap,
        refresh: fetchEntries
    }
}
