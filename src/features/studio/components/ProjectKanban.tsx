'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Rocket, Shield, Clock, MoreVertical, Trash2, CheckCircle2, Zap, Plus } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import type { StudioProject, ProjectStatus, StudioMilestone, ProjectKanbanProps } from '../types/studio.types'
import { cn } from '@/lib/utils'
import PlatformIcon from './PlatformIcon'
import ProjectDetailModal from './ProjectDetailModal'
import CreateProjectModal from './CreateProjectModal'
import ConfirmationModal from '@/components/ConfirmationModal'

const COLUMNS: { label: string; value: ProjectStatus }[] = [
    { label: 'Idea', value: 'idea' },
    { label: 'Research', value: 'research' },
    { label: 'Active', value: 'active' },
    { label: 'Shipped', value: 'shipped' }
]


export default function ProjectKanban({ searchQuery = '', showArchived = false, sortBy = 'priority', onProjectClick }: ProjectKanbanProps) {
    const { projects: allProjects, milestones, updateProject, deleteProject, loading, generatingProjectIds } = useStudio()
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null)
    const [focusTab, setFocusTab] = useState<ProjectStatus>('active')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [projectToDelete, setProjectToDelete] = useState<StudioProject | null>(null)
    const [projectToArchive, setProjectToArchive] = useState<StudioProject | null>(null)

    const priorityOrder: Record<string, number> = { super: 1, high: 2, mid: 3, low: 4 };

    const projects = allProjects.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
        const archiveMatch = showArchived ? p.is_archived : !p.is_archived
        return matchesSearch && archiveMatch
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
            const dateA = a.target_date || a.start_date || '9999-12-31'
            const dateB = b.target_date || b.start_date || '9999-12-31'
            return dateA.localeCompare(dateB)
        }
        return 0
    })

    useEffect(() => {
        const handleDeleteEvent = async (e: any) => {
            try {
                await deleteProject(e.detail)
            } catch (err: any) {
                alert(`Failed to delete project: ${err.message}`)
            }
        }
        window.addEventListener('studio:deleteProject', handleDeleteEvent)
        return () => window.removeEventListener('studio:deleteProject', handleDeleteEvent)
    }, [deleteProject])

    const handlePointerDrop = async (projectId: string, x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        let targetStatus: ProjectStatus | null = null
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.columnStatus) {
                targetStatus = el.dataset.columnStatus as ProjectStatus
                break
            }
        }
        setDraggingId(null)
        setDragOverStatus(null)
        if (targetStatus && projectId) {
            try {
                await updateProject(projectId, { status: targetStatus })
            } catch (err) {
                console.error('Failed to update project status:', err)
            }
        }
    }

    const handlePointerDragOver = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.columnStatus) {
                setDragOverStatus(el.dataset.columnStatus as ProjectStatus)
                return
            }
        }
    }

    return (
        <div className="space-y-6">

            {/* Status Tabs and Add Button Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                    {COLUMNS.map(column => {
                        const isActive = focusTab === column.value
                        const isOver = dragOverStatus === column.value
                        const count = projects.filter(p => p.status === column.value).length

                        return (
                            <button
                                key={column.value}
                                data-column-status={column.value}
                                onClick={() => setFocusTab(column.value)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all relative whitespace-nowrap",
                                    isActive
                                        ? "bg-white text-black shadow-sm"
                                        : "text-black/30 hover:text-black/60",
                                    isOver && "bg-orange-50 text-orange-600 scale-[1.05] z-10"
                                )}
                            >
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    column.value === 'idea' && "bg-black/10",
                                    column.value === 'research' && "bg-blue-400",
                                    column.value === 'active' && "bg-orange-400",
                                    column.value === 'shipped' && "bg-emerald-400"
                                )} />
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
                    New Project
                </button>
            </div>

            {/* Focused Column View */}
            <div
                data-column-status={focusTab}
                className={cn(
                    "rounded-[32px] transition-all min-h-[600px] border-2 border-transparent",
                    dragOverStatus === focusTab ? "bg-orange-50/50 border-orange-200 shadow-inner" :
                        draggingId ? "bg-black/[0.01] border-dashed border-black/[0.05]" : "bg-transparent"
                )}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-black/[0.02] border border-black/[0.05] rounded-2xl animate-pulse" />
                        ))
                    ) : projects.filter(p => p.status === focusTab).length === 0 ? (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-center px-4 opacity-10">
                            <Rocket className="w-12 h-12 mb-4" />
                            <p className="text-[14px] font-black uppercase tracking-[0.2em]">No projects in {focusTab}</p>
                        </div>
                    ) : (
                        projects.filter(p => p.status === focusTab).map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                milestones={milestones}
                                onPointerDragStart={(id) => setDraggingId(id)}
                                onPointerDragOver={handlePointerDragOver}
                                onPointerDrop={handlePointerDrop}
                                onPointerDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                                onClick={() => onProjectClick(project)}
                                onArchive={() => setProjectToArchive(project)}
                                onDelete={() => setProjectToDelete(project)}
                                isGenerating={generatingProjectIds.includes(project.id)}
                            />
                        ))
                    )}
                </div>
            </div>

                <ConfirmationModal
                    isOpen={!!projectToDelete}
                    onClose={() => setProjectToDelete(null)}
                    onConfirm={async () => {
                        if (projectToDelete) {
                            await deleteProject(projectToDelete.id)
                        }
                    }}
                    title="Delete Project"
                    message={`Are you sure you want to delete "${projectToDelete?.title}"? This will also delete all associated milestones and content.`}
                    confirmText="Delete"
                    type="danger"
                />

                <ConfirmationModal
                    isOpen={!!projectToArchive}
                    onClose={() => setProjectToArchive(null)}
                    onConfirm={async () => {
                        if (projectToArchive) {
                            await updateProject(projectToArchive.id, { is_archived: !projectToArchive.is_archived })
                        }
                    }}
                    title={projectToArchive?.is_archived ? "Unarchive Project" : "Archive Project"}
                    message={projectToArchive?.is_archived
                        ? `Are you sure you want to unarchive "${projectToArchive?.title}"? It will be moved back to your active project pipeline.`
                        : `Are you sure you want to archive "${projectToArchive?.title}"? You can view it later by enabling the Archive view.`}
                    confirmText={projectToArchive?.is_archived ? "Unarchive" : "Archive Project"}
                    type={projectToArchive?.is_archived ? "info" : "info"}
                />
                <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    )
}

