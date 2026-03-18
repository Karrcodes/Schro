'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Plus, Target, Calendar, Briefcase, Heart,
    User, Wallet, Trash2, Sparkles, Upload, Loader2, AlertCircle, ImageIcon, GripVertical
} from 'lucide-react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { Reorder, useDragControls } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Goal, GoalCategory, GoalPriority, CreateGoalData, GoalStatus } from '../types/goals.types'
import { useGoals as useFinanceGoals } from '@/features/finance/hooks/useGoals'
import { usePots } from '@/features/finance/hooks/usePots'
import { PiggyBank, Landmark } from 'lucide-react'

interface GoalCreationModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (data: CreateGoalData, imageFile?: File, id?: string) => Promise<void>
    initialGoal?: Goal | null
}

const CATEGORIES: { value: GoalCategory; label: string; icon: any }[] = [
    { value: 'personal', label: 'Personal', icon: User },
    { value: 'finance', label: 'Finance', icon: Wallet },
    { value: 'career', label: 'Career', icon: Briefcase },
    { value: 'health', label: 'Health', icon: Heart },
]

const PRIORITIES: { value: GoalPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'mid', label: 'Mid' },
    { value: 'high', label: 'High' },
    { value: 'super', label: 'Super' },
]

export default function GoalCreationModal({ isOpen, onClose, onSave, initialGoal }: GoalCreationModalProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState<GoalCategory>('personal')
    const [status, setStatus] = useState<GoalStatus>('active')
    const [priority, setPriority] = useState<GoalPriority>('mid')
    const [timeframe, setTimeframe] = useState<'short' | 'medium' | 'long'>('short')
    const [visionImageUrl, setVisionImageUrl] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [targetDate, setTargetDate] = useState('')
    const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null)
    const [milestones, setMilestones] = useState<{ id: string, text: string, is_completed: boolean, impact_score: number }[]>([{ id: 'initial', text: '', is_completed: false, impact_score: 5 }])
    const [saving, setSaving] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [aiUsed, setAiUsed] = useState(false)
    
    // Linked Savings State
    const [linkedSavingsId, setLinkedSavingsId] = useState<string | null>(null)
    const [linkedSavingsType, setLinkedSavingsType] = useState<'manual' | 'monzo' | null>(null)
    
    const { goals: financeGoals } = useFinanceGoals()
    const { pots } = usePots()
    
    // Combine for selection
    const availableSavings = [
        ...financeGoals.map(g => ({ id: g.id, name: g.name, type: 'manual' as const })),
        ...pots.filter(p => p.target_amount > 0 || p.type === 'savings').map(p => ({ id: p.id, name: p.name, type: 'monzo' as const }))
    ]

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Populate fields when editing
    React.useEffect(() => {
        if (initialGoal && isOpen) {
            setTitle(initialGoal.title)
            setDescription(initialGoal.description || '')
            setCategory(initialGoal.category)
            setStatus(initialGoal.status)
            setPriority(initialGoal.priority)
            setTimeframe(initialGoal.timeframe)
            setVisionImageUrl(initialGoal.vision_image_url || '')
            setTargetDate(initialGoal.target_date || '')
            setMilestones(initialGoal.milestones?.map(m => ({
                id: m.id || Math.random().toString(36).substring(2, 9),
                text: m.title,
                is_completed: m.is_completed,
                impact_score: m.impact_score || 5
            })) || [{ id: Math.random().toString(36).substring(2, 9), text: '', is_completed: false, impact_score: 5 }])
            setImagePreview(null)
            setImageFile(null)
            setAiUsed(false)
            setError(null)
            setLinkedSavingsId(initialGoal.linked_savings_id || null)
            setLinkedSavingsType(initialGoal.linked_savings_type || null)
        } else if (!initialGoal && isOpen) {
            // Reset for new goal
            setTitle(''); setDescription(''); setCategory('personal'); setStatus('active')
            setPriority('mid'); setTimeframe('short'); setVisionImageUrl(''); setTargetDate('')
            setMilestones([{ id: 'initial', text: '', is_completed: false, impact_score: 5 }]); setImagePreview(null); setImageFile(null); setAiUsed(false); setError(null)
            setLinkedSavingsId(null); setLinkedSavingsType(null)
        }
    }, [initialGoal, isOpen])

    // ── helpers ──────────────────────────────────────────────
    const addMilestone = () => {
        console.log('Adding milestone...')
        setMilestones([...milestones, { id: Math.random().toString(36).substring(2, 9), text: '', is_completed: false, impact_score: 5 }])
    }
    const removeMilestone = (id: string) => {
        setMilestoneToDelete(id)
    }
    const confirmRemoveMilestone = () => {
        if (!milestoneToDelete) return
        if (milestones.length === 1) { 
            setMilestones([{ id: Math.random().toString(36).substring(2, 9), text: '', is_completed: false, impact_score: 5 }])
        } else {
            setMilestones(milestones.filter(m => m.id !== milestoneToDelete))
        }
        setMilestoneToDelete(null)
    }
    const updateMilestone = (id: string, updates: Partial<{ text: string, impact_score: number }>) => {
        setMilestones(milestones.map(m => m.id === id ? { ...m, ...updates } : m))
    }

    const handleImageFile = (file: File) => {
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
        setVisionImageUrl('') // clear URL if file chosen
    }

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file?.type.startsWith('image/')) handleImageFile(file)
    }

    // ── AI assist ─────────────────────────────────────────────
    const runAiAssist = async () => {
        if (!title.trim()) return
        setAiLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/ai/goal-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title }),
            })
            if (!res.ok) throw new Error('AI service failed')
            const data = await res.json()
            if (data.description) setDescription(data.description)
            if (data.category) setCategory(data.category)
            if (data.priority) setPriority(data.priority)
            if (data.timeframe) setTimeframe(data.timeframe)
            if (data.target_date) setTargetDate(data.target_date)
            if (data.milestones?.length) setMilestones(data.milestones.map((m: string) => ({ id: Math.random().toString(36).substring(2, 9), text: m, is_completed: false, impact_score: 5 })))
            setAiUsed(true)
        } catch (e: any) {
            setError('AI assist failed. Fill in manually.')
        } finally {
            setAiLoading(false)
        }
    }

    // ── submit ────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || saving) return
        setSaving(true)
        setError(null)
        try {
            await onSave({
                title,
                description,
                category,
                status,
                priority,
                timeframe,
                vision_image_url: visionImageUrl, // Pass the actual state (empty string means removal)
                target_date: targetDate || undefined,
                linked_savings_id: linkedSavingsId,
                linked_savings_type: linkedSavingsType,
                milestones: milestones
                    .filter(m => m.text.trim() !== '')
                    .map(m => ({ title: m.text, is_completed: m.is_completed, impact_score: m.impact_score }))
            }, imageFile || undefined, initialGoal?.id)

            onClose()
        } catch (err: any) {
            setError(err?.message || 'Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh]"
                    >
                        {/* Header */}
                        <div className="px-5 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5 border-b border-black/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-[18px] md:text-[20px] font-bold text-black tracking-tight">{initialGoal ? 'Edit Goal' : 'New Goal'}</h2>
                                    <p className="text-[10px] text-black/35 font-medium uppercase tracking-wider">Strategic Tactical Layer</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-9 h-9 rounded-full border border-black/5 flex items-center justify-center hover:bg-black/5 transition-colors">
                                <X className="w-4 h-4 text-black/40" />
                            </button>
                        </div>

                        {/* Error Banner */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-red-50 border-b border-red-100 px-5 md:px-8 py-3 flex items-center gap-2"
                                >
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                    <p className="text-[12px] font-medium text-red-500">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="p-5 md:px-10 md:pt-12 pb-16 md:pb-[86px] space-y-8">

                                {/* Title + AI Assist */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Goal Designation</label>
                                    <input
                                        autoFocus
                                        value={title}
                                        onChange={e => { setTitle(e.target.value); setAiUsed(false) }}
                                        placeholder="e.g. Save for apartment deposit"
                                        className="w-full text-[20px] md:text-[26px] font-bold tracking-tight placeholder:text-black/10 border-none p-0 focus:ring-0 outline-none"
                                        required
                                    />

                                    {/* AI Assist trigger — appears after typing */}
                                    <AnimatePresence>
                                        {title.trim().length > 3 && !aiUsed && (
                                            <motion.button
                                                type="button"
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                onClick={runAiAssist}
                                                disabled={aiLoading}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black text-white text-[11px] font-bold uppercase tracking-wide hover:bg-black/80 transition-all disabled:opacity-60"
                                            >
                                                {aiLoading
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <Sparkles className="w-3.5 h-3.5" />
                                                }
                                                {aiLoading ? 'Generating...' : 'AI Assist — auto fill'}
                                            </motion.button>
                                        )}
                                        {aiUsed && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-medium"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                AI suggestions applied — review and adjust below
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Description */}
                                <div className="space-y-2 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Goal Brief</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Detailed description of the target state..."
                                        rows={3}
                                        className="w-full text-sm font-medium text-black/60 placeholder:text-black/15 border-none p-0 focus:ring-0 resize-none outline-none"
                                    />
                                </div>

                                {/* Milestones (Promoted) */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Milestone Breakdown</label>
                                            <div className="bg-emerald-100 text-emerald-600 rounded px-1.5 py-0.5 text-[10px] font-bold">
                                                {milestones.filter(m => m.text.trim()).length}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addMilestone}
                                            className="text-[10px] font-bold text-black bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add Step
                                        </button>
                                    </div>

                                    <Reorder.Group
                                        axis="y"
                                        values={milestones}
                                        onReorder={setMilestones}
                                        className="space-y-2"
                                    >
                                        {milestones.map((milestone) => (
                                            <MilestoneItem
                                                key={milestone.id}
                                                milestone={milestone}
                                                onUpdate={updateMilestone}
                                                onRemove={removeMilestone}
                                                index={milestones.indexOf(milestone)}
                                            />
                                        ))}
                                    </Reorder.Group>
                                </div>

                                {/* Category (Full Width) */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Category</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {CATEGORIES.map(cat => {
                                            const Icon = cat.icon
                                            const active = category === cat.value
                                            return (
                                                <button
                                                    key={cat.value}
                                                    type="button"
                                                    onClick={() => setCategory(cat.value)}
                                                    className={cn(
                                                        "flex items-center justify-center gap-2.5 py-3 rounded-xl border transition-all text-[12px] font-bold",
                                                        active ? "bg-black text-white border-black" : "bg-white border-black/5 text-black/40 hover:border-black/20"
                                                    )}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {cat.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Config Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-black/5">

                                    {/* Left column */}
                                    <div className="space-y-5 min-w-0">

                                        {/* Horizon */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Strategic Horizon</label>
                                            <div className="flex items-center gap-1.5 p-1 bg-black/5 rounded-xl">
                                                {(['short', 'medium', 'long'] as const).map(t => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setTimeframe(t)}
                                                        className={cn(
                                                            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                                            timeframe === t ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/60"
                                                        )}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right column */}
                                    <div className="space-y-5 min-w-0">
                                        <div className="space-y-2">
                                            {/* Linked Savings */}
                                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Savings Target</label>
                                            <div className="relative group rounded-xl border border-black/5 bg-black/[0.02] focus-within:border-black/20 focus-within:bg-white transition-all overflow-hidden">
                                                <select
                                                    value={linkedSavingsId || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        if (!val) {
                                                            setLinkedSavingsId(null)
                                                            setLinkedSavingsType(null)
                                                        } else {
                                                            const found = availableSavings.find(s => s.id === val)
                                                            if (found) {
                                                                setLinkedSavingsId(found.id)
                                                                setLinkedSavingsType(found.type)
                                                            }
                                                        }
                                                    }}
                                                    className="block w-full py-3 px-4 text-[12px] font-bold appearance-none outline-none bg-transparent border-none transition-all pr-12 cursor-pointer"
                                                >
                                                    <option value="">No linked savings</option>
                                                    <optgroup label="Manual Finance Goals">
                                                        {availableSavings.filter(s => s.type === 'manual').map(s => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="Monzo Savings Pots">
                                                        {availableSavings.filter(s => s.type === 'monzo').map(s => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </optgroup>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black/20">
                                                    <PiggyBank className="w-4 h-4" />
                                                </div>
                                            </div>
                                            {linkedSavingsId && (
                                                <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-100 mt-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    <span className="text-[8.5px] font-bold text-emerald-700 uppercase tracking-widest leading-none">
                                                        Auto-Syncing
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Targeting */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Tier Priority</label>
                                        <div className="flex items-center gap-1.5 p-1 bg-black/5 rounded-xl">
                                            {PRIORITIES.map(p => (
                                                <button
                                                    key={p.value}
                                                    type="button"
                                                    onClick={() => setPriority(p.value)}
                                                    className={cn(
                                                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                                        priority === p.value
                                                            ? p.value === 'super' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" :
                                                                p.value === 'high' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" :
                                                                    p.value === 'mid' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" :
                                                                        "bg-black text-white shadow-sm"
                                                            : "text-black/30 hover:text-black/60"
                                                    )}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Target Deadline</label>
                                        <div className="rounded-xl border border-black/5 bg-black/[0.02] focus-within:border-black/20 focus-within:bg-white transition-all overflow-hidden">
                                            <input
                                                type="date"
                                                value={targetDate}
                                                onChange={e => setTargetDate(e.target.value)}
                                                style={{ minWidth: 0 }}
                                                className="block w-full py-3 px-4 text-[12px] font-bold outline-none bg-transparent border-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Vision Image — Upload or URL */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Vision Image</label>

                                    {/* Preview */}
                                    {(imagePreview || visionImageUrl) && (
                                        <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-black/5">
                                            <img
                                                src={imagePreview || visionImageUrl}
                                                alt="Vision preview"
                                                className="w-full h-full object-cover"
                                                onError={() => { setImagePreview(null); setVisionImageUrl('') }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { setImageFile(null); setImagePreview(null); setVisionImageUrl('') }}
                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black transition-colors"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        {/* URL fallback */}
                                        <div className="flex-1 rounded-xl border border-black/5 bg-black/[0.02] focus-within:border-black/20 focus-within:bg-white transition-all overflow-hidden flex items-center h-12">
                                            <ImageIcon className="w-4 h-4 text-black/20 ml-4 shrink-0" />
                                            <input
                                                type="text"
                                                value={visionImageUrl}
                                                onChange={e => { setVisionImageUrl(e.target.value); setImageFile(null); setImagePreview(null) }}
                                                placeholder="Paste image URL here..."
                                                className="block w-full py-3 px-3 text-[12px] font-bold outline-none bg-transparent border-none"
                                            />
                                        </div>

                                        {/* Upload button wrapper */}
                                        <div className="relative shrink-0 h-12">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="h-full px-5 py-3 rounded-xl border border-dashed border-black/15 bg-black/[0.01] hover:bg-black/[0.05] hover:border-black/30 transition-all cursor-pointer flex items-center gap-2 text-[12px] font-bold text-black/50"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>Upload</span>
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
                                            />
                                        </div>
                                    </div>
                                </div>


                            </div>

                            {/* Footer */}
                            <div className="px-5 md:px-8 py-4 border-t border-black/5 flex items-center justify-between gap-3 shrink-0 bg-white sticky bottom-0">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl border border-black/10 text-[12px] font-bold text-black/50 hover:bg-black/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !title.trim()}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-black text-white rounded-xl font-bold text-[12px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 disabled:opacity-40 disabled:scale-100"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                                    {saving ? (initialGoal ? 'Refining...' : 'Authorizing...') : (initialGoal ? 'Refine Goal' : 'Authorize Goal')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <ConfirmationModal
            isOpen={!!milestoneToDelete}
            onClose={() => setMilestoneToDelete(null)}
            onConfirm={confirmRemoveMilestone}
            title="Remove Milestone?"
            message="Are you sure you want to remove this tactical step? Any progress linked to this specific milestone will be lost."
            confirmText="Remove"
            type="danger"
        />
    </>
    )
}

interface MilestoneItemProps {
    milestone: { id: string; text: string; impact_score: number }
    onUpdate: (id: string, updates: Partial<{ text: string, impact_score: number }>) => void
    onRemove: (id: string) => void
    index: number
}

function MilestoneItem({ milestone, onUpdate, onRemove, index }: MilestoneItemProps) {
    const controls = useDragControls()

    return (
        <Reorder.Item
            value={milestone}
            dragListener={false}
            dragControls={controls}
            className="flex items-center gap-2 group/item"
        >
            <div
                onPointerDown={(e) => controls.start(e)}
                className="cursor-grab active:cursor-grabbing p-2 touch-none hover:bg-black/10 rounded-lg transition-colors border border-transparent hover:border-black/5 flex items-center justify-center bg-black/5"
                title="Drag to reorder"
            >
                <GripVertical className="w-4 h-4 text-black/40" />
            </div>

            <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[9px] font-bold text-black/20 shrink-0">
                {index + 1}
            </div>

            <div className="flex-1 flex flex-col gap-2">
                <input
                    value={milestone.text}
                    onChange={e => onUpdate(milestone.id, { text: e.target.value })}
                    placeholder="Designate next step..."
                    className="w-full text-[13px] font-medium text-black/70 border-b border-black/5 py-2 px-1 focus:border-black/20 focus:outline-none transition-all bg-transparent min-w-0"
                />
                <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase text-black/20">Impact</span>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={milestone.impact_score || 5}
                        onChange={e => onUpdate(milestone.id, { impact_score: parseInt(e.target.value) })}
                        className="flex-1 h-0.5 bg-black/5 rounded-full appearance-none accent-black/40"
                    />
                    <span className="text-[9px] font-black text-black/30 w-3">{milestone.impact_score || 5}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={() => onRemove(milestone.id)}
                className="p-1.5 rounded hover:bg-red-50 text-black/10 hover:text-red-400 transition-colors self-start mt-1"
                title="Remove step"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </Reorder.Item>
    )
}
