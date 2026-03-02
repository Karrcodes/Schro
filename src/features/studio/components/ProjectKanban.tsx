'use client'

import React, { useState, useEffect } from 'react'
import { Briefcase, Shield, Clock, MoreVertical, Trash2, CheckCircle2, Zap } from 'lucide-react'
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


export default function ProjectKanban({ searchQuery = '', filterType = null }: ProjectKanbanProps) {
    const { projects: allProjects, milestones, updateProject, deleteProject, loading } = useStudio()
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null)
    const [selectedProject, setSelectedProject] = useState<StudioProject | null>(null)
    const [projectToDelete, setProjectToDelete] = useState<StudioProject | null>(null)

    // Filter projects based on search, type and archiving
    const projects = allProjects.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = !filterType || p.type === filterType
        const isNotArchived = !p.is_archived
        return matchesSearch && matchesType && isNotArchived
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

    const onDragOver = (e: React.DragEvent, status: ProjectStatus) => {
        e.preventDefault()
        setDragOverStatus(status)
    }

    const onDrop = async (e: React.DragEvent, status: ProjectStatus) => {
        e.preventDefault()
        setDragOverStatus(null)
        if (!draggingId) return

        try {
            await updateProject(draggingId, { status })
        } catch (err) {
            console.error('Failed to update project status:', err)
        } finally {
            setDraggingId(null)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
            {COLUMNS.map(column => {
                const columnProjects = projects.filter(p => p.status === column.value)
                const isOver = dragOverStatus === column.value

                return (
                    <div
                        key={column.value}
                        className="flex flex-col gap-4"
                        onDragOver={(e) => onDragOver(e, column.value)}
                        onDragLeave={() => setDragOverStatus(null)}
                        onDrop={(e) => onDrop(e, column.value)}
                    >
                        {/* Column Header */}
                        <div className="flex items-center justify-between px-2">
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

                        {/* Column Content */}
                        <div className={cn(
                            "flex-1 rounded-[32px] transition-all p-2 space-y-3 min-h-[150px] border-2 border-transparent",
                            isOver ? "bg-orange-50/50 border-orange-200 shadow-inner scale-[1.01]" :
                                draggingId ? "bg-black/[0.01] border-dashed border-black/[0.05]" : "bg-transparent"
                        )}>
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2].map(i => (
                                        <div key={i} className="h-40 bg-black/[0.02] border border-black/[0.05] rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : columnProjects.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center px-4 opacity-10">
                                    <Briefcase className="w-8 h-8 mb-2" />
                                    <p className="text-[11px] font-bold uppercase tracking-widest">Empty</p>
                                </div>
                            ) : (
                                columnProjects.map(project => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        milestones={milestones}
                                        onDragStart={() => setDraggingId(project.id)}
                                        onDragEnd={() => setDraggingId(null)}
                                        onClick={() => setSelectedProject(project)}
                                        onDelete={() => setProjectToDelete(project)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )
            })}

            <ProjectDetailModal
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
                project={selectedProject}
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
        </div>
    )
}

function ProjectCard({ project, milestones, onDragStart, onDragEnd, onClick, onDelete }: {
    project: StudioProject;
    milestones: StudioMilestone[];
    onDragStart: () => void;
    onDragEnd: () => void;
    onClick: () => void;
    onDelete: () => void;
}) {
    const { updateProject } = useStudio()

    const handleArchive = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await updateProject(project.id, { is_archived: true })
        } catch (err: any) {
            alert(`Failed to archive: ${err.message}`)
        }
    }
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onClick}
            className="group relative bg-white border border-black/[0.05] rounded-2xl cursor-grab active:cursor-grabbing hover:border-orange-200 hover:shadow-xl transition-all overflow-hidden"
        >
            {project.cover_url && (
                <div className="h-32 w-full overflow-hidden relative">
                    <img
                        src={project.cover_url}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-60" />

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
            )}


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
                            className="p-1.5 rounded-lg bg-black/[0.03] text-black/30 hover:bg-black/5 hover:text-black transition-all flex items-center justify-center"
                            title="Archive Project"
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
