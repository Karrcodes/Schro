'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Plus, Target, Calendar, Rocket,
    Globe, Trash2, Sparkles, Upload, Loader2, AlertCircle, ImageIcon, GripVertical,
    Type, AlignLeft, CheckSquare, Zap
} from 'lucide-react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { Reorder, useDragControls } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ProjectStatus, ProjectType, Platform } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'
import PlatformIcon from './PlatformIcon'
import DatePickerInput from '@/components/DatePickerInput'

interface CreateProjectModalProps {
    isOpen: boolean
    onClose: () => void
}

const PROJECT_TYPES: ProjectType[] = ['Architectural Design', 'Technology', 'Fashion', 'Product Design', 'Media', 'Other']
const PLATFORMS: Platform[] = ['youtube', 'instagram', 'substack', 'tiktok', 'x', 'web']
const MILESTONE_CATEGORIES = ['rnd', 'production', 'media', 'growth']

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
    const { addProject } = useStudio()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [tagline, setTagline] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<ProjectType>('Other')
    const [platforms, setPlatforms] = useState<Platform[]>([])
    const [status, setStatus] = useState<ProjectStatus>('idea')
    const [priority, setPriority] = useState<'super' | 'high' | 'mid' | 'low'>('mid')
    const [targetDate, setTargetDate] = useState('')
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [impactScore, setImpactScore] = useState(5)
    const [strategicCategory, setStrategicCategory] = useState('rnd')
    
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [milestones, setMilestones] = useState<{ id: string, title: string, category: string, impact_score: number, target_date?: string }[]>([])
    const [error, setError] = useState<string | null>(null)
    const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Reset form when opening
    React.useEffect(() => {
        if (isOpen) {
            setTitle(''); setTagline(''); setDescription(''); setType('Other'); setPlatforms([]); setStatus('idea')
            setPriority('mid'); setTargetDate(''); setStartDate(new Date().toISOString().split('T')[0])
            setImpactScore(5); setStrategicCategory('rnd'); setMilestones([])
            setCoverFile(null); setImagePreview(null); setError(null)
        }
    }, [isOpen])

    const togglePlatform = (p: Platform) => {
        setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
    }

    const addMilestone = () => {
        setMilestones([...milestones, { 
            id: Math.random().toString(36).substring(2, 9), 
            title: '', 
            category: 'rnd', 
            impact_score: 5 
        }])
    }

    const removeMilestone = (id: string) => {
        setMilestoneToDelete(id)
    }

    const confirmRemoveMilestone = () => {
        if (!milestoneToDelete) return
        setMilestones(milestones.filter(m => m.id !== milestoneToDelete))
        setMilestoneToDelete(null)
    }

    const updateMilestone = (id: string, updates: Partial<{ title: string, category: string, impact_score: number, target_date?: string }>) => {
        setMilestones(milestones.map(m => m.id === id ? { ...m, ...updates } : m))
    }

    const handleImageFile = (file: File) => {
        setCoverFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || loading) return
        setLoading(true)
        setError(null)

        try {
            const payload = {
                title,
                tagline,
                description,
                type,
                platforms,
                status,
                priority,
                impact_score: impactScore,
                strategic_category: strategicCategory,
                target_date: targetDate || undefined,
                start_date: startDate
            }

            await addProject(
                payload as any, 
                milestones.filter(m => m.title.trim() !== '').map(m => ({
                    title: m.title,
                    impact_score: m.impact_score,
                    category: m.category,
                    target_date: m.target_date
                })), 
                coverFile || undefined
            )
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Failed to create project')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

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
                                    <Rocket className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-[18px] md:text-[20px] font-bold text-black tracking-tight">New Project</h2>
                                    <p className="text-[10px] text-black/35 font-medium uppercase tracking-wider">Creation Pipeline Layer</p>
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

                                {/* Title */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Project Designation</label>
                                    <input
                                        autoFocus
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Project Schrödinger"
                                        className="w-full text-[20px] md:text-[26px] font-bold tracking-tight placeholder:text-black/10 border-none p-0 focus:ring-0 outline-none"
                                        required
                                    />
                                </div>

                                {/* Tagline */}
                                <div className="space-y-2 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Tagline</label>
                                    <input
                                        value={tagline}
                                        onChange={e => setTagline(e.target.value)}
                                        placeholder="One-liner vision..."
                                        className="w-full text-lg font-bold text-black placeholder:text-black/10 border-none p-0 focus:ring-0 outline-none"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Project Brief</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Detailed description of the endeavor..."
                                        rows={3}
                                        className="w-full text-sm font-medium text-black/60 placeholder:text-black/15 border-none p-0 focus:ring-0 resize-none outline-none"
                                    />
                                </div>

                                {/* Milestones */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Roadmap Milestones</label>
                                            <div className="bg-orange-100 text-orange-600 rounded px-1.5 py-0.5 text-[10px] font-bold">
                                                {milestones.filter(m => m.title.trim()).length}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addMilestone}
                                            className="text-[10px] font-bold text-black bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add Milestone
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
                                    {milestones.length === 0 && (
                                        <p className="text-[11px] text-black/20 text-center py-4 italic font-medium">No initial milestones defined</p>
                                    )}
                                </div>

                                {/* Category (Full Width) */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Project Category</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
                                        {PROJECT_TYPES.map(cat => {
                                            const active = type === cat
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setType(cat)}
                                                    className={cn(
                                                        "flex items-center justify-center gap-2.5 py-3 rounded-xl border transition-all text-[12px] font-bold",
                                                        active ? "bg-black text-white border-black" : "bg-white border-black/5 text-black/40 hover:border-black/20 text-[11px]"
                                                    )}
                                                >
                                                    {cat}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Config Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-black/5">
                                    {/* Priority */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Pipeline Priority</label>
                                        <div className="flex items-center gap-1.5 p-1 bg-black/5 rounded-xl">
                                            {(['super', 'high', 'mid', 'low'] as const).map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setPriority(p)}
                                                    className={cn(
                                                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                                        priority === p
                                                            ? p === 'super' ? "bg-purple-600 text-white shadow-lg" :
                                                                p === 'high' ? "bg-red-500 text-white shadow-lg" :
                                                                    p === 'mid' ? "bg-orange-500 text-white shadow-lg" :
                                                                        "bg-black text-white"
                                                            : "text-black/30 hover:text-black/60"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Timeline</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-bold text-black/30 uppercase ml-1">Start</span>
                                                    <DatePickerInput
                                                        value={startDate}
                                                        onChange={val => setStartDate(val)}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-bold text-black/30 uppercase ml-1">Target</span>
                                                    <DatePickerInput
                                                        value={targetDate}
                                                        onChange={val => setTargetDate(val)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Platforms */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Target Platforms</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PLATFORMS.map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => togglePlatform(p)}
                                                className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                    platforms.includes(p)
                                                        ? "bg-black text-white shadow-lg scale-110"
                                                        : "bg-black/[0.04] text-black/30 hover:bg-black/[0.08]"
                                                )}
                                            >
                                                <PlatformIcon platform={p} className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Impact Score */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1 flex justify-between">
                                        Endeavor Impact
                                        <span className="text-black font-black">{impactScore}/10</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={impactScore}
                                        onChange={e => setImpactScore(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-black/[0.05] rounded-lg appearance-none cursor-pointer accent-black"
                                    />
                                </div>

                                {/* Cover Image */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Cover Asset</label>

                                    {imagePreview && (
                                        <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-black/5">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { setCoverFile(null); setImagePreview(null) }}
                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black transition-colors"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 px-5 py-4 rounded-xl border border-dashed border-black/15 bg-black/[0.01] hover:bg-black/[0.05] hover:border-black/30 transition-all cursor-pointer flex items-center justify-center gap-2 text-[12px] font-bold text-black/50"
                                        >
                                            <Upload className="w-4 h-4" />
                                            <span>Upload high-res cover</span>
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-center text-black/20 font-medium">Or leave blank to auto-generate via Gemini Vision</p>
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
                                    disabled={loading || !title.trim()}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-black text-white rounded-xl font-bold text-[12px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 disabled:opacity-40 disabled:scale-100"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                    {loading ? 'Initiating...' : 'Initiate Project'}
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
            message="Are you sure you want to remove this roadmapped step?"
            confirmText="Remove"
            type="danger"
        />
    </>
    )
}

interface MilestoneItemProps {
    milestone: { id: string; title: string; category: string; impact_score: number; target_date?: string }
    onUpdate: (id: string, updates: Partial<{ title: string, category: string, impact_score: number, target_date?: string }>) => void
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
            >
                <GripVertical className="w-4 h-4 text-black/40" />
            </div>

            <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[9px] font-bold text-black/20 shrink-0">
                {index + 1}
            </div>

            <div className="flex-1 flex flex-col gap-2">
                <input
                    value={milestone.title}
                    onChange={e => onUpdate(milestone.id, { title: e.target.value })}
                    placeholder="Milestone title..."
                    className="w-full text-[13px] font-bold text-black border-b border-black/5 py-1 px-1 focus:border-black/20 focus:outline-none transition-all bg-transparent min-w-0"
                />
                <div className="flex items-center gap-3">
                    <select
                        value={milestone.category}
                        onChange={e => onUpdate(milestone.id, { category: e.target.value })}
                        className="bg-transparent border-none text-[9px] font-black uppercase text-black/40 focus:ring-0 p-0 cursor-pointer"
                    >
                        {MILESTONE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase text-black/20">Impact</span>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={milestone.impact_score}
                            onChange={e => onUpdate(milestone.id, { impact_score: parseInt(e.target.value) })}
                            className="w-16 h-0.5 bg-black/5 rounded-full appearance-none accent-black/40"
                        />
                        <span className="text-[9px] font-black text-black/30 w-3">{milestone.impact_score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[100px]">
                        <DatePickerInput
                            className="scale-75 origin-left"
                            value={milestone.target_date || ''}
                            onChange={val => onUpdate(milestone.id, { target_date: val || undefined })}
                        />
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={() => onRemove(milestone.id)}
                className="p-1.5 rounded hover:bg-red-50 text-black/10 hover:text-red-400 transition-colors self-start mt-1"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </Reorder.Item>
    )
}
