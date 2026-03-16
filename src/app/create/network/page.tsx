'use client'

import React, { useState } from 'react'
import { Activity, Plus, Search, Users, Globe, MapPin, ExternalLink, MessageCircle, Hash, Calendar, Inbox, CheckCircle2, Trash2 } from 'lucide-react'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import CreateNetworkModal from '@/features/studio/components/CreateNetworkModal'
import NetworkDetailModal from '@/features/studio/components/NetworkDetailModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import type { StudioNetwork, NetworkType } from '@/features/studio/types/studio.types'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<NetworkType, any> = {
    person: Users,
    community: Globe,
    event: MapPin
}

const TYPE_COLORS: Record<NetworkType, string> = {
    person: 'text-orange-600 bg-orange-50',
    community: 'text-blue-600 bg-blue-50',
    event: 'text-emerald-600 bg-emerald-50'
}

export default function NetworkPage() {
    const { networks, loading, updateNetwork, deleteNetwork } = useStudio()
    const { settings } = useSystemSettings()
    const networkReachOutDays = settings.network_reach_out_days || 30
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<StudioNetwork | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<NetworkType>('person')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [networkToDelete, setNetworkToDelete] = useState<StudioNetwork | null>(null)

    // Person Focus Tabs & DnD State
    const [activePersonCategory, setActivePersonCategory] = useState<'new_contact' | 'reach_out_soon' | 'recently_contacted'>('new_contact')
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverCategory, setDragOverCategory] = useState<'new_contact' | 'reach_out_soon' | 'recently_contacted' | null>(null)

    const PERSON_COLUMNS = [
        { label: 'New Contact', value: 'new_contact', icon: Plus, color: 'text-blue-500 bg-blue-50' },
        { label: 'Reach Out Soon', value: 'reach_out_soon', icon: Inbox, color: 'text-orange-500 bg-orange-50' },
        { label: 'Recently Contacted', value: 'recently_contacted', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' }
    ]

    const handlePointerDragStart = (id: string) => setDraggingId(id)

    const handlePointerDragOver = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.categoryStatus) {
                setDragOverCategory(el.dataset.categoryStatus as any)
                return
            }
        }
        setDragOverCategory(null)
    }

    const handlePointerDrop = async (networkId: string, x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        let targetCategory: string | null = null
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.categoryStatus) {
                targetCategory = el.dataset.categoryStatus
                break
            }
        }
        setDraggingId(null)
        setDragOverCategory(null)

        if (targetCategory && networkId) {
            const network = networks.find(n => n.id === networkId)
            if (network && network.type === 'person') {
                let newDate = network.last_contact
                if (targetCategory === 'new_contact') newDate = ''
                else if (targetCategory === 'recently_contacted') newDate = new Date().toISOString().split('T')[0]
                else if (targetCategory === 'reach_out_soon') {
                    const date = new Date()
                    date.setDate(date.getDate() - (networkReachOutDays + 1))
                    newDate = date.toISOString().split('T')[0]
                }

                try {
                    await updateNetwork(networkId, { last_contact: newDate })
                } catch (err) {
                    console.error('Failed to move network person:', err)
                }
            }
        }
    }

    const allUniqueTags = Array.from(new Set(networks.flatMap(n => n.tags || []))).sort()

    const filteredNetworks = networks.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.platform && item.platform.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
        const matchesType = item.type === filterType
        const matchesTags = selectedTags.length === 0 || selectedTags.every(t => item.tags?.includes(t))

        let matchesPersonCategory = true
        if (filterType === 'person' && item.type === 'person') {
            const daysSinceContact = item.last_contact
                ? Math.floor((new Date().getTime() - new Date(item.last_contact).getTime()) / (1000 * 3600 * 24))
                : -1

            let itemCategory = ''
            if (!item.last_contact) itemCategory = 'new_contact'
            else if (daysSinceContact > networkReachOutDays) itemCategory = 'reach_out_soon'
            else itemCategory = 'recently_contacted'

            matchesPersonCategory = itemCategory === activePersonCategory
        }

        return matchesSearch && matchesType && matchesTags && matchesPersonCategory
    })

    return (
        <main className="pb-24 pt-8 md:pt-10 px-6 md:px-10">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em]">Studio Protocol</h2>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Creative Network</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mb-1">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                placeholder="Search network..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-11 pr-4 py-2.5 bg-white border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 w-full md:w-64 shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-black/10 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Add Contact
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-black/[0.05] overflow-x-auto pb-4">
                    {(Object.keys(TYPE_ICONS) as NetworkType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border",
                                filterType === type
                                    ? "bg-black text-white border-black"
                                    : "bg-white border-black/[0.05] text-black/40 hover:border-black/20"
                            )}
                        >
                            <span className={cn(filterType === type ? "text-white" : TYPE_COLORS[type].split(' ')[0])}>
                                {React.createElement(TYPE_ICONS[type], { className: "w-3.5 h-3.5" })}
                            </span>
                            {type} ({networks.filter(n => n.type === type).length})
                        </button>
                    ))}
                </div>

                {/* Focus Tabs for Persons */}
                {filterType === 'person' && (
                    <div className="flex items-center gap-1 p-1 mt-3 bg-black/[0.03] rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                        {PERSON_COLUMNS.map(column => {
                            const isActive = activePersonCategory === column.value
                            const isOver = dragOverCategory === column.value
                            const Icon = column.icon

                            return (
                                <button
                                    key={column.value}
                                    data-category-status={column.value}
                                    onClick={() => setActivePersonCategory(column.value as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all relative whitespace-nowrap",
                                        isActive
                                            ? "bg-white text-black shadow-sm"
                                            : "text-black/30 hover:text-black/60",
                                        isOver && "bg-purple-50 text-purple-600 z-10 shadow-md ring-1 ring-purple-200"
                                    )}
                                >
                                    <Icon className={cn("w-3.5 h-3.5", isActive ? column.color.split(' ')[0] : "text-current")} />
                                    {column.label}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Tag Filters */}
                {allUniqueTags.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-4 custom-scrollbar">
                        <Hash className="w-4 h-4 text-black/20 shrink-0 mr-1" />
                        {allUniqueTags.map(tag => {
                            const isSelected = selectedTags.includes(tag)
                            return (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTags(prev =>
                                        isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                                    )}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border shrink-0",
                                        isSelected
                                            ? "bg-purple-50 text-purple-600 border-purple-200"
                                            : "bg-white text-black/40 border-black/[0.05] hover:border-black/20"
                                    )}
                                >
                                    #{tag}
                                </button>
                            )
                        })}
                        {selectedTags.length > 0 && (
                            <button
                                onClick={() => setSelectedTags([])}
                                className="px-2 py-1 ml-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {/* Network List Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[400px]">
                    {filteredNetworks.map(item => (
                        <NetworkCard
                            key={item.id}
                            item={item}
                            onClick={() => setSelectedItem(item)}
                            thresholdDays={networkReachOutDays}
                            onPointerDragStart={handlePointerDragStart}
                            onPointerDragOver={handlePointerDragOver}
                            onPointerDrop={handlePointerDrop}
                            onPointerDragEnd={() => { setDraggingId(null); setDragOverCategory(null) }}
                            onDelete={(i) => setNetworkToDelete(i)}
                        />
                    ))}
                    {filteredNetworks.length === 0 && !loading && (
                        <div className="col-span-full py-20 bg-black/[0.015] border-2 border-dashed border-black/[0.05] rounded-[40px] flex flex-col items-center justify-center text-center px-6">
                            <Activity className="w-12 h-12 text-black/10 mb-4" />
                            <p className="text-[13px] font-bold text-black/20 italic">No network entries found in this category.</p>
                        </div>
                    )}
                </div>
            </div>

            <CreateNetworkModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
            <NetworkDetailModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
            />
            <ConfirmationModal
                isOpen={!!networkToDelete}
                onClose={() => setNetworkToDelete(null)}
                onConfirm={async () => {
                    if (networkToDelete) {
                        await deleteNetwork(networkToDelete.id)
                        setNetworkToDelete(null)
                    }
                }}
                title="Delete Contact"
                message={`Are you sure you want to delete "${networkToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />
        </main>
    )
}

function NetworkCard({
    item, onClick, thresholdDays,
    onPointerDragStart, onPointerDragOver, onPointerDrop, onPointerDragEnd, onDelete
}: {
    item: StudioNetwork; onClick: () => void; thresholdDays: number;
    onPointerDragStart?: (id: string) => void;
    onPointerDragOver?: (x: number, y: number) => void;
    onPointerDrop?: (id: string, x: number, y: number) => void;
    onPointerDragEnd?: () => void;
    onDelete?: (item: StudioNetwork) => void;
}) {
    const Icon = TYPE_ICONS[item.type]

    // Drag and Drop Logic
    const isDragging = React.useRef(false)
    const startPos = React.useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)
    const [imgError, setImgError] = useState(false)

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!onPointerDragStart || !onPointerDragOver || !onPointerDrop || !onPointerDragEnd) return
        if (e.button !== 0) return
        // Don't drag if clicking a button or an anchor
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return
        // Only allow dragging Persons
        if (item.type !== 'person') return

        startPos.current = { x: e.clientX, y: e.clientY }
        isDragging.current = false

        let ghost: HTMLDivElement | null = null

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPos.current.x
            const dy = ev.clientY - startPos.current.y

            if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDragging.current = true
                setIsDraggingThis(true)
                onPointerDragStart(item.id)

                // Clear text selection
                window.getSelection()?.removeAllRanges()

                ghost = document.createElement('div')
                ghost.style.cssText = [
                    'position:fixed', 'pointer-events:none', 'z-index:9999', 'width:200px', 'background:white',
                    'border-radius:24px', 'box-shadow:0 24px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
                    'padding:16px', 'transform:rotate(-2deg) scale(0.95)', 'opacity:0.96', 'transition:none', 'font-family:inherit'
                ].join(';')

                ghost.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <div style="width:32px;height:32px;background:rgba(0,0,0,0.03);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;">
                            👤
                        </div>
                        <div style="font-size:12px;font-weight:900;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${item.name}</div>
                    </div>
                `
                document.body.appendChild(ghost)
            }

            if (isDragging.current) {
                onPointerDragOver(ev.clientX, ev.clientY)
                if (ghost) {
                    ghost.style.left = `${ev.clientX - 10}px`
                    ghost.style.top = `${ev.clientY - 10}px`
                }
            }
        }

        const handleUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)
            if (ghost) { ghost.remove(); ghost = null }
            setIsDraggingThis(false)
            onPointerDragEnd()

            if (isDragging.current) {
                onPointerDrop(item.id, ev.clientX, ev.clientY)
                isDragging.current = false
            } else {
                onClick()
            }
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    }

    const getHostName = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '')
        } catch {
            return url.length > 20 ? url.substring(0, 20) + '...' : url
        }
    }

    return (
        <div
            onPointerDown={handlePointerDown}
            onClick={() => { if (!isDraggingThis) onClick() }}
            style={{ touchAction: 'none' }}
            className={cn(
                "p-4 bg-white border border-black/[0.05] rounded-[32px] hover:border-purple-200 hover:shadow-xl transition-all group flex flex-col cursor-pointer select-none h-fit",
                isDraggingThis && "opacity-30 scale-95 shadow-none"
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={cn("px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5", TYPE_COLORS[item.type])}>
                    <Icon className="w-3 h-3" />
                    {item.type}
                </div>
                <div className="flex items-center gap-2 opacity-100">
                    {item.platform && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-black/30">
                            <MessageCircle className="w-3 h-3" />
                            {item.platform}
                        </div>
                    )}
                </div>
            </div>

            <h3 className="text-[16px] font-black text-black group-hover:text-purple-600 transition-colors leading-tight mb-3">{item.name}</h3>

            {item.url && !imgError && (
                <div className="w-full aspect-video bg-black/[0.02] rounded-xl overflow-hidden mb-3 border border-black/[0.05] shrink-0">
                    <img
                        src={`https://s0.wp.com/mshots/v1/${encodeURIComponent(item.url.startsWith('http') ? item.url : `https://${item.url}`)}?w=400`}
                        alt="Website Preview"
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                </div>
            )}

            {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-black/[0.02] text-black/50 rounded-md text-[9px] font-bold flex items-center gap-0.5">
                            <Hash className="w-2.5 h-2.5" />
                            {tag}
                        </span>
                    ))}
                    {item.tags.length > 3 && (
                        <span className="px-2 py-0.5 bg-black/[0.02] text-black/30 rounded-md text-[9px] font-bold">
                            +{item.tags.length - 3}
                        </span>
                    )}
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-black/[0.05] flex items-center justify-between">
                {(() => {
                    let label = item.status.replace('_', ' ')
                    let colorClass = "bg-black/[0.04] text-black/30"

                    if (item.type === 'person') {
                        if (!item.last_contact) {
                            label = "New Contact"
                            colorClass = "bg-blue-50 text-blue-600"
                        } else {
                            const daysSinceContact = Math.floor((new Date().getTime() - new Date(item.last_contact).getTime()) / (1000 * 3600 * 24))
                            if (daysSinceContact > thresholdDays) {
                                label = "Reach Out Soon"
                                colorClass = "bg-orange-50 text-orange-600"
                            } else {
                                label = "Recently Contacted"
                                colorClass = "bg-emerald-50 text-emerald-600"
                            }
                        }
                    } else if (item.category) {
                        label = item.category
                        colorClass = "bg-purple-50 text-purple-600"
                    } else if (item.status === 'connected' || item.status === 'attended' || item.status === 'attending') {
                        colorClass = "bg-purple-50 text-purple-600"
                    }

                    return (
                        <span className={cn("text-[9px] font-black uppercase px-2 py-1 rounded-lg", colorClass)}>
                            {label}
                        </span>
                    )
                })()}

                <div className="flex items-center gap-2">
                    {item.event_date && item.type === 'event' && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-black/40 pr-2 border-r border-black/[0.05]">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.event_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item);
                            }}
                            className="p-1 rounded-md text-red-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
                            title="Delete Contact"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
