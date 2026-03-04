'use client'

import React, { useState, useEffect } from 'react'
import { X, Award, Globe, Shield, Calendar, Link as LinkIcon, Edit3, Save, Trash2, ExternalLink, Rocket, Target, Zap, CheckCircle2 } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import type { PressType, PressStatus, StudioPress } from '../types/studio.types'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'

interface PressDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: StudioPress | null
}

const PRESS_TYPES: { value: PressType; label: string; icon: any; color: string }[] = [
    { value: 'competition', label: 'Competition', icon: Award, color: 'text-orange-600' },
    { value: 'grant', label: 'Grant', icon: Target, color: 'text-emerald-600' },
    { value: 'award', label: 'Award', icon: Zap, color: 'text-yellow-600' },
    { value: 'feature', label: 'Feature/PR', icon: Globe, color: 'text-blue-600' },
    { value: 'accelerator', label: 'Accelerator', icon: Shield, color: 'text-purple-600' }
]

const STATUSES: { value: PressStatus; label: string }[] = [
    { value: 'not_started', label: 'Backlog / Goal' },
    { value: 'applying', label: 'Active Application' },
    { value: 'submitted', label: 'Submitted / Pending' },
    { value: 'achieved', label: 'Won / Achieved' },
    { value: 'published', label: 'Live / Published' },
    { value: 'rejected', label: 'Unsuccessful' }
]

