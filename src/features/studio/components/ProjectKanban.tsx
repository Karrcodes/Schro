'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Rocket, Shield, Clock, MoreVertical, Trash2, CheckCircle2, Zap } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import type { StudioProject, ProjectStatus, StudioMilestone, ProjectKanbanProps } from '../types/studio.types'
import { cn } from '@/lib/utils'
import PlatformIcon from './PlatformIcon'
import ProjectDetailModal from './ProjectDetailModal'
import ConfirmationModal from '@/components/ConfirmationModal'

const COLUMNS: { label: string; value: ProjectStatus }[] = [
    { label: 'Idea', value: 'idea' },
    { label: 'Research', value: 'research' },
    { label: 'Active', value: 'active' },
    { label: 'Shipped', value: 'shipped' }
]


export default function ProjectKanban({ searchQuery = '', filterType = null, showArchived = false }: ProjectKanbanProps) {
    const { projects: allProjects, milestones, updateProject, deleteProject, loading } = useStudio()
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [projectToDelete, setProjectToDelete] = useState<StudioProject | null>(null)
    const [projectToArchive, setProjectToArchive] = useState<StudioProject | null>(null)
    const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'date'>('priority')

    // Filter and sort projects based on search, type, archiving and sorting mode
    const projects = allProjects.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = !filterType || p.type === filterType
        const archiveMatch = showArchived ? p.is_archived : !p.is_archived
        return matchesSearch && matchesType && archiveMatch
    }).sort((a, b) => {
        if (sortBy === 'priority') {
            const weights = { urgent: 4, high: 3, mid: 2, low: 1 }
            return (weights[b.priority || 'low'] || 0) - (weights[a.priority || 'low'] || 0)
        }
        if (sortBy === 'impact') {
            return (b.impact_score || 0) - (a.impact_score || 0)
        }
        if (sortBy === 'date') {
            const dateA = a.target_date || '9999-12-31'
            const dateB = b.target_date || '9999-12-31'
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
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-black/20 ml-2">Sort By</span>
                <div className="flex items-center gap-1.5 p-1 bg-black/[0.03] rounded-xl border border-black/5 w-fit">
                    {(['priority', 'impact', 'date'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setSortBy(mode)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                sortBy === mode
                                    ? "bg-white text-black shadow-sm ring-1 ring-black/5"
                                    : "text-black/30 hover:text-black/60"
                            )}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
                {COLUMNS.map(column => {
                    const columnProjects = projects.filter(p => p.status === column.value)
                    const isOver = dragOverStatus === column.value

                    return (
                        <div
                            key={column.value}
                            className="flex flex-col gap-4"
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-2 mb-2">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-black/30 flex items-center gap-2">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        column.value === 'idea' && "bg-black/10",
                                        column.value === 'research' && "bg-blue-400",
                                        column.value === 'active' && "bg-orange-400",
                                        column.value === 'shipped' && "bg-emerald-400"
                                    )} />
                                    {column.label}
                                </h3>
                                <span className="text-[10px] font-bold text-black/20 bg-black/5 px-1.5 py-0.5 rounded-md">
                                    {columnProjects.length}
                                </span>
                            </div>

                            {/* Column Content Area */}
                            <div
                                data-column-status={column.value}
                                className={cn(
                                    "flex-1 rounded-[32px] transition-all p-2 space-y-3 min-h-[400px] border-2 border-transparent",
                                    isOver ? "bg-orange-50/50 border-orange-200 shadow-inner scale-[1.01]" :
                                        draggingId ? "bg-black/[0.01] border-dashed border-black/[0.05]" : "bg-transparent"
                                )}
                            >
                                {loading ? (
                                    <div className="space-y-3">
                                        {[1, 2].map(i => (
                                            <div key={i} className="h-40 bg-black/[0.02] border border-black/[0.05] rounded-2xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : columnProjects.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center px-4 opacity-10">
                                        <Rocket className="w-8 h-8 mb-2" />
                                        <p className="text-[11px] font-bold uppercase tracking-widest">Empty</p>
                                    </div>
                                ) : (
                                    columnProjects.map(project => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            milestones={milestones}
                                            onPointerDragStart={(id) => setDraggingId(id)}
                                            onPointerDragOver={handlePointerDragOver}
                                            onPointerDrop={handlePointerDrop}
                                            onPointerDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                                            onClick={() => setSelectedProjectId(project.id)}
                                            onArchive={() => setProjectToArchive(project)}
                                            onDelete={() => setProjectToDelete(project)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )
                })}

                <ProjectDetailModal
                    isOpen={!!selectedProjectId}
                    onClose={() => setSelectedProjectId(null)}
                    project={allProjects.find(p => p.id === selectedProjectId) || null}
                />

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
            </div>
        </div>
    )
}

function ProjectCard({ project, milestones, onPointerDragStart, onPointerDragOver, onPointerDrop, onPointerDragEnd, onClick, onArchive, onDelete }: {
    project: StudioProject;
    milestones: StudioMilestone[];
    onPointerDragStart: (id: string) => void;
    onPointerDragOver: (x: number, y: number) => void;
    onPointerDrop: (id: string, x: number, y: number) => void;
    onPointerDragEnd: () => void;
    onClick: () => void;
    onArchive: () => void;
    onDelete: () => void;
}) {
    const isDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)

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
                    'opacity:0.96',
                    'transition:none',
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
                onPointerDrop(project.id, ev.clientX, ev.clientY)
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
                        !project.cover_url && "scale-[1.15]",
                        imageLoading ? "opacity-0" : "opacity-100"
                    )}
                />
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


            <div className="p-4">
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
                        </div>


                        {project.priority && (
                            <div className={cn(
                                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter w-fit",
                                project.priority === 'urgent' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                                    project.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
                                        project.priority === 'mid' ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                                            "bg-black/5 text-black/40"
                            )}>
                                {project.priority}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {/* Top Right: Impact & Date */}
                        <div className="flex items-center gap-2">
                            {project.target_date && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-black/30 uppercase tracking-tighter">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(project.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </div>
                            )}
                            {project.impact_score && (
                                <div className="flex items-center gap-0.5">
                                    <Zap className="w-3 h-3 text-orange-500 fill-orange-500" />
                                    <span className="text-[11px] font-black text-orange-600">
                                        {project.impact_score}
                                    </span>
                                </div>
                            )}

                        </div>
                        {project.gtv_featured && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-md">
                                <Shield className="w-3 h-3 text-blue-600" />
                                <span className="text-[8px] font-black text-blue-900 uppercase">GTV</span>
                            </div>
                        )}
                    </div>
                </div>


                <h4 className="text-[13px] font-black text-black leading-tight group-hover:text-orange-600 transition-colors">
                    {project.title}
                </h4>

                {project.tagline && (
                    <p className="text-[11px] text-black/40 mt-1 line-clamp-2 leading-relaxed">
                        {project.tagline}
                    </p>
                )}

                {/* Milestone Preview (Max 3) */}
                <div className="mt-3 space-y-1.5">
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

                <div className="mt-4 pt-3 border-t border-black/[0.03] flex items-center justify-end">
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
                        <button className="p-1 rounded-md hover:bg-black/5 text-black/20 hover:text-black/60 transition-all">
                            <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>


            {/* Drag Handle Overlay Indicator */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-orange-500 scale-x-0 group-active:scale-x-50 transition-transform rounded-full mx-8" />
        </div >
    )
}
