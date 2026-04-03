'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import type { ChangeEvent, KeyboardEvent, FocusEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Settings2, Plus, Trash2, LayoutGrid,
    Clock, Smartphone, Globe, Briefcase, User,
    ChevronRight, Save, Beaker, Factory, Tv, TrendingUp, Zap,
    Type, ListChecks, ShoppingCart, Bell, Car,
    ChevronDown, ChevronUp, Lock,
    Grid, List, Tag, Eye, EyeOff, Check,
    Wallet, Heart, Feather, Timer, Dumbbell, FileText
} from 'lucide-react'
import { TaskTemplate, Category, Priority, StrategicCategory } from '../types/tasks.types'
import { CATEGORIES, PRIORITIES, STRATEGIC_CATEGORIES, PRIORITY_MAP, WORK_MODES } from '../constants/tasks.constants'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useTasksProfile } from '../contexts/TasksProfileContext'

// Fixed strategic categories for the settings modal
const LOCAL_STRATEGIC_CATEGORIES = {
    personal: [
        { id: 'finance', label: 'Finance', icon: Wallet, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
        { id: 'career', label: 'Career', icon: Briefcase, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
        { id: 'health', label: 'Health', icon: Heart, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
        { id: 'personal', label: 'Personal', icon: User, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    ],
    business: [
        { id: 'rnd', label: 'R&D', icon: Beaker, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
        { id: 'production', label: 'Production', icon: Factory, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
        { id: 'media', label: 'Media', icon: Tv, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
        { id: 'growth', label: 'Growth', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
        { id: 'general', label: 'General', icon: Zap, color: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20' },
    ]
}

interface TaskSettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export function TaskSettingsModal({ isOpen, onClose }: TaskSettingsModalProps) {
    const { activeProfile } = useTasksProfile()
    const [templates, setTemplates] = useState<TaskTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<Partial<TaskTemplate> | null>(null)
    const isShopping = editingTemplate?.category === 'grocery' || editingTemplate?.category === 'essential'
    const isGrocery = editingTemplate?.category === 'grocery'
    const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
    const [newChecklistItem, setNewChecklistItem] = useState('')

    const DEFAULT_TEMPLATE: Partial<TaskTemplate> = {
        title: '',
        category: 'todo',
        priority: 'low',
        impact_score: 5,
        work_type: 'light'
    }

    useEffect(() => {
        if (isOpen) {
            fetchTemplates()
        }
    }, [isOpen])

    const fetchTemplates = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('fin_task_templates')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setTemplates(data)
        }
        setLoading(false)
    }

    const handleSave = async () => {
        if (!editingTemplate?.title) return

        const payload = {
            ...editingTemplate,
            profile: activeProfile,
            updated_at: new Date().toISOString()
        }

        let error
        if (editingTemplate.id) {
            // Clean payload for update: remove id and created_at
            const { id, created_at, ...updateData } = payload as any
            const { error: err } = await supabase
                .from('fin_task_templates')
                .update(updateData)
                .eq('id', editingTemplate.id)
            error = err
        } else {
            const { error: err } = await supabase
                .from('fin_task_templates')
                .insert([{ ...payload, created_at: new Date().toISOString() }])
            error = err
        }

        if (!error) {
            setIsAdding(false)
            setEditingTemplate(null)
            fetchTemplates()
        } else {
            console.error('Failed to save preset:', JSON.stringify(error, null, 2), error)
            alert(`Operation Failed: ${error.message || error.details || 'Unknown error'}. Please ensure the database migration for 'work_type' has been run and the schema cache is reloaded.`)
        }
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('fin_task_templates')
            .delete()
            .eq('id', id)

        if (!error) {
            fetchTemplates()
        } else {
            console.error('Failed to delete preset:', error)
            alert(`Purge Failed: ${error.message}`)
        }
    }

    const renderTemplateForm = () => {
        if (!editingTemplate) return null
        return (
            <div className="p-7 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-6 bg-blue-500 rounded-full" />
                        <h3 className="text-[13px] font-[900] uppercase tracking-[0.15em] text-neutral-800">
                            {editingTemplate.id ? 'Refine Preset' : 'New Configuration'}
                        </h3>
                    </div>
                    {editingTemplate.id && (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-wider">Modifying Active Spec</span>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em] ml-1">Preset Identity</label>
                        <input
                            type="text"
                            value={editingTemplate.title || ''}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                            placeholder="e.g. Deep Work Session"
                            className="w-full bg-white border border-black/10 rounded-xl px-5 py-3.5 font-bold text-[15px] outline-none focus:border-black transition-all placeholder:text-black/20"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em] ml-1">Class</label>
                            <div className="flex bg-white rounded-xl border border-black/10 p-1 shadow-sm">
                                {(['todo', 'reminder'] as const).map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setEditingTemplate({ ...editingTemplate, category: c as any })}
                                        className={cn(
                                            "flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                            editingTemplate.category === c
                                                ? "bg-black text-white shadow-md shadow-black/10"
                                                : "text-black/30 hover:text-black/60 hover:bg-black/[0.02]"
                                        )}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {editingTemplate.category !== 'reminder' && editingTemplate.category !== 'grocery' && editingTemplate.category !== 'essential' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em] ml-1">Priority</label>
                                <div className="flex bg-white rounded-xl border border-black/10 p-1 shadow-sm">
                                    {(['low', 'mid', 'high', 'super'] as const).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setEditingTemplate({ ...editingTemplate, priority: p })}
                                            className={cn(
                                                "flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                                editingTemplate.priority === p
                                                    ? p === 'super' ? "bg-purple-600 text-white shadow-md shadow-purple-100" :
                                                        p === 'high' ? "bg-red-600 text-white shadow-md shadow-red-100" :
                                                            p === 'mid' ? "bg-yellow-500 text-white shadow-md shadow-yellow-100" :
                                                                "bg-black text-white shadow-md shadow-black/10"
                                                    : "text-black/30 hover:text-black/60 hover:bg-black/[0.02]"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {editingTemplate.category === 'todo' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em] ml-1">Engagement Mode</label>
                                <div className="flex bg-white rounded-xl border border-black/10 p-1 shadow-sm">
                                    {WORK_MODES.map(m => {
                                        const Icon = m.icon
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => setEditingTemplate({ ...editingTemplate, work_type: m.id as any })}
                                                className={cn(
                                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                                    editingTemplate.work_type === m.id
                                                        ? "bg-black text-white shadow-md shadow-black/10"
                                                        : "text-black/30 hover:text-black/60 hover:bg-black/[0.02]"
                                                )}
                                            >
                                                <Icon className="w-3 h-3" />
                                                {m.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {editingTemplate.category !== 'grocery' && editingTemplate.category !== 'essential' && editingTemplate.category !== 'reminder' && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em] ml-1">Category</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {((activeProfile === 'business' ? STRATEGIC_CATEGORIES.business : STRATEGIC_CATEGORIES.personal) as unknown as any[]).map((s: any) => (
                                        <button
                                            key={s.id}
                                            onClick={() => setEditingTemplate({ ...editingTemplate, strategic_category: s.id })}
                                            className={cn(
                                                "flex flex-col items-center gap-2 px-3 py-3.5 rounded-xl border text-[10px] font-bold tracking-tight transition-all group active:scale-95",
                                                editingTemplate.strategic_category === s.id
                                                    ? "bg-black text-white border-black shadow-md shadow-black/10"
                                                    : "bg-white border-black/[0.06] text-black/40 hover:border-black/20 hover:text-black/60"
                                            )}
                                        >
                                            <s.icon className={cn("w-4 h-4", editingTemplate.strategic_category === s.id ? "text-white" : "text-black/20 group-hover:text-black/40 transition-colors")} />
                                            <span className="uppercase tracking-wider">{s.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {editingTemplate.category !== 'reminder' && editingTemplate.category !== 'grocery' && editingTemplate.category !== 'essential' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em] ml-1">Impact Score</label>
                                <div className="bg-white rounded-xl border border-black/10 p-3 shadow-sm flex flex-col justify-center">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={editingTemplate.impact_score || 5}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, impact_score: parseInt(e.target.value) })}
                                        className="w-full accent-black h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between mt-2.5 px-0.5">
                                        <span className="text-[9px] font-bold text-black/20 uppercase tracking-tighter">Minimal</span>
                                        <span className="text-[13px] font-black text-black leading-none">{editingTemplate.impact_score || 5}</span>
                                        <span className="text-[9px] font-bold text-black/20 uppercase tracking-tighter">Critical</span>
                                    </div>
                                </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em] ml-1">Dynamic Parameters</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {([
                                { id: 'project', label: 'Project', icon: LayoutGrid },
                                { id: 'content', label: 'Content', icon: Tv },
                                { id: 'article', label: 'Article', icon: FileText },
                                { id: 'fitness', label: 'Fitness', icon: Dumbbell }
                            ] as const).map(param => (
                                <button
                                    key={param.id}
                                    type="button"
                                    onClick={() => {
                                        const current = (editingTemplate as any).dynamic_params || []
                                        const next = current.includes(param.id)
                                            ? current.filter((p: string) => p !== param.id)
                                            : [...current, param.id]
                                        setEditingTemplate({ ...editingTemplate, dynamic_params: next })
                                    }}
                                    className={cn(
                                        "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-tight transition-all",
                                        ((editingTemplate as any).dynamic_params || []).includes(param.id)
                                            ? "bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-100"
                                            : "bg-white text-black/40 border-black/10 hover:border-black/20 hover:text-black/60"
                                    )}
                                >
                                    <param.icon className="w-3 h-3" />
                                    {param.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-black/30 italic ml-1">Modal will pop up when clicking quick action to select data.</p>
                    </div>
                </div>


                    {/* Notes System */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-[900] text-neutral-400 uppercase tracking-[0.2em] ml-1">Preset Notes / Checklist</label>
                            <div className="flex bg-neutral-100 rounded-lg p-1">
                                {([
                                    { id: 'text', icon: Type, label: 'Text' },
                                    { id: 'bullets', icon: List, label: 'Bullets' },
                                    { id: 'checklist', icon: ListChecks, label: 'Checklist' }
                                ] as const).map(type => {
                                    const Icon = type.icon
                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => {
                                                const newNotes = {
                                                    type: type.id,
                                                    content: type.id === 'checklist' ? [] : ''
                                                    }
                                                setEditingTemplate((prev: any) => ({ ...prev, notes: newNotes as any }))
                                            }}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all",
                                                editingTemplate.notes?.type === type.id
                                                    ? "bg-white text-neutral-900 shadow-sm"
                                                    : "text-neutral-400 hover:text-neutral-600"
                                            )}
                                        >
                                            <Icon className="w-3 h-3" />
                                            {type.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-inner">
                            {editingTemplate.notes?.type === 'checklist' ? (
                                <div className="space-y-3">
                                    {((editingTemplate.notes.content as any[]) || []).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 group">
                                            <div className="w-5 h-5 rounded-md border-2 border-neutral-200" />
                                            <span className="flex-1 text-[13px] font-bold text-neutral-700">{item.text}</span>
                                            <button
                                                onClick={() => {
                                                    const newContent = [...(editingTemplate.notes!.content as any[])]
                                                    newContent.splice(idx, 1)
                                                    setEditingTemplate((prev: any) => ({
                                                        ...prev,
                                                        notes: { ...prev.notes!, content: newContent }
                                                    }))
                                                }}
                                                className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-rose-500 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            placeholder="Add checklist item..."
                                            value={newChecklistItem}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewChecklistItem(e.target.value)}
                                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                                if (e.key === 'Enter' && newChecklistItem.trim()) {
                                                    setEditingTemplate((prev: any) => ({
                                                        ...prev,
                                                        notes: {
                                                            ...prev.notes,
                                                            content: [...(prev.notes.content || []), { text: newChecklistItem.trim(), completed: false }]
                                                        }
                                                    }))
                                                    setNewChecklistItem('')
                                                }
                                            }}
                                            className="flex-1 bg-transparent border-b-2 border-neutral-100 px-1 py-2 text-[13px] font-bold outline-none focus:border-blue-500 transition-all"
                                            onBlur={(e: FocusEvent<HTMLInputElement>) => {
                                                if (newChecklistItem.trim()) {
                                                    setEditingTemplate((prev: any) => ({
                                                        ...prev,
                                                        notes: {
                                                            ...prev.notes,
                                                            content: [...(prev.notes.content || []), { text: newChecklistItem.trim(), completed: false }]
                                                        }
                                                    }))
                                                    setNewChecklistItem('')
                                                }
                                            }}
                                        />
                                        <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <textarea
                                    value={editingTemplate.notes?.content as string || ''}
                                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditingTemplate((prev: any) => ({
                                        ...prev,
                                        notes: { ...prev.notes, content: e.target.value }
                                    }))}
                                    placeholder={editingTemplate.notes?.type === 'bullets' ? "Add point per line..." : "Attach strategic context here..."}
                                    className="w-full bg-transparent text-[13px] font-bold text-neutral-700 outline-none min-h-[100px] resize-none placeholder:text-neutral-300"
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-neutral-200">
                    <button
                        onClick={() => {
                            setIsAdding(false)
                            setEditingTemplate(null)
                        }}
                        className="px-6 py-3.5 rounded-xl bg-white border border-black/10 hover:bg-neutral-50 text-black/60 font-bold text-[13px] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3.5 rounded-xl bg-black text-white font-bold text-[13px] hover:bg-neutral-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                    >
                        <Save className="w-4 h-4" />
                        Save
                    </button>
                </div>
            </div>
        )
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-black/5"
            >

                {/* Header */}
                <div className="px-8 py-8 flex items-center justify-between border-b border-black/[0.03] bg-neutral-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-black border border-black/10 flex items-center justify-center text-white shadow-lg shadow-black/5">
                            <Settings2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-black tracking-tight">Operation Presets</h2>
                            <p className="text-[11px] text-black/40 font-bold uppercase tracking-wider mt-0.5">Focus & Execution Library</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-all active:scale-90"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">
                    {/* Add New Template Button */}
                    {!isAdding && (
                        <button
                            onClick={() => {
                                setIsAdding(true)
                                setEditingTemplate({
                                    ...DEFAULT_TEMPLATE,
                                    strategic_category: activeProfile === 'business' ? 'rnd' : 'personal' as any,
                                    notes: { type: 'text', content: '' }
                                })
                            }}
                            className="w-full py-6 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-[1.75rem] flex flex-col items-center justify-center gap-2 group hover:border-blue-500/50 hover:bg-blue-50/30 transition-all active:scale-[0.99]"
                        >
                            <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-all">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="font-extrabold text-[15px] tracking-tight text-neutral-400 group-hover:text-blue-600 transition-colors">Engineer New Preset</span>
                        </button>
                    )}

                    {/* New Preset Form (Top) */}
                    <AnimatePresence mode="wait">
                        {isAdding && !editingTemplate?.id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, scale: 0.98 }}
                                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                                exit={{ height: 0, opacity: 0, scale: 0.98 }}
                                className="bg-neutral-50/50 rounded-[2rem] border border-neutral-200 overflow-hidden shadow-inner"
                            >
                                {renderTemplateForm()}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Template List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[11px] font-[900] text-neutral-400 uppercase tracking-[0.25em]">Operational Inventory</label>
                            {templates.length > 0 && (
                                <span className="text-[10px] font-black text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">{templates.length} Spec{templates.length > 1 ? 's' : ''}</span>
                            )}
                        </div>

                        {loading ? (
                            <div className="py-20 flex flex-col items-center gap-4">
                                <div className="relative w-12 h-12">
                                    <div className="absolute inset-0 border-4 border-neutral-100 rounded-full" />
                                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-300">Synchronizing...</span>
                            </div>
                        ) : templates.filter(t => t.profile === activeProfile).length === 0 ? (
                            <div className="py-20 text-center space-y-4 bg-neutral-50/50 rounded-[2.5rem] border-2 border-dashed border-neutral-100">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-neutral-100">
                                    <Beaker className="w-10 h-10 text-neutral-200" />
                                </div>
                                <div>
                                    <p className="text-[15px] font-[900] text-neutral-400 tracking-tight">System Laboratory Empty</p>
                                    <p className="text-[11px] text-neutral-300 font-bold uppercase tracking-widest mt-1">Ready for initialization</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {templates.filter(t => t.profile === activeProfile).map((tmpl: TaskTemplate) => (
                                    <div key={tmpl.id} className="space-y-3">
                                        <motion.div
                                            layout
                                            className={cn(
                                                "group bg-white border rounded-[1.75rem] p-5 flex items-center justify-between transition-all active:scale-[0.99]",
                                                editingTemplate?.id === tmpl.id
                                                    ? "border-blue-500/30 shadow-[0_20px_40px_-12px_rgba(59,130,246,0.1)]"
                                                    : "border-neutral-100 hover:border-neutral-200 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)]"
                                            )}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-[1.25rem] flex items-center justify-center border-2 transition-transform group-hover:scale-105",
                                                    tmpl.category === 'todo' ? "bg-indigo-50 border-indigo-100 text-indigo-500 shadow-indigo-100/50 shadow-lg" :
                                                        (tmpl.category === 'grocery' || tmpl.category === 'essential') ? "bg-emerald-50 border-emerald-100 text-emerald-500 shadow-emerald-100/50 shadow-lg" :
                                                            "bg-amber-50 border-amber-100 text-amber-500 shadow-amber-100/50 shadow-lg"
                                                )}>
                                                    {tmpl.category === 'todo' ? <Check className="w-8 h-8" /> :
                                                        (tmpl.category === 'grocery' || tmpl.category === 'essential') ? <ShoppingCart className="w-8 h-8" /> :
                                                            <Bell className="w-8 h-8" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-[16px] text-black leading-tight tracking-tight">{tmpl.title}</h4>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        <div className={cn(
                                                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0",
                                                            (PRIORITY_MAP[tmpl.priority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.low).color
                                                        )}>
                                                            {tmpl.category !== 'reminder' && (PRIORITY_MAP[tmpl.priority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.low).label}
                                                            {tmpl.category === 'reminder' && 'REMINDER'}
                                                        </div>

                                                        {tmpl.strategic_category && tmpl.category !== 'grocery' && tmpl.category !== 'essential' && tmpl.category !== 'reminder' && (
                                                            <span className="text-[9px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200">
                                                                {tmpl.strategic_category}
                                                            </span>
                                                        )}
                                                        
                                                        {tmpl.work_type && tmpl.category === 'todo' && (
                                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                                                                {tmpl.work_type === 'deep' ? <Timer className="w-2.5 h-2.5" /> : <Feather className="w-2.5 h-2.5" />}
                                                                {tmpl.work_type}
                                                            </span>
                                                        )}

                                                        {tmpl.category !== 'reminder' && tmpl.category !== 'grocery' && tmpl.category !== 'essential' && (
                                                            <div className="flex items-center gap-2 ml-1">
                                                                <div className="flex items-center gap-1">
                                                                    <label className="text-[9px] text-black/30 font-black uppercase tracking-widest leading-none">Impact</label>
                                                                    <span className="text-[11px] font-bold text-black/60">{tmpl.impact_score || 0}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {confirmingDelete === tmpl.id ? (
                                                    <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                                        <button
                                                            onClick={() => setConfirmingDelete(null)}
                                                            className="px-4 py-2 rounded-xl bg-neutral-100 text-[11px] font-black text-neutral-500 hover:bg-neutral-200"
                                                        >
                                                            CANCEL
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleDelete(tmpl.id)
                                                                setConfirmingDelete(null)
                                                            }}
                                                            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-[11px] font-black hover:bg-rose-600 shadow-lg shadow-rose-200"
                                                        >
                                                            PURGE
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                if (editingTemplate?.id === tmpl.id) {
                                                                    setIsAdding(false)
                                                                    setEditingTemplate(null)
                                                                } else {
                                                                    setIsAdding(true)
                                                                    setEditingTemplate(tmpl)
                                                                }
                                                            }}
                                                            className={cn(
                                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                                                                editingTemplate?.id === tmpl.id
                                                                    ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                                                                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900"
                                                            )}
                                                        >
                                                            <Settings2 className="w-5 h-5" />
                                                        </button>
                                                        {!editingTemplate?.id && (
                                                            <button
                                                                onClick={() => setConfirmingDelete(tmpl.id)}
                                                                className="w-12 h-12 rounded-2xl bg-neutral-100 hover:bg-rose-50 flex items-center justify-center text-neutral-300 hover:text-rose-500 transition-all active:scale-90"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>

                                        {/* Inline Edit Form */}
                                        <AnimatePresence mode="wait">
                                            {editingTemplate?.id === tmpl.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-neutral-50/30 rounded-[2.5rem] border border-blue-500/10 overflow-hidden shadow-inner"
                                                >
                                                    {renderTemplateForm()}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-neutral-50/50 border-t border-black/[0.03] flex items-center justify-between">
                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.4em]">Operations Unit</p>
                    <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-black/5" />
                        <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
                        <div className="w-1.5 h-1.5 rounded-full bg-black/5" />
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
