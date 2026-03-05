'use client'

import { Target, ExternalLink, Calendar, Plus, MoreVertical, Tag, Rocket, Trash2, Search, HelpCircle, Archive, CheckCircle2, Inbox } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useStudio } from '../hooks/useStudio'
import type { StudioSpark, SparkStatus } from '../types/studio.types'
import { cn } from '@/lib/utils'
import SparkDetailModal from './SparkDetailModal'
import ConfirmationModal from '@/components/ConfirmationModal'

interface SparksGridProps {
    searchQuery?: string
    view?: 'grid' | 'list' | 'focused'
    renderAddButton?: () => React.ReactNode
}

const SPARK_COLUMNS: { label: string; value: SparkStatus; icon: any; color: string }[] = [
    { label: 'Inbox', value: 'inbox', icon: Inbox, color: 'text-blue-500 bg-blue-50' },
    { label: 'Review', value: 'review', icon: Search, color: 'text-amber-500 bg-amber-50' },
    { label: 'Utilized', value: 'utilized', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
    { label: 'Discarded', value: 'discarded', icon: Trash2, color: 'text-rose-500 bg-rose-50' }
]

export default function SparksGrid({ searchQuery = '', view = 'focused', renderAddButton }: SparksGridProps) {
    const { sparks: allSparks, projects, updateSpark, deleteSpark, loading } = useStudio()
    const [selectedSparkId, setSelectedSparkId] = useState<string | null>(null)
    const [activeStatus, setActiveStatus] = useState<SparkStatus>('inbox')
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<SparkStatus | null>(null)
    const [sparkToDelete, setSparkToDelete] = useState<StudioSpark | null>(null)

    const filteredSparks = allSparks.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.type.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Pointer-based Drag and Drop Logic
    const handlePointerDragStart = (id: string) => {
        setDraggingId(id)
    }

    const handlePointerDragOver = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.columnStatus) {
                setDragOverStatus(el.dataset.columnStatus as SparkStatus)
                return
            }
        }
    }

    const handlePointerDrop = async (sparkId: string, x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        let targetStatus: SparkStatus | null = null
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.columnStatus) {
                targetStatus = el.dataset.columnStatus as SparkStatus
                break
            }
        }
        setDraggingId(null)
        setDragOverStatus(null)

        if (targetStatus && sparkId) {
            try {
                await updateSpark(sparkId, { status: targetStatus })
            } catch (err) {
                console.error('Failed to move spark:', err)
            }
        }
    }


    if (loading) {
        return (
            <div className={cn(
                "grid gap-4",
                view === 'list' ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            )}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className={cn(
                        "bg-black/[0.02] border border-black/[0.05] rounded-3xl animate-pulse",
                        view === 'list' ? "h-20" : "aspect-[4/5]"
                    )} />
                ))}
            </div>
        )
    }

    if (allSparks.length === 0) {
        return (
            <div className="py-24 flex flex-col items-center justify-center text-center px-4 bg-black/[0.01] rounded-[48px] border-2 border-dashed border-black/[0.03]">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center mb-6">
                    <Target className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-black">Your mind is currenty clear</h3>
                <p className="text-[14px] text-black/40 mt-2 max-w-[320px]">
                    Sparks are the seeds of your future projects. Capture every idea, tool, and link you find interesting.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6 w-full">
            {/* View Switcher Controls and Add Button */}
            {view === 'focused' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                        {SPARK_COLUMNS.map(column => {
                            const isActive = activeStatus === column.value
                            const isOver = dragOverStatus === column.value
                            const count = filteredSparks.filter(s => s.status === column.value).length
                            const Icon = column.icon

                            return (
                                <button
                                    key={column.value}
                                    data-column-status={column.value}
                                    onClick={() => setActiveStatus(column.value)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all relative whitespace-nowrap",
                                        isActive
                                            ? "bg-white text-black shadow-sm"
                                            : "text-black/30 hover:text-black/60",
                                        isOver && "bg-orange-50 text-orange-600 scale-[1.05] z-10 shadow-md ring-1 ring-orange-200"
                                    )}
                                >
                                    <Icon className={cn("w-3.5 h-3.5", isActive ? column.color.split(' ')[0] : "text-current")} />
                                    {column.label}
                                    {count > 0 && (
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-md text-[9px]",
                                            isActive ? "bg-black text-white" : "bg-black/5 text-black/30"
                                        )}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {renderAddButton?.()}
                </div>
            )}

            <div className={cn(
                "grid gap-4 transition-all duration-500",
                view === 'focused' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" :
                    view === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1"
            )}>
                {filteredSparks
                    .filter(s => view === 'focused' ? s.status === activeStatus : true)
                    .map(spark => (
                        view === 'list' ? (
                            <SparkListRow
                                key={spark.id}
                                spark={spark}
                                projects={projects}
                                onClick={() => setSelectedSparkId(spark.id)}
                                onPointerDragStart={handlePointerDragStart}
                                onPointerDragOver={handlePointerDragOver}
                                onPointerDrop={handlePointerDrop}
                                onPointerDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                                onDelete={() => setSparkToDelete(spark)}
                            />
                        ) : (
                            <SparkCard
                                key={spark.id}
                                spark={spark}
                                projects={projects}
                                onClick={() => setSelectedSparkId(spark.id)}
                                onPointerDragStart={handlePointerDragStart}
                                onPointerDragOver={handlePointerDragOver}
                                onPointerDrop={handlePointerDrop}
                                onPointerDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                                onDelete={() => setSparkToDelete(spark)}
                            />
                        )
                    ))}

                {view === 'focused' && filteredSparks.filter(s => s.status === activeStatus).length === 0 && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-10">
                        <Target className="w-12 h-12 mb-4" />
                        <p className="text-[14px] font-black uppercase tracking-[0.2em]">No sparks in {activeStatus}</p>
                    </div>
                )}
            </div>

            <SparkDetailModal
                isOpen={!!selectedSparkId}
                onClose={() => setSelectedSparkId(null)}
                spark={allSparks.find(s => s.id === selectedSparkId) || null}
                projects={projects}
            />

            <ConfirmationModal
                isOpen={!!sparkToDelete}
                onClose={() => setSparkToDelete(null)}
                onConfirm={async () => {
                    if (sparkToDelete) {
                        await deleteSpark(sparkToDelete.id)
                        setSparkToDelete(null)
                    }
                }}
                title="Delete Spark"
                message={`Are you sure you want to delete "${sparkToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />
        </div>
    )
}

function SparkListRow({ spark, projects, onClick, onPointerDragStart, onPointerDragOver, onPointerDrop, onPointerDragEnd, onDelete }: {
    spark: StudioSpark;
    projects: any[];
    onClick: () => void;
    onPointerDragStart: (id: string) => void;
    onPointerDragOver: (x: number, y: number) => void;
    onPointerDrop: (id: string, x: number, y: number) => void;
    onPointerDragEnd: () => void;
    onDelete: () => void;
}) {
    const isDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)
    const linkedProject = projects.find(p => p.id === spark.project_id)
    const [imgError, setImgError] = useState(false)

    const typeEmoji: any = {
        tool: '🛠️',
        resource: '🔗',
        event: '📅'
    }[spark.type] || '✨'

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return
        // Don't drag if clicking a button or an anchor
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return

        startPos.current = { x: e.clientX, y: e.clientY }
        isDragging.current = false

        let ghost: HTMLDivElement | null = null

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPos.current.x
            const dy = ev.clientY - startPos.current.y

            if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDragging.current = true
                setIsDraggingThis(true)
                onPointerDragStart(spark.id)

                // Clear any existing selection to prevent text copying
                window.getSelection()?.removeAllRanges()

                ghost = document.createElement('div')
                ghost.style.cssText = [
                    'position:fixed',
                    'pointer-events:none',
                    'z-index:9999',
                    'width:200px',
                    'background:white',
                    'border-radius:24px',
                    'box-shadow:0 24px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
                    'padding:16px',
                    'transform:rotate(-2deg) scale(0.95)',
                    'opacity:0.96',
                    'transition:none',
                    'font-family:inherit',
                ].join(';')

                ghost.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <div style="width:32px;height:32px;background:rgba(0,0,0,0.03);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;">
                            ${spark.icon_url && !imgError ? `<img src="${spark.icon_url}" style="width:100%;height:100%;object-fit:contain;padding:2px;" />` : typeEmoji}
                        </div>
                        <div style="font-size:12px;font-weight:900;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${spark.title}</div>
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
                onPointerDrop(spark.id, ev.clientX, ev.clientY)
                isDragging.current = false
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
            style={{ touchAction: 'none' }}
            className={cn(
                "group relative px-6 py-4 bg-white border border-black/[0.05] rounded-[24px] hover:border-emerald-200 hover:shadow-lg transition-all flex items-center gap-6 cursor-pointer select-none",
                isDraggingThis && "opacity-30 scale-95 shadow-none"
            )}
        >
            <div className="w-10 h-10 rounded-xl bg-black/[0.02] flex items-center justify-center text-xl border border-black/[0.03] shrink-0">
                {spark.icon_url && !imgError ? (
                    <img src={spark.icon_url} alt="" className="w-full h-full object-contain p-1" onError={() => setImgError(true)} />
                ) : typeEmoji}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <h4 className="text-[14px] font-black text-black group-hover:text-emerald-600 transition-colors truncate">
                        {spark.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-tight shrink-0">
                        {spark.type}
                    </span>
                </div>
                {spark.notes && <p className="text-[11px] text-black/35 truncate mt-0.5">{spark.notes}</p>}
            </div>

            <div className="hidden md:flex items-center gap-4 shrink-0">
                {linkedProject && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50/50 rounded-lg">
                        <Rocket className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-700">{linkedProject.title}</span>
                    </div>
                )}
                <div className="flex items-center gap-1 text-[10px] font-bold text-black/20">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(spark.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-100 ml-auto">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}

function SparkCard({ spark, projects, onClick, onPointerDragStart, onPointerDragOver, onPointerDrop, onPointerDragEnd, onDelete }: {
    spark: StudioSpark;
    projects: any[];
    onClick: () => void;
    onPointerDragStart: (id: string) => void;
    onPointerDragOver: (x: number, y: number) => void;
    onPointerDrop: (id: string, x: number, y: number) => void;
    onPointerDragEnd: () => void;
    onDelete: () => void;
}) {
    const isDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)
    const linkedProject = projects.find(p => p.id === spark.project_id)
    const [imgError, setImgError] = useState(false)

    const typeEmoji: any = {
        tool: '🛠️',
        resource: '🔗',
        event: '📅'
    }[spark.type] || '✨'

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only trigger on left click (button 0)
        if (e.button !== 0) return
        // Don't drag if clicking a button or an anchor
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return

        startPos.current = { x: e.clientX, y: e.clientY }
        isDragging.current = false

        let ghost: HTMLDivElement | null = null

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPos.current.x
            const dy = ev.clientY - startPos.current.y

            if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDragging.current = true
                setIsDraggingThis(true)
                onPointerDragStart(spark.id)

                // Clear any existing selection to prevent text copying
                window.getSelection()?.removeAllRanges()

                // Create floating ghost card
                ghost = document.createElement('div')
                ghost.style.cssText = [
                    'position:fixed',
                    'pointer-events:none',
                    'z-index:9999',
                    'width:200px',
                    'background:white',
                    'border-radius:24px',
                    'box-shadow:0 24px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
                    'padding:16px',
                    'transform:rotate(-2deg) scale(0.95)',
                    'opacity:0.96',
                    'transition:none',
                    'font-family:inherit',
                ].join(';')

                ghost.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <div style="width:32px;height:32px;background:rgba(0,0,0,0.03);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;">
                            ${spark.icon_url && !imgError ? `<img src="${spark.icon_url}" style="width:100%;height:100%;object-fit:contain;padding:2px;" />` : typeEmoji}
                        </div>
                        <div style="font-size:12px;font-weight:900;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${spark.title}</div>
                    </div>
                    <div style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:rgba(0,0,0,0.4);">${spark.type}</div>
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

            if (ghost) {
                ghost.remove()
                ghost = null
            }

            setIsDraggingThis(false)
            onPointerDragEnd()

            if (isDragging.current) {
                onPointerDrop(spark.id, ev.clientX, ev.clientY)
                isDragging.current = false
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
            style={{ touchAction: 'none' }}
            className={cn(
                "group relative p-6 bg-white border border-black/[0.05] rounded-[32px] hover:border-emerald-200 hover:shadow-xl transition-all flex flex-col cursor-pointer active:scale-95 select-none",
                isDraggingThis && "opacity-30 scale-95 shadow-none"
            )}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-2xl bg-black/[0.02] flex items-center justify-center text-xl border border-black/[0.03] group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors overflow-hidden shrink-0 p-1">
                    {spark.icon_url && !imgError ? (
                        <img
                            src={spark.icon_url}
                            alt={spark.title}
                            className="w-full h-full object-contain"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        typeEmoji
                    )}
                </div>
                <div className="flex items-center gap-1.5 opacity-100">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-black/5 text-black/20 hover:text-black transition-all">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-tight">
                        {spark.type}
                    </span>
                    {spark.url && <ExternalLink className="w-3 h-3 text-black/20" />}
                </div>
                <h4 className="text-[15px] font-black text-black leading-tight group-hover:text-emerald-600 transition-colors line-clamp-2">
                    {spark.title}
                </h4>
                {spark.notes && (
                    <p className="text-[12px] text-black/40 line-clamp-3 leading-relaxed font-medium">
                        {spark.notes}
                    </p>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-black/[0.03] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {linkedProject ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50/50 rounded-lg max-w-[140px]">
                            <Rocket className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="text-[10px] font-bold text-blue-700 truncate">{linkedProject.title}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/20">
                            <Tag className="w-3 h-3" />
                            <span>Standalone</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 text-[10px] font-bold text-black/20">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(spark.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>
            </div>
        </div>
    )
}
