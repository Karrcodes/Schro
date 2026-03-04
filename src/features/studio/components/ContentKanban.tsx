'use client'

import { useState, useRef } from 'react'
import { Video, Calendar, CheckCircle2, Trash2, Plus, Zap, Briefcase, Shield, ListTodo, MoreVertical } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import type { StudioContent, ContentStatus, StudioProject, StudioMilestone } from '../types/studio.types'
import { cn } from '@/lib/utils'
import PlatformIcon from './PlatformIcon'
import ContentDetailModal from './ContentDetailModal'
import CreateContentModal from './CreateContentModal'
import ConfirmationModal from '@/components/ConfirmationModal'

const CONTENT_COLUMNS: { label: string; value: ContentStatus; dot: string }[] = [
    { label: 'Idea', value: 'idea', dot: 'bg-black/10' },
    { label: 'Scripted', value: 'scripted', dot: 'bg-blue-400' },
    { label: 'Filmed', value: 'filmed', dot: 'bg-purple-400' },
    { label: 'Edited', value: 'edited', dot: 'bg-orange-400' },
    { label: 'Scheduled', value: 'scheduled', dot: 'bg-cyan-400' },
    { label: 'Published', value: 'published', dot: 'bg-emerald-400' },
]

const PRIORITY_STYLES: Record<string, { pill: string; border: string; bg: string }> = {
    urgent: { pill: 'bg-purple-50 text-purple-600 border-purple-100', border: 'border-black/[0.05]', bg: 'bg-white' },
    high: { pill: 'bg-red-50 text-red-600 border-red-100', border: 'border-black/[0.05]', bg: 'bg-white' },
    mid: { pill: 'bg-yellow-50 text-yellow-600 border-yellow-100', border: 'border-black/[0.05]', bg: 'bg-white' },
    low: { pill: 'bg-black/5 text-black/40 border-transparent', border: 'border-black/[0.05]', bg: 'bg-white' },
}

