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
    Wallet, Heart
} from 'lucide-react'
import { TaskTemplate, Category, Priority, StrategicCategory } from '../types/tasks.types'
import { CATEGORIES, PRIORITIES, STRATEGIC_CATEGORIES, PRIORITY_MAP } from '../constants/tasks.constants'
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
    const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
    const [newChecklistItem, setNewChecklistItem] = useState('')

    const DEFAULT_TEMPLATE: Partial<TaskTemplate> = {
        title: '',
        category: 'todo',
        priority: 'low',
        estimated_duration: 30,
        travel_to_duration: 15,
        travel_from_duration: 15,
        impact_score: 5
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
            const { error: err } = await supabase
                .from('fin_task_templates')
                .update(payload)
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
        }
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('fin_task_templates')
            .delete()
            .eq('id', id)

        if (!error) {
            fetchTemplates()
        }
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
                className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh] border border-white/50"
            >
                {/* Decorative Header Gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500" />

                {/* Header */}
                <div className="px-8 py-8 flex items-center justify-between border-b border-black/[0.03]">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center text-white shadow-xl shadow-black/10">
                            <Settings2 className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-[900] text-neutral-900 tracking-tight leading-tight">Operation Presets</h2>
                            <p className="text-[12px] text-neutral-400 font-bold uppercase tracking-[0.2em] mt-0.5">Automated Task Engineering</p>
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
                                    priority: 'mid',
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

                    {/* Template Form */}
                    <AnimatePresence>
                        {isAdding && editingTemplate && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, scale: 0.98 }}
                                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                                exit={{ height: 0, opacity: 0, scale: 0.98 }}
                                className="bg-neutral-50/50 rounded-[2rem] border border-neutral-200 overflow-hidden shadow-inner"
                            >
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
                                            <label className="text-[10px] font-[900] text-neutral-400 uppercase tracking-[0.2em] ml-1">Preset Identity</label>
                                            <input
                                                type="text"
                                                value={editingTemplate.title || ''}
                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                                                placeholder="e.g. Deep Work Session"
                                                className="w-full bg-white border border-neutral-200 rounded-2xl px-6 py-4 font-bold text-[16px] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-neutral-300"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-[900] text-neutral-400 uppercase tracking-[0.2em] ml-1">Category</label>
                                                <div className="flex bg-white rounded-2xl border border-neutral-200 p-1.5 shadow-sm">
                                                    {(['todo', 'grocery', 'reminder'] as const).map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => setEditingTemplate({ ...editingTemplate, category: c })}
                                                            className={cn(
                                                                "flex-1 py-3 rounded-xl text-[11px] font-[900] uppercase tracking-wider transition-all",
                                                                editingTemplate.category === c
                                                                    ? "bg-neutral-900 text-white shadow-lg"
                                                                    : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
                                                            )}
                                                        >
                                                            {c}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {editingTemplate.category !== 'reminder' && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-[900] text-neutral-400 uppercase tracking-[0.2em] ml-1">Intensity / Risk</label>
                                                    <div className="flex bg-white rounded-2xl border border-neutral-200 p-1.5 shadow-sm">
                                                        {(['low', 'mid', 'high', 'super'] as const).map(p => (
                                                            <button
                                                                key={p}
                                                                onClick={() => setEditingTemplate({ ...editingTemplate, priority: p })}
                                                                className={cn(
                                                                    "flex-1 py-3 rounded-xl text-[11px] font-[900] uppercase tracking-wider transition-all",
                                                                    editingTemplate.priority === p
                                                                        ? p === 'super' ? "bg-rose-600 text-white shadow-lg shadow-rose-200" :
                                                                            p === 'high' ? "bg-orange-600 text-white shadow-lg shadow-orange-200" :
                                                                                "bg-neutral-900 text-white shadow-lg"
                                                                        : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
                                                                )}
                                                            >
                                                                {p}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {editingTemplate.category !== 'grocery' && editingTemplate.category !== 'reminder' && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-[900] text-neutral-400 uppercase tracking-[0.2em] ml-1">Strategic Architecture</label>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    {((activeProfile === 'business' ? STRATEGIC_CATEGORIES.business : STRATEGIC_CATEGORIES.personal) as unknown as any[]).map((s: any) => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => setEditingTemplate({ ...editingTemplate, strategic_category: s.id })}
                                                            className={cn(
                                                                "flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border text-[11px] font-black transition-all group active:scale-95",
                                                                editingTemplate.strategic_category === s.id
                                                                    ? s.color + " ring-4 ring-current/10"
                                                                    : "bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300"
                                                            )}
                                                        >
                                                            <s.icon className={cn("w-5 h-5", editingTemplate.strategic_category === s.id ? "scale-110" : "group-hover:scale-110 transition-transform")} />
                                                            <span className="uppercase tracking-tighter">{s.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}


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
                                            className="px-6 py-4 rounded-2xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600 font-extrabold text-[14px] transition-all"
                                        >
                                            Abort
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="flex-1 py-4 rounded-2xl bg-neutral-900 text-white font-extrabold text-[14px] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-neutral-200"
                                        >
                                            <Save className="w-5 h-5 text-blue-400" />
                                            Initialize Protocol
                                        </button>
                                    </div>
                                </div>
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
                        ) : templates.length === 0 ? (
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
                                {templates.map((tmpl: TaskTemplate) => (
                                    <motion.div

                                        layout
                                        key={tmpl.id}
                                        className="group bg-white border border-neutral-100 hover:border-neutral-200 rounded-[1.75rem] p-5 flex items-center justify-between transition-all hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)] active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "w-16 h-16 rounded-[1.25rem] flex items-center justify-center border-2 transition-transform group-hover:scale-105",
                                                tmpl.category === 'todo' ? "bg-indigo-50 border-indigo-100 text-indigo-500 shadow-indigo-100/50 shadow-lg" :
                                                    tmpl.category === 'grocery' ? "bg-emerald-50 border-emerald-100 text-emerald-500 shadow-emerald-100/50 shadow-lg" :
                                                        "bg-amber-50 border-amber-100 text-amber-500 shadow-amber-100/50 shadow-lg"
                                            )}>
                                                {tmpl.category === 'todo' ? <Check className="w-8 h-8" /> :
                                                    tmpl.category === 'grocery' ? <ShoppingCart className="w-8 h-8" /> :
                                                        <Bell className="w-8 h-8" />}
                                            </div>
                                            <div>
                                                <h4 className="font-[900] text-lg text-neutral-900 leading-tight tracking-tight">{tmpl.title}</h4>
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    <div className={cn(
                                                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0",
                                                        (PRIORITY_MAP[tmpl.priority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.low).color
                                                    )}>
                                                        {tmpl.category !== 'reminder' && (PRIORITY_MAP[tmpl.priority as keyof typeof PRIORITY_MAP] || PRIORITY_MAP.low).label}
                                                        {tmpl.category === 'reminder' && 'REMINDER'}
                                                    </div>
                                                    {tmpl.category !== 'grocery' && tmpl.category !== 'reminder' && (
                                                        <span className="text-[9px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3" /> {tmpl.estimated_duration}m
                                                        </span>
                                                    )}

                                                    {tmpl.category !== 'grocery' && (tmpl.travel_to_duration || tmpl.travel_from_duration) && (
                                                        <span className="text-[9px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full bg-neutral-900 text-white shadow-lg flex items-center gap-1.5">
                                                            <Car className="w-3 h-3" />
                                                            {tmpl.travel_to_duration || 0}{tmpl.travel_from_duration !== tmpl.travel_to_duration ? `+${tmpl.travel_from_duration || 0}` : ''}m
                                                        </span>
                                                    )}
                                                    {tmpl.strategic_category && tmpl.category !== 'grocery' && tmpl.category !== 'reminder' && (
                                                        <span className="text-[9px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200">
                                                            {tmpl.strategic_category}
                                                        </span>
                                                    )}
                                                    {/* Algorithmic Parameters - Hidden for groceries */}
                                                    {tmpl.category !== 'grocery' && (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Dur</label>
                                                                <select
                                                                    value={editingTemplate?.estimated_duration || tmpl.estimated_duration}
                                                                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, estimated_duration: parseInt(e.target.value) } : null)}
                                                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-1.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                                                                >
                                                                    {[15, 30, 45, 60, 90, 120].map(d => (
                                                                        <option key={d} value={d}>{d}m</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Trv</label>
                                                                <select
                                                                    value={editingTemplate?.travel_to_duration || tmpl.travel_to_duration}
                                                                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, travel_to_duration: parseInt(e.target.value) } : null)}
                                                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-1.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                                                                >
                                                                    {[0, 5, 10, 15, 20, 30].map(t => (
                                                                        <option key={t} value={t}>{t}m</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Imp</label>
                                                                <select
                                                                    value={editingTemplate?.impact_score || tmpl.impact_score}
                                                                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, impact_score: parseInt(e.target.value) } : null)}
                                                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-1.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                                                                >
                                                                    {[1, 2, 3, 4, 5].map(i => (
                                                                        <option key={i} value={i}>{i}</option>
                                                                    ))}
                                                                </select>
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
                                                            setIsAdding(true)
                                                            setEditingTemplate(tmpl)
                                                        }}
                                                        className="w-12 h-12 rounded-2xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-all active:scale-90"
                                                    >
                                                        <Settings2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmingDelete(tmpl.id)}
                                                        className="w-12 h-12 rounded-2xl bg-neutral-100 hover:bg-rose-50 flex items-center justify-center text-neutral-300 hover:text-rose-500 transition-all active:scale-90"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-neutral-50 border-t border-black/[0.03] flex items-center justify-between">
                    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.4em]">Operations Unit v2.0</p>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-neutral-200 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-neutral-200 animate-pulse delay-75" />
                        <div className="w-2 h-2 rounded-full bg-neutral-200 animate-pulse delay-150" />
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
