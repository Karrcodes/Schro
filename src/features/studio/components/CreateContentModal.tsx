'use client'

import React, { useState } from 'react'
import { Plus, X, Video, Type, Globe, Calendar, Briefcase, AlignLeft, UploadCloud, CheckSquare, Zap } from 'lucide-react'
import type { ContentStatus, Platform, StudioContent, ContentCategory, PriorityLevel } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'
import PlatformIcon from './PlatformIcon'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface CreateContentModalProps {
    isOpen: boolean
    onClose: () => void
}

const PLATFORMS: Platform[] = ['youtube', 'instagram', 'tiktok', 'x', 'web', 'substack']
const TYPES = ['video', 'reel', 'post', 'thread', 'article', 'short']
const CATEGORIES: ContentCategory[] = ['Vlog', 'Thoughts', 'Showcase', 'Concept', 'Update', 'Other']

const PRIORITY_CONFIG = {
    urgent: { label: 'Urgent', bg: 'bg-purple-500 text-white', ring: 'ring-purple-300' },
    high: { label: 'High', bg: 'bg-red-500 text-white', ring: 'ring-red-300' },
    mid: { label: 'Mid', bg: 'bg-amber-400 text-white', ring: 'ring-amber-200' },
    low: { label: 'Low', bg: 'bg-neutral-300 text-neutral-700', ring: 'ring-neutral-200' },
} as const

const MILESTONE_CATEGORIES = ['rnd', 'production', 'media', 'growth']

type ContentMilestone = { title: string; impact_score: number; category: string; target_date?: string }

const INITIAL_FORM = {
    title: '',
    platforms: [] as Platform[],
    type: 'video',
    category: 'Vlog' as ContentCategory,
    status: 'idea' as ContentStatus,
    priority: 'mid' as PriorityLevel,
    impact_score: 5,
    notes: '',
    deadline: '',
    project_id: '',
    cover_url: '',
}

