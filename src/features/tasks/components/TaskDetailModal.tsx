"use client"

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Calendar, Clock, Star,
    AlertCircle, ShoppingCart, Bell,
    Check, Save, Edit2, Trash2,
    Plus, ChevronRight, ChevronDown,
    Zap, Target, Beaker, Car, User, Activity,
    ArrowRight, MapPin, Briefcase, CheckSquare,
    Type, List, ListChecks, Factory, Tv, TrendingUp, Wallet, Heart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '../types/tasks.types'
import { CATEGORIES, PRIORITIES, STRATEGIC_CATEGORIES, PRIORITY_MAP, WORK_MODES } from '../constants/tasks.constants'
import type { StudioProject, StudioContent, StudioMilestone } from '../../studio/types/studio.types'

interface TaskDetailModalProps {
    task: Task | null
    milestone?: StudioMilestone | null
    isOpen: boolean
    onClose: () => void
    onToggleSubtask: (taskId: string, index: number) => Promise<void>
    onToggleComplete: (taskId: string, completed: boolean) => Promise<void>
    onEditTask?: (taskId: string, updates: Partial<Task>) => Promise<any>
    onEditMilestone?: (milestoneId: string, updates: Partial<StudioMilestone>) => Promise<any>
    projects?: StudioProject[]
    content?: StudioContent[]
}

const PERSONAL_CATEGORIES = STRATEGIC_CATEGORIES.personal
const BUSINESS_CATEGORIES = STRATEGIC_CATEGORIES.business

