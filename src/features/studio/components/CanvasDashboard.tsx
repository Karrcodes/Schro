'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { PenLine, Search, Pin, Plus, X, LayoutGrid, Network } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanvas } from '../hooks/useCanvas'
import CanvasCard from './CanvasCard'
import CanvasEntryModal from './CanvasEntryModal'
import CanvasWebView from './CanvasWebView'
import type { StudioCanvasEntry, CanvasColor } from '../types/studio.types'

type ViewMode = 'board' | 'web'

export default function CanvasDashboard() {
    const {
        entries, connections, loading,
        maps, currentMapId, setCurrentMapId, mapNodes,
        createEntry, updateEntry, updateNodePosition, deleteEntry, archiveEntry, togglePin,
        createConnection, deleteConnection,
        createMap, addNodeToMap, deleteMapNode
    } = useCanvas()
    const [viewMode, setViewMode] = useState<ViewMode>('board')
    const [selectedEntry, setSelectedEntry] = useState<StudioCanvasEntry | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [search, setSearch] = useState('')
    const [filterTag, setFilterTag] = useState<string | null>(null)
    const [pinnedFirst, setPinnedFirst] = useState(true)
    const [quickTitle, setQuickTitle] = useState('')
    const quickInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { quickInputRef.current?.focus() }, [])

    const allTags = useMemo(() => {
        const set = new Set<string>()
        entries.forEach(e => e.tags?.forEach(t => set.add(t)))
        return Array.from(set).sort()
    }, [entries])

    const filtered = useMemo(() => {
        let list = entries
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(e => e.title.toLowerCase().includes(q) || e.body?.toLowerCase().includes(q))
        }
        if (filterTag) list = list.filter(e => e.tags?.includes(filterTag))
        if (pinnedFirst) list = [...list.filter(e => e.pinned), ...list.filter(e => !e.pinned)]
        return list
    }, [entries, search, filterTag, pinnedFirst])

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
            const entry = entries.find(e => e.id === mn.entry_id)
            if (!entry) return null
            return { ...entry, web_x: mn.x, web_y: mn.y }
        }).filter(Boolean) as StudioCanvasEntry[]
    }, [mapNodes, entries, currentMapId])

    const unmappedEntries = useMemo(() => {
        const mappedIds = new Set(mapNodes.map(m => m.entry_id))
        return entries.filter(e => !mappedIds.has(e.id))
    }, [entries, mapNodes])

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
                            <select
                                value={currentMapId || ''}
                                onChange={e => setCurrentMapId(e.target.value)}
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

            {/* Web View */}
            {viewMode === 'web' && (
                <div className="flex-1 flex relative overflow-hidden" style={{ height: 'calc(100vh - 96px)' }}>
                    {/* Node Library Side Panel */}
                    {isImporting && (
                        <div className="w-72 bg-white border-r border-black/[0.06] flex flex-col z-20 animate-in slide-in-from-left duration-300">
                            <div className="p-4 border-b border-black/[0.03] flex items-center justify-between">
                                <h3 className="text-[12px] font-black uppercase tracking-tight text-black/40">Idea Library</h3>
                                <button onClick={() => setIsImporting(false)}><X className="w-4 h-4 text-black/20" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {unmappedEntries.length === 0 ? (
                                    <p className="text-[11px] text-black/30 italic text-center py-10">All ideas are already in this map</p>
                                ) : (
                                    unmappedEntries.map(e => (
                                        <button
                                            key={e.id}
                                            onClick={() => addNodeToMap(e.id)}
                                            className="w-full text-left p-3 rounded-xl border border-black/[0.04] hover:border-black/20 hover:bg-black/[0.01] transition-all group"
                                        >
                                            <p className="text-[12px] font-bold text-black line-clamp-1">{e.title}</p>
                                            <p className="text-[10px] text-black/30 mt-0.5 line-clamp-1 group-hover:text-indigo-500">+ Add to map</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 flex flex-col">
                        {currentMapId ? (
                            <CanvasWebView
                                entries={entriesInMap}
                                connections={connections}
                                onNodeClick={setSelectedEntry}
                                onCreateConnection={createConnection}
                                onDeleteConnection={deleteConnection}
                                onUpdatePosition={updateNodePosition}
                                onDeleteNode={deleteMapNode}
                                onArchiveNode={archiveEntry}
                                onCreateNode={(data) => createEntry({ ...data })}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center bg-[#f7f7f7] gap-4">
                                <div className="p-6 bg-white border border-black/[0.06] rounded-3xl shadow-sm text-center max-w-sm">
                                    <Network className="w-10 h-10 text-black/10 mx-auto mb-4" />
                                    <h3 className="text-[16px] font-bold text-black">Create your first mindmap</h3>
                                    <p className="text-[12px] text-black/40 mt-2 mb-6 leading-relaxed">Organize your thoughts and connect ideas visually in independent maps.</p>
                                    <button
                                        onClick={handleCreateMap}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-2xl text-[13px] font-bold hover:bg-black/80 transition-all shadow-xl active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Get Started
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Board View */}
            {viewMode === 'board' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20 flex-1 flex flex-col gap-6">

                        {/* Quick Capture Bar */}
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
                                            connectionCount={connectionCountMap[entry.id] || 0}
                                            onClick={() => setSelectedEntry(entry)}
                                            onPin={() => togglePin(entry.id, entry.pinned)}
                                            onArchive={() => archiveEntry(entry.id)}
                                            onDelete={() => deleteEntry(entry.id)}
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
                onDelete={(id) => { deleteEntry(id); setSelectedEntry(null) }}
                onArchive={(id) => { archiveEntry(id); setSelectedEntry(null) }}
                onPromoteToSpark={handlePromoteToSpark}
            />
        </div>
    )
}
