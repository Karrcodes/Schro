'use client'

import React, { useState, useRef } from 'react'
import { Video, Calendar, CheckCircle2, Trash2, Plus, Zap, Rocket, Shield, ListTodo, MoreVertical, LayoutGrid, Search, Clock, Sparkles, Globe } from 'lucide-react'
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

const CONTENT_CATEGORIES: { label: string; value: string }[] = [
    { label: 'All Categories', value: 'all' },
    { label: 'Vlog', value: 'Vlog' },
    { label: 'Thoughts', value: 'Thoughts' },
    { label: 'Showcase', value: 'Showcase' },
    { label: 'Concept', value: 'Concept' },
    { label: 'Update', value: 'Update' },
    { label: 'Other', value: 'Other' }
]

interface ContentKanbanProps {
    searchQuery: string
    showArchived: boolean
    sortBy: 'priority' | 'impact' | 'date'
    focusTab: ContentStatus
    onFocusTabChange?: (tab: ContentStatus) => void
    hideHeader?: boolean
    onToggleArchived?: () => void
}

export default function ContentKanban({ 
    searchQuery, 
    showArchived: isArchived, 
    sortBy, 
    focusTab, 
    onFocusTabChange, 
    hideHeader, 
    onToggleArchived 
}: ContentKanbanProps) {
    const { content, projects, milestones, updateContent, deleteContent, generatingContentIds } = useStudio()
    
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<ContentStatus | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
    const [modalInitialTab, setModalInitialTab] = useState<'details' | 'script'>('details')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [localShowArchived, setLocalShowArchived] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [contentToArchive, setContentToArchive] = useState<StudioContent | null>(null)

    const priorityOrder: Record<string, number> = { super: 1, high: 2, mid: 3, low: 4 };

    const filteredContent = content.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.type?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesArchived = isArchived ? !!item.is_archived : !item.is_archived
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
        return matchesSearch && matchesArchived && matchesCategory
    }).sort((a, b) => {
        if (sortBy === 'impact') {
            const diff = (b.impact_score || 0) - (a.impact_score || 0)
            if (diff !== 0) return diff
            return (priorityOrder[a.priority as string || 'low'] || 99) - (priorityOrder[b.priority as string || 'low'] || 99)
        } else if (sortBy === 'priority') {
            const diff = (priorityOrder[a.priority as string || 'low'] || 99) - (priorityOrder[b.priority as string || 'low'] || 99)
            if (diff !== 0) return diff
            return (b.impact_score || 0) - (a.impact_score || 0)
        } else if (sortBy === 'date') {
            const dateA = a.deadline || a.publish_date || '9999-12-31'
            const dateB = b.deadline || b.publish_date || '9999-12-31'
            return dateA.localeCompare(dateB)
        }
        return 0
    })

    const handlePointerDragOver = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.columnStatus) {
                const status = el.dataset.columnStatus as ContentStatus
                if (dragOverStatus !== status) setDragOverStatus(status)
                return
            }
        }
        if (dragOverStatus) setDragOverStatus(null)
    }

    const handlePointerDrop = async (itemId: string, x: number, y: number) => {
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

        if (targetStatus && itemId) {
            await updateContent(itemId, { status: targetStatus })
        }
    }

    const handleDelete = async () => {
        if (deleteConfirmId) {
            await deleteContent(deleteConfirmId)
            setDeleteConfirmId(null)
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
                            onClick={onToggleArchived || (() => setLocalShowArchived(!localShowArchived))}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                                isArchived
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                    : "bg-black/[0.03] text-black/30 border-transparent hover:border-black/10 hover:text-black/60"
                            )}
                        >
                            <Shield className={cn("w-3 h-3", isArchived ? "text-white" : "text-black/20")} />
                            {isArchived ? 'Viewing Archives' : 'View Archives'}
                        </button>
                    </div>
                </div>
            )}

            {/* Status Tabs and Add Button Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                    {CONTENT_COLUMNS.map(column => {
                        const isActive = focusTab === column.value
                        const isOver = dragOverStatus === column.value
                        const count = filteredContent.filter(c => c.status === column.value).length

                        return (
                            <button
                                key={column.value}
                                data-column-status={column.value}
                                onClick={() => onFocusTabChange ? onFocusTabChange(column.value) : null}
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

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 h-[46px] rounded-2xl bg-black text-white text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-black/10 shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    New Content
                </button>
            </div>

            {/* Category Sub-menu */}
            <div className="flex items-center gap-2 p-1 bg-black/[0.015] rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar border border-black/[0.03]">
                {CONTENT_CATEGORIES.map(cat => {
                    const isActive = selectedCategory === cat.value
                    const count = content.filter(item => {
                        const statusMatch = item.status === focusTab 
                        const archiveMatch = isArchived ? item.is_archived : !item.is_archived
                        const categoryMatch = cat.value === 'all' || item.category === cat.value
                        return statusMatch && archiveMatch && categoryMatch
                    }).length

                    if (cat.value !== 'all' && count === 0 && !isActive) return null

                    return (
                        <button
                            key={cat.value}
                            onClick={() => setSelectedCategory(cat.value)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-white text-black shadow-sm ring-1 ring-black/5"
                                    : "text-black/30 hover:text-black/60"
                            )}
                        >
                            {cat.label}
                            {count > 0 && (
                                <span className={cn(
                                    "px-1 rounded-md text-[8px]",
                                    isActive ? "text-blue-600 bg-blue-50" : "text-black/20"
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
                data-column-status={focusTab}
                className={cn(
                    "rounded-[32px] transition-all min-h-[600px] border-2 border-transparent",
                    dragOverStatus === focusTab ? "bg-orange-50/50 border-orange-200 shadow-inner" :
                        draggingId ? "bg-black/[0.01] border-dashed border-black/[0.05]" : "bg-transparent"
                )}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                    {filteredContent
                        .filter(c => c.status === focusTab)
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
                                onClick={() => { setSelectedContentId(item.id); setModalInitialTab('details'); }}
                                onWrite={() => { setSelectedContentId(item.id); setModalInitialTab('script'); }}
                                onArchive={() => setContentToArchive(item)}
                                onDelete={() => setDeleteConfirmId(item.id)}
                                isGenerating={generatingContentIds.includes(item.id)}
                            />
                        ))}
                    {filteredContent.filter(c => c.status === focusTab).length === 0 && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-10">
                            <Video className="w-12 h-12 mb-4" />
                            <p className="text-[14px] font-black uppercase tracking-[0.2em]">No items in {focusTab}</p>
                        </div>
                    )}
                </div>
            </div>

            <ContentDetailModal
                isOpen={!!selectedContentId}
                onClose={() => setSelectedContentId(null)}
                item={content.find(c => c.id === selectedContentId) || null}
                initialTab={modalInitialTab}
            />

            <ConfirmationModal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDelete}
                title="Delete Content"
                message="Are you sure you want to delete this content item? This action cannot be undone."
                confirmText="Delete"
                type="danger"
            />

            <ConfirmationModal
                isOpen={!!contentToArchive}
                onClose={() => setContentToArchive(null)}
                onConfirm={async () => {
                    if (contentToArchive) {
                        await updateContent(contentToArchive.id, { is_archived: !contentToArchive.is_archived })
                        setContentToArchive(null)
                    }
                }}
                title={contentToArchive?.is_archived ? "Restore Content" : "Archive Content"}
                message={`Are you sure you want to ${contentToArchive?.is_archived ? 'restore' : 'archive'} "${contentToArchive?.title}"?`}
                confirmText={contentToArchive?.is_archived ? "Restore" : "Archive"}
                type={contentToArchive?.is_archived ? "info" : "warning"}
            />

            <CreateContentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    )
}

function ContentCard({ item, project, milestones, onPointerDragStart, onPointerDragOver, onPointerDrop, onPointerDragEnd, onClick, onWrite, onArchive, onDelete, isGenerating }: {
    item: StudioContent;
    project?: StudioProject;
    milestones: StudioMilestone[];
    onPointerDragStart: (id: string) => void;
    onPointerDragOver: (x: number, y: number) => void;
    onPointerDrop: (id: string, x: number, y: number) => void;
    onPointerDragEnd: () => void;
    onClick: () => void;
    onWrite: () => void;
    onArchive: () => void;
    onDelete: () => void;
    isGenerating?: boolean;
}) {
    const isDragging = useRef(false)
    const wasDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 && e.pointerType !== 'touch') return
        if ((e.target as HTMLElement).closest('button')) return
        document.body.style.userSelect = 'none'

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

                ghost = document.createElement('div')
                ghost.style.cssText = [
                    'position:fixed',
                    'pointer-events:none',
                    'z-index:9999',
                    'width:200px',
                    'background:white',
                    'border-radius:14px',
                    'box-shadow:0 24px 48px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.06)',
                    'padding:10px 12px',
                    'transform:rotate(-2deg) scale(0.95)',
                    'transition:transform 0.1s linear, opacity 0.1s linear',
                    'opacity:0.96',
                    'user-select:none',
                    'line-height:1.3',
                ].join(';')
                ghost.innerHTML = `
            <div style="font-size:11px;font-weight:800;color:#000;margin-bottom:2px;font-family:inherit;">${item.title}</div>
            <div style="font-size:9px;color:rgba(0,0,0,0.4);font-family:inherit;">${item.category || 'Content idea'}</div>
            `
                document.body.appendChild(ghost)
            }
            if (isDragging.current) {
                const targets = document.querySelectorAll('[data-column-status]')
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
                    ghost.style.top = `${ev.clientY - 20}px`
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
            onClick={() => {
                if (wasDragging.current) return
                onClick()
            }}
            className={cn(
                "group relative bg-white border border-black/[0.05] rounded-2xl hover:border-blue-200 hover:shadow-xl transition-[box-shadow,border-color] duration-300 overflow-hidden flex flex-col h-full",
                isDraggingThis && "opacity-30 scale-95 shadow-none"
            )}
        >
            <div 
                className="h-32 w-full overflow-hidden relative shrink-0 bg-black/[0.02] cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                style={{ touchAction: 'none' }}
            >
                <img
                    src={item.cover_url || `/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.category || 'Content')}&type=content&id=${item.id}&w=1200&h=630`}
                    alt=""
                    onLoad={() => setImageLoading(false)}
                    className={cn(
                        "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                        imageLoading ? "opacity-0" : "opacity-100",
                        (!item.cover_url || isGenerating) && "scale-[1.15]"
                    )}
                />
                {isGenerating && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-[2]">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Generating...</span>
                    </div>
                )}
                {imageLoading && (
                    <div className="absolute inset-0 bg-black/[0.03] animate-pulse flex items-center justify-center">
                         <div className="w-full h-full bg-gradient-to-r from-transparent via-black/[0.03] to-transparent bg-[length:200%_100%] animate-shimmer" />
                    </div>
                )}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent",
                    item.cover_url ? "opacity-60" : "opacity-20"
                )} />
                {item.platforms && item.platforms.length > 0 && (
                    <div className="absolute top-3 left-3 flex -space-x-1.5 ring-1 ring-white/20 rounded-full p-0.5 bg-black/10 backdrop-blur-md">
                        {item.platforms.map(p => (
                            <div key={p} className="w-5 h-5 rounded-full bg-white border border-black/[0.1] flex items-center justify-center text-black shadow-sm z-[1]" title={p}>
                                <PlatformIcon platform={p} className="w-2.5 h-2.5" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">                        <div className="flex flex-wrap items-center gap-1.5">
                            {!item.cover_url && item.platforms && item.platforms.length > 0 && (
                                <div className="flex -space-x-1 mr-1">
                                    {item.platforms.map(p => (
                                        <div
                                            key={p}
                                            className="w-4 h-4 rounded-full bg-white border border-black/[0.1] flex items-center justify-center text-black shadow-sm z-[1]"
                                            title={p}
                                        >
                                            <PlatformIcon platform={p} className="w-2 h-2" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {item.category && (
                                <div className={cn(
                                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight truncate max-w-[120px]",
                                    item.category === 'Thoughts' && "bg-blue-50 text-blue-600",
                                    item.category === 'Concept' && "bg-emerald-50 text-emerald-600",
                                    item.category === 'Vlog' && "bg-purple-50 text-purple-600",
                                    item.category === 'Showcase' && "bg-rose-50 text-rose-600",
                                    item.category === 'Update' && "bg-amber-50 text-amber-600",
                                    !['Thoughts', 'Concept', 'Vlog', 'Showcase', 'Update'].includes(item.category as any) && "bg-black/[0.03] text-black/40"
                                )}>
                                    {item.category}
                                </div>
                            )}
                            {item.priority && (
                                <div className={cn(
                                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter w-fit",
                                    item.priority === 'super' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                                    item.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
                                    item.priority === 'mid' ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                                    "bg-black/5 text-black/40"
                                )}>
                                    {item.priority}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-2">
                            {item.deadline && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-black/30 uppercase tracking-tighter">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </div>
                            )}
                            {item.impact_score && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/5 rounded-md border border-orange-500/5">
                                    <Zap className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                                    <span className="text-[10px] font-black text-orange-600">{item.impact_score}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <h4 className="text-[13px] font-black text-black leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                </h4>

                {project && (
                    <div className="mt-2.5 flex items-center gap-1.5">
                        <Rocket className="w-2.5 h-2.5 text-orange-500" />
                        <span className="text-[9px] font-black text-black/30 uppercase truncate">{project.title}</span>
                    </div>
                )}

                {/* Milestone preview */}
                {milestones.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                        {milestones.slice(0, 3).map(m => (
                            <div key={m.id} className="flex items-center gap-2">
                                {m.status === 'completed' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> : <div className="w-2.5 h-2.5 rounded-full border border-black/10" />}
                                <span className={cn("text-[10px] font-medium truncate", m.status === 'completed' ? "text-black/20 line-through" : "text-black/40")}>
                                    {m.title}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-auto pt-6">
                    <div className="border-t border-black/[0.03] pt-4 flex items-center justify-end">
                    <div className="flex items-center gap-1">
                        {item.url && (
                            <a
                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center mr-1 shadow-sm"
                                title="View Online"
                            >
                                <Globe className="w-3.5 h-3.5" />
                            </a>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onWrite(); }}
                            className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all flex items-center justify-center"
                            title="Write Mode"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onArchive(); }}
                            className={cn(
                                "p-1.5 rounded-lg transition-all flex items-center justify-center",
                                item.is_archived ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-black/[0.03] text-black/30 hover:bg-black/5 hover:text-black"
                            )}
                            title={item.is_archived ? "Unarchive" : "Archive"}
                        >
                            <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
