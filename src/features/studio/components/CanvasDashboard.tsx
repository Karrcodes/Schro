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
        createEntry, updateEntry, updateNodePosition, deleteEntry, archiveEntry, togglePin,
        createConnection, deleteConnection,
    } = useCanvas()
    const [viewMode, setViewMode] = useState<ViewMode>('board')
    const [selectedEntry, setSelectedEntry] = useState<StudioCanvasEntry | null>(null)
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

    const connectedIds = useMemo(() => {
        const set = new Set<string>()
        connections.forEach(c => { set.add(c.from_id); set.add(c.to_id) })
        return set
    }, [connections])

    const connectionCountMap = useMemo(() => {
        const map: Record<string, number> = {}
        connections.forEach(c => {
            map[c.from_id] = (map[c.from_id] || 0) + 1
            map[c.to_id] = (map[c.to_id] || 0) + 1
        })
        return map
    }, [connections])

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 h-[96px] border-b border-black/[0.06] bg-[#fafafa] flex-shrink-0 shadow-sm z-10">
                <div>
                    <h1 className="text-[22px] font-bold text-black tracking-tight">Canvas</h1>
                    <p className="text-[12px] text-black/35 mt-0.5">Brainstorm · Studio Module</p>
                </div>
                <div className="flex items-center gap-3">
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
                    <div className="text-[11px] text-black/25 uppercase tracking-wider font-medium hidden sm:block">
                        {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                </div>
            </div>

            {/* Web View */}
            {viewMode === 'web' && (
                <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 96px)' }}>
                    <CanvasWebView
                        entries={entries}
                        connections={connections}
                        onNodeClick={setSelectedEntry}
                        onCreateConnection={createConnection}
                        onDeleteConnection={deleteConnection}
                        onUpdatePosition={updateNodePosition}
                        onDeleteNode={deleteEntry}
                        onArchiveNode={archiveEntry}
                    />
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
