'use client'

import { useState } from 'react'
import { Video, Calendar, CheckCircle2, Trash2, Plus, Zap, Briefcase, Shield, ListTodo } from 'lucide-react'
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
    urgent: { pill: 'bg-purple-500 text-white', border: 'border-purple-200', bg: 'bg-purple-50/60' },
    high: { pill: 'bg-red-500 text-white', border: 'border-red-200', bg: 'bg-red-50/60' },
    mid: { pill: 'bg-amber-400 text-white', border: 'border-amber-200', bg: 'bg-amber-50/40' },
    low: { pill: 'bg-neutral-300 text-neutral-700', border: 'border-black/5', bg: 'bg-black/[0.01]' },
}

export default function ContentKanban({ hideHeader = false }: { hideHeader?: boolean }) {
    const { content, projects, milestones, updateContent, deleteContent, loading } = useStudio()
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<ContentStatus | null>(null)
    const [selectedItem, setSelectedItem] = useState<StudioContent | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [showArchived, setShowArchived] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const onDragOver = (e: React.DragEvent, status: ContentStatus) => {
        e.preventDefault()
        setDragOverStatus(status)
    }

    const onDrop = async (e: React.DragEvent, status: ContentStatus) => {
        e.preventDefault()
        setDragOverStatus(null)
        if (!draggingId) return
        try {
            await updateContent(draggingId, { status })
        } catch (err) {
            console.error('Failed to update content status:', err)
        } finally {
            setDraggingId(null)
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

            <div className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 no-scrollbar">
                {CONTENT_COLUMNS.map(column => {
                    const columnContent = content.filter(c => c.status === column.value && (showArchived ? c.is_archived : !c.is_archived))
                    const isOver = dragOverStatus === column.value

                    return (
                        <div
                            key={column.value}
                            className="flex-shrink-0 w-72 flex flex-col gap-4"
                            onDragOver={(e) => onDragOver(e, column.value)}
                            onDragLeave={() => setDragOverStatus(null)}
                            onDrop={(e) => onDrop(e, column.value)}
                        >
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-black/30 flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", column.dot)} />
                                    {column.label}
                                </h3>
                                <span className="text-[10px] font-bold text-black/20 bg-black/5 px-1.5 py-0.5 rounded-md">
                                    {columnContent.length}
                                </span>
                            </div>

                            <div className={cn(
                                "flex-1 rounded-[32px] transition-all p-2 space-y-3 min-h-[500px] border-2 border-transparent",
                                isOver ? "bg-blue-50/50 border-blue-200 shadow-inner scale-[1.01]" :
                                    draggingId ? "bg-black/[0.01] border-dashed border-black/[0.05]" : "bg-black/[0.02]"
                            )}>
                                {loading ? (
                                    <div className="space-y-3">
                                        {[1, 2].map(i => (
                                            <div key={i} className="h-36 bg-black/[0.02] border border-black/[0.05] rounded-2xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : columnContent.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center px-4 opacity-10">
                                        <Video className="w-8 h-8 mb-2" />
                                        <p className="text-[11px] font-bold uppercase tracking-widest">Empty</p>
                                    </div>
                                ) : (
                                    columnContent.map(item => (
                                        <ContentCard
                                            key={item.id}
                                            item={item}
                                            project={projects.find(p => p.id === item.project_id)}
                                            milestones={milestones.filter(m => m.content_id === item.id)}
                                            onDragStart={() => setDraggingId(item.id)}
                                            onDragEnd={() => setDraggingId(null)}
                                            onClick={() => setSelectedItem(item)}
                                            onDelete={() => setDeleteConfirmId(item.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <ContentDetailModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
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
        </div>
    )
}

function ContentCard({ item, project, milestones, onDragStart, onDragEnd, onClick, onDelete }: {
    item: StudioContent
    project?: StudioProject
    milestones: StudioMilestone[]
    onDragStart: () => void
    onDragEnd: () => void
    onClick: () => void
    onDelete: () => void
}) {
    const priority = item.priority ?? 'low'
    const styles = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low
    const deadline = item.deadline || item.publish_date

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onClick}
            className={cn(
                "group relative rounded-2xl cursor-grab active:cursor-grabbing transition-all hover:shadow-xl hover:-translate-y-0.5 border overflow-hidden",
                styles.border, styles.bg
            )}
        >
            {/* Cover image if set */}
            {item.cover_url && (
                <div className="w-full h-24 overflow-hidden">
                    <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 h-24 bg-gradient-to-b from-transparent to-black/20" />
                </div>
            )}

            <div className="p-4">
                {/* Top row: platforms + type + published check */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-0.5">
                            {item.platforms?.map(p => (
                                <div key={p} className="p-1 px-1.5 rounded-md bg-black/[0.04] flex items-center justify-center border border-white shadow-sm" title={p}>
                                    <PlatformIcon platform={p} className="w-2.5 h-2.5" />
                                </div>
                            ))}
                        </div>
                        {item.category && (
                            <span className="text-[9px] font-black uppercase tracking-tight text-black/40 bg-black/[0.03] px-1.5 py-0.5 rounded-md">
                                {item.category}
                            </span>
                        )}
                    </div>
                    {item.status === 'published' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                </div>

                {/* Title */}
                <h4 className="text-[13px] font-black text-black leading-tight group-hover:text-blue-600 transition-colors mb-2">
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

                {/* Priority + Impact row */}
                <div className="flex items-center gap-2 mb-3">
                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider", styles.pill)}>
                        {priority}
                    </span>
                    {(item.impact_score != null) && (
                        <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                            <Zap className="w-2.5 h-2.5 fill-current" />
                            {item.impact_score}
                        </span>
                    )}
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

                {/* Footer: deadline + delete */}
                <div className="pt-3 border-t border-black/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-black/30 font-bold">
                        <Calendar className="w-3 h-3" />
                        {deadline
                            ? new Date(deadline + (deadline.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            : 'No date'}
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete() }}
                        className="p-1.5 rounded-lg bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