export function TaskDetailModal({
    task,
    milestone,
    isOpen,
    onClose,
    onToggleSubtask,
    onToggleComplete,
    onEditTask,
    onEditMilestone,
    projects = [],
    content = []
}: TaskDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState('')
    const [editPriority, setEditPriority] = useState(task?.priority || 'mid')
    const [editStrategicCategory, setEditStrategicCategory] = useState(task?.strategic_category || 'personal')
    const [editDuration, setEditDuration] = useState('')
    const [editTravelDuration, setEditTravelDuration] = useState('')
    const [editImpact, setEditImpact] = useState('')
    const [editStartTime, setEditStartTime] = useState('')
    const [editLocation, setEditLocation] = useState('')
    const [editOriginLocation, setEditOriginLocation] = useState('')
    const [editProjectId, setEditProjectId] = useState<string | null>(task?.project_id || null)
    const [editContentId, setEditContentId] = useState<string | null>(task?.content_id || null)
    const [linkType, setLinkType] = useState<'none' | 'project' | 'content'>(
        task?.content_id ? 'content' : task?.project_id ? 'project' : 'none'
    )
    const [editNotesType, setEditNotesType] = useState<'text' | 'bullets' | 'checklist'>(task?.notes?.type || 'text')
    const [editNotesContent, setEditNotesContent] = useState<any>(task?.notes?.content || '')
    const [newChecklistItem, setNewChecklistItem] = useState('')
    const [editWorkType, setEditWorkType] = useState<'light' | 'deep'>(task?.work_type || 'light')

    useEffect(() => {
        if (isOpen) {
            if (milestone) {
                setEditTitle(milestone.title)
                setEditPriority('mid') // Milestones don't have priority yet
                setEditStrategicCategory(milestone.category as any || 'general')
                setEditDuration('0')
                setEditTravelDuration('0')
                setEditImpact(milestone.impact_score?.toString() || '5')
                setEditStartTime('')
                setEditLocation('')
                setEditOriginLocation('')
                setEditProjectId(milestone.project_id || null)
                setEditContentId(milestone.content_id || null)
                setLinkType(milestone.content_id ? 'content' : milestone.project_id ? 'project' : 'none')
            } else if (task) {
                setEditTitle(task.title)

                let initialPriority = task.priority || 'mid'
                let initialCategory = task.strategic_category || 'personal'
                let initialImpact = task.impact_score?.toString() || '5'

                // Apply business defaults for unlinked tasks
                if (task.profile === 'business' && !task.project_id && !task.content_id) {
                    if (!task.strategic_category || task.strategic_category === 'rnd') {
                        if (!task.strategic_category) initialCategory = 'general'
                    }
                    if (task.priority === 'low' || !task.priority) initialPriority = 'mid'
                    if (!task.impact_score || task.impact_score === 5) initialImpact = '2'
                }

                setEditPriority(initialPriority)
                setEditStrategicCategory(initialCategory)
                setEditDuration(task.estimated_duration?.toString() || '30')
                setEditTravelDuration(task.travel_to_duration?.toString() || '0')
                setEditImpact(initialImpact)
                setEditStartTime(task.start_time || '')
                setEditLocation(task.location || '')
                setEditOriginLocation(task.origin_location || '')
                setEditProjectId(task.project_id || null)
                setEditContentId(task.content_id || null)
                setLinkType(task.content_id ? 'content' : task.project_id ? 'project' : 'none')
                setEditNotesType(task.notes?.type || 'text')
                setEditNotesContent(task.notes?.content || (task.notes?.type === 'checklist' ? [] : ''))
                setEditWorkType(task.work_type || 'light')
            }
        }
    }, [task, milestone, isOpen])

    if (!task && !milestone) return null

    const item = (task || milestone)!
    const isMilestone = !!milestone
    const isCompleted = isMilestone ? milestone!.status === 'completed' : task!.is_completed


    const checklistItems = !isMilestone && task?.notes?.type === 'checklist' ? (task.notes.content as any[]) : []
    const completedSubtasks = checklistItems.filter((i: any) => i.completed).length
    const totalSubtasks = checklistItems.length
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0


    const STRATEGIC_CATEGORIES_LIST = task?.profile === 'business' ? [
        { id: 'rnd', label: 'R&D' },
        { id: 'production', label: 'Production' },
        { id: 'media', label: 'Media' },
        { id: 'growth', label: 'Growth' },
        { id: 'general', label: 'General' },
    ] : [
        { id: 'finance', label: 'Finance' },
        { id: 'career', label: 'Career' },
        { id: 'health', label: 'Health' },
        { id: 'personal', label: 'Personal' },
    ] as const

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white border border-black/[0.08] rounded-3xl shadow-2xl z-[101] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="relative p-8 pb-6">
                            <button
                                onClick={onClose}
                                className="absolute right-6 top-6 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 text-black/40 hover:bg-black/10 hover:text-black transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-2 mb-4">
                                <span className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm",
                                    isMilestone
                                        ? "bg-blue-50 text-blue-600 border-blue-200"
                                        : task?.category === 'reminder'
                                            ? "bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100/50"
                                            : (PRIORITY_MAP[task?.priority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.mid).color
                                )}>
                                    {isMilestone
                                        ? 'Milestone'
                                        : task?.category === 'reminder'
                                            ? 'Reminder'
                                            : (PRIORITY_MAP[task?.priority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.low).label}
                                </span>
                                {task?.category !== 'grocery' && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-black/40 bg-black/5 uppercase tracking-wider">
                                        {isMilestone ? <Briefcase className="w-3 h-3" /> : (task?.profile === 'business' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />)}
                                        {isMilestone ? 'business' : task?.profile}
                                    </span>
                                )}
                                {((isMilestone ? milestone?.category : task?.strategic_category)) && (isMilestone || task?.category !== 'grocery') && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-black/40 bg-black/5 uppercase tracking-wider">
                                        {isMilestone ? milestone?.category : task?.strategic_category}
                                    </span>
                                )}

                                {!isMilestone && task && task.estimated_duration && task.category !== 'reminder' && task.category !== 'grocery' && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 uppercase tracking-wider">
                                        <Clock className="w-3 h-3" />
                                        {task.estimated_duration}m
                                    </span>
                                )}
                                {item.impact_score && (task || milestone)?.category !== 'reminder' && (task || milestone)?.category !== 'grocery' && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 uppercase tracking-wider">
                                        <Zap className="w-3 h-3" />
                                        {item.impact_score}/10
                                    </span>
                                )}
                                    {task?.work_type && task?.category === 'todo' && (
                                        <span className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                            task.work_type === 'deep' ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                        )}>
                                            {task.work_type === 'deep' ? <Activity className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                            {task.work_type}
                                        </span>
                                    )}
                                {!isMilestone && task && (task.travel_to_duration || 0) > 0 && task.category !== 'reminder' && task.category !== 'grocery' && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-500 bg-amber-50 border border-amber-100 uppercase tracking-wider">
                                        <Car className="w-3 h-3" />
                                        {task.travel_to_duration || 0}{task.travel_from_duration !== task.travel_to_duration ? `+ ${task.travel_from_duration || 0} ` : ''}m
                                    </span>
                                )}

                            </div>

                            {isEditing ? (
                                <input
                                    autoFocus
                                    value={editTitle}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                                    className="w-full text-2xl font-bold tracking-tight mb-2 bg-black/[0.03] border border-black/5 rounded-xl px-3 py-1 outline-none focus:bg-white transition-all"

                                />
                            ) : (
                                <h2 className={cn(
                                    "text-2xl font-bold tracking-tight mb-2",
                                    isCompleted ? "text-black/30 line-through" : "text-black"
                                )}>
                                    {item.title}
                                </h2>
                            )}

                            {(isMilestone ? milestone?.target_date : task?.due_date) && (isMilestone || task?.category !== 'grocery') && (
                                <div className="flex items-center gap-2 text-[12px] font-bold text-black/40 uppercase tracking-widest mt-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        {!isMilestone && task?.due_date_mode === 'before' && "On or Before "}
                                        {!isMilestone && task?.due_date_mode === 'range' && "From "}
                                        {new Date((isMilestone ? milestone?.target_date : task?.due_date) as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        {!isMilestone && task?.due_date_mode === 'range' && task?.end_date && ` → ${new Date(task.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} `}
                                    </span>
                                </div>
                            )}


                            {!isMilestone && (task?.start_time || task?.location) && task?.category !== 'grocery' && (
                                <div className="flex flex-wrap gap-4 mt-3">
                                    {task?.start_time && (
                                        <div className="flex items-center gap-2 text-[12px] font-bold text-black/60 bg-black/5 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Starts at {task.start_time}</span>
                                        </div>
                                    )}
                                    {task?.location && (
                                        <div className="flex items-center gap-2 text-[12px] font-bold text-black/60 bg-black/5 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>{task.location}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Content Area */}
                        <div className="px-8 pb-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {/* Checklist Section */}
                            {!isMilestone && task?.notes?.type === 'checklist' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[11px] font-bold text-black/30 uppercase tracking-[0.2em]">Checklist Progress</h3>
                                        <span className="text-[11px] font-bold text-black/60">{completedSubtasks}/{totalSubtasks}</span>
                                    </div>

                                    <div className="h-2 bg-black/[0.03] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}% ` }}
                                            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-500"
                                        />
                                    </div>

                                    <div className="grid gap-2 mt-6">
                                        {checklistItems.map((item: any, idx: number) => (
                                            <div
                                                key={idx}
                                                onClick={() => onToggleSubtask(task!.id, idx)}

                                                className={cn(
                                                    "group flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer",
                                                    item.completed
                                                        ? "bg-black/[0.01] border-transparent"
                                                        : "bg-white border-black/[0.04] hover:border-black/[0.1] hover:shadow-sm"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                                                    item.completed
                                                        ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20"
                                                        : "bg-white border-black/10 group-hover:border-black/30"
                                                )}>
                                                    {item.completed && <CheckSquare className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className={cn(
                                                    "text-[14px] transition-all",
                                                    item.completed ? "text-black/30 line-through" : "text-black/70 font-medium"
                                                )}>
                                                    {item.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Plain Text Notes Section */}
                            {!isMilestone && task?.notes?.type !== 'checklist' && task?.notes?.content && (
                                <div className="space-y-3">
                                    <h3 className="text-[11px] font-bold text-black/30 uppercase tracking-[0.2em]">Notes</h3>
                                    <div className="p-6 bg-black/[0.02] border border-black/[0.04] rounded-2xl text-[14px] text-black/70 leading-relaxed whitespace-pre-wrap font-medium">
                                        {task?.notes?.content}
                                    </div>
                                </div>
                            )}

                            {!isMilestone && !task?.notes?.content && !isEditing && (
                                <div className="flex flex-col items-center justify-center py-12 text-black/20 italic">
                                    <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-[13px]">No additional notes for this task.</p>
                                </div>
                            )}

                            {isEditing && (
                                <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-[11px] font-bold text-black/30 uppercase tracking-[0.2em]">{isMilestone ? 'Milestone Configuration' : 'Task Configuration'}</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        {!isMilestone && task?.category !== 'reminder' && task?.category !== 'grocery' && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-black/40 uppercase tracking-widest px-1">Priority</label>
                                                <select
                                                    value={editPriority}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditPriority(e.target.value as any)}
                                                    className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-black/20 focus:bg-white transition-all appearance-none cursor-pointer"

                                                >
                                                    {PRIORITIES.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {/* For Groceries, keep priority but in a different layout or same as Todo */}
                                        {!isMilestone && task?.category === 'grocery' && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-black/40 uppercase tracking-widest px-1">Priority</label>
                                                <select
                                                    value={editPriority}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditPriority(e.target.value as any)}
                                                    className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-black/20 focus:bg-white transition-all appearance-none cursor-pointer"

                                                >
                                                    {PRIORITIES.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                    </div>


                                    <div className="grid grid-cols-2 gap-4">
                                        {!isMilestone && task?.category !== 'reminder' && task?.category !== 'grocery' && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-bold text-black/40 uppercase tracking-widest px-1 flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" /> Duration
                                                    </label>
                                                    <select
                                                        value={editDuration}
                                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setEditDuration(e.target.value)}
                                                        className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-black/20 focus:bg-white transition-all appearance-none cursor-pointer"

                                                    >
                                                        {Array.from({ length: 16 }, (_, i) => (i + 1) * 15).map(mins => (
                                                            <option key={mins} value={mins}>
                                                                {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''} ` : `${mins} m`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-bold text-black/40 uppercase tracking-widest px-1 flex items-center gap-1">
                                                        <Car className="w-3.5 h-3.5" /> Travel (mins)
                                                    </label>
                                                    <select
                                                        value={editTravelDuration}
                                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setEditTravelDuration(e.target.value)}
                                                        className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-black/20 focus:bg-white transition-all appearance-none cursor-pointer"

                                                    >
                                                        <option value="0">None</option>
                                                        {Array.from({ length: 8 }, (_, i) => (i + 1) * 15).map(mins => (
                                                            <option key={mins} value={mins}>
                                                                {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''} ` : `${mins} m`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                        {task?.category !== 'reminder' && task?.category !== 'grocery' && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-black/40 uppercase tracking-widest px-1 flex items-center gap-1">
                                                    <Zap className="w-3.5 h-3.5" /> Impact & Mode
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-3 bg-black/[0.03] border border-black/5 rounded-xl px-4 py-2.5 h-[50px] flex-1">
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            value={editImpact}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditImpact(e.target.value)}
                                                            className="flex-1 accent-black h-1 bg-black/10 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                        <span className="text-[12px] font-black text-black w-4 text-center">{editImpact}</span>
                                                    </div>

                                                    {!isMilestone && task?.category === 'todo' && (
                                                        <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/5 h-[50px]">
                                                            {WORK_MODES.map((mode) => (
                                                                <button
                                                                    key={mode.id}
                                                                    type="button"
                                                                    onClick={() => setEditWorkType(mode.id as any)}
                                                                    title={mode.label}
                                                                    className={cn(
                                                                        "w-10 flex items-center justify-center rounded-lg transition-all",
                                                                        editWorkType === mode.id
                                                                            ? "bg-white text-black shadow-sm"
                                                                            : "text-black/30 hover:text-black/60"
                                                                    )}
                                                                >
                                                                    <mode.icon className="w-4 h-4" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>


                                    {!isMilestone && task?.category !== 'grocery' && (
                                        <div className="space-y-4 pt-2">
                                            <div className="bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 flex items-center justify-between">
                                                <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest">Appointment Time</label>
                                                <input
                                                    type="time"
                                                    value={editStartTime}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditStartTime(e.target.value)}

                                                    className="bg-transparent text-[14px] font-black text-black outline-none"
                                                />
                                            </div>

                                            {task?.category !== 'reminder' && (
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest px-1">Location Details</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input
                                                            type="text"
                                                            placeholder="Destination..."
                                                            value={editLocation}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditLocation(e.target.value)}

                                                            className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-black/20 focus:bg-white transition-all"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Origin..."
                                                            value={editOriginLocation}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditOriginLocation(e.target.value)}

                                                            className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-black/20 focus:bg-white transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}


                                    {/* Studio Linking - Hidden for groceries */}
                                    {(isMilestone || (task?.profile === 'business' && task?.category !== 'grocery') || projects.length > 0) && task?.category !== 'grocery' && (
                                        <div className="space-y-4 pt-4 border-t border-black/[0.04]">
                                            <h3 className="text-[11px] font-bold text-black/30 uppercase tracking-[0.2em]">Studio Linking</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-bold text-black/40 uppercase tracking-widest px-1">Link To</label>
                                                    <select
                                                        value={linkType}
                                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                                            const val = e.target.value as any
                                                            setLinkType(val)

                                                            if (val === 'none') {
                                                                setEditProjectId(null)
                                                                setEditContentId(null)
                                                            } else if (val === 'project') {
                                                                setEditContentId(null)
                                                            } else {
                                                                setEditProjectId(null)
                                                            }
                                                        }}
                                                        className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-black/20 focus:bg-white transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value="none">None</option>
                                                        <option value="project">Project</option>
                                                        <option value="content">Content</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-bold text-black/40 uppercase tracking-widest px-1">
                                                        {linkType === 'project' ? 'Select Project' : linkType === 'content' ? 'Select Content' : 'Context'}
                                                    </label>
                                                    <select
                                                        disabled={linkType === 'none'}
                                                        value={linkType === 'project' ? (editProjectId || '') : (editContentId || '')}
                                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                            if (linkType === 'project') setEditProjectId(e.target.value)
                                                            else setEditContentId(e.target.value)
                                                        }}

                                                        className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[14px] text-black outline-none focus:border-black/20 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50"
                                                    >
                                                        <option value="">Select...</option>
                                                        {linkType === 'project' ? (
                                                            projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)
                                                        ) : (
                                                            content.map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                                                        )}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Notes Editor in Modal */}
                                    <div className="space-y-4 pt-4 border-t border-black/[0.04]">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-bold text-black/30 uppercase tracking-[0.2em]">Notes / Checklist</h3>
                                            <div className="flex bg-black/[0.03] rounded-lg p-1">
                                                {([
                                                    { id: 'text', icon: Type, label: 'Text' },
                                                    { id: 'bullets', icon: List, label: 'Bullets' },
                                                    { id: 'checklist', icon: ListChecks, label: 'Checklist' }
                                                ] as const).map(type => {
                                                    const IconComponent = type.icon as any
                                                    return (
                                                        <button
                                                            key={type.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setEditNotesType(type.id)
                                                                if (type.id === 'checklist' && !Array.isArray(editNotesContent)) {
                                                                    setEditNotesContent([])
                                                                } else if (type.id !== 'checklist' && Array.isArray(editNotesContent)) {
                                                                    setEditNotesContent('')
                                                                }
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all",
                                                                editNotesType === type.id
                                                                    ? "bg-white text-neutral-900 shadow-sm"
                                                                    : "text-neutral-400 hover:text-neutral-600"
                                                            )}
                                                        >
                                                            <IconComponent className="w-3 h-3" />
                                                            {type.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div className="bg-black/[0.02] border border-black/[0.05] rounded-2xl p-4 min-h-[120px]">
                                            {editNotesType === 'checklist' ? (
                                                <div className="space-y-2">
                                                    {(Array.isArray(editNotesContent) ? editNotesContent : []).map((item: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-2 group">
                                                            <div className="w-4 h-4 rounded border border-black/10" />
                                                            <input
                                                                value={item.text}
                                                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                    const newContent = [...(editNotesContent as { text: string; completed: boolean }[])]
                                                                    newContent[idx] = { ...newContent[idx], text: e.target.value }
                                                                    setEditNotesContent(newContent)
                                                                }}
                                                                className="flex-1 bg-transparent text-[13px] font-medium outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const nc = [...editNotesContent]
                                                                    nc.splice(idx, 1)
                                                                    setEditNotesContent(nc)
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 text-black/20 hover:text-rose-500 transition-all"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <Plus className="w-4 h-4 text-black/20" />
                                                        <input
                                                            placeholder="Add item..."
                                                            value={newChecklistItem}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewChecklistItem(e.target.value)}
                                                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                                                if (e.key === 'Enter' && newChecklistItem.trim()) {
                                                                    setEditNotesContent([...(Array.isArray(editNotesContent) ? editNotesContent : []), { text: newChecklistItem.trim(), completed: false }])
                                                                    setNewChecklistItem('')
                                                                }
                                                            }}
                                                            className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-black/20"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <textarea
                                                    value={typeof editNotesContent === 'string' ? editNotesContent : ''}
                                                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditNotesContent(e.target.value)}
                                                    placeholder="Add details..."
                                                    className="w-full bg-transparent text-[13px] font-medium outline-none min-h-[100px] resize-none"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Controls */}
                        <div className="px-8 py-6 bg-black/[0.01] border-t border-black/[0.04] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={isMilestone ? milestone?.status === 'completed' : task?.is_completed}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            if (isMilestone) {
                                                onEditMilestone?.(milestone!.id, { status: e.target.checked ? 'completed' : 'pending' })
                                            } else {
                                                onToggleComplete(task!.id, e.target.checked)
                                            }
                                        }}

                                        className="w-5 h-5 rounded-lg border-2 border-black/10 checked:bg-black checked:border-black transition-all accent-black"
                                    />
                                    <span className="text-[12px] font-bold text-black/40 group-hover:text-black transition-colors">
                                        {(isMilestone ? milestone?.status === 'completed' : task?.is_completed) ? 'Item Completed' : 'Mark as Complete'}
                                    </span>
                                </label>
                            </div>

                            <button
                                onClick={async () => {
                                    if (isEditing) {
                                        if (isMilestone && onEditMilestone) {
                                            await onEditMilestone(milestone!.id, {
                                                title: editTitle,
                                                category: editStrategicCategory,
                                                impact_score: parseInt(editImpact),
                                                project_id: editProjectId || undefined,
                                                content_id: editContentId || undefined
                                            })
                                        } else if (!isMilestone && onEditTask) {
                                            const isGrocery = task?.category === 'grocery'
                                            await onEditTask(task!.id, {
                                                title: editTitle,
                                                priority: editPriority,
                                                strategic_category: isGrocery ? undefined : editStrategicCategory,
                                                estimated_duration: isGrocery ? undefined : parseInt(editDuration),
                                                impact_score: isGrocery ? undefined : parseInt(editImpact),
                                                travel_to_duration: isGrocery ? undefined : parseInt(editTravelDuration),
                                                travel_from_duration: isGrocery ? undefined : parseInt(editTravelDuration),
                                                start_time: isGrocery ? undefined : (editStartTime || undefined),
                                                location: isGrocery ? undefined : (editLocation || undefined),
                                                origin_location: isGrocery ? undefined : (editOriginLocation || undefined),
                                                project_id: isGrocery ? null : (editProjectId || null),
                                                content_id: isGrocery ? null : (editContentId || null),
                                                notes: {
                                                    type: editNotesType,
                                                    content: editNotesContent
                                                },
                                                work_type: editWorkType
                                            })
                                        }
                                        setIsEditing(false)
                                    } else {
                                        setIsEditing(true)
                                    }
                                }}
                                className="px-6 py-2.5 bg-black text-white text-[12px] font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 active:scale-95"
                            >
                                {isEditing ? 'Save Changes' : 'Edit Details'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
