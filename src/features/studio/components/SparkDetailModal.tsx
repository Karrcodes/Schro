'use client'

import { useState, useEffect, useRef } from 'react'
import {
    X,
    ExternalLink,
    Trash2,
    Briefcase,
    Link as LinkIcon,
    Tag,
    Plus,
    Target,
    CheckCircle2,
    Circle,
    Calendar,
    Zap,
    Inbox,
    History,
    Search
} from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import type { StudioSpark, StudioProject, StudioMilestone, SparkStatus } from '../types/studio.types'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'

const MILESTONE_CATEGORIES = ['rnd', 'production', 'media', 'growth']
const SPARK_STATUS_CONFIG: { label: string; value: SparkStatus; icon: any; color: string; border: string }[] = [
    { label: 'Inbox', value: 'inbox', icon: Inbox, color: 'text-blue-500 bg-blue-50', border: 'border-blue-100' },
    { label: 'Review', value: 'review', icon: Search, color: 'text-amber-500 bg-amber-50', border: 'border-amber-100' },
    { label: 'Utilized', value: 'utilized', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Discarded', value: 'discarded', icon: Trash2, color: 'text-rose-500 bg-rose-50', border: 'border-rose-100' }
]

interface SparkDetailModalProps {
    isOpen: boolean
    onClose: () => void
    spark: StudioSpark | null
    projects: StudioProject[]
}

export default function SparkDetailModal({ isOpen, onClose, spark, projects }: SparkDetailModalProps) {
    const {
        updateSpark,
        deleteSpark,
        addProject,
        milestones,
        addMilestone,
        updateMilestone,
        deleteMilestone,
        loading
    } = useStudio()
    const [isEditing, setIsEditing] = useState(false)
    const [editedNotes, setEditedNotes] = useState('')
    const [imgError, setImgError] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Reset state when spark changes to prevent "leaking" notes between different sparks
    useEffect(() => {
        if (spark) {
            setEditedNotes(spark.notes || '')
            setIsEditing(false)
            setImgError(false)
        }
    }, [spark])

    const milestoneDateInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen || !spark) return null

    const linkedProject = projects.find(p => p.id === spark.project_id)

    const handleSave = async () => {
        try {
            await updateSpark(spark.id, { notes: editedNotes })
            setIsEditing(false)
        } catch (err: any) {
            alert(`Failed to save spark: ${err.message}`)
        }
    }

    const handleDelete = async () => {
        try {
            await deleteSpark(spark.id)
            onClose()
        } catch (err: any) {
            alert(`Failed to delete spark: ${err.message}`)
        }
    }

    const handleConvertToProject = async () => {
        try {
            const project = await addProject({
                title: spark.title,
                tagline: spark.notes?.slice(0, 100),
                status: 'idea',
                type: 'Other'
            })
            // Link spark to the new project
            await updateSpark(spark.id, { project_id: project.id })

            // Move milestones to project
            const sparkMilestones = milestones.filter(m => m.spark_id === spark.id)
            await Promise.all(sparkMilestones.map(m =>
                updateMilestone(m.id, { project_id: project.id, spark_id: undefined })
            ))

            alert('Sucessfully converted spark to a new project! Milestones have been migrated.')
            onClose()
        } catch (err: any) {
            alert(`Failed to convert: ${err.message}`)
        }
    }

    const sparkMilestones = milestones.filter(m => m.spark_id === spark.id)

    const toggleMilestone = async (m: any) => {
        try {
            await updateMilestone(m.id, {
                status: m.status === 'completed' ? 'pending' : 'completed',
                completed_at: m.status === 'completed' ? undefined : new Date().toISOString()
            })
        } catch (err: any) {
            alert(`Failed to update milestone: ${err.message}`)
        }
    }

    const handleAddMilestone = async () => {
        try {
            await addMilestone({
                spark_id: spark.id,
                title: 'New Milestone',
                status: 'pending',
                impact_score: 5,
                category: 'rnd'
            })
        } catch (err: any) {
            alert(`Failed to add milestone: ${err.message}`)
        }
    }

    const typeEmoji = {
        idea: '💡',
        tool: '🛠️',
        item: '🛒',
        resource: '🔗',
        event: '📅',
        person: '👤',
        platform: '📱'
    }[spark.type] || '✨'

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Visual Header */}
                <div className="h-32 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 relative p-8">
                    <div className="w-16 h-16 rounded-3xl bg-white shadow-xl border border-black/[0.05] flex items-center justify-center text-3xl animate-bounce-subtle overflow-hidden p-2">
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
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-2xl bg-white/50 backdrop-blur hover:bg-white text-black/40 hover:text-black transition-all shadow-sm"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                                {spark.type}
                            </span>
                            {spark.url && (
                                <a
                                    href={spark.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Visit Resource
                                </a>
                            )}
                        </div>
                        <h1 className="text-2xl font-black text-black leading-tight">{spark.title}</h1>

                        <div className="pt-4 border-t border-black/[0.05]">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.15em]">Notes</h3>
                                <button
                                    onClick={() => {
                                        setEditedNotes(spark.notes || '')
                                        setIsEditing(!isEditing)
                                    }}
                                    className="text-[11px] font-bold text-black/60 hover:text-black transition-colors"
                                >
                                    {isEditing ? 'Cancel' : 'Edit'}
                                </button>
                            </div>

                            {isEditing ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={editedNotes}
                                        onChange={(e) => setEditedNotes(e.target.value)}
                                        className="w-full p-4 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-medium min-h-[120px] focus:outline-none focus:border-emerald-200"
                                        placeholder="Add thoughts, details, or tool analysis..."
                                    />
                                    <button
                                        onClick={handleSave}
                                        className="w-full py-2.5 bg-black text-white rounded-xl text-[12px] font-black hover:scale-[1.02] transition-transform shadow-lg shadow-black/10"
                                    >
                                        Save Note
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[14px] text-black/60 leading-relaxed italic">
                                    {spark.notes || 'No notes added yet...'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Roadmap Section */}
                    <div className="space-y-4 pt-4 border-t border-black/[0.05]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.15em] flex items-center gap-2">
                                <Target className="w-3.5 h-3.5 text-emerald-500" />
                                Growth Roadmap
                            </h3>
                            <button
                                onClick={handleAddMilestone}
                                className="p-1 px-2 rounded-lg bg-black text-white text-[9px] font-black uppercase hover:scale-105 transition-transform"
                            >
                                Add Milestone
                            </button>
                        </div>

                        <div className="space-y-2">
                            {sparkMilestones.length === 0 ? (
                                <div className="p-4 bg-black/[0.02] border border-dashed border-black/[0.1] rounded-2xl text-center">
                                    <p className="text-[11px] text-black/30 font-medium">No milestones set for this spark yet.</p>
                                </div>
                            ) : (
                                sparkMilestones.map(m => (
                                    <div
                                        key={m.id}
                                        className="p-3 bg-white border border-black/[0.04] rounded-2xl flex flex-col gap-2 group hover:border-emerald-200 transition-all shadow-sm"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <button
                                                    onClick={() => toggleMilestone(m)}
                                                    className={cn(
                                                        "transition-colors",
                                                        m.status === 'completed' ? "text-emerald-500" : "text-black/10 hover:text-emerald-500"
                                                    )}
                                                >
                                                    {m.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                                </button>
                                                <input
                                                    type="text"
                                                    value={m.title}
                                                    onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                                                    className={cn(
                                                        "w-full bg-transparent border-none text-[12px] font-bold focus:outline-none p-0",
                                                        m.status === 'completed' && "line-through text-black/20"
                                                    )}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/[0.03] border border-black/[0.05] rounded-lg group/stdate relative min-w-0 flex-1 h-7 overflow-hidden cursor-pointer"
                                                    onClick={(e) => (e.currentTarget.querySelector('input[type="date"]') as any)?.showPicker?.()}>
                                                    <Calendar className="w-2.5 h-2.5 text-black/10 shrink-0 pointer-events-none" />
                                                    <input
                                                        type="date"
                                                        value={m.target_date ? m.target_date.split('T')[0] : ''}
                                                        onChange={(e) => updateMilestone(m.id, { target_date: e.target.value || null })}
                                                        className="absolute inset-0 w-full h-full text-transparent bg-transparent border-none cursor-pointer z-10 p-0 pointer-events-none"
                                                    />
                                                    <span className="text-[10px] font-bold text-black/40 truncate pointer-events-none">
                                                        {m.target_date ? new Date(m.target_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Set date'}
                                                    </span>
                                                    {m.target_date && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateMilestone(m.id, { target_date: null }) }}
                                                            className="relative ml-auto p-1 text-black/20 hover:text-red-500 transition-colors z-30 pointer-events-auto"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                                                    <Zap className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                                                    <div className="flex items-center h-4">
                                                        <button
                                                            onClick={() => updateMilestone(m.id, { impact_score: Math.max(1, (m.impact_score || 0) - 1) })}
                                                            className="text-[11px] font-black text-orange-600/30 hover:text-orange-600 px-0.5"
                                                        >-</button>
                                                        <span className="text-[10px] font-black text-orange-600 w-3 text-center">
                                                            {m.impact_score || 0}
                                                        </span>
                                                        <button
                                                            onClick={() => updateMilestone(m.id, { impact_score: Math.min(10, (m.impact_score || 0) + 1) })}
                                                            className="text-[11px] font-black text-orange-600/30 hover:text-orange-600 px-0.5"
                                                        >+</button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center bg-black/[0.02] border border-black/5 rounded-lg px-1.5 py-0.5">
                                                    <select
                                                        value={m.category || 'rnd'}
                                                        onChange={(e) => updateMilestone(m.id, { category: e.target.value })}
                                                        className="bg-transparent border-none py-0 text-[10px] font-black uppercase text-black/40 focus:outline-none cursor-pointer"
                                                    >
                                                        {MILESTONE_CATEGORIES.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => deleteMilestone(m.id)}
                                                    className={cn(
                                                        "p-1.5 text-black/10 hover:text-red-500 transition-all",
                                                        isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                    )}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Meta Section */}
                    <div className="grid grid-cols-1 gap-3 pt-4 border-t border-black/[0.05]">
                        <div className="space-y-3">
                            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest pl-2">Progress Stage</p>
                            <div className="grid grid-cols-4 gap-2">
                                {SPARK_STATUS_CONFIG.map(status => {
                                    const Icon = status.icon
                                    const isActive = spark.status === status.value
                                    return (
                                        <button
                                            key={status.value}
                                            onClick={() => updateSpark(spark.id, { status: status.value })}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1.5",
                                                isActive
                                                    ? cn(status.color, status.border, "shadow-sm scale-105")
                                                    : "bg-black/[0.01] border-black/[0.03] text-black/20 hover:text-black/40 hover:bg-black/[0.03]"
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-[9px] font-black uppercase tracking-tight">{status.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="p-4 bg-black/[0.02] rounded-2xl border border-black/[0.03]">
                            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest mb-1">Context</p>
                            {linkedProject ? (
                                <p className="text-[12px] font-bold text-black flex items-center gap-1.5 truncate">
                                    <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    {linkedProject.title}
                                </p>
                            ) : (
                                <p className="text-[12px] font-bold text-black/20 italic">Standalone</p>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-6 border-t border-black/[0.05] flex items-center justify-between gap-4">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            title="Delete Spark"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>

                        <div className="flex gap-2">
                            {!linkedProject && (
                                <button
                                    onClick={handleConvertToProject}
                                    className="px-6 py-3 bg-white border border-black/[0.08] text-black rounded-2xl text-[12px] font-black hover:bg-black/[0.02] transition-all flex items-center gap-2"
                                >
                                    <Target className="w-4 h-4 text-orange-500" />
                                    Convert to Project
                                </button>
                            )}
                            <button className="px-6 py-3 bg-black text-white rounded-2xl text-[12px] font-black flex items-center gap-2 hover:scale-105 transition-transform shadow-xl shadow-black/10">
                                <LinkIcon className="w-4 h-4" />
                                Link to Project
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Spark"
                message="Are you sure you want to delete this spark? This action cannot be undone."
                confirmText="Delete"
                type="danger"
            />
        </div>
    )
}