export default function ContentKanban({
    hideHeader = false,
    searchQuery = '',
    layout = 'focused'
}: {
    hideHeader?: boolean
    searchQuery?: string
    layout?: 'focused' | 'board' | 'compact'
}) {
    const { content, projects, milestones, updateContent, deleteContent, loading } = useStudio()

    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [activeStatus, setActiveStatus] = useState<ContentStatus>('idea')
    const [dragOverStatus, setDragOverStatus] = useState<ContentStatus | null>(null)
    const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [showArchived, setShowArchived] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [contentToArchive, setContentToArchive] = useState<StudioContent | null>(null)

    // Unified filtering logic
    const filteredContent = content.filter(item => {
        const matchesSearch = !searchQuery ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.type?.toLowerCase().includes(searchQuery.toLowerCase())

        const isArchivedMatch = showArchived ? item.is_archived : !item.is_archived

        return matchesSearch && isArchivedMatch
    })

    const handlePointerDrop = async (contentId: string, x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        let targetStatus: ContentStatus | null = null
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.columnStatus) {
                targetStatus = el.dataset.columnStatus as ContentStatus
                break
            }
        }
        setDraggingId(null)
        setDragOverStatus(null)
        if (targetStatus && contentId) {
            try {
                await updateContent(contentId, { status: targetStatus })
            } catch (err) {
                console.error('Failed to update content status:', err)
            }
        }
    }

    const handlePointerDragOver = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.columnStatus) {
                setDragOverStatus(el.dataset.columnStatus as ContentStatus)
                return
            }
        }
    }

    return (
        <div className="space-y-6">
            {!hideHeader && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-[22px] font-bold text-black tracking-tight">Content Pipeline</h1>
                            <p className="text-[12px] text-black/35 mt-0.5">Studio Module · Creative Production</p>
                        </div>
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                                showArchived
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                    : "bg-black/[0.03] text-black/30 border-transparent hover:border-black/10 hover:text-black/60"
                            )}
                        >
                            <Shield className={cn("w-3 h-3", showArchived ? "text-white" : "text-black/20")} />
                            {showArchived ? 'Viewing Archives' : 'View Archives'}
                        </button>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-[12px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 self-start sm:self-auto"
                    >
                        <Plus className="w-4 h-4" />
                        New Content
                    </button>
                </div>
            )}
            {hideHeader && (
                <div className="flex justify-between items-center mb-2">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                            showArchived
                                ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                : "bg-black/[0.03] text-black/30 border-transparent hover:border-black/10 hover:text-black/60"
                        )}
                    >
                        <Shield className={cn("w-3 h-3", showArchived ? "text-white" : "text-black/20")} />
                        {showArchived ? 'Viewing Archives' : 'View Archives'}
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-[12px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10"
                    >
                        <Plus className="w-4 h-4" />
                        New Content
                    </button>
                </div>
            )}

            {/* Status Tabs - Focused View (Now Global) */}
            <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                {CONTENT_COLUMNS.map(column => {
                    const isActive = activeStatus === column.value
                    const isOver = dragOverStatus === column.value
                    const count = filteredContent.filter(c => c.status === column.value).length

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
                                isOver && "bg-orange-50 text-orange-600 scale-[1.05] z-10"
                            )}
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full", column.dot)} />
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

            {/* Content Display (Focused) */}
            <div
                data-column-status={activeStatus}
                className={cn(
                    "rounded-[32px] transition-all min-h-[600px] border-2 border-transparent",
                    dragOverStatus === activeStatus ? "bg-orange-50/50 border-orange-200 shadow-inner" :
                        draggingId ? "bg-black/[0.01] border-dashed border-black/[0.05]" : "bg-transparent"
                )}
            >
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-black/[0.02] border border-black/[0.05] rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                        {filteredContent
                            .filter(c => c.status === activeStatus)
                            .length === 0 ? (
                            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-10">
                                <Video className="w-12 h-12 mb-4" />
                                <p className="text-[14px] font-black uppercase tracking-[0.2em]">No items in {activeStatus}</p>
                            </div>
                        ) : (
                            filteredContent
                                .filter(c => c.status === activeStatus)
                                .map(item => (
                                    <ContentCard
                                        key={item.id}
                                        item={item}
                                        project={projects.find(p => p.id === item.project_id)}
                                        milestones={milestones.filter(m => m.content_id === item.id)}
                                        onPointerDragStart={(id) => setDraggingId(id)}
                                        onPointerDragOver={handlePointerDragOver}
                                        onPointerDrop={handlePointerDrop}
                                        onPointerDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                                        onClick={() => setSelectedContentId(item.id)}
                                        onArchive={() => setContentToArchive(item)}
                                        onDelete={() => setDeleteConfirmId(item.id)}
                                    />
                                ))
                        )}
                    </div>
                )}
            </div>

            <ContentDetailModal
                isOpen={!!selectedContentId}
                onClose={() => setSelectedContentId(null)}
                item={content.find(c => c.id === selectedContentId) || null}
            />
            <CreateContentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            <ConfirmationModal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={() => {
                    if (deleteConfirmId) deleteContent(deleteConfirmId)
                    setDeleteConfirmId(null)
                }}
                title="Delete Content"
                message="Are you sure you want to delete this content item? This action is permanent."
                confirmText="Delete Content"
                type="danger"
            />

            <ConfirmationModal
                isOpen={!!contentToArchive}
                onClose={() => setContentToArchive(null)}
                onConfirm={async () => {
                    if (contentToArchive) {
                        await updateContent(contentToArchive.id, { is_archived: !contentToArchive.is_archived })
                    }
                }}
                title={contentToArchive?.is_archived ? "Unarchive Content" : "Archive Content"}
                message={contentToArchive?.is_archived
                    ? `Are you sure you want to unarchive "${contentToArchive?.title}"? It will be moved back to your content pipeline.`
                    : `Are you sure you want to archive "${contentToArchive?.title}"? You can view it later by enabling the Archive view.`}
                confirmText={contentToArchive?.is_archived ? "Unarchive" : "Archive Content"}
                type={contentToArchive?.is_archived ? "info" : "info"}
            />
        </div>
    )
}