export default function CreateContentModal({ isOpen, onClose }: CreateContentModalProps) {
    const { addContent, addMilestone, projects } = useStudio()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState(INITIAL_FORM)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [coverPreview, setCoverPreview] = useState<string>('')

    // Milestones
    const [milestones, setMilestones] = useState<ContentMilestone[]>([])
    const [newMilestone, setNewMilestone] = useState('')
    const [newMilestoneImpact, setNewMilestoneImpact] = useState(5)
    const [newMilestoneCategory, setNewMilestoneCategory] = useState('production')
    const [newMilestoneDate, setNewMilestoneDate] = useState('')

    if (!isOpen) return null

    const togglePlatform = (p: Platform) => {
        setFormData(prev => ({
            ...prev,
            platforms: prev.platforms.includes(p)
                ? prev.platforms.filter(x => x !== p)
                : [...prev.platforms, p]
        }))
    }

    const handleCoverFile = (file: File) => {
        setCoverFile(file)
        const reader = new FileReader()
        reader.onload = e => setCoverPreview(e.target?.result as string)
        reader.readAsDataURL(file)
    }

    const handleAddMilestone = () => {
        if (!newMilestone.trim()) return
        setMilestones(prev => [...prev, {
            title: newMilestone.trim(),
            impact_score: newMilestoneImpact,
            category: newMilestoneCategory,
            target_date: newMilestoneDate || undefined
        }])
        setNewMilestone('')
        setNewMilestoneImpact(5)
        setNewMilestoneCategory('production')
        setNewMilestoneDate('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title) return

        try {
            setLoading(true)

            // Upload cover if provided
            let finalCoverUrl = formData.cover_url
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
                ...formData,
                cover_url: finalCoverUrl || undefined,
                project_id: formData.project_id || null,
                deadline: formData.deadline || undefined,
            } as any)

            // Add milestones linked to this content item (reusing existing milestone system)
            // We store them linked to the project if one is set, or standalone
            // For now we add them as studio_milestones with a note
            for (const m of milestones) {
                await addMilestone({
                    title: m.title,
                    impact_score: m.impact_score,
                    category: m.category,
                    target_date: m.target_date,
                    project_id: formData.project_id || undefined,
                    content_id: !formData.project_id ? created.id : undefined,
                    status: 'pending',
                } as any)
            }


            onClose()
            setFormData(INITIAL_FORM)
            setCoverFile(null)
            setCoverPreview('')
            setMilestones([])
        } catch (err: any) {
            console.error('Failed to create content:', err)
            alert(`Error: ${err.message || 'Failed to create content item'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-xl max-h-[92vh] bg-white rounded-[32px] shadow-2xl border border-black/[0.05] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">

                {/* Cover Banner */}
                {coverPreview && (
                    <div className="w-full h-32 relative overflow-hidden flex-shrink-0">
                        <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <button
                            type="button"
                            onClick={() => { setCoverFile(null); setCoverPreview('') }}
                            className="absolute top-3 right-3 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Video className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-black leading-tight">New Content Item</h2>
                            <p className="text-[12px] font-medium text-black/40">Capture a new creative idea</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-6 h-6 text-black/20" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 pt-2 space-y-6">

                    {/* Title */}
                    <div className="relative">
                        <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="What are you making?"
                            value={formData.title}
                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full pl-11 pr-4 py-4 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[16px] font-bold focus:outline-none focus:border-blue-200 transition-all"
                            required
                        />
                    </div>

                    {/* Cover Image */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Cover Image</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    type="url"
                                    placeholder="Cover image URL (optional)"
                                    value={formData.cover_url}
                                    onChange={e => setFormData(prev => ({ ...prev, cover_url: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-medium focus:outline-none focus:border-blue-200 transition-all"
                                />
                            </div>
                            <label className="cursor-pointer">
                                <input type="file" className="hidden" accept="image/*"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverFile(f) }} />
                                <div className={cn(
                                    "h-full px-4 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all",
                                    coverFile ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-black/[0.06] hover:border-blue-200 bg-black/[0.02]"
                                )}>
                                    <UploadCloud className="w-4 h-4" />
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Priority Pills */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Priority</label>
                        <div className="flex gap-2">
                            {(Object.keys(PRIORITY_CONFIG) as PriorityLevel[]).map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, priority: level }))}
                                    className={cn(
                                        "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                                        formData.priority === level
                                            ? cn(PRIORITY_CONFIG[level].bg, "border-transparent scale-105 shadow-md")
                                            : "bg-black/[0.02] border-black/[0.05] text-black/30 hover:bg-black/[0.04]"
                                    )}
                                >
                                    {PRIORITY_CONFIG[level].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Impact Score Slider */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2 flex justify-between items-center">
                            Impact Score
                            <span className="flex items-center gap-1 text-amber-500 font-black">
                                <Zap className="w-3 h-3 fill-current" />
                                {formData.impact_score}/10
                            </span>
                        </label>
                        <input
                            type="range" min="1" max="10"
                            value={formData.impact_score}
                            onChange={e => setFormData(prev => ({ ...prev, impact_score: parseInt(e.target.value) }))}
                            className="w-full h-1.5 bg-black/[0.06] rounded-lg appearance-none cursor-pointer accent-black"
                        />
                    </div>

                    {/* Category & Format */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Category</label>
                            <select value={formData.category}
                                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as ContentCategory }))}
                                className="w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-blue-200 appearance-none cursor-pointer">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Format</label>
                            <select value={formData.type}
                                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                className="w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-blue-200 appearance-none cursor-pointer">
                                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Deadline & Publish Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Deadline</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 pointer-events-none" />
                                <input type="date"
                                    value={formData.deadline}
                                    onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-blue-200 cursor-pointer" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Publish Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 pointer-events-none" />
                                <input type="date"
                                    value={(formData as any).publish_date || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, publish_date: e.target.value } as any))}
                                    className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-blue-200 cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    {/* Platforms */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Distribute To</label>
                        <div className="flex flex-wrap gap-2 px-2">
                            {PLATFORMS.map(p => (
                                <button key={p} type="button" onClick={() => togglePlatform(p)}
                                    className={cn(
                                        "w-9 h-9 rounded-xl border transition-all flex items-center justify-center",
                                        formData.platforms.includes(p)
                                            ? "bg-black text-white border-black scale-110 shadow-lg shadow-black/10"
                                            : "bg-black/[0.02] border-black/[0.05] text-black/40 hover:border-black/20"
                                    )} title={p}>
                                    <PlatformIcon platform={p} className="w-4 h-4" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Link Project */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Link Project (Optional)</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                            <select value={formData.project_id || ''}
                                onChange={e => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                                className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-blue-200 appearance-none cursor-pointer">
                                <option value="">No project link</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Initial Notes */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Initial Notes</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-black/20" />
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                rows={3}
                                placeholder="Quick concept, angle, or vision..."
                                className="w-full pl-11 pr-4 py-4 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-medium focus:outline-none focus:border-blue-200 resize-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Milestones */}
                    <div className="space-y-4 pt-4 border-t border-black/[0.05]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Content Milestones</label>

                        {milestones.length > 0 && (
                            <div className="space-y-2">
                                {milestones.map((m, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl group">
                                        <div className="flex items-center gap-2">
                                            <CheckSquare className="w-3.5 h-3.5 text-black/20" />
                                            <span className="text-[12px] font-bold text-black">{m.title}</span>
                                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-black/5 rounded uppercase text-black/30">{m.category}</span>
                                            <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-500">
                                                <Zap className="w-2.5 h-2.5 fill-current" />{m.impact_score}
                                            </span>
                                            {m.target_date && (
                                                <span className="text-[9px] font-bold text-black/25">
                                                    {new Date(m.target_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                        <button type="button"
                                            onClick={() => setMilestones(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-1 rounded-md hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col gap-4 p-5 bg-black/[0.01] border-2 border-dashed border-black/[0.07] rounded-[24px]">
                            <div className="relative">
                                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    type="text"
                                    placeholder="Milestone title (Script Draft, Filming Day, etc.)"
                                    value={newMilestone}
                                    onChange={e => setNewMilestone(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && newMilestone.trim()) { e.preventDefault(); handleAddMilestone() } }}
                                    className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-[13px] font-bold focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-black/20 ml-2">Type</label>
                                    <select value={newMilestoneCategory}
                                        onChange={e => setNewMilestoneCategory(e.target.value)}
                                        className="w-full px-3 py-2 bg-black/[0.03] border border-black/5 rounded-xl text-[11px] font-bold focus:outline-none cursor-pointer">
                                        {MILESTONE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-black/20 ml-2">Deadline</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-black/20 pointer-events-none" />
                                        <input type="date"
                                            value={newMilestoneDate}
                                            onChange={e => setNewMilestoneDate(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 bg-black/[0.03] border border-black/5 rounded-xl text-[11px] font-bold focus:outline-none cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 px-2">
                                <div className="flex-1 flex items-center gap-3">
                                    <span className="text-[9px] font-black uppercase text-black/20 shrink-0">Impact</span>
                                    <input type="range" min="1" max="10"
                                        value={newMilestoneImpact}
                                        onChange={e => setNewMilestoneImpact(parseInt(e.target.value))}
                                        className="flex-1 h-1 bg-black/5 rounded-full appearance-none accent-black" />
                                    <span className="text-[11px] font-black text-black/40 w-4 text-center">{newMilestoneImpact}</span>
                                </div>
                                <button type="button" onClick={handleAddMilestone}
                                    className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:scale-105 transition-transform">
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        disabled={loading || !formData.title}
                        type="submit"
                        className="w-full py-4 bg-black text-white rounded-2xl font-black text-[14px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 shadow-xl shadow-black/10"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Plus className="w-5 h-5" />
                                Create Content Item
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
