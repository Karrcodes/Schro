'use client'

import { Target, ExternalLink, Calendar, Plus, MoreVertical, Tag, Rocket, Trash2, Search, HelpCircle, Archive, CheckCircle2, Inbox } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useStudio } from '../hooks/useStudio'
import type { StudioSpark, SparkStatus } from '../types/studio.types'
import { cn } from '@/lib/utils'
import SparkDetailModal from './SparkDetailModal'

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

    const filteredSparks = allSparks.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.type.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Drag and Drop Logic
    const onDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id)
        e.dataTransfer.setData('sparkId', id)
    }

    const onDragOver = (e: React.DragEvent, status: SparkStatus) => {
        e.preventDefault()
        setDragOverStatus(status)
    }

    const onDrop = async (e: React.DragEvent, status: SparkStatus) => {
        e.preventDefault()
        const sparkId = e.dataTransfer.getData('sparkId') || draggingId
        setDragOverStatus(null)
        setDraggingId(null)

        if (sparkId) {
            try {
                await updateSpark(sparkId, { status })
            } catch (err) {
                console.error('Failed to move spark:', err)
            }
        }
    }

    useEffect(() => {
        const handleDelete = async (e: any) => {
            try {
                await deleteSpark(e.detail)
            } catch (err: any) {
                alert(`Failed to delete spark: ${err.message}`)
            }
        }
        window.addEventListener('studio:deleteSpark', handleDelete)
        return () => window.removeEventListener('studio:deleteSpark', handleDelete)
    }, [deleteSpark])

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
                                    onClick={() => setActiveStatus(column.value)}
                                    onDragOver={(e) => onDragOver(e, column.value)}
                                    onDragLeave={() => setDragOverStatus(null)}
                                    onDrop={(e) => onDrop(e, column.value)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all relative whitespace-nowrap",
                                        isActive
                                            ? "bg-white text-black shadow-sm"
                                            : "text-black/30 hover:text-black/60",
                                        isOver && "bg-orange-50 text-orange-600 scale-[1.05] z-10"
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
                            />
                        ) : (
                            <SparkCard
                                key={spark.id}
                                spark={spark}
                                projects={projects}
                                onClick={() => setSelectedSparkId(spark.id)}
                                onDragStart={(e) => onDragStart(e, spark.id)}
                                onDragEnd={() => setDraggingId(null)}
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
        </div>
    )
}

function SparkListRow({ spark, projects, onClick }: { spark: StudioSpark; projects: any[]; onClick: () => void }) {
    const linkedProject = projects.find(p => p.id === spark.project_id)
    const [imgError, setImgError] = useState(false)

    const typeEmoji = {
        idea: '💡',
        tool: '🛠️',
        item: '🛒',
        resource: '🔗',
        event: '📅',
        person: '👤'
    }[spark.type] || '✨'

    return (
        <div
            onClick={onClick}
            className="group relative px-6 py-4 bg-white border border-black/[0.05] rounded-[24px] hover:border-emerald-200 hover:shadow-lg transition-all flex items-center gap-6 cursor-pointer"
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
                        if (confirm(`Are you sure you want to delete this spark?`)) {
                            window.dispatchEvent(new CustomEvent('studio:deleteSpark', { detail: spark.id }));
                        }
                    }}
                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}

function SparkCard({ spark, projects, onClick, onDragStart, onDragEnd }: {
    spark: StudioSpark;
    projects: any[];
    onClick: () => void;
    onDragStart?: (e: React.DragEvent, id: string) => void;
    onDragEnd?: () => void;
}) {
    const dragStarted = useRef(false)
    const linkedProject = projects.find(p => p.id === spark.project_id)
    const [imgError, setImgError] = useState(false)

    const typeEmoji = {
        idea: '💡',
        tool: '🛠️',
        item: '🛒',
        resource: '🔗',
        event: '📅',
        person: '👤'
    }[spark.type] || '✨'

    return (
        <div
            draggable={!!onDragStart}
            onDragStart={(e) => {
                dragStarted.current = true
                onDragStart?.(e, spark.id)
            }}
            onDragEnd={() => {
                onDragEnd?.()
                setTimeout(() => { dragStarted.current = false }, 100)
            }}
            onClick={(e) => {
                if (dragStarted.current) {
                    dragStarted.current = false
                    return
                }
                onClick()
            }}
            className="group relative p-6 bg-white border border-black/[0.05] rounded-[32px] hover:border-emerald-200 hover:shadow-xl transition-all flex flex-col cursor-pointer active:scale-95 touch-none"
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
                            if (confirm(`Are you sure you want to delete this spark?`)) {
                                window.dispatchEvent(new CustomEvent('studio:deleteSpark', { detail: spark.id }));
                            }
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