function ContentCard({ item, project, milestones, onPointerDragStart, onPointerDragOver, onPointerDrop, onPointerDragEnd, onClick, onArchive, onDelete }: {
    item: StudioContent
    project?: StudioProject
    milestones: StudioMilestone[]
    onPointerDragStart: (id: string) => void
    onPointerDragOver: (x: number, y: number) => void
    onPointerDrop: (id: string, x: number, y: number) => void
    onPointerDragEnd: () => void
    onClick: () => void
    onArchive: () => void
    onDelete: () => void
}) {
    const { updateContent } = useStudio()
    const isDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)
    const priority = item.priority ?? 'low'
    const styles = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low
    const deadline = item.deadline || item.publish_date

    const handleArchive = async (e: React.MouseEvent) => {
        e.stopPropagation()
        onArchive()
    }

    const handleCoverPointerDown = (e: React.PointerEvent) => {
        e.preventDefault()
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

                // Create floating ghost card
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
                    'transform:rotate(-2deg) scale(0.95)',
                    'opacity:0.96',
                    'transition:none',
                    'line-height:1.3',
                ].join(';')
                ghost.innerHTML = `
                    <div style="width:100%;height:80px;border-radius:8px;margin-bottom:6px;background:#f5f5f5;overflow:hidden;">
                        <img src="${item.cover_url || `/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.category || '')}&type=content&id=${item.id}&w=1200&h=630`}" style="width:100%;height:100%;object-fit:cover;" />
                    </div>
                    <div style="font-size:11px;font-weight:800;color:#000;margin-bottom:2px;font-family:inherit;">${item.title}</div>
                    ${item.category ? `<div style="font-size:9px;color:rgba(0,0,0,0.4);font-family:inherit;">${item.category}</div>` : ''}
                `
                document.body.appendChild(ghost)
            }
            if (isDragging.current) {
                onPointerDragOver(ev.clientX, ev.clientY)
                if (ghost) {
                    ghost.style.left = `${ev.clientX - 90}px`
                    ghost.style.top = `${ev.clientY - 30}px`
                }
            }
        }

        const handleUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)
            if (ghost) { ghost.remove(); ghost = null }
            setIsDraggingThis(false)
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

    return (
        <div
            className={cn(
                "group relative bg-white border border-black/[0.05] rounded-2xl hover:border-orange-200 hover:shadow-xl transition-all overflow-hidden",
                isDraggingThis && "opacity-30 scale-95 shadow-none"
            )}
        >
            {/* Cover image area */}
            <div
                onPointerDown={handleCoverPointerDown}
                className="w-full h-24 overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
                style={{ touchAction: 'none' }}
            >
                <img
                    src={item.cover_url || `/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.category || '')}&type=content&id=${item.id}&w=1200&h=630`}
                    alt={item.title}
                    className={cn(
                        "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                        !item.cover_url && "opacity-80"
                    )}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
            </div>

            <div className="p-4">
                {/* Top row: platforms + type + published check + Date/Impact */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <div className="flex -space-x-1 mr-1">
                                {item.platforms?.map(p => (
                                    <div key={p} className="w-4 h-4 rounded-full bg-white border border-black/[0.1] flex items-center justify-center text-black shadow-sm z-[1]" title={p}>
                                        <PlatformIcon platform={p} className="w-2.5 h-2.5" />
                                    </div>
                                ))}
                            </div>
                            {item.category && (
                                <div className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight bg-black/[0.03] text-black/40 w-fit truncate">
                                    {item.category}
                                </div>
                            )}
                        </div>
                        {item.status === 'published' && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span className="text-[8px] font-black text-emerald-900 uppercase">Published</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-2">
                            {deadline && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-black/30 uppercase tracking-tighter">
                                    <Calendar className="w-2.5 h-2.5" />
                                    {new Date(deadline + (deadline.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </div>
                            )}
                            {(item.impact_score != null) && (
                                <div className="flex items-center gap-0.5">
                                    <Zap className="w-3 h-3 text-orange-500 fill-orange-500" />
                                    <span className="text-[11px] font-black text-orange-600">
                                        {item.impact_score}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h4 className="text-[13px] font-black text-black leading-tight group-hover:text-orange-600 transition-colors mb-2">
                    {item.title}
                </h4>

                {/* Milestones List - limit 3 */}
                {milestones.length > 0 && (
                    <div className="space-y-1 mb-3">
                        {milestones.slice(0, 3).map(m => (
                            <div key={m.id} className="flex items-center gap-1.5 text-[10px] font-bold text-black/40">
                                <ListTodo className={cn("w-2.5 h-2.5", m.status === 'completed' ? "text-emerald-500" : "text-amber-500")} />
                                <span className={cn(m.status === 'completed' && "line-through opacity-50")}>{m.title}</span>
                            </div>
                        ))}
                        {milestones.length > 3 && (
                            <p className="text-[9px] font-black text-black/20 ml-4">+{milestones.length - 3} more milestones</p>
                        )}
                    </div>
                )}

                {/* Priority row */}
                <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter w-fit border",
                        priority === 'urgent' ? "bg-purple-50 text-purple-600 border-purple-100" :
                            priority === 'high' ? "bg-red-50 text-red-600 border-red-100" :
                                priority === 'mid' ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                                    "bg-black/5 text-black/40 border-transparent"
                    )}>
                        {priority}
                    </div>
                    {item.type && (
                        <span className="text-[9px] font-bold text-black/30 ml-auto">{item.type}</span>
                    )}
                </div>

                {/* Project tag */}
                {project && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/40 bg-black/[0.03] w-fit px-2 py-0.5 rounded-md mb-3">
                        <Briefcase className="w-2.5 h-2.5" />
                        {project.title}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-black/[0.03] flex items-center justify-end">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleArchive}
                            className={cn(
                                "p-1.5 rounded-lg transition-all flex items-center justify-center",
                                item.is_archived
                                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    : "bg-black/[0.03] text-black/30 hover:bg-black/5 hover:text-black"
                            )}
                            title={item.is_archived ? "Unarchive Content" : "Archive Content"}
                        >
                            <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete()
                            }}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center"
                            title="Delete Content"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 rounded-md hover:bg-black/5 text-black/20 hover:text-black/60 transition-all">
                            <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