export default function PressDetailModal({ isOpen, onClose, item }: PressDetailModalProps) {
    const { updatePress, deletePress, projects } = useStudio()
    const [isEditing, setIsEditing] = useState(false)
    const [editedData, setEditedData] = useState<Partial<StudioPress>>({})
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    useEffect(() => {
        if (item) {
            setEditedData({})
            setIsEditing(false)
        }
    }, [item])

    if (!isOpen || !item) return null

    const handleSave = async () => {
        if (Object.keys(editedData).length === 0) {
            setIsEditing(false)
            return
        }

        try {
            const submissionData = { ...editedData }
            if ('project_id' in submissionData && !submissionData.project_id) {
                submissionData.project_id = null as any
            }
            await updatePress(item.id, submissionData)
            setIsEditing(false)
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`)
        }
    }

    const handleDelete = async () => {
        try {
            await deletePress(item.id)
            onClose()
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`)
        }
    }

    const currentProject = projects.find(p => p.id === (editedData.project_id ?? item.project_id))
    const currentType = PRESS_TYPES.find(t => t.value === (editedData.type ?? item.type)) || PRESS_TYPES[0]

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-black/[0.05] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] font-outfit">
                {/* Header */}
                <div className="p-8 pb-6 flex items-center justify-between border-b border-black/[0.05]">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", currentType.color.replace('text-', 'bg-').split('-')[0] + '-50')}>
                            <currentType.icon className={cn("w-6 h-6", currentType.color)} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-black/30">
                                    {currentType.label} • {item.organization}
                                </span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedData.title ?? item.title}
                                    onChange={e => setEditedData(prev => ({ ...prev, title: e.target.value }))}
                                    className="text-xl font-black text-black bg-black/[0.02] border border-black/[0.1] rounded-lg px-2 py-0.5 focus:outline-none focus:border-orange-500 w-full"
                                />
                            ) : (
                                <h2 className="text-xl font-black text-black">{item.title}</h2>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                className="p-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20"
                            >
                                <Save className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2.5 bg-black/[0.03] text-black/40 rounded-xl hover:bg-black/[0.05] hover:text-black transition-colors"
                            >
                                <Edit3 className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                            <X className="w-6 h-6 text-black/20" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Status & Project Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Current Status</label>
                            <div className="relative">
                                <select
                                    disabled={!isEditing}
                                    value={editedData.status ?? item.status}
                                    onChange={e => setEditedData(prev => ({ ...prev, status: e.target.value as PressStatus }))}
                                    className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 appearance-none disabled:opacity-100 cursor-pointer"
                                >
                                    {STATUSES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Linked Project</label>
                            <div className="relative">
                                <Rocket className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <select
                                    disabled={!isEditing}
                                    value={editedData.project_id ?? item.project_id ?? ''}
                                    onChange={e => setEditedData(prev => ({ ...prev, project_id: e.target.value }))}
                                    className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 appearance-none disabled:opacity-100 cursor-pointer"
                                >
                                    <option value="">No project link</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Deadline & URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Deadline / Achievement Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    readOnly={!isEditing}
                                    type="date"
                                    value={editedData.deadline ?? item.deadline ?? ''}
                                    onChange={e => setEditedData(prev => ({ ...prev, deadline: e.target.value }))}
                                    className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Resource Link</label>
                            <div className="relative">
                                <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <div className="flex gap-2">
                                    <input
                                        readOnly={!isEditing}
                                        type="url"
                                        placeholder="Add URL..."
                                        value={editedData.url ?? item.url ?? ''}
                                        onChange={e => setEditedData(prev => ({ ...prev, url: e.target.value }))}
                                        className="flex-1 pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200"
                                    />
                                    {item.url && (
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-3.5 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-colors">
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Flags */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() => setEditedData(prev => ({ ...prev, is_strategy_goal: !(editedData.is_strategy_goal ?? item.is_strategy_goal) }))}
                            className={cn(
                                "p-5 rounded-3xl border flex items-center gap-4 transition-all text-left",
                                (editedData.is_strategy_goal ?? item.is_strategy_goal)
                                    ? "bg-emerald-50 border-emerald-200 shadow-sm"
                                    : "bg-black/[0.01] border-black/[0.05] hover:border-black/10",
                                !isEditing && "cursor-default"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                (editedData.is_strategy_goal ?? item.is_strategy_goal) ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-black/[0.05] text-black/20"
                            )}>
                                <Target className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[13px] font-black text-black leading-none">Strategy Goal</p>
                                <p className="text-[11px] text-black/40 mt-1 font-bold">Priority Objective</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() => setEditedData(prev => ({ ...prev, is_portfolio_item: !(editedData.is_portfolio_item ?? item.is_portfolio_item) }))}
                            className={cn(
                                "p-5 rounded-3xl border flex items-center gap-4 transition-all text-left",
                                (editedData.is_portfolio_item ?? item.is_portfolio_item)
                                    ? "bg-blue-50 border-blue-200 shadow-sm"
                                    : "bg-black/[0.01] border-black/[0.05] hover:border-black/10",
                                !isEditing && "cursor-default"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                (editedData.is_portfolio_item ?? item.is_portfolio_item) ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-black/[0.05] text-black/20"
                            )}>
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[13px] font-black text-black leading-none">Add to Portfolio</p>
                                <p className="text-[11px] text-black/40 mt-1 font-bold">Showcase on GTV</p>
                            </div>
                        </button>
                    </div>

                    {/* Milestone / Requirement */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Requirements / Achievement Goal</label>
                        <textarea
                            readOnly={!isEditing}
                            placeholder="What needs to happen?"
                            value={editedData.milestone_goal ?? item.milestone_goal ?? ''}
                            onChange={e => setEditedData(prev => ({ ...prev, milestone_goal: e.target.value }))}
                            className="w-full px-5 py-5 bg-black/[0.02] border border-black/[0.05] rounded-[32px] text-[15px] font-medium min-h-[140px] focus:outline-none focus:border-orange-200 resize-none transition-all"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 flex items-center justify-between bg-black/[0.01] border-t border-black/[0.05]">
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-5 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[13px]"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Entry
                    </button>

                    {(item.status === 'achieved' || item.status === 'published') ? (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-5 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest shadow-sm border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4" />
                            {item.status === 'achieved' ? 'Achieved' : 'Published'}
                        </div>
                    ) : (
                        <div className="text-[11px] font-black text-black/20 uppercase tracking-[0.2em]">
                            Active Strategy
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Entry"
                message={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />
        </div>
    )
}
