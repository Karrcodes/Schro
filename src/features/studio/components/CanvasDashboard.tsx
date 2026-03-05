'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { PenLine, Search, Pin, Plus, X, LayoutGrid, Network, Trash2, Archive, RotateCcw, Video, Rocket, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import CanvasCard from './CanvasCard'
import CanvasEntryModal from './CanvasEntryModal'
import CanvasWebView from './CanvasWebView'
import { useStudioContext } from '../context/StudioContext'
import { useCanvas } from '../hooks/useCanvas'
import { supabase } from '@/lib/supabase'
import type { StudioCanvasEntry, CanvasColor, StudioProject, StudioContent, CanvasMap, CanvasMapNode, CanvasConnection, PolymorphicNode } from '../types/studio.types'

type ViewMode = 'board' | 'web'

export default function CanvasDashboard() {
    const {
        entries, connections, loading: canvasLoading,
        maps, currentMapId, setCurrentMapId, mapNodes, nodeLinks,
        createEntry, updateEntry, updateNodePosition, deleteEntry, archiveEntry, togglePin,
        createConnection, deleteConnection,
        createMap, addNodeToMap, deleteMapNode, deleteMap, archiveMap, fetchMaps, renameMap,
        nodeAddLink, nodeRemoveLink,
        refresh: refreshCanvas
    } = useCanvas()

    const { projects, content, loading: studioLoading } = useStudioContext()

    const [viewMode, setViewMode] = useState<ViewMode>('board')
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
    const [showArchivedMaps, setShowArchivedMaps] = useState(false)
    const [libraryTab, setLibraryTab] = useState<'notes' | 'projects' | 'content'>('notes')
    const [selectedEntry, setSelectedEntry] = useState<StudioCanvasEntry | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [showBrowser, setShowBrowser] = useState(false)
    const [search, setSearch] = useState('')
    const [filterTag, setFilterTag] = useState<string | null>(null)
    const [pinnedFirst, setPinnedFirst] = useState(true)
    const [quickTitle, setQuickTitle] = useState('')
    const [confirmAction, setConfirmAction] = useState<{
        type: 'delete_note' | 'archive_note' | 'delete_map' | 'archive_map' | 'rename_map',
        id: string,
        title: string
    } | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const quickInputRef = useRef<HTMLInputElement>(null)

    const loading = studioLoading || canvasLoading

    useEffect(() => {
        refreshCanvas()
    }, [refreshCanvas])

    useEffect(() => {
        fetchMaps(showArchivedMaps)
    }, [fetchMaps, showArchivedMaps])

    const isBoard = viewMode === 'board'

    useEffect(() => {
        if (viewMode === 'board') quickInputRef.current?.focus()
    }, [viewMode])

    const allTags = useMemo(() => {
        const set = new Set<string>()
        entries.forEach(e => e.tags?.forEach(t => set.add(t)))
        return Array.from(set).sort()
    }, [entries])

    const filtered = useMemo(() => {
        let list = entries.filter(e => e.is_archived === (activeTab === 'archived'))
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(e => e.title.toLowerCase().includes(q) || e.body?.toLowerCase().includes(q))
        }
        if (filterTag) list = list.filter(e => e.tags?.includes(filterTag))
        if (pinnedFirst && activeTab === 'active') list = [...list.filter(e => e.pinned), ...list.filter(e => !e.pinned)]
        return list
    }, [entries, search, filterTag, pinnedFirst, activeTab])

    const handleQuickCreate = async () => {
        if (!quickTitle.trim()) return
        await createEntry({ title: quickTitle.trim() })
        setQuickTitle('')
    }

    const handlePromoteToSpark = async (entry: StudioCanvasEntry) => {
        window.open(`/create/sparks?from_canvas=${encodeURIComponent(entry.title)}`, '_self')
    }

    const connectionCountMap = useMemo(() => {
        const map: Record<string, number> = {}
        connections.forEach(c => {
            map[c.from_id] = (map[c.from_id] || 0) + 1
            map[c.to_id] = (map[c.to_id] || 0) + 1
        })
        return map
    }, [connections])

    const entriesInMap = useMemo(() => {
        if (!currentMapId) return []
        return mapNodes.map(mn => {
            if (mn.entry_id) {
                const entry = entries.find(e => e.id === mn.entry_id && !e.is_archived)
                return entry ? { ...entry, web_x: mn.x, web_y: mn.y, node_type: 'entry' as const } : null
            }
            if (mn.project_id) {
                const project = projects.find(p => p.id === mn.project_id)
                return project ? { ...project, web_x: mn.x, web_y: mn.y, node_type: 'project' as const } : null
            }
            if (mn.content_id) {
                const c = content.find(item => item.id === mn.content_id)
                return c ? { ...c, web_x: mn.x, web_y: mn.y, node_type: 'content' as const } : null
            }
            return null
        }).filter(Boolean) as PolymorphicNode[]
    }, [mapNodes, entries, projects, content, currentMapId])

    const unmappedEntries = useMemo(() => {
        const mappedIds = new Set(mapNodes.map(m => m.entry_id))
        return entries.filter(e => !mappedIds.has(e.id) && !e.is_archived)
    }, [entries, mapNodes])

    const unmappedProjects = useMemo(() => {
        const mappedIds = new Set(mapNodes.map(m => m.project_id))
        return projects.filter(p => !mappedIds.has(p.id))
    }, [projects, mapNodes])

    const unmappedContent = useMemo(() => {
        const mappedIds = new Set(mapNodes.map(m => m.content_id))
        return content.filter(c => !mappedIds.has(c.id))
    }, [content, mapNodes])

    const getLinkedInfo = (entryId: string) => {
        return nodeLinks
            .filter(l => l.entry_id === entryId)
            .map(l => {
                if (l.target_type === 'project') {
                    const p = projects.find(p => p.id === l.target_id)
                    return p ? { id: p.id, type: 'project' as const, title: p.title } : null
                } else {
                    const c = content.find(c => c.id === l.target_id)
                    return c ? { id: c.id, type: 'content' as const, title: c.title } : null
                }
            })
            .filter(Boolean) as { id: string; type: 'project' | 'content'; title: string }[]
    }

    const activeMap = useMemo(() => maps.find(m => m.id === currentMapId), [maps, currentMapId])

    const handleCreateMap = async () => {
        const name = prompt('Map Name:', `Brainstorm ${maps.length + 1}`)
        if (name) await createMap(name)
    }

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 h-[96px] border-b border-black/[0.06] bg-[#fafafa] flex-shrink-0 shadow-sm z-30">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-[22px] font-bold text-black tracking-tight">Canvas</h1>
                        <p className="text-[12px] text-black/35 mt-0.5">Brainstorm · Studio Module</p>
                    </div>

                    {viewMode === 'web' && maps.length > 0 && (
                        <div className="h-10 w-px bg-black/[0.06] mx-2 hidden md:block" />
                    )}

                    {viewMode === 'web' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowBrowser(!showBrowser)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border",
                                    showBrowser ? "bg-black text-white border-black" : "bg-black/[0.03] text-black/50 border-black/[0.06] hover:border-black/20"
                                )}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                {showBrowser ? "Back to Canvas" : "All Maps"}
                            </button>

                            <div className="h-4 w-px bg-black/[0.06] mx-1" />

                            <select
                                value={currentMapId || ''}
                                onChange={e => { setCurrentMapId(e.target.value); setShowBrowser(false) }}
                                className="bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-1.5 text-[12px] font-bold outline-none focus:ring-2 ring-indigo-500/20"
                            >
                                {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                {maps.length === 0 && <option value="">No Mindmaps</option>}
                            </select>
                            <button onClick={handleCreateMap} className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center hover:bg-black/80 transition-all shadow-md active:scale-95">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* View Archived Toggle for Board */}
                    {viewMode === 'board' && (
                        <button
                            onClick={() => setActiveTab(activeTab === 'active' ? 'archived' : 'active')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all border",
                                activeTab === 'archived' ? "bg-amber-500 text-white border-amber-600" : "bg-white text-black/50 border-black/[0.06] hover:border-black/20"
                            )}
                        >
                            <Archive className="w-3.5 h-3.5" />
                            {activeTab === 'archived' ? "View Active" : "View Archived"}
                        </button>
                    )}

                    {/* Import toggle */}
                    {viewMode === 'web' && currentMapId && (
                        <button
                            onClick={() => setIsImporting(!isImporting)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all border",
                                isImporting ? "bg-black text-white border-black" : "bg-white text-black/50 border-black/[0.06] hover:border-black/20"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            {isImporting ? "Close Library" : "Import Node"}
                        </button>
                    )}

                    {/* View toggle */}
                    <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.04] items-center gap-0.5">
                        {([
                            { label: 'Board', value: 'board' as const, icon: LayoutGrid },
                            { label: 'Node', value: 'web' as const, icon: Network },
                        ] as const).map(({ label, value, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={() => setViewMode(value)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all",
                                    viewMode === value ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60'
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* View Switching */}
            {viewMode === 'web' ? (
                <div className="flex-1 flex relative overflow-hidden" style={{ height: 'calc(100vh - 96px)' }}>
                    {showBrowser ? (
                        <div className="flex-1 bg-white overflow-y-auto p-8 sm:p-12 z-20">
                            <div className="max-w-6xl mx-auto">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                                    <div>
                                        <h2 className="text-[32px] font-black text-black tracking-tight">Mindmap Browser</h2>
                                        <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.04] inline-flex mt-2">
                                            <button
                                                onClick={() => setShowArchivedMaps(false)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                                                    !showArchivedMaps ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                                )}
                                            >
                                                Active
                                            </button>
                                            <button
                                                onClick={() => setShowArchivedMaps(true)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                                                    showArchivedMaps ? "bg-amber-500 text-white shadow-sm" : "text-black/30 hover:text-black/50"
                                                )}
                                            >
                                                Archive
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCreateMap}
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-wider shadow-xl hover:bg-black/80 transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New Mindmap
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {maps.map(map => {
                                        const nodeCount = mapNodes.filter(mn => mn.map_id === map.id).length
                                        const connCount = connections.filter(c => c.map_id === map.id).length
                                        const isActive = currentMapId === map.id

                                        return (
                                            <div
                                                key={map.id}
                                                onClick={() => { setCurrentMapId(map.id); setShowBrowser(false) }}
                                                className={cn(
                                                    "group relative flex flex-col bg-white border-2 rounded-[32px] p-7 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 cursor-pointer overflow-hidden",
                                                    isActive ? "border-indigo-500 bg-indigo-50/20 shadow-xl shadow-indigo-100/50" : "border-black/[0.04] hover:border-black/10"
                                                )}
                                            >
                                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-500" />

                                                <div className="flex items-start justify-between mb-8 relative z-10">
                                                    <div className={cn(
                                                        "p-4 rounded-[20px] transition-all duration-500 group-hover:rotate-6",
                                                        isActive ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200" : "bg-black/[0.04] text-black/40 group-hover:bg-indigo-50"
                                                    )}>
                                                        <Network className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 opacity-20 group-hover:opacity-100 transition-all duration-300">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setRenameValue(map.name);
                                                                setConfirmAction({ type: 'rename_map', id: map.id, title: map.name })
                                                            }}
                                                            className="p-2.5 hover:bg-black/5 rounded-xl text-black/40 hover:text-black hover:scale-110 active:scale-95 transition-all"
                                                            title="Rename"
                                                        >
                                                            <PenLine className="w-4 h-4" />
                                                        </button>
                                                        {!showArchivedMaps ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmAction({ type: 'archive_map', id: map.id, title: map.name })
                                                                }}
                                                                className="p-2.5 rounded-xl text-black/40 hover:text-white hover:bg-amber-500 hover:scale-110 active:scale-95 transition-all shadow-sm hover:shadow-amber-500/20"
                                                                title="Archive"
                                                            >
                                                                <Archive className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    supabase.from('studio_canvas_maps').update({ is_archived: false }).eq('id', map.id).then(() => fetchMaps(true))
                                                                }}
                                                                className="p-2.5 rounded-xl text-black/40 hover:text-white hover:bg-emerald-500 hover:scale-110 active:scale-95 transition-all shadow-sm hover:shadow-emerald-500/20"
                                                                title="Restore"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmAction({ type: 'delete_map', id: map.id, title: map.name })
                                                            }}
                                                            className="p-2.5 rounded-xl text-black/40 hover:text-white hover:bg-red-500 hover:scale-110 active:scale-95 transition-all shadow-sm hover:shadow-red-500/20"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="relative z-10">
                                                    <h3 className="text-[19px] font-black text-black tracking-tight mb-1 group-hover:text-indigo-600 transition-colors">{map.name}</h3>
                                                    <div className="flex items-center gap-2 mb-6">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
                                                        <p className="text-[10px] text-black/30 font-black uppercase tracking-widest">
                                                            Last Edit {new Date(map.updated_at || map.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-6 border-t border-black/[0.04] flex items-center justify-between relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-black text-black">{nodeCount}</span>
                                                            <span className="text-[9px] font-black uppercase tracking-tighter text-black/25">Nodes</span>
                                                        </div>
                                                        <div className="w-px h-6 bg-black/[0.06]" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-black text-black">{connCount}</span>
                                                            <span className="text-[9px] font-black uppercase tracking-tighter text-black/25">Conns</span>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                                        isActive
                                                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200"
                                                            : "bg-black/[0.05] text-black/30 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                                                    )}>
                                                        {isActive ? "Viewing" : "Open Map"}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {!showArchivedMaps && (
                                        <button
                                            onClick={handleCreateMap}
                                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-black/[0.06] rounded-[32px] hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group group-hover:-translate-y-1 duration-300"
                                        >
                                            <div className="w-12 h-12 bg-black/[0.03] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-all">
                                                <Plus className="w-6 h-6 text-black/20 group-hover:text-indigo-500" />
                                            </div>
                                            <p className="text-[14px] font-black text-black/30 group-hover:text-indigo-600">Create New Map</p>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {isImporting && (
                                <div className="w-72 bg-white border-r border-black/[0.06] flex flex-col z-20 animate-in slide-in-from-left duration-300 shadow-2xl">
                                    <div className="px-6 py-5 border-b border-black/[0.05] flex items-center justify-between shrink-0">
                                        <div>
                                            <h3 className="text-[13px] font-black uppercase tracking-wider text-black">Concept Library</h3>
                                            <p className="text-[10px] text-black/30 font-medium">Add items to this map</p>
                                        </div>
                                        <button onClick={() => setIsImporting(false)} className="p-1.5 hover:bg-black/5 rounded-xl transition-colors text-black/20">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex border-b border-black/[0.05]">
                                        {(['notes', 'projects', 'content'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setLibraryTab(tab)}
                                                className={cn(
                                                    "flex-1 py-3 text-[10px] font-black uppercase tracking-tighter transition-all",
                                                    libraryTab === tab ? "text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600" : "text-black/30 hover:text-black/50"
                                                )}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-12">
                                        {libraryTab === 'notes' && (
                                            unmappedEntries.length === 0 ? (
                                                <EmptyLibrary message="No unmapped ideas" />
                                            ) : (
                                                unmappedEntries.map(e => (
                                                    <LibraryItem key={e.id} id={e.id} type="entry" title={e.title} onClick={() => addNodeToMap(e.id, 'entry' as const)} />
                                                ))
                                            )
                                        )}
                                        {libraryTab === 'projects' && (
                                            unmappedProjects.length === 0 ? (
                                                <EmptyLibrary message="No unmapped projects" />
                                            ) : (
                                                unmappedProjects.map(p => (
                                                    <LibraryItem key={p.id} id={p.id} title={p.title} type="project" onClick={() => addNodeToMap(p.id, 'project' as const)} />
                                                ))
                                            )
                                        )}
                                        {libraryTab === 'content' && (
                                            unmappedContent.length === 0 ? (
                                                <EmptyLibrary message="No unmapped content" />
                                            ) : (
                                                unmappedContent.map(c => (
                                                    <LibraryItem key={c.id} id={c.id} title={c.title} type="content" onClick={() => addNodeToMap(c.id, 'content' as const)} />
                                                ))
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 flex flex-col min-h-0 bg-[#f7f7f7]">
                                {currentMapId ? (
                                    <CanvasWebView
                                        entries={entriesInMap}
                                        connections={connections}
                                        onNodeClick={(node) => {
                                            if (node.node_type === 'entry') {
                                                setSelectedEntry(node as StudioCanvasEntry)
                                            }
                                        }}
                                        onCreateConnection={createConnection}
                                        onDeleteConnection={deleteConnection}
                                        onUpdatePosition={updateNodePosition}
                                        onDeleteNode={(id) => setConfirmAction({ type: 'delete_note', id, title: 'Note' })}
                                        onRemoveNode={deleteMapNode}
                                        onDropNode={addNodeToMap}
                                        onArchiveNode={(id) => setConfirmAction({ type: 'archive_note', id, title: 'Note' })}
                                        onCreateNode={(data) => createEntry({ ...data })}
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                        <div className="p-10 bg-white border border-black/[0.05] rounded-[48px] shadow-2xl shadow-black/5 text-center max-w-sm">
                                            <div className="w-20 h-20 bg-indigo-50 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                                                <Network className="w-10 h-10 text-indigo-500" />
                                            </div>
                                            <h3 className="text-2xl font-black text-black tracking-tight mb-2">Build Your Universe</h3>
                                            <p className="text-[14px] text-black/40 font-medium leading-relaxed mb-8">
                                                Each mindmap is an independent dimension of thought. Start your first session now.
                                            </p>
                                            <button
                                                onClick={handleCreateMap}
                                                className="w-full py-4 bg-indigo-500 text-white rounded-[24px] font-black uppercase text-[12px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-600 hover:-translate-y-1 transition-all active:translate-y-0 active:scale-95"
                                            >
                                                Create First Mindmap
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20 flex-1 flex flex-col gap-6">
                        {/* Quick Capture Bar */}
                        {activeTab === 'active' && (
                            <div className="flex items-center gap-3 bg-white border border-black/[0.07] rounded-2xl px-4 py-3 shadow-sm hover:border-black/10 transition-all focus-within:border-orange-200 focus-within:shadow-orange-500/5">
                                <PenLine className="w-4 h-4 text-black/25 shrink-0" />
                                <input
                                    ref={quickInputRef}
                                    value={quickTitle}
                                    onChange={e => setQuickTitle(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleQuickCreate() }}
                                    placeholder="Capture an idea... press Enter to save"
                                    className="flex-1 text-[14px] font-medium text-black bg-transparent outline-none placeholder:text-black/25"
                                />
                                {quickTitle && (
                                    <button onClick={handleQuickCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[11px] font-black rounded-xl hover:bg-black/80 transition-all shrink-0">
                                        <Plus className="w-3.5 h-3.5" />
                                        Save
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Filter row */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/25" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search ideas..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-black/[0.06] rounded-xl text-[12px] font-medium text-black outline-none focus:border-black/20 transition-all"
                                />
                            </div>
                            {allTags.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {allTags.slice(0, 8).map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                                            className={cn(
                                                "text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all",
                                                filterTag === tag
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-white text-black/50 border-black/[0.08] hover:border-black/20'
                                            )}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                    {filterTag && (
                                        <button onClick={() => setFilterTag(null)} className="w-6 h-6 flex items-center justify-center rounded-full bg-black/[0.05] text-black/40 hover:bg-black/10 transition-all">
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => setPinnedFirst(p => !p)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all",
                                    pinnedFirst
                                        ? 'bg-black/[0.05] text-black/70 border-black/[0.08]'
                                        : 'bg-white text-black/40 border-black/[0.06] hover:border-black/15'
                                )}
                            >
                                <Pin className="w-3 h-3" />
                                Pinned first
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-[11px] text-black/30 font-medium">
                            <span>{entries.length} {entries.length === 1 ? 'idea' : 'ideas'}</span>
                            {entries.filter(e => e.pinned).length > 0 && (
                                <span>· {entries.filter(e => e.pinned).length} pinned</span>
                            )}
                            {connections.length > 0 && <span>· {connections.length} connection{connections.length !== 1 ? 's' : ''}</span>}
                            {filtered.length !== entries.length && <span>· showing {filtered.length}</span>}
                        </div>

                        {/* Grid */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-32 bg-black/[0.02] rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-black/[0.03] flex items-center justify-center">
                                    <PenLine className="w-5 h-5 text-black/20" />
                                </div>
                                <p className="text-[13px] font-bold text-black/20">
                                    {search || filterTag ? 'No matching ideas' : 'Your canvas is empty'}
                                </p>
                                <p className="text-[11px] text-black/15">
                                    {search || filterTag ? 'Try different filters' : 'Capture your first idea above'}
                                </p>
                            </div>
                        ) : (
                            <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                                {filtered.map(entry => (
                                    <div key={entry.id} className="break-inside-avoid mb-3">
                                        <CanvasCard
                                            entry={entry}
                                            links={getLinkedInfo(entry.id)}
                                            connectionCount={connectionCountMap[entry.id] || 0}
                                            onClick={() => setSelectedEntry(entry)}
                                            onPin={() => togglePin(entry.id, entry.pinned)}
                                            onArchive={() => setConfirmAction({ type: 'archive_note', id: entry.id, title: entry.title })}
                                            onDelete={() => setConfirmAction({ type: 'delete_note', id: entry.id, title: entry.title })}
                                            onColorChange={(c: CanvasColor) => updateEntry(entry.id, { color: c })}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            )}

            {/* Detail Modal */}
            <CanvasEntryModal
                entry={selectedEntry}
                isOpen={!!selectedEntry}
                onClose={() => setSelectedEntry(null)}
                onUpdate={(id, upd) => { updateEntry(id, upd); setSelectedEntry(prev => prev ? { ...prev, ...upd } : prev) }}
                onDelete={(id) => setConfirmAction({ type: 'delete_note', id, title: selectedEntry?.title || '' })}
                onArchive={(id) => setConfirmAction({ type: 'archive_note', id, title: selectedEntry?.title || '' })}
                onPromoteToSpark={handlePromoteToSpark}
                links={selectedEntry ? nodeLinks.filter(l => l.entry_id === selectedEntry.id) : []}
                onAddLink={nodeAddLink}
                onRemoveLink={nodeRemoveLink}
            />

            {/* Global Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setConfirmAction(null)}>
                    <div className="bg-white rounded-[32px] p-8 max-w-[360px] w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                            confirmAction.type.includes('delete') ? "bg-red-50 text-red-500" : confirmAction.type === 'rename_map' ? "bg-indigo-50 text-indigo-500" : "bg-amber-50 text-amber-500"
                        )}>
                            {confirmAction.type.includes('delete') ? <Trash2 className="w-6 h-6" /> : confirmAction.type === 'rename_map' ? <PenLine className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
                        </div>

                        <h3 className="text-[18px] font-black tracking-tight text-black mb-2">
                            {confirmAction.type === 'delete_note' && 'Delete Note?'}
                            {confirmAction.type === 'archive_note' && 'Archive Note?'}
                            {confirmAction.type === 'delete_map' && 'Delete Mindmap?'}
                            {confirmAction.type === 'archive_map' && 'Archive Mindmap?'}
                            {confirmAction.type === 'rename_map' && 'Rename Mindmap'}
                        </h3>

                        <p className="text-[13px] text-black/50 leading-relaxed mb-6">
                            {confirmAction.type === 'rename_map' ? 'Enter a new name for your mindmap.' : `Are you sure you want to ${confirmAction.type.includes('delete') ? 'delete' : 'archive'} "${confirmAction.title}"?`}
                        </p>

                        {confirmAction.type === 'rename_map' && (
                            <input
                                autoFocus
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                className="w-full px-4 py-3 bg-black/[0.03] border border-black/[0.06] rounded-xl text-[14px] font-medium mb-8 outline-none focus:border-indigo-500/30"
                                onKeyDown={e => { if (e.key === 'Enter') { renameMap(confirmAction.id, renameValue); setConfirmAction(null) } }}
                            />
                        )}

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={async () => {
                                    if (confirmAction.type === 'delete_note') { await deleteEntry(confirmAction.id); setSelectedEntry(null) }
                                    else if (confirmAction.type === 'archive_note') { await archiveEntry(confirmAction.id); setSelectedEntry(null) }
                                    else if (confirmAction.type === 'delete_map') await deleteMap(confirmAction.id)
                                    else if (confirmAction.type === 'archive_map') await archiveMap(confirmAction.id)
                                    else if (confirmAction.type === 'rename_map') await renameMap(confirmAction.id, renameValue)
                                    setConfirmAction(null)
                                }}
                                className={cn(
                                    "w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 shadow-lg",
                                    confirmAction.type.includes('delete') ? "bg-red-500 text-white hover:bg-red-600" : "bg-black text-white hover:bg-neutral-800"
                                )}
                            >
                                {confirmAction.type === 'rename_map' ? 'Update Name' : 'Confirm Action'}
                            </button>
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-wider text-black/40 hover:bg-black/5 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function EmptyLibrary({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center opacity-30 transition-all">
            <LayoutGrid className="w-10 h-10 mb-3" />
            <p className="text-[12px] font-bold">{message}</p>
            <p className="text-[10px] mt-1">Items available in board view will appear here for mapping.</p>
        </div>
    )
}

function LibraryItem({ id, title, type = 'entry', onClick }: { id: string; title: string; type?: 'entry' | 'project' | 'content'; onClick: () => void }) {
    const isDraggingRef = useRef(false)
    const startPosRef = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 && e.pointerType !== 'touch') return
        e.preventDefault()
        startPosRef.current = { x: e.clientX, y: e.clientY }
        isDraggingRef.current = false

        let ghost: HTMLDivElement | null = null

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPosRef.current.x
            const dy = ev.clientY - startPosRef.current.y
            if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDraggingRef.current = true
                setIsDraggingThis(true)

                ghost = document.createElement('div')
                ghost.style.cssText = [
                    'position:fixed',
                    'pointer-events:none',
                    'z-index:9999',
                    'width:180px',
                    'background:white',
                    'border-radius:14px',
                    'box-shadow:0 24px 48px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.06)',
                    'padding:10px 12px',
                    'font-family:ui-sans-serif, system-ui, sans-serif',
                    'color:#000',
                    'transform:rotate(-2deg) scale(0.95)',
                    'opacity:0.96',
                    'line-height:1.3'
                ].join(';')
                ghost.innerHTML = `
                    <div style="font-size:11px;font-weight:800;color:#000;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
                    <div style="font-size:9px;color:rgba(0,0,0,0.4);text-transform:uppercase;font-weight:bold;">${type}</div>
                `
                document.body.appendChild(ghost)
            }

            if (isDraggingRef.current && ghost) {
                ghost.style.left = `${ev.clientX - 90}px`
                ghost.style.top = `${ev.clientY - 30}px`
            }
        }

        const handleUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)

            if (ghost) { ghost.remove(); ghost = null }
            setIsDraggingThis(false)

            if (isDraggingRef.current) {
                window.dispatchEvent(new CustomEvent('studio-canvas-pointer-drop', {
                    detail: { id, type, clientX: ev.clientX, clientY: ev.clientY }
                }))
                isDraggingRef.current = false
            } else {
                onClick()
            }
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    }

    return (
        <div
            onPointerDown={handlePointerDown}
            className={cn(
                "w-full text-left p-4 rounded-2xl border border-black/[0.05] transition-all group relative overflow-hidden select-none cursor-grab active:cursor-grabbing",
                isDraggingThis ? "opacity-30 scale-95 shadow-none" : "hover:border-indigo-300 hover:bg-indigo-50/30"
            )}
            style={{ touchAction: 'none' }}
        >
            <div className={cn(
                "absolute top-0 right-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-all",
                type === 'project' ? "bg-orange-500" : type === 'content' ? "bg-blue-500" : "bg-indigo-500"
            )} />
            <p className="text-[13px] font-black text-black line-clamp-1">{title}</p>
            <div className="flex items-center gap-1.5 mt-1">
                {type === 'project' ? <Rocket className="w-3 h-3 text-orange-500" /> : type === 'content' ? <Video className="w-3 h-3 text-blue-500" /> : <Plus className="w-3 h-3 text-indigo-500" />}
                <p className={cn(
                    "text-[10px] font-bold uppercase tracking-tighter",
                    type === 'project' ? "text-orange-500/70" : type === 'content' ? "text-blue-500/70" : "text-indigo-500/70"
                )}>
                    {type ? `Map ${type}` : 'Map Idea'}
                </p>
            </div>
        </div>
    )
}
