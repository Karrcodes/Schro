'use client'

import React, { useState, useRef } from 'react'
import { Plus, X, Briefcase, Globe, Type, AlignLeft, Youtube, Instagram, UploadCloud, Trash2, CheckSquare, Calendar, Target as TargetIcon, Zap } from 'lucide-react'
import type { ProjectStatus, ProjectType, Platform } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'
import PlatformIcon from './PlatformIcon'
import { cn } from '@/lib/utils'

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
    const [formData, setFormData] = useState<{
        title: string;
        tagline: string;
        description: string;
        type: ProjectType;
        platforms: Platform[];
        status: ProjectStatus;
        gtv_featured: boolean;
        cover_url: string;
        target_date: string;
        priority: 'urgent' | 'high' | 'mid' | 'low';
        impact_score: number;
        strategic_category: string;
    }>({
        title: '',
        tagline: '',
        description: '',
        type: 'Other',
        platforms: [],
        status: 'idea',
        gtv_featured: false,
        cover_url: '',
        target_date: '',
        priority: 'mid',
        impact_score: 5,
        strategic_category: 'rnd'
    })
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [milestones, setMilestones] = useState<{ title: string; impact_score: number; category: string; target_date?: string }[]>([])
    const [newMilestone, setNewMilestone] = useState('')
    const [newImpact, setNewImpact] = useState(5)
    const [newCategory, setNewCategory] = useState('rnd')
    const [newDate, setNewDate] = useState('')

    const targetDateInputRef = useRef<HTMLInputElement>(null)
    const newMilestoneDateRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title) return

        try {
            setLoading(true)
            await addProject(formData, milestones, coverFile || undefined)
            onClose()
            // Reset form
            setFormData({
                title: '',
                tagline: '',
                description: '',
                type: 'Other',
                platforms: [],
                status: 'idea',
                gtv_featured: false,
                cover_url: '',
                target_date: '',
                priority: 'mid',
                impact_score: 5,
                strategic_category: 'rnd'
            })
            setCoverFile(null)
            setMilestones([])
        } catch (err: any) {
            console.error('Failed to create project:', err)
            alert(`Error: ${err.message || 'Failed to create project'}`)
        } finally {
            setLoading(false)
        }
    }

    const togglePlatform = (p: Platform) => {
        setFormData(prev => ({
            ...prev,
            platforms: prev.platforms.includes(p)
                ? prev.platforms.filter((x: Platform) => x !== p)
                : [...prev.platforms, p]
        }))
    }

    const handleAddMilestone = () => {
        if (newMilestone.trim()) {
            setMilestones(prev => [...prev, {
                title: newMilestone.trim(),
                impact_score: newImpact,
                category: newCategory,
                target_date: newDate || undefined
            }]);
            setNewMilestone('');
            setNewImpact(5);
            setNewCategory('rnd');
            setNewDate('');
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-xl max-h-[90vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-8 overflow-y-auto no-scrollbar">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-black leading-tight">New Project</h2>
                                <p className="text-[12px] font-medium text-black/40">Add a new creative endeavor to your pipeline.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 text-black/20 hover:text-black/60 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 1. Title & Tagline */}
                        <div className="space-y-4">
                            <div className="relative">
                                <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    placeholder="Project Title"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-sm font-bold focus:outline-none focus:border-orange-200 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <AlignLeft className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    type="text"
                                    placeholder="Project Tagline"
                                    value={formData.tagline}
                                    onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-medium focus:outline-none focus:border-orange-200 transition-all"
                                />
                            </div>
                        </div>

                        {/* 2. Cover Image */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Cover Image</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input
                                        type="url"
                                        placeholder="Cover Image URL (optional)"
                                        value={formData.cover_url}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cover_url: e.target.value }))}
                                        className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-medium focus:outline-none focus:border-orange-200 transition-all"
                                    />
                                </div>
                                <label className="cursor-pointer group/upload relative">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                                    />
                                    <div className={cn(
                                        "h-full px-4 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all",
                                        coverFile ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-black/5 hover:border-orange-200 bg-black/[0.02]"
                                    )}>
                                        <UploadCloud className="w-4 h-4" />
                                        {coverFile && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />}
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* 3. Priority + Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Priority</label>
                                <div className="flex gap-1.5">
                                    {(['urgent', 'high', 'mid', 'low'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, priority: level }))}
                                            className={cn(
                                                "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all",
                                                formData.priority === level
                                                    ? level === 'urgent' ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200" :
                                                        level === 'high' ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-200" :
                                                            level === 'mid' ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200" :
                                                                "bg-black text-white border-black"
                                                    : "bg-black/[0.02] border-black/[0.05] text-black/30 hover:bg-black/[0.04]"
                                            )}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Project Category</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ProjectType }))}
                                    className="w-full px-4 py-2.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[12px] font-bold focus:outline-none focus:border-orange-200 transition-all appearance-none cursor-pointer"
                                >
                                    {PROJECT_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 4. Impact Score */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2 flex justify-between">
                                Overall Project Impact
                                <span className="text-orange-500 font-black">{formData.impact_score}/10</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={formData.impact_score}
                                onChange={(e) => setFormData(prev => ({ ...prev, impact_score: parseInt(e.target.value) }))}
                                className="w-full h-1.5 bg-black/[0.05] rounded-lg appearance-none cursor-pointer accent-black"
                            />
                        </div>

                        {/* 5. Target Date */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Overall Target Completion</label>
                            <div className="relative w-full md:w-1/2 group/targetdate h-12 flex items-center px-4 bg-black/[0.02] border border-black/[0.1] rounded-2xl overflow-hidden cursor-pointer">
                                <Calendar className="w-4 h-4 text-black/20 shrink-0 pointer-events-none" />
                                <input
                                    type="date"
                                    ref={targetDateInputRef}
                                    value={formData.target_date ? formData.target_date.split('T')[0] : ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                                    className="absolute inset-0 w-full h-full text-transparent bg-transparent border-none cursor-pointer z-10 p-0"
                                />
                                <span className="ml-3 text-[13px] font-bold text-black/40 truncate pointer-events-none">
                                    {formData.target_date ? new Date(formData.target_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Set target date'}
                                </span>
                                {formData.target_date && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, target_date: '' }))}
                                        className="relative ml-auto p-1 text-black/20 hover:text-red-500 transition-colors z-30 pointer-events-auto"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 6. Initial Milestones (Roadmap) */}
                        <div className="space-y-4 pt-4 border-t border-black/[0.05]">
                            <label className="text-xs font-black uppercase tracking-[0.2em] text-black/60 ml-2">Project Roadmap</label>

                            {milestones.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {milestones.map((m, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 p-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl group/ms relative">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CheckSquare className="w-3.5 h-3.5 text-black/20" />
                                                    <span className="text-[12px] font-bold text-black">{m.title}</span>
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-black/5 rounded uppercase text-black/40">{m.category}</span>
                                                </div>
                                                <button
                                                    onClick={() => setMilestones(prev => prev.filter((_, i) => i !== idx))}
                                                    className="p-1 rounded-md hover:bg-red-50 text-red-400 opacity-40 hover:opacity-100 transition-all"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-4 pl-5">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/30">
                                                    <Zap className="w-3 h-3 text-orange-500/40" />
                                                    Impact: {m.impact_score}/10
                                                </div>
                                                {m.target_date && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/30">
                                                        <Calendar className="w-3 h-3" />
                                                        {(() => {
                                                            const [y, mm, d] = m.target_date.split('-').map(Number);
                                                            return new Date(y, mm - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-col gap-4 p-5 bg-black/[0.01] border-2 border-dashed border-black/[0.08] rounded-[32px]">
                                <div className="relative">
                                    <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input
                                        type="text"
                                        placeholder="Milestone title (Prototype, Launch, etc...)"
                                        value={newMilestone}
                                        onChange={(e) => setNewMilestone(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && newMilestone.trim()) {
                                                e.preventDefault();
                                                handleAddMilestone();
                                            }
                                        }}
                                        className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-[13px] font-bold focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-black/20 ml-2">Type</label>
                                        <select
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className="w-full px-3 py-2 bg-black/[0.03] border border-black/5 rounded-xl text-[11px] font-bold focus:outline-none cursor-pointer"
                                        >
                                            {MILESTONE_CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-black/20 ml-2">Deadline</label>
                                        <div className="relative group/newdate h-9 flex items-center px-3 bg-black/[0.03] border border-black/5 rounded-xl overflow-hidden cursor-pointer">
                                            <Calendar className="w-3.5 h-3.5 text-black/20 shrink-0 pointer-events-none" />
                                            <input
                                                type="date"
                                                ref={newMilestoneDateRef}
                                                value={newDate ? newDate.split('T')[0] : ''}
                                                onChange={(e) => setNewDate(e.target.value)}
                                                className="absolute inset-0 w-full h-full text-transparent bg-transparent border-none cursor-pointer z-10 p-0"
                                            />
                                            <span className="ml-2 text-[11px] font-bold text-black/40 truncate pointer-events-none">
                                                {newDate ? new Date(newDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Set date'}
                                            </span>
                                            {newDate && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setNewDate(''); }}
                                                    className="relative ml-auto p-1 text-black/20 hover:text-red-500 transition-colors z-30 pointer-events-auto"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 px-2 pt-2">
                                    <div className="flex-1 flex items-center gap-3">
                                        <span className="text-[9px] font-black uppercase text-black/20 shrink-0">Impact</span>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={newImpact}
                                            onChange={(e) => setNewImpact(parseInt(e.target.value))}
                                            className="flex-1 h-1 bg-black/5 rounded-full appearance-none accent-black"
                                        />
                                        <span className="text-[11px] font-black text-black/40 w-4 text-center">{newImpact}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddMilestone}
                                        className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:scale-105 transition-transform"
                                    >
                                        Add Milestone
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Extra Fields (Platforms & Brief) */}
                        <div className="space-y-4 pt-6 border-t border-black/[0.05]">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Platforms</label>
                                <div className="flex flex-wrap gap-1.5 px-2">
                                    {PLATFORMS.map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => togglePlatform(p)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                formData.platforms.includes(p)
                                                    ? "bg-black text-white scale-110 shadow-lg"
                                                    : "bg-black/[0.04] text-black/30 hover:bg-black/[0.08]"
                                            )}
                                        >
                                            <PlatformIcon platform={p} className="w-3.5 h-3.5" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Project Brief</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-medium focus:outline-none focus:border-orange-200 transition-all resize-none"
                                    placeholder="Goals, vision, or core concept..."
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading || !formData.title}
                            type="submit"
                            className="w-full py-4 bg-black text-white rounded-2xl text-[15px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-2xl shadow-black/20 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Create Project
                                    <Briefcase className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
