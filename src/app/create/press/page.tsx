'use client'

import React, { useState, useRef } from 'react'
import { Award, Globe, Shield, Target, Zap, Plus, Search, Filter, Calendar, Rocket, Pin, Archive, Trash2, ArrowDownUp, CheckCircle2, Clock, XCircle, Send, ExternalLink } from 'lucide-react'
import { useStudio } from '@/features/studio/hooks/useStudio'
import CreatePressModal from '@/features/studio/components/CreatePressModal'
import PressDetailModal from '@/features/studio/components/PressDetailModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import type { StudioPress, PressType, PressStatus } from '@/features/studio/types/studio.types'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<PressType, any> = {
    competition: Award,
    grant: Target,
    award: Zap,
    feature: Globe,
    accelerator: Shield,
    other: Award
}

const TYPE_COLORS: Record<PressType, string> = {
    competition: 'text-orange-600 bg-orange-50',
    grant: 'text-emerald-600 bg-emerald-50',
    award: 'text-yellow-600 bg-yellow-50',
    feature: 'text-blue-600 bg-blue-50',
    accelerator: 'text-purple-600 bg-purple-50',
    other: 'text-slate-600 bg-slate-50'
}

const FOCUS_TABS: { label: string; value: PressStatus | 'all'; icon: any; color: string }[] = [
    { label: 'All Entries', value: 'all', icon: Filter, color: 'text-black bg-black/[0.05]' },
    { label: 'Backlog', value: 'not_started', icon: Clock, color: 'text-slate-600 bg-slate-50' },
    { label: 'Active', value: 'applying', icon: Target, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending', value: 'submitted', icon: Send, color: 'text-orange-600 bg-orange-50' },
    { label: 'Won', value: 'achieved', icon: Award, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Published', value: 'published', icon: Globe, color: 'text-purple-600 bg-purple-50' },
    { label: 'Declined', value: 'rejected', icon: XCircle, color: 'text-red-600 bg-red-50' }
]

export default function PressPage() {
    const { press, loading, updatePress, deletePress, projects } = useStudio()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showArchived, setShowArchived] = useState(false)
    const [filterType, setFilterType] = useState<PressType | 'all'>('all')
    const [activeStatus, setActiveStatus] = useState<PressStatus | 'all'>('all')
    const [sortByDeadline, setSortByDeadline] = useState(false)

    // Actions & Modals
    const [itemToDelete, setItemToDelete] = useState<StudioPress | null>(null)
    const [itemToArchive, setItemToArchive] = useState<StudioPress | null>(null)

    // DnD State
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<PressStatus | 'all' | null>(null)

    const handlePointerDragStart = (id: string) => setDraggingId(id)

    const handlePointerDragOver = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.focusStatus) {
                setDragOverStatus(el.dataset.focusStatus as any)
                return
            }
        }
        setDragOverStatus(null)
    }

    const handlePointerDrop = async (pressId: string, x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        let targetStatus: PressStatus | 'all' | null = null
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.focusStatus) {
                targetStatus = el.dataset.focusStatus as any
                break
            }
        }
        setDraggingId(null)
        setDragOverStatus(null)

        if (targetStatus && targetStatus !== 'all' && pressId) {
            try {
                await updatePress(pressId, { status: targetStatus as PressStatus })
            } catch (err) {
                console.error('Failed to move press item:', err)
            }
        }
    }

    const filteredPress = press.filter(item => {
        const archiveMatch = showArchived ? item.is_archived : !item.is_archived
        if (!archiveMatch) return false

        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.organization.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === 'all' || item.type === filterType
        const matchesStatus = activeStatus === 'all' || item.status === activeStatus

        return matchesSearch && matchesType && matchesStatus
    }).sort((a, b) => {
        if (!showArchived && a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1

        if (sortByDeadline) {
            if (!a.deadline) return 1
            if (!b.deadline) return -1
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        }

        // Default sort by created_at (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const selectedItem = press.find(p => p.id === selectedItemId) || null

    return (
        <main className="pb-24 pt-8 md:pt-10 px-6 md:px-10">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em]">Creative Protocol</h2>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Press &amp; Media</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mb-1">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                placeholder="Search press..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-11 pr-4 py-2.5 bg-white border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 w-full md:w-64 shadow-sm relative z-0"
                            />
                        </div>
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={cn(
                                "flex items-center gap-2 px-4 h-[42px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                                showArchived
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                    : "bg-black/[0.03] text-black/30 border-transparent hover:border-black/10 hover:text-black/60"
                            )}
                        >
                            <Shield className={cn("w-3.5 h-3.5", showArchived ? "text-white" : "text-black/20")} />
                            {showArchived ? 'Archives' : 'View Archives'}
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-black/10 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Add Entry
                        </button>
                    </div>
                </header>

                {/* Sub Filters & Sorting */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-black/[0.05] overflow-x-auto pb-4 custom-scrollbar">
                        <button
                            onClick={() => setFilterType('all')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0",
                                filterType === 'all' ? "bg-black text-white" : "bg-white border border-black/[0.05] text-black/40 hover:border-black/20"
                            )}
                        >
                            All Types
                        </button>
                        {(Object.keys(TYPE_ICONS) as PressType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border shrink-0",
                                    filterType === type
                                        ? "bg-black text-white border-black"
                                        : "bg-white border-black/[0.05] text-black/40 hover:border-black/20"
                                )}
                            >
                                <span className={cn(filterType === type ? "text-white" : TYPE_COLORS[type].split(' ')[0])}>
                                    {React.createElement(TYPE_ICONS[type], { className: "w-3 h-3" })}
                                </span>
                                {type} ({press.filter(p => p.type === type && !p.is_archived).length})
                            </button>
                        ))}
                    </div>

                    {/* Focus Tabs & Sorting */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                        <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar shrink-0">
                            {FOCUS_TABS.map(tab => {
                                const isActive = activeStatus === tab.value
                                const isOver = dragOverStatus === tab.value && tab.value !== 'all'
                                const Icon = tab.icon

                                return (
                                    <button
                                        key={tab.value}
                                        data-focus-status={tab.value}
                                        onClick={() => setActiveStatus(tab.value)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all relative whitespace-nowrap shrink-0",
                                            isActive
                                                ? "bg-white text-black shadow-sm"
                                                : "text-black/30 hover:text-black/60",
                                            isOver && "bg-orange-50 text-orange-600 shadow-md ring-1 ring-orange-200 z-10"
                                        )}
                                    >
                                        <Icon className={cn("w-3.5 h-3.5", isActive ? tab.color.split(' ')[0] : "text-current")} />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>

                        <button
                            onClick={() => setSortByDeadline(!sortByDeadline)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border shrink-0 md:ml-auto",
                                sortByDeadline ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-white text-black/40 border-black/[0.05] hover:border-black/20"
                            )}
                        >
                            <ArrowDownUp className="w-3.5 h-3.5" />
                            Sort by Deadline
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[400px]">
                    {filteredPress.map(item => (
                        <PressCard
                            key={item.id}
                            item={item}
                            onClick={() => setSelectedItemId(item.id)}
                            projects={projects}
                            onPointerDragStart={handlePointerDragStart}
                            onPointerDragOver={handlePointerDragOver}
                            onPointerDrop={handlePointerDrop}
                            onPointerDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                            onTogglePin={async (e) => {
                                e.stopPropagation()
                                await updatePress(item.id, { is_pinned: !item.is_pinned })
                            }}
                            onArchiveRequest={(e) => {
                                e.stopPropagation()
                                setItemToArchive(item)
                            }}
                            onDeleteRequest={(e) => {
                                e.stopPropagation()
                                setItemToDelete(item)
                            }}
                        />
                    ))}
                    {filteredPress.length === 0 && !loading && (
                        <div className="col-span-full py-20 bg-black/[0.015] border-2 border-dashed border-black/[0.05] rounded-[40px] flex flex-col items-center justify-center text-center px-6">
                            <Award className="w-12 h-12 text-black/10 mb-4" />
                            <p className="text-[14px] font-bold text-black/40 tracking-tight">No press matching your filters</p>
                        </div>
                    )}
                </div>
            </div>

            <CreatePressModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
            <PressDetailModal
                isOpen={!!selectedItemId}
                onClose={() => setSelectedItemId(null)}
                item={selectedItem}
            />

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={async () => {
                    if (itemToDelete) {
                        try {
                            await deletePress(itemToDelete.id)
                        } catch (err: any) {
                            alert(`Failed to delete: ${err.message}`)
                        }
                        setItemToDelete(null)
                    }
                }}
                title="Delete Entry"
                message={`Are you sure you want to permanently delete "${itemToDelete?.title}"? This cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />

            <ConfirmationModal
                isOpen={!!itemToArchive}
                onClose={() => setItemToArchive(null)}
                onConfirm={async () => {
                    if (itemToArchive) {
                        try {
                            await updatePress(itemToArchive.id, { is_archived: true })
                        } catch (err: any) {
                            alert(`Failed to archive: ${err.message}`)
                        }
                        setItemToArchive(null)
                    }
                }}
                title="Archive Entry"
                message={`Are you sure you want to archive "${itemToArchive?.title}"? It will be removed from this view.`}
                confirmText="Archive"
                type="warning"
            />
        </main>
    )
}

interface PressCardProps {
    item: StudioPress;
    onClick: () => void;
    projects: any[];
    onPointerDragStart?: (id: string) => void;
    onPointerDragOver?: (x: number, y: number) => void;
    onPointerDrop?: (id: string, x: number, y: number) => void;
    onPointerDragEnd?: () => void;
    onTogglePin: (e: React.MouseEvent) => void;
    onArchiveRequest: (e: React.MouseEvent) => void;
    onDeleteRequest: (e: React.MouseEvent) => void;
}

function PressCard({ item, onClick, projects, onPointerDragStart, onPointerDragOver, onPointerDrop, onPointerDragEnd, onTogglePin, onArchiveRequest, onDeleteRequest }: PressCardProps) {
    const Icon = TYPE_ICONS[item.type]
    const project = projects.find(p => p.id === item.project_id)

    // Drag and Drop Logic
    const isDragging = useRef(false)
    const wasDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!onPointerDragStart || !onPointerDragOver || !onPointerDrop || !onPointerDragEnd) return
        if (e.button !== 0) return
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return

        startPos.current = { x: e.clientX, y: e.clientY }
        isDragging.current = false
        wasDragging.current = false

        let ghost: HTMLDivElement | null = null

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPos.current.x
            const dy = ev.clientY - startPos.current.y

            if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDragging.current = true
                wasDragging.current = true
                setIsDraggingThis(true)
                onPointerDragStart(item.id)

                document.body.style.userSelect = 'none'
                window.getSelection()?.removeAllRanges()

                ghost = document.createElement('div')
                ghost.style.cssText = [
                    'position:fixed', 'pointer-events:none', 'z-index:9999', 'width:200px', 'background:white',
                    'border-radius:24px', 'box-shadow:0 24px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
                    'padding:16px', 'transform:rotate(-2deg) scale(0.95)', 'opacity:0.96', 
                    'transition:transform 0.1s linear, opacity 0.1s linear', 'font-family:inherit'
                ].join(';')

                ghost.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <div style="width:32px;height:32px;background:rgba(0,0,0,0.03);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;">
                            📰
                        </div>
                        <div style="font-size:12px;font-weight:900;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${item.title}</div>
                    </div>
                `
                document.body.appendChild(ghost)
            }

            if (isDragging.current) {
                // Calculate proximity to targets
                const targets = document.querySelectorAll('[data-focus-status]')
                let minDistance = 1000

                targets.forEach(t => {
                    const rect = t.getBoundingClientRect()
                    const cx = rect.left + rect.width / 2
                    const cy = rect.top + rect.height / 2
                    const dist = Math.sqrt(Math.pow(ev.clientX - cx, 2) + Math.pow(ev.clientY - cy, 2))
                    if (dist < minDistance) minDistance = dist
                })

                const startShrink = 300
                const minScaleDist = 40
                const factor = Math.max(0, Math.min(1, (minDistance - minScaleDist) / (startShrink - minScaleDist)))
                const targetScale = 0.5 + (factor * 0.45)
                const targetOpacity = 0.6 + (factor * 0.36)

                onPointerDragOver(ev.clientX, ev.clientY)
                if (ghost) {
                    ghost.style.left = `${ev.clientX - 100}px`
                    ghost.style.top = `${ev.clientY - 40}px`
                    ghost.style.transform = `rotate(-2deg) scale(${targetScale})`
                    ghost.style.opacity = `${targetOpacity}`
                }
            }
        }

        const handleUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)
            document.body.style.userSelect = ''
            if (ghost) { ghost.remove(); ghost = null }
            setIsDraggingThis(false)
            onPointerDragEnd()

            if (isDragging.current) {
                onPointerDrop(item.id, ev.clientX, ev.clientY)
                isDragging.current = false
            }
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    }

    return (
        <div
            onPointerDown={handlePointerDown}
            onClick={() => {
                if (wasDragging.current) return
                onClick()
            }}
            style={{ touchAction: 'none' }}
            className={cn(
                "p-4 bg-white border border-black/[0.05] rounded-[32px] hover:border-orange-200 hover:shadow-xl transition-all group flex flex-col select-none h-fit",
                isDraggingThis && "opacity-40 scale-95 shadow-none ring-2 ring-orange-500 cursor-grabbing cursor-pointer",
                !isDraggingThis && "cursor-pointer",
                item.is_pinned && "border-orange-200/50 bg-orange-50/10"
            )}
        >
            {/* Cover Image */}
            <div className="relative h-32 -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-[32px] group-hover:scale-[1.02] transition-transform duration-500">
                {item.cover_url ? (
                    <img 
                        src={item.cover_url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className={cn("w-full h-full flex items-center justify-center opacity-20", TYPE_COLORS[item.type].split(' ')[1])}>
                        <Icon className="w-10 h-10" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-60" />
                
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                    <div className={cn("px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border border-black/5 pointer-events-auto", TYPE_COLORS[item.type])}>
                        <Icon className="w-3 h-3" />
                        {item.type}
                    </div>
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onTogglePin(e); }}
                            className={cn(
                                "p-1.5 rounded-lg transition-all shadow-sm border border-black/5 backdrop-blur-md bg-white/60",
                                item.is_pinned ? "text-orange-500" : "text-black/20 hover:text-black"
                            )}
                            title={item.is_pinned ? "Unpin" : "Pin"}
                        >
                            <Pin className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            <h3 className="text-[15px] font-black text-black group-hover:text-orange-600 transition-colors leading-tight mb-0.5">{item.title}</h3>
            <p className="text-[12px] font-bold text-black/40 mb-3">{item.organization}</p>

            {item.milestone_goal && (
                <div className="p-3 bg-black/[0.02] rounded-2xl mb-4 border border-black/[0.03]">
                    <p className="text-[11px] text-black/60 font-medium line-clamp-3 italic">"{item.milestone_goal}"</p>
                </div>
            )}

            <div className="mt-1 pt-3 border-t border-black/[0.05]">
                <div className="flex items-center justify-between mb-2">
                    {project && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-black/40">
                            <Rocket className="w-3 h-3" />
                            {project.title}
                        </div>
                    )}
                    {item.deadline && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-black/40 ml-auto">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-lg mt-1",
                        item.status === 'applying' || item.status === 'submitted' ? "bg-blue-50 text-blue-600" :
                            item.status === 'achieved' || item.status === 'published' ? "bg-emerald-50 text-emerald-600" :
                                "bg-black/[0.04] text-black/30"
                    )}>
                        {item.status.replace('_', ' ')}
                    </span>

                    <div className="flex items-center gap-1">
                        {item.url && (
                            <a
                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg text-black/20 hover:bg-orange-50 hover:text-orange-600 transition-all"
                                title="View Link"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onArchiveRequest(e); }}
                            className="p-1.5 rounded-lg text-black/20 hover:bg-black/5 hover:text-black transition-all"
                            title="Archive"
                        >
                            <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onDeleteRequest(e); }}
                            className="p-1.5 rounded-lg text-black/20 hover:bg-red-50 hover:text-red-500 transition-all"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