function ProjectCard({ project, milestones, onPointerDragStart, onPointerDragOver, onPointerDrop, onPointerDragEnd, onClick, onArchive, onDelete, isGenerating }: {
    project: StudioProject;
    milestones: StudioMilestone[];
    onPointerDragStart: (id: string) => void;
    onPointerDragOver: (x: number, y: number) => void;
    onPointerDrop: (id: string, x: number, y: number) => void;
    onPointerDragEnd: () => void;
    onClick: () => void;
    onArchive: () => void;
    onDelete: () => void;
    isGenerating?: boolean;
}) {
    // Drag and Drop Logic
    const isDragging = useRef(false)
    const wasDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)

    const handleArchive = async (e: React.MouseEvent) => {
        e.stopPropagation()
        onArchive()
    }

    const handleCoverPointerDown = (e: React.PointerEvent) => {
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
                onPointerDragStart(project.id)

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
                    'transition:transform 0.1s linear, opacity 0.1s linear',
                    'opacity:0.96',
                    'user-select:none',
                    'line-height:1.3',
                ].join(';')

                ghost.innerHTML = `
            <div style="width:100%;height:80px;border-radius:8px;margin-bottom:6px;background:#f5f5f5;overflow:hidden;">
                <img src="${project.cover_url || `/api/studio/cover?title=${encodeURIComponent(project.title)}&tagline=${encodeURIComponent(project.tagline || '')}&type=${encodeURIComponent(project.type || '')}&id=${project.id}&w=1200&h=630`}" style="width:100%;height:100%;object-fit:cover;" />
            </div>
            <div style="font-size:11px;font-weight:800;color:#000;margin-bottom:2px;font-family:inherit;">${project.title}</div>
            ${project.tagline ? `<div style="font-size:9px;color:rgba(0,0,0,0.4);font-family:inherit;">${project.tagline.slice(0, 50)}</div>` : ''}
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
                    ghost.style.left = `${ev.clientX - 90}px`
                    ghost.style.top = `${ev.clientY - 30}px`
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
                onPointerDrop(project.id, ev.clientX, ev.clientY)
                isDragging.current = false
            }
            onPointerDragEnd()
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
                "group relative bg-white border border-black/[0.05] rounded-2xl hover:border-orange-200 hover:shadow-xl transition-[box-shadow,border-color] duration-300 overflow-hidden flex flex-col h-full",
                isDraggingThis && "opacity-30 scale-95 shadow-none"
            )}
        >
            <div
                onPointerDown={handleCoverPointerDown}
                className="h-32 w-full overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
                style={{ touchAction: 'none' }}
            >
                <img
                    src={project.cover_url || `/api/studio/cover?title=${encodeURIComponent(project.title)}&tagline=${encodeURIComponent(project.tagline || '')}&type=${encodeURIComponent(project.type || '')}&id=${project.id}&w=1200&h=630`}
                    alt=""
                    onLoad={() => setImageLoading(false)}
                    className={cn(
                        "w-full h-full object-cover transition-all duration-700 group-hover:scale-110",
                        (!project.cover_url || isGenerating) && "scale-[1.15]",
                        imageLoading ? "opacity-0" : "opacity-100"
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
                    project.cover_url ? "opacity-60" : "opacity-20"
                )} />

                {/* Platform icons overlay */}
                {project.platforms && project.platforms.length > 0 && (
                    <div className="absolute top-3 left-3 flex -space-x-1.5 ring-1 ring-white/20 rounded-full p-0.5 bg-black/10 backdrop-blur-md">
                        {project.platforms.map(p => (
                            <div
                                key={p}
                                className="w-5 h-5 rounded-full bg-white border border-black/[0.1] flex items-center justify-center text-black shadow-sm z-[1]"
                                title={p}
                            >
                                <PlatformIcon platform={p} className="w-2.5 h-2.5" />
                            </div>
                        ))}
                    </div>
                )}
            </div>


            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        {/* Tags section */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {!project.cover_url && project.platforms && project.platforms.length > 0 && (
                                 <div className="flex -space-x-1 mr-1">
                                     {project.platforms.map(p => (
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
                            <div className={cn(
                                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight w-fit truncate",
                                project.type === 'Media' && "bg-red-50 text-red-600",
                                project.type === 'Architectural Design' && "bg-blue-50 text-blue-600",
                                project.type === 'Product Design' && "bg-emerald-50 text-emerald-600",
                                project.type === 'Technology' && "bg-cyan-50 text-cyan-600",
                                project.type === 'Fashion' && "bg-purple-50 text-purple-600",
                                !project.type && "bg-black/[0.03] text-black/40"
                            )}>
                                {project.type || 'Other'}
                            </div>
                            {project.priority && (
                                <div className={cn(
                                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter w-fit",
                                    project.priority === 'super' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                                        project.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
                                            project.priority === 'mid' ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                                                "bg-black/5 text-black/40"
                                )}>
                                    {project.priority}
                                </div>
                            )}
                            {project.gtv_featured && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-md">
                                    <Shield className="w-2.5 h-2.5 text-blue-600" />
                                    <span className="text-[8px] font-black text-blue-900 uppercase">GTV</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-2">
                            {project.target_date && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-black/30 uppercase tracking-tighter">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(project.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </div>
                            )}
                            {project.impact_score && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/5 rounded-md border border-orange-500/5">
                                    <Zap className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                                    <span className="text-[10px] font-black text-orange-600">{project.impact_score}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                <h4 className="text-[13px] font-black text-black leading-snug group-hover:text-orange-600 transition-colors">
                    {project.title}
                </h4>

                {project.tagline && (
                    <p className="text-[11px] text-black/40 mt-2 line-clamp-2 leading-relaxed">
                        {project.tagline}
                    </p>
                )}

                {/* Milestone Preview (Max 3) */}
                <div className="mt-4 space-y-1.5">
                    {milestones?.filter((m: any) => m.project_id === project.id).slice(0, 3).map((m: any) => (
                        <div key={m.id} className="flex items-center gap-2">
                            {m.status === 'completed' ? (
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                            ) : (
                                <div className="w-2.5 h-2.5 rounded-full border border-black/10" />
                            )}
                            <span className={cn(
                                "text-[10px] font-medium truncate",
                                m.status === 'completed' ? "text-black/20 line-through" : "text-black/40"
                            )}>
                                {m.title}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-6">
                    <div className="border-t border-black/[0.03] pt-4 flex items-center justify-end">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleArchive}
                            className={cn(
                                "p-1.5 rounded-lg transition-all flex items-center justify-center",
                                project.is_archived
                                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    : "bg-black/[0.03] text-black/30 hover:bg-black/5 hover:text-black"
                            )}
                            title={project.is_archived ? "Unarchive Project" : "Archive Project"}
                        >
                            <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete()
                            }}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center"
                            title="Delete Project"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
            </div>


            {/* Drag Handle Overlay Indicator */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-orange-500 scale-x-0 group-active:scale-x-50 transition-transform rounded-full mx-8" />
        </div>
    )
}
