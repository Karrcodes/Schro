'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Plus, Target, Calendar, Rocket,
    Clock, Trash2, CheckCircle2, Circle, Image as ImageIcon, Pencil, Loader2, Zap,
    Shield, ExternalLink, Link as LinkIcon, Trash, CheckSquare, Sparkles, Wand2, AlignLeft
} from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import type { StudioProject, StudioMilestone, Platform, ProjectType, ProjectStatus } from '../types/studio.types'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import PlatformIcon from './PlatformIcon'
import ConfirmationModal from '@/components/ConfirmationModal'
import { Task } from '../../tasks/types/tasks.types'

interface ProjectDetailModalProps {
    isOpen: boolean
    onClose: () => void
    project: StudioProject | null
}

const PROJECT_TYPES: ProjectType[] = ['Architectural Design', 'Technology', 'Fashion', 'Product Design', 'Media', 'Other']
const PLATFORMS: Platform[] = ['youtube', 'instagram', 'substack', 'tiktok', 'x', 'web']
const MILESTONE_CATEGORIES = ['rnd', 'production', 'media', 'growth']

export default function ProjectDetailModal({ isOpen, onClose, project }: ProjectDetailModalProps) {
    const { milestones, addMilestone, updateMilestone, deleteMilestone, updateProject, deleteProject, regenerateProjectCover, generatingProjectIds } = useStudio()
    const { settings } = useSystemSettings()
    
    const [isEditing, setIsEditing] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [editedData, setEditedData] = useState<Partial<StudioProject>>({})
    const [linkedTasks, setLinkedTasks] = useState<Task[]>([])
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null)
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('')

    const isGeneratingProject = project ? generatingProjectIds.includes(project.id) : false

    useEffect(() => {
        if (!isOpen || !project) return
        const fetchLinkedTasks = async () => {
            const { data } = await supabase.from('fin_tasks').select('*').eq('project_id', project.id).order('created_at', { ascending: false })
            if (data) setLinkedTasks(data)
        }
        fetchLinkedTasks()
        setIsEditing(false)
        setEditedData({})
    }, [isOpen, project])

    if (!project) return null

    const projectMilestones = milestones.filter((m: StudioMilestone) => m.project_id === project.id)
    const completedCount = projectMilestones.filter((m: StudioMilestone) => m.status === 'completed').length
    const progress = projectMilestones.length > 0 ? (completedCount / projectMilestones.length) * 100 : 0

    const handleSave = async () => {
        try {
            await updateProject(project.id, editedData)
            setIsEditing(false)
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`)
        }
    }

    const toggleMilestone = async (m: StudioMilestone) => {
        try {
            await updateMilestone(m.id, {
                status: m.status === 'completed' ? 'pending' : 'completed',
                completed_at: m.status === 'pending' ? new Date().toISOString() : undefined
            })
        } catch (err: any) {
            console.error('Failed to toggle milestone:', err)
        }
    }

    const handleAddMilestone = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!newMilestoneTitle.trim()) return
        try {
            await addMilestone({
                project_id: project.id,
                title: newMilestoneTitle.trim(),
                status: 'pending',
                category: 'rnd',
                impact_score: 5
            })
            setNewMilestoneTitle('')
        } catch (err: any) {
            console.error('Failed to add milestone:', err)
        }
    }



    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[100] max-h-[90vh] overflow-y-auto shadow-2xl border-t border-black/5 no-scrollbar"
                    >
                        {/* Handle */}
                        <div className="flex justify-center p-4">
                            <div className="w-12 h-1.5 bg-black/10 rounded-full" />
                        </div>

                        <div className="max-w-4xl mx-auto px-6 md:px-8 pb-20 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                {/* Left Column: Visual & Meta */}
                                <div className="md:col-span-1 space-y-8">
                                    <div className="relative group aspect-[4/5] rounded-[24px] overflow-hidden border border-black/5 shadow-2xl shadow-black/10">
                                        <img
                                            src={project.cover_url || `/api/studio/cover?title=${encodeURIComponent(project.title)}&tagline=${encodeURIComponent(project.tagline || '')}&type=project&id=${project.id}`}
                                            alt={project.title}
                                            className={cn(
                                                "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                                                isGeneratingProject && "blur-md"
                                            )}
                                        />
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent rounded-b-[24px]">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{project.type}</span>
                                                    <div className="flex items-center gap-2">
                                                        {(project.platforms || []).map(p => <PlatformIcon key={p} platform={p} className="w-3.5 h-3.5 text-white" />)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => regenerateProjectCover(project.id)}
                                                    disabled={isGeneratingProject}
                                                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                                                >
                                                    {isGeneratingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        {isGeneratingProject && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm gap-2 rounded-[24px]">
                                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Rendering...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Project Progress */}
                                    <div className="p-6 bg-black/[0.02] rounded-3xl border border-black/5 space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Endeavor Progress</span>
                                                <span className="text-[14px] font-black text-black">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    className="h-full bg-black shadow-lg"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-black text-black/20 uppercase">Milestones</span>
                                                <span className="text-[16px] font-black text-black">{completedCount}/{projectMilestones.length}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-black text-black/20 uppercase">Status</span>
                                                <span className={cn(
                                                    "text-[16px] font-black uppercase tracking-tight",
                                                    project.status === 'active' ? "text-emerald-500" : "text-black/40"
                                                )}>{project.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {!isEditing && (
                                            <button
                                                onClick={() => {
                                                    setEditedData(project)
                                                    setIsEditing(true)
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-black/[0.03] hover:bg-black/[0.06] rounded-2xl text-[11px] font-black uppercase tracking-widest text-black/40"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Edit Project
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full py-3 text-red-400 hover:text-red-500 text-[11px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            Archive Project
                                        </button>
                                    </div>
                                </div>

                                {/* Right Column: Content & Milestones */}
                                <div className="md:col-span-2 space-y-12">
                                    {isEditing ? (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                            {/* Core Identity Setup */}
                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1 text-[9px]">Project Designation</label>
                                                    <input
                                                        autoFocus
                                                        value={editedData.title || ''}
                                                        onChange={e => setEditedData(prev => ({ ...prev, title: e.target.value }))}
                                                        placeholder="e.g. Project Schrödinger"
                                                        className="w-full text-[24px] md:text-[32px] font-bold tracking-tight placeholder:text-black/10 border-none p-0 focus:ring-0 outline-none bg-transparent"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-2 pt-2 border-t border-black/5">
                                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1 text-[9px]">Tagline</label>
                                                    <input
                                                        value={editedData.tagline || ''}
                                                        onChange={e => setEditedData(prev => ({ ...prev, tagline: e.target.value }))}
                                                        placeholder="One-liner vision..."
                                                        className="w-full text-lg font-bold text-black placeholder:text-black/10 border-none p-0 focus:ring-0 outline-none bg-transparent"
                                                    />
                                                </div>

                                                <div className="space-y-2 pt-2 border-t border-black/5">
                                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1 text-[9px]">Project Brief</label>
                                                    <textarea
                                                        value={editedData.description || ''}
                                                        onChange={e => setEditedData(prev => ({ ...prev, description: e.target.value }))}
                                                        placeholder="Detailed description of the endeavor..."
                                                        rows={4}
                                                        className="w-full text-[15px] font-medium text-black/60 placeholder:text-black/15 border-none p-0 focus:ring-0 resize-none outline-none bg-transparent leading-relaxed"
                                                    />
                                                </div>
                                            </div>

                                            {/* Status selection */}
                                            <div className="space-y-3 pt-4 border-t border-black/5">
                                                <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Current status</label>
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                                    {(['idea', 'research', 'active', 'paused', 'shipped'] as ProjectStatus[]).map(s => {
                                                        const active = (editedData.status || project.status) === s
                                                        return (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                onClick={() => setEditedData(prev => ({ ...prev, status: s }))}
                                                                className={cn(
                                                                    "py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tight",
                                                                    active ? "bg-black text-white border-black" : "bg-white border-black/5 text-black/20 hover:border-black/20"
                                                                )}
                                                            >
                                                                {s}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Project Type Selection */}
                                            <div className="space-y-3 pt-4 border-t border-black/5">
                                                <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Project Category</label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {PROJECT_TYPES.map(cat => {
                                                        const active = (editedData.type || project.type) === cat
                                                        return (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                onClick={() => setEditedData(prev => ({ ...prev, type: cat }))}
                                                                className={cn(
                                                                    "py-2.5 rounded-xl border transition-all text-[10px] font-bold",
                                                                    active ? "bg-black text-white border-black" : "bg-white border-black/5 text-black/30 hover:border-black/20"
                                                                )}
                                                            >
                                                                {cat}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-black/5">
                                                {/* Priority Setup */}
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Priority Logic</label>
                                                    <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-xl border border-black/5">
                                                        {(['super', 'high', 'mid', 'low'] as const).map(p => {
                                                            const currentPriority = editedData.priority || project.priority
                                                            const isActive = currentPriority === p
                                                            const colors = {
                                                                super: 'bg-purple-50 text-purple-600 border-purple-200 shadow-purple-500/10',
                                                                high: 'bg-red-50 text-red-600 border-red-200 shadow-red-500/10',
                                                                mid: 'bg-yellow-50 text-yellow-600 border-yellow-200 shadow-yellow-500/10',
                                                                low: 'bg-black/5 text-black/60 border-black/10 shadow-black/5'
                                                            }
                                                            return (
                                                                <button
                                                                    key={p}
                                                                    type="button"
                                                                    onClick={() => setEditedData(prev => ({ ...prev, priority: p }))}
                                                                    className={cn(
                                                                        "flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all border",
                                                                        isActive
                                                                            ? colors[p]
                                                                            : "bg-transparent text-black/30 border-transparent hover:text-black/5 pointer-events-auto"
                                                                    )}
                                                                >
                                                                    {p}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Platforms Selection */}
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Distribution Targets</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {PLATFORMS.map(p => {
                                                            const active = (editedData.platforms || project.platforms || []).includes(p)
                                                            return (
                                                                <button
                                                                    key={p}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = editedData.platforms || project.platforms || []
                                                                        const next = current.includes(p) ? current.filter(x => x !== p) : [...current, p]
                                                                        setEditedData(prev => ({ ...prev, platforms: next }))
                                                                    }}
                                                                    className={cn(
                                                                        "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                                                        active ? "bg-black text-white shadow-lg scale-110" : "bg-black/[0.03] text-black/20 hover:bg-black/[0.06]"
                                                                    )}
                                                                >
                                                                    <PlatformIcon platform={p} className="w-3.5 h-3.5" />
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Timeline Logic */}
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Activation Date</label>
                                                    <input
                                                        type="date"
                                                        value={(editedData.start_date || project.start_date || '').split('T')[0]}
                                                        onChange={e => setEditedData(prev => ({ ...prev, start_date: e.target.value }))}
                                                        className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[12px] font-bold outline-none focus:bg-white transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Target Deadline</label>
                                                    <input
                                                        type="date"
                                                        value={(editedData.target_date || project.target_date || '').split('T')[0]}
                                                        onChange={e => setEditedData(prev => ({ ...prev, target_date: e.target.value }))}
                                                        className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[12px] font-bold outline-none focus:bg-white transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {/* Impact Score Control */}
                                            <div className="p-6 bg-black/[0.03] border border-black/5 rounded-[24px] space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Zap className="w-3.5 h-3.5 text-black/40" />
                                                        <label className="text-[9px] font-black text-black/30 uppercase tracking-widest">Impact Score</label>
                                                    </div>
                                                    <span className="text-[14px] font-black text-black">{editedData.impact_score || project.impact_score || 5}/10</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={editedData.impact_score || project.impact_score || 5}
                                                    onChange={e => setEditedData(prev => ({ ...prev, impact_score: parseInt(e.target.value) }))}
                                                    className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-black"
                                                />
                                            </div>

                                            <div className="flex items-center gap-3 pt-4">
                                                <button
                                                    onClick={handleSave}
                                                    className="flex-1 py-4 bg-black text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="px-6 py-4 bg-black/[0.03] text-black/40 rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-black/[0.06] transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-12">
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <h1 className="text-[32px] md:text-[42px] font-black tracking-tight text-black leading-none">{project.title}</h1>
                                                    {project.tagline && <p className="text-[14px] md:text-[16px] font-medium text-black/40 uppercase tracking-[0.2em]">{project.tagline}</p>}
                                                </div>

                                                <div className="p-8 bg-black/[0.01] border border-black/[0.03] rounded-[32px] space-y-4">
                                                    <div className="flex items-center gap-2 text-black/20 mb-2">
                                                        <AlignLeft className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Endeavor Brief</span>
                                                    </div>
                                                    <p className="text-[15px] font-medium text-black/70 leading-relaxed whitespace-pre-wrap">{project.description || 'No description provided.'}</p>
                                                </div>
                                            </div>

                                            {/* Milestones Section */}
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[12px] font-black uppercase tracking-widest text-black/30">Tactical Milestones</h3>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-black/20 uppercase">
                                                        <Target className="w-3 h-3" />
                                                        Active Roadmap
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    {projectMilestones.map(m => (
                                                        <div
                                                            key={m.id}
                                                            className={cn(
                                                                "w-full flex flex-col gap-3 p-5 rounded-[24px] border transition-all group",
                                                                m.status === 'completed'
                                                                    ? "bg-emerald-50 border-emerald-100 opacity-60 shadow-sm shadow-emerald-500/5"
                                                                    : "bg-white border-black/5 hover:border-black/20 hover:shadow-xl hover:shadow-black/5"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <button
                                                                    onClick={() => toggleMilestone(m)}
                                                                    className={cn(
                                                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0",
                                                                        m.status === 'completed' ? "bg-emerald-500 text-white" : "bg-black/5 text-black/20 group-hover:bg-black group-hover:text-white"
                                                                    )}
                                                                >
                                                                    {m.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                                </button>
                                                                <div className="flex-1 min-w-0">
                                                                    <input
                                                                        type="text"
                                                                        value={m.title}
                                                                        onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                                                                        className={cn(
                                                                            "w-full bg-transparent border-none outline-none text-[15px] font-bold p-0",
                                                                            m.status === 'completed' && "line-through text-emerald-900/40"
                                                                        )}
                                                                        placeholder="Milestone title..."
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => setMilestoneToDelete(m.id)}
                                                                    className="p-2 opacity-0 group-hover:opacity-100 text-black/10 hover:text-red-500 transition-all"
                                                                >
                                                                    <Trash className="w-4 h-4" />
                                                                </button>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-6 pl-12 border-t border-black/5 pt-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[8px] font-black uppercase text-black/20 whitespace-nowrap">Impact Score</span>
                                                                    <input
                                                                        type="range"
                                                                        min="1"
                                                                        max="10"
                                                                        value={m.impact_score || 5}
                                                                        onChange={(e) => updateMilestone(m.id, { impact_score: parseInt(e.target.value) })}
                                                                        className="w-20 h-0.5 bg-black/5 rounded-full appearance-none accent-black/40"
                                                                    />
                                                                    <span className="text-[10px] font-black text-black/40 w-4 text-center">{m.impact_score || 5}</span>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="w-3 h-3 text-black/10" />
                                                                    <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">
                                                                        {m.target_date ? new Date(m.target_date).toLocaleDateString('en-GB') : 'No Date'}
                                                                    </span>
                                                                </div>

                                                                <div className="px-2 py-0.5 bg-black/5 rounded text-[8px] font-black uppercase text-black/40 tracking-widest">
                                                                    {m.category || 'RND'}
                                                                </div>

                                                                {m.linked_task_id && (
                                                                    <div className="flex items-center gap-1.5 ml-auto text-emerald-600">
                                                                        <LinkIcon className="w-3 h-3" />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">Synced to Tasks</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* New Milestone Form */}
                                                    <form onSubmit={handleAddMilestone} className="relative group/new p-5 bg-black/[0.01] border-2 border-dashed border-black/[0.1] rounded-[24px] hover:border-black/30 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-black/20 group-hover/new:bg-black group-hover/new:text-white transition-all">
                                                                <Plus className="w-5 h-5" />
                                                            </div>
                                                            <input
                                                                value={newMilestoneTitle}
                                                                onChange={e => setNewMilestoneTitle(e.target.value)}
                                                                placeholder="Define next tactical step..."
                                                                className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-black placeholder:text-black/10"
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={!newMilestoneTitle.trim()}
                                                                className={cn(
                                                                    "px-5 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                    !newMilestoneTitle.trim() ? "opacity-0 scale-90" : "opacity-100 scale-100"
                                                                )}
                                                            >
                                                                Add Step
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>

                                            {/* GTV Portfolio (Conditional) */}
                                            {!settings.is_demo_mode && (
                                                <div className="pt-12 border-t border-black/5 space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-[14px] bg-blue-50 text-blue-600 flex items-center justify-center">
                                                                <Shield className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[14px] font-black text-black">GTV Portfolio Recognition</h4>
                                                                <p className="text-[11px] font-medium text-black/30 uppercase tracking-widest">Status: {project.gtv_featured ? 'Verified Evidence' : 'Draft Endeavor'}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => updateProject(project.id, { gtv_featured: !project.gtv_featured })}
                                                            className={cn(
                                                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                project.gtv_featured ? "bg-blue-600 text-white shadow-lg" : "bg-black/[0.03] text-black/40 hover:bg-black/[0.06]"
                                                            )}
                                                        >
                                                            {project.gtv_featured ? 'Featured in Portfolio' : 'Feature for GTV'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <ConfirmationModal
                        isOpen={showDeleteConfirm}
                        onClose={() => setShowDeleteConfirm(false)}
                        onConfirm={async () => {
                            await deleteProject(project.id)
                            onClose()
                        }}
                        title="Archive Project?"
                        message={`Are you sure you want to permanently archive "${project.title}"? This will remove all associated roadmap data.`}
                        confirmText="Archive"
                        type="danger"
                    />
                    
                    <ConfirmationModal
                        isOpen={!!milestoneToDelete}
                        onClose={() => setMilestoneToDelete(null)}
                        onConfirm={async () => {
                            if (milestoneToDelete) await deleteMilestone(milestoneToDelete)
                            setMilestoneToDelete(null)
                        }}
                        title="Remove Milestone?"
                        message="This tactical step will be removed from the active roadmap."
                        confirmText="Remove"
                        type="danger"
                    />
                </>
            )}
        </AnimatePresence>
    )
}
