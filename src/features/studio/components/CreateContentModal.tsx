'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Plus, Target, Calendar, Rocket,
    Video, Trash2, Sparkles, Upload, Loader2, AlertCircle, ImageIcon, GripVertical,
    Type, AlignLeft, CheckSquare, Zap, Globe
} from 'lucide-react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { Reorder, useDragControls } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ContentStatus, Platform, ContentCategory, PriorityLevel } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'
import PlatformIcon from './PlatformIcon'
import { supabase } from '@/lib/supabase'
import DatePickerInput from '@/components/DatePickerInput'

interface CreateContentModalProps {
    isOpen: boolean
    onClose: () => void
}

const PLATFORMS: Platform[] = ['youtube', 'instagram', 'tiktok', 'x', 'web', 'substack']
const TYPES = ['video', 'reel', 'post', 'thread', 'article', 'short']
const CATEGORIES: ContentCategory[] = ['Vlog', 'Thoughts', 'Showcase', 'Concept', 'Update', 'Other']
const MILESTONE_CATEGORIES = ['rnd', 'production', 'media', 'growth']

export default function CreateContentModal({ isOpen, onClose }: CreateContentModalProps) {
    const { addContent, addMilestone, projects } = useStudio()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [platforms, setPlatforms] = useState<Platform[]>([])
    const [type, setType] = useState('video')
    const [category, setCategory] = useState<ContentCategory>('Vlog')
    const [status, setStatus] = useState<ContentStatus>('idea')
    const [priority, setPriority] = useState<PriorityLevel>('mid')
    const [impactScore, setImpactScore] = useState(5)
    const [notes, setNotes] = useState('')
    const [deadline, setDeadline] = useState('')
    const [projectId, setProjectId] = useState('')
    const [url, setUrl] = useState('')
    
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [milestones, setMilestones] = useState<{ id: string, title: string, category: string, impact_score: number, target_date?: string }[]>([])
    const [error, setError] = useState<string | null>(null)
    const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Reset form when opening
    React.useEffect(() => {
        if (isOpen) {
            setTitle(''); setPlatforms([]); setType('video'); setCategory('Vlog'); setStatus('idea')
            setPriority('mid'); setImpactScore(5); setNotes(''); setDeadline(''); setProjectId('')
            setUrl(''); setMilestones([]); setCoverFile(null); setImagePreview(null); setError(null)
        }
    }, [isOpen])

    const togglePlatform = (p: Platform) => {
        setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
    }

    const addMilestoneItem = () => {
        setMilestones([...milestones, { 
            id: Math.random().toString(36).substring(2, 9), 
            title: '', 
            category: 'production', 
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

    const updateMilestoneItem = (id: string, updates: Partial<{ title: string, category: string, impact_score: number, target_date?: string }>) => {
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
            // Upload cover if provided
            let finalCoverUrl = undefined
            if (coverFile) {
                const fileExt = coverFile.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`
                const filePath = `content-covers/${fileName}`
                const { error: uploadError } = await supabase.storage.from('studio-assets').upload(filePath, coverFile)
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(filePath)
                    finalCoverUrl = urlData.publicUrl
                }
            }

            const created = await addContent({
                title,
                platforms,
                type,
                category,
                status,
                priority,
                impact_score: impactScore,
                notes,
                deadline: deadline || undefined,
                project_id: projectId || null,
                cover_url: finalCoverUrl,
                url: url || undefined
            } as any)

            // Add milestones
            for (const m of milestones) {
                if (!m.title.trim()) continue
                await addMilestone({
                    title: m.title.trim(),
                    impact_score: m.impact_score,
                    category: m.category,
                    target_date: m.target_date,
                    project_id: projectId || undefined,
                    content_id: !projectId ? created.id : undefined,
                    status: 'pending',
                } as any)
            }

            // Trigger AI cover generation if no image provided
            if (!finalCoverUrl) {
                fetch(`/api/studio/cover?title=${encodeURIComponent(title)}&tagline=${encodeURIComponent(category || '')}&type=content&id=${created.id}&w=1200&h=630`);
            }

            onClose()
        } catch (err: any) {
            setError(err?.message || 'Failed to create content')
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
                                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                                    <Video className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-[18px] md:text-[20px] font-bold text-black tracking-tight">New Content Item</h2>
                                    <p className="text-[10px] text-black/35 font-medium uppercase tracking-wider">Creation Pipeline Layer</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-9 h-9 rounded-full border border-black/5 flex items-center justify-center hover:bg-black/5 transition-colors">
                                <X className="w-4 h-4 text-black/40" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="p-5 md:px-10 md:pt-12 pb-16 md:pb-[86px] space-y-8">

                                {/* Title */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Content Concept</label>
                                    <input
                                        autoFocus
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="What are you making?"
                                        className="w-full text-[20px] md:text-[26px] font-bold tracking-tight placeholder:text-black/10 border-none p-0 focus:ring-0 outline-none"
                                        required
                                    />
                                </div>

                                {/* Link Project */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Parent Project</label>
                                    <select
                                        value={projectId}
                                        onChange={e => setProjectId(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-xl text-[13px] font-bold focus:outline-none focus:border-blue-200 appearance-none cursor-pointer"
                                    >
                                        <option value="">No project link</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                </div>

                                {/* Milestones */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Production Milestones</label>
                                        <button
                                            type="button"
                                            onClick={addMilestoneItem}
                                            className="text-[10px] font-bold text-black bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1.5 transition-all"
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
                                                onUpdate={updateMilestoneItem}
                                                onRemove={removeMilestone}
                                                index={milestones.indexOf(milestone)}
                                            />
                                        ))}
                                    </Reorder.Group>
                                    {milestones.length === 0 && (
                                        <p className="text-[11px] text-black/20 text-center py-4 italic font-medium">No initial milestones defined</p>
                                    )}
                                </div>

                                {/* Type & Category */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-black/5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Format Type</label>
                                        <select value={type}
                                            onChange={e => setType(e.target.value)}
                                            className="w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-xl text-[12px] font-bold focus:outline-none appearance-none cursor-pointer">
                                            {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Content Category</label>
                                        <select value={category}
                                            onChange={e => setCategory(e.target.value as ContentCategory)}
                                            className="w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-xl text-[12px] font-bold focus:outline-none appearance-none cursor-pointer">
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Config Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 border-t border-black/5">
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
                                                                    p === 'mid' ? "bg-amber-500 text-white shadow-lg" :
                                                                        "bg-black text-white"
                                                            : "text-black/30 hover:text-black/60"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status Selection */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Production Status</label>
                                        <select
                                            value={status}
                                            onChange={e => setStatus(e.target.value as ContentStatus)}
                                            className="w-full px-4 py-2.5 bg-black/[0.02] border border-black/[0.05] rounded-xl text-[12px] font-bold focus:outline-none appearance-none cursor-pointer"
                                        >
                                            {['idea', 'scripted', 'filmed', 'edited', 'scheduled', 'published'].map(s => (
                                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Dates */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Release Target</label>
                                        <DatePickerInput
                                            value={deadline}
                                            onChange={val => setDeadline(val)}
                                        />
                                    </div>
                                </div>

                                {/* Published Link - Automatic when status is published */}
                                {status === 'published' && (
                                    <div className="space-y-3 pt-4 border-t border-black/5 animate-in slide-in-from-top-4 duration-300">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Globe className="w-3.5 h-3.5 text-emerald-500" />
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest">Published URL (YouTube/TikTok/etc)</label>
                                        </div>
                                        <div className="relative">
                                            <input
                                                value={url}
                                                onChange={e => setUrl(e.target.value)}
                                                placeholder="https://..."
                                                className="w-full px-4 py-4 bg-black/[0.03] border border-black/5 rounded-2xl text-[13px] font-black placeholder:text-black/10 focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500/30 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Platforms */}
                                <div className="space-y-3 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Distribution Targets</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PLATFORMS.map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => togglePlatform(p)}
                                                className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                    platforms.includes(p)
                                                        ? "bg-blue-600 text-white shadow-lg scale-110"
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
                                        Strategic Impact
                                        <span className="text-black font-black">{impactScore}/10</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={impactScore}
                                        onChange={e => setImpactScore(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-black/[0.05] rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                {/* Short Notes */}
                                <div className="space-y-2 pt-2 border-t border-black/5">
                                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Creative Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Quick concept or vision..."
                                        rows={3}
                                        className="w-full text-sm font-medium text-black/60 placeholder:text-black/15 border-none p-0 focus:ring-0 resize-none outline-none"
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
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-[12px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/10 disabled:opacity-40 disabled:scale-100"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                    {loading ? 'Creating...' : 'Create Content'}
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
            message="Are you sure you want to remove this production step?"
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
                    placeholder="Step title..."
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
