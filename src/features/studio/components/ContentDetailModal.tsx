'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Video, Globe, Calendar, Briefcase, AlignLeft, Edit3, Save, Trash2, ExternalLink, Link as LinkIcon, CheckCircle2, MapPin, Navigation, DollarSign, Plus, FileText, Lightbulb, ChevronDown, ChevronRight, Clock, Hash, Zap, UploadCloud, Type, Shield } from 'lucide-react'
import type { StudioContent, ContentStatus, Platform, ContentCategory, ContentScene, PriorityLevel } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'
import PlatformIcon from './PlatformIcon'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'
import { supabase } from '@/lib/supabase'

interface ContentDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: StudioContent | null
}

const PLATFORMS: Platform[] = ['youtube', 'instagram', 'tiktok', 'x', 'web', 'substack']
const TYPES = ['video', 'reel', 'post', 'thread', 'article', 'short']
const STATUSES: ContentStatus[] = ['idea', 'scripted', 'filmed', 'edited', 'scheduled', 'published']
const CATEGORIES: ContentCategory[] = ['Vlog', 'Thoughts', 'Showcase', 'Concept', 'Update', 'Other']

const PRIORITY_CONFIG = {
    urgent: { label: 'Urgent', bg: 'bg-purple-500 text-white', border: 'border-purple-300' },
    high: { label: 'High', bg: 'bg-red-500 text-white', border: 'border-red-300' },
    mid: { label: 'Mid', bg: 'bg-amber-400 text-white', border: 'border-amber-300' },
    low: { label: 'Low', bg: 'bg-neutral-300 text-neutral-700', border: 'border-black/10' },
} as const

const SCRIPT_SECTIONS = [
    { id: 'hook', label: 'Hook', color: 'border-purple-400 bg-purple-50/60', badge: 'bg-purple-100 text-purple-700', placeholder: 'What grabs attention in the first 3 seconds?' },
    { id: 'intro', label: 'Intro', color: 'border-blue-400 bg-blue-50/60', badge: 'bg-blue-100 text-blue-700', placeholder: 'Who you are, what this video is about...' },
    { id: 'body', label: 'Main Content', color: 'border-emerald-400 bg-emerald-50/60', badge: 'bg-emerald-100 text-emerald-700', placeholder: 'The core story, points, or demonstration...' },
    { id: 'cta', label: 'CTA', color: 'border-amber-400 bg-amber-50/60', badge: 'bg-amber-100 text-amber-700', placeholder: 'Like, subscribe, follow, buy... what do you want?' },
    { id: 'outro', label: 'Outro', color: 'border-rose-400 bg-rose-50/60', badge: 'bg-rose-100 text-rose-700', placeholder: 'Sign off, tease next video...' },
]
type ScriptSections = { hook: string; intro: string; body: string; cta: string; outro: string }

function parseScript(raw: string | undefined): ScriptSections {
    try { if (raw?.startsWith('{')) return { hook: '', intro: '', body: '', cta: '', outro: '', ...JSON.parse(raw) } }
    catch { }
    return { hook: '', intro: '', body: raw || '', cta: '', outro: '' }
}
function wordCount(t: string) { return t.trim() ? t.trim().split(/\s+/).length : 0 }
function readTime(w: number) { return Math.ceil(w / 130) <= 1 ? '~1 min' : `~${Math.ceil(w / 130)} mins` }

function ScriptSection({ section, value, onChange }: { section: typeof SCRIPT_SECTIONS[0]; value: string; onChange: (v: string) => void }) {
    const [collapsed, setCollapsed] = useState(false)
    const wc = wordCount(value)
    return (
        <div className={cn("rounded-2xl border-l-4 overflow-hidden", section.color)}>
            <button type="button" onClick={() => setCollapsed(c => !c)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", section.badge)}>{section.label}</span>
                    {wc > 0 && <span className="flex items-center gap-2 text-[10px] text-black/30 font-bold"><Hash className="w-3 h-3" />{wc}w <Clock className="w-3 h-3 ml-1" />{readTime(wc)}</span>}
                </div>
                {collapsed ? <ChevronRight className="w-4 h-4 text-black/20" /> : <ChevronDown className="w-4 h-4 text-black/20" />}
            </button>
            {!collapsed && (
                <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={section.placeholder}
                    className="w-full px-5 pb-4 bg-transparent text-[13px] font-medium leading-relaxed focus:outline-none resize-none text-black/80 placeholder:text-black/20 min-h-[100px]"
                    rows={Math.max(4, value.split('\n').length + 1)} />
            )}
        </div>
    )
}

export default function ContentDetailModal({ isOpen, onClose, item }: ContentDetailModalProps) {
    const { updateContent, deleteContent, projects, milestones, addMilestone, updateMilestone, deleteMilestone } = useStudio()
    const [activeTab, setActiveTab] = useState<'details' | 'script'>('details')
    const [isEditing, setIsEditing] = useState(false)
    const [editedData, setEditedData] = useState<Partial<StudioContent>>({})
    const [newScene, setNewScene] = useState<Partial<ContentScene>>({ type: 'public' })
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [coverPreview, setCoverPreview] = useState<string>('')

    // Milestone state
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
    const [newMilestoneScore, setNewMilestoneScore] = useState(5)
    const [newMilestoneDate, setNewMilestoneDate] = useState('')

    // Script state
    const [scriptSections, setScriptSections] = useState<ScriptSections>({ hook: '', intro: '', body: '', cta: '', outro: '' })
    const [brainstorm, setBrainstorm] = useState('')
    const [scriptSaving, setScriptSaving] = useState(false)
    const [scriptSaved, setScriptSaved] = useState(false)
    const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const deadlineInputRef = useRef<HTMLInputElement>(null)
    const publishDateInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (item) {
            setEditedData({})
            setIsEditing(false)
            setActiveTab('details')
            setScriptSections(parseScript(item.script))
            setBrainstorm(item.notes || '')
            setCoverFile(null)
            setCoverPreview('')
        }
    }, [item])

    const triggerAutosave = useCallback((sections: ScriptSections, notes: string) => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
        setScriptSaved(false)
        autosaveTimer.current = setTimeout(async () => {
            if (!item) return
            setScriptSaving(true)
            try {
                const scriptJson = JSON.stringify(sections)
                const updates: Partial<StudioContent> = { script: scriptJson, notes }
                const hasContent = Object.values(sections).some(v => v.trim()) || notes.trim()
                if (hasContent && item.status === 'idea') updates.status = 'scripted'
                await updateContent(item.id, updates)
                setScriptSaved(true)
                setTimeout(() => setScriptSaved(false), 2000)
            } catch (e) { console.error('Autosave failed', e) }
            finally { setScriptSaving(false) }
        }, 800)
    }, [item, updateContent])

    if (!isOpen || !item) return null

    const togglePlatform = (p: Platform) => {
        const cur = editedData.platforms ?? item.platforms ?? []
        setEditedData(prev => ({ ...prev, platforms: cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p] }))
    }

    const addScene = () => {
        if (!newScene.location) return
        const scene: ContentScene = { id: Math.random().toString(36).substring(2, 11), location: newScene.location, type: newScene.type as any, cost: newScene.cost, distance: newScene.distance }
        setEditedData(prev => ({ ...prev, scenes: [...(prev.scenes ?? item.scenes ?? []), scene] }))
        setNewScene({ type: 'public' })
    }

    const removeScene = (id: string) => {
        setEditedData(prev => ({ ...prev, scenes: (prev.scenes ?? item.scenes ?? []).filter((s: ContentScene) => s.id !== id) }))
    }

    const handleCoverFile = (file: File) => {
        setCoverFile(file)
        const reader = new FileReader()
        reader.onload = e => setCoverPreview(e.target?.result as string)
        reader.readAsDataURL(file)
    }

    const handleSave = async () => {
        if (Object.keys(editedData).length === 0 && !coverFile) { setIsEditing(false); return }
        try {
            let uploads: Partial<StudioContent> = { ...editedData }
            if (coverFile) {
                const fileExt = coverFile.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`
                const { error: uploadError } = await supabase.storage.from('studio-assets').upload(`content-covers/${fileName}`, coverFile)
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(`content-covers/${fileName}`)
                    uploads.cover_url = urlData.publicUrl
                }
            }
            if ('project_id' in uploads && !uploads.project_id) uploads.project_id = null as any
            await updateContent(item.id, uploads)
            setIsEditing(false)
            setCoverFile(null)
            setCoverPreview('')
        } catch (err: any) { alert(`Failed to save: ${err.message}`) }
    }

    const handleDelete = async () => {
        try { await deleteContent(item.id); onClose() }
        catch (err: any) { alert(`Failed to delete: ${err.message}`) }
    }

    const handleArchiveToggle = async () => {
        try {
            await updateContent(item.id, { is_archived: !item.is_archived })
            onClose()
        } catch (err: any) { alert(`Failed to archive: ${err.message}`) }
    }

    const handleAddMilestone = async () => {
        if (!newMilestoneTitle.trim()) return
        try {
            await addMilestone({
                title: newMilestoneTitle,
                impact_score: newMilestoneScore,
                target_date: newMilestoneDate || undefined,
                content_id: item.id,
                project_id: item.project_id || undefined,
                status: 'pending'
            })
            setNewMilestoneTitle('')
            setNewMilestoneScore(5)
            setNewMilestoneDate('')
        } catch (err) { console.error('Failed to add milestone:', err) }
    }

    const contentMilestones = milestones.filter(m => m.content_id === item.id)

    const totalWords = Object.values(scriptSections).reduce((s, t) => s + wordCount(t), 0)
    const currentPriority = (editedData.priority ?? item.priority ?? 'low') as PriorityLevel
    const coverSrc = coverPreview || editedData.cover_url || item.cover_url

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-black/[0.05] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] font-outfit">

                {/* Cover Banner */}
                <div className="w-full h-36 relative overflow-hidden flex-shrink-0 bg-black/[0.02]">
                    <img
                        src={coverSrc || `/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.category || '')}&type=content&id=${item.id}&w=1200&h=300`}
                        alt={item.title}
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-500",
                            !coverSrc && "opacity-40"
                        )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {isEditing && (coverPreview || editedData.cover_url || item.cover_url) && (
                        <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); setEditedData(prev => ({ ...prev, cover_url: '' })) }}
                            className="absolute top-3 right-3 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Header */}
                <div className="p-8 pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Video className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex items-center gap-1">
                                    {(editedData.platforms ?? item.platforms ?? []).map((p: Platform) => (
                                        <PlatformIcon key={p} platform={p} className="w-3 h-3 text-black/40" />
                                    ))}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-black/30">
                                    {editedData.category ?? item.category ?? 'Content'} • {editedData.type ?? item.type}
                                </span>
                            </div>
                            {isEditing ? (
                                <input type="text" value={editedData.title ?? item.title}
                                    onChange={e => setEditedData(prev => ({ ...prev, title: e.target.value }))}
                                    className="text-xl font-black text-black bg-black/[0.02] border border-black/[0.1] rounded-lg px-2 py-0.5 focus:outline-none focus:border-blue-500 w-full" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-black text-black">{item.title}</h2>
                                    {item.is_archived && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase rounded-lg flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            Archived
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {activeTab === 'details' && (
                            isEditing ? (
                                <button onClick={handleSave} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                                    <Save className="w-5 h-5" />
                                </button>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="p-2.5 bg-black/[0.03] text-black/40 rounded-xl hover:bg-black/[0.05] hover:text-black transition-colors">
                                    <Edit3 className="w-5 h-5" />
                                </button>
                            )
                        )}
                        {activeTab === 'script' && (
                            <div className={cn("text-[10px] font-black px-3 py-1.5 rounded-xl transition-all",
                                scriptSaving ? "bg-blue-50 text-blue-500" : scriptSaved ? "bg-emerald-50 text-emerald-600" : "bg-black/[0.03] text-black/20")}>
                                {scriptSaving ? 'Saving...' : scriptSaved ? '✓ Saved' : 'Autosave on'}
                            </div>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                            <X className="w-6 h-6 text-black/20" />
                        </button>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="px-8 pt-6 pb-0 flex items-center gap-1">
                    {(['details', 'script'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                activeTab === tab ? "bg-black text-white shadow-md" : "text-black/30 hover:text-black hover:bg-black/[0.04]")}>
                            {tab === 'details' ? <Globe className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                            {tab === 'details' ? 'Details' : 'Script & Ideas'}
                            {tab === 'script' && totalWords > 0 && (
                                <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md", activeTab === 'script' ? "bg-white/20" : "bg-black/[0.06] text-black/40")}>
                                    {totalWords}w
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="border-b border-black/[0.05] mx-8 mt-4" />

                {/* ── DETAILS TAB ── */}
                {activeTab === 'details' && (
                    <div className="flex-1 overflow-y-auto p-8 space-y-8">

                        {/* Milestones Section */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                Content Milestones
                            </label>

                            <div className="space-y-2.5">
                                {contentMilestones.map(m => (
                                    <div key={m.id} className="flex flex-col gap-2 p-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl group">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateMilestone(m.id, { status: m.status === 'completed' ? 'pending' : 'completed' })}
                                                className={cn(
                                                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                                                    m.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-black/10 hover:border-black/20"
                                                )}
                                            >
                                                {m.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </button>
                                            <input
                                                type="text"
                                                value={m.title}
                                                onChange={e => updateMilestone(m.id, { title: e.target.value })}
                                                className={cn("flex-1 bg-transparent border-none p-0 text-[13px] font-bold focus:ring-0", m.status === 'completed' && "line-through text-black/20")}
                                            />
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/[0.03] border border-black/[0.05] rounded-lg group/date relative min-w-0 flex-1 h-7 overflow-hidden cursor-pointer"
                                                    onClick={(e) => (e.currentTarget.querySelector('input[type="date"]') as any)?.showPicker?.()}
                                                >
                                                    <Calendar className="w-2.5 h-2.5 text-black/20 shrink-0 pointer-events-none" />
                                                    <input
                                                        type="date"
                                                        value={m.target_date?.split('T')[0] || ''}
                                                        onChange={e => updateMilestone(m.id, { target_date: e.target.value || null })}
                                                        className="absolute inset-0 w-full h-full text-transparent bg-transparent border-none cursor-pointer z-10 p-0"
                                                    />
                                                    <span className="text-[10px] font-bold text-black/40 truncate pointer-events-none">
                                                        {m.target_date ? new Date(m.target_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Set date'}
                                                    </span>
                                                    {m.target_date && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateMilestone(m.id, { target_date: null }) }}
                                                            className="relative ml-auto p-1 text-black/20 hover:text-red-500 transition-colors z-30 pointer-events-auto"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                                                    <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                                    <div className="flex items-center">
                                                        <button
                                                            onClick={() => updateMilestone(m.id, { impact_score: Math.max(1, (m.impact_score || 0) - 1) })}
                                                            className="text-[12px] font-black text-amber-600/40 hover:text-amber-600 px-1"
                                                        >-</button>
                                                        <span className="text-[10px] font-black text-amber-600 w-4 text-center">
                                                            {m.impact_score || 0}
                                                        </span>
                                                        <button
                                                            onClick={() => updateMilestone(m.id, { impact_score: Math.min(10, (m.impact_score || 0) + 1) })}
                                                            className="text-[12px] font-black text-amber-600/40 hover:text-amber-600 px-1"
                                                        >+</button>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setMilestoneToDelete(m.id)}
                                                    className="p-1.5 text-black/20 hover:text-red-500 transition-all opacity-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Milestone Form */}
                                <div className="flex flex-col gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <Plus className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
                                        <input
                                            type="text"
                                            placeholder="Add a new milestone..."
                                            value={newMilestoneTitle}
                                            onChange={e => setNewMilestoneTitle(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddMilestone()}
                                            className="flex-1 bg-transparent border-none p-0 text-[13px] font-bold text-black placeholder:text-blue-300 focus:ring-0"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-4 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-blue-100 rounded-lg group/adddate relative min-w-0 flex-1 h-8 overflow-hidden cursor-pointer"
                                                onClick={(e) => (e.currentTarget.querySelector('input[type="date"]') as any)?.showPicker?.()}
                                            >
                                                <Calendar className="w-3 h-3 text-blue-300 shrink-0 pointer-events-none" />
                                                <input
                                                    type="date"
                                                    value={newMilestoneDate}
                                                    onChange={e => setNewMilestoneDate(e.target.value)}
                                                    className="absolute inset-0 w-full h-full text-transparent bg-transparent border-none cursor-pointer z-10 p-0"
                                                />
                                                <span className="text-[11px] font-bold text-black/40 truncate pointer-events-none">
                                                    {newMilestoneDate ? new Date(newMilestoneDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Deadline'}
                                                </span>
                                                {newMilestoneDate && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setNewMilestoneDate(''); }}
                                                        className="relative ml-auto p-1 text-black/20 hover:text-red-500 transition-colors z-20"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-blue-100 rounded-lg">
                                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                <div className="flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewMilestoneScore(s => Math.max(1, s - 1))}
                                                        className="text-[14px] font-black text-amber-600/40 hover:text-amber-600 px-1"
                                                    >-</button>
                                                    <span className="w-4 text-center bg-transparent border-none p-0 text-[11px] font-black text-amber-600">
                                                        {newMilestoneScore}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewMilestoneScore(s => Math.min(10, s + 1))}
                                                        className="text-[14px] font-black text-amber-600/40 hover:text-amber-600 px-1"
                                                    >+</button>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleAddMilestone}
                                            disabled={!newMilestoneTitle.trim()}
                                            className="px-6 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50 hover:scale-105 transition-transform"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Progress Stage</label>
                            <div className="flex flex-wrap gap-1.5 p-1.5 bg-black/[0.02] rounded-2xl border border-black/[0.05]">
                                {STATUSES.map(s => (
                                    <button key={s} onClick={() => updateContent(item.id, { status: s })}
                                        className={cn("flex-1 px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all",
                                            item.status === s ? "bg-white text-blue-600 shadow-sm border border-black/[0.05]" : "text-black/30 hover:text-black hover:bg-black/5")}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cover Image (edit) */}
                        {isEditing && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Cover Image</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                        <input type="url" placeholder="Cover image URL"
                                            value={editedData.cover_url ?? item.cover_url ?? ''}
                                            onChange={e => setEditedData(prev => ({ ...prev, cover_url: e.target.value }))}
                                            className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-medium focus:outline-none focus:border-blue-200 transition-all" />
                                    </div>
                                    <label className="cursor-pointer">
                                        <input type="file" className="hidden" accept="image/*"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverFile(f) }} />
                                        <div className={cn("h-full px-4 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all",
                                            coverFile ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-black/[0.06] hover:border-blue-200 bg-black/[0.02]")}>
                                            <UploadCloud className="w-4 h-4" />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Priority Pills */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Priority</label>
                            <div className="flex gap-2">
                                {(Object.keys(PRIORITY_CONFIG) as PriorityLevel[]).map(level => (
                                    <button key={level} type="button"
                                        onClick={() => isEditing && setEditedData(prev => ({ ...prev, priority: level }))}
                                        className={cn(
                                            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                                            currentPriority === level
                                                ? cn(PRIORITY_CONFIG[level].bg, "border-transparent scale-105 shadow-md")
                                                : "bg-black/[0.02] border-black/[0.05] text-black/30",
                                            isEditing && currentPriority !== level && "hover:bg-black/[0.04] cursor-pointer",
                                            !isEditing && "cursor-default"
                                        )}>
                                        {PRIORITY_CONFIG[level].label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Impact Score */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2 flex justify-between items-center">
                                Impact Score
                                <span className="flex items-center gap-1 text-amber-500 font-black">
                                    <Zap className="w-3 h-3 fill-current" />
                                    {editedData.impact_score ?? item.impact_score ?? 5}/10
                                </span>
                            </label>
                            <input type="range" min="1" max="10" disabled={!isEditing}
                                value={editedData.impact_score ?? item.impact_score ?? 5}
                                onChange={e => setEditedData(prev => ({ ...prev, impact_score: parseInt(e.target.value) }))}
                                className="w-full h-1.5 bg-black/[0.06] rounded-lg appearance-none cursor-pointer accent-black disabled:opacity-60 disabled:cursor-default" />
                        </div>

                        {/* Category, Format, Project */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Category</label>
                                <select disabled={!isEditing} value={editedData.category ?? item.category ?? 'Vlog'}
                                    onChange={e => setEditedData(prev => ({ ...prev, category: e.target.value as ContentCategory }))}
                                    className="w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none appearance-none disabled:opacity-100">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Format</label>
                                <select disabled={!isEditing} value={editedData.type ?? item.type}
                                    onChange={e => setEditedData(prev => ({ ...prev, type: e.target.value }))}
                                    className="w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none appearance-none disabled:opacity-100">
                                    {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Project</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/20" />
                                    <select disabled={!isEditing} value={editedData.project_id ?? item.project_id ?? ''}
                                        onChange={e => setEditedData(prev => ({ ...prev, project_id: e.target.value }))}
                                        className="w-full pl-9 pr-3 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[12px] font-bold focus:outline-none appearance-none disabled:opacity-100">
                                        <option value="">None</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Platforms */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Distribute To</label>
                            <div className="flex flex-wrap gap-2 px-2">
                                {PLATFORMS.map(p => (
                                    <button key={p} disabled={!isEditing} type="button" onClick={() => togglePlatform(p)}
                                        className={cn("w-8 h-8 rounded-xl border transition-all flex items-center justify-center",
                                            (editedData.platforms ?? item.platforms ?? []).includes(p)
                                                ? "bg-black text-white border-black scale-110 shadow-lg shadow-black/10"
                                                : "bg-black/[0.02] border-black/[0.05] text-black/40 hover:border-black/20",
                                            !isEditing && "cursor-default"
                                        )} title={p}>
                                        <PlatformIcon platform={p} className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Deadline</label>
                                <div className="relative group/maindate h-12 flex items-center px-4 bg-black/[0.02] border border-black/[0.05] rounded-2xl cursor-pointer">
                                    <Calendar className="w-4 h-4 text-black/20 shrink-0 pointer-events-none" />
                                    <input readOnly={!isEditing} type="date"
                                        ref={deadlineInputRef}
                                        value={(editedData.deadline ?? item.deadline ?? '').split('T')[0]}
                                        onChange={e => setEditedData(prev => ({ ...prev, deadline: e.target.value || null }))}
                                        className={cn("absolute inset-0 w-full h-full text-transparent bg-transparent border-none cursor-pointer z-10 p-0", !isEditing && "pointer-events-none")} />
                                    <span className="ml-3 text-[12px] font-bold text-black/40 truncate pointer-events-none">
                                        {(editedData.deadline ?? item.deadline) ? new Date((editedData.deadline ?? item.deadline!) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline'}
                                    </span>
                                    {isEditing && (editedData.deadline ?? item.deadline) && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditedData(prev => ({ ...prev, deadline: null })) }}
                                            className="relative ml-auto p-1 text-black/20 hover:text-red-500 transition-colors z-20"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Publish Date</label>
                                <div className="relative group/pubdate h-12 flex items-center px-4 bg-black/[0.02] border border-black/[0.05] rounded-2xl cursor-pointer">
                                    <Calendar className="w-4 h-4 text-black/20 shrink-0 pointer-events-none" />
                                    <input readOnly={!isEditing} type="date"
                                        ref={publishDateInputRef}
                                        value={(editedData.publish_date ?? item.publish_date ?? '').split('T')[0]}
                                        onChange={e => setEditedData(prev => ({ ...prev, publish_date: e.target.value || null }))}
                                        className={cn("absolute inset-0 w-full h-full text-transparent bg-transparent border-none cursor-pointer z-10 p-0", !isEditing && "pointer-events-none")} />
                                    <span className="ml-3 text-[12px] font-bold text-black/40 truncate pointer-events-none">
                                        {(editedData.publish_date ?? item.publish_date) ? new Date((editedData.publish_date ?? item.publish_date!) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not scheduled'}
                                    </span>
                                    {isEditing && (editedData.publish_date ?? item.publish_date) && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditedData(prev => ({ ...prev, publish_date: null })) }}
                                            className="relative ml-auto p-1 text-black/20 hover:text-red-500 transition-colors z-20"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* URL */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">External Link</label>
                            <div className="relative flex gap-2">
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input readOnly={!isEditing} type="url" placeholder="Add URL..."
                                    value={editedData.url ?? item.url ?? ''}
                                    onChange={e => setEditedData(prev => ({ ...prev, url: e.target.value }))}
                                    className="flex-1 pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-blue-200" />
                                {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors"><ExternalLink className="w-5 h-5" /></a>}
                            </div>
                        </div>

                        {/* Scenes */}
                        <div className="space-y-4 pt-4 border-t border-black/[0.05]">
                            <div className="flex items-center justify-between px-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30">Production Scenes</label>
                                {isEditing && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-black/[0.02] border border-black/[0.05] rounded-xl p-1">
                                            <input placeholder="Location" value={newScene.location || ''} onChange={e => setNewScene(prev => ({ ...prev, location: e.target.value }))} className="text-[11px] font-bold px-2 py-1 bg-transparent focus:outline-none w-24" />
                                            <select value={newScene.type || 'public'} onChange={e => setNewScene(prev => ({ ...prev, type: e.target.value as any }))} className="text-[10px] font-bold bg-transparent border-l border-black/[0.05] px-1 focus:outline-none">
                                                <option value="public">Pub</option><option value="private">Priv</option>
                                            </select>
                                            <input placeholder="Cost" value={newScene.cost || ''} onChange={e => setNewScene(prev => ({ ...prev, cost: e.target.value }))} className="text-[11px] font-bold px-2 py-1 bg-transparent border-l border-black/[0.05] focus:outline-none w-16" />
                                            <input placeholder="Dist" value={newScene.distance || ''} onChange={e => setNewScene(prev => ({ ...prev, distance: e.target.value }))} className="text-[11px] font-bold px-2 py-1 bg-transparent border-l border-black/[0.05] focus:outline-none w-16" />
                                        </div>
                                        <button onClick={addScene} className="p-1.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"><Plus className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-hidden rounded-3xl border border-black/[0.05] bg-black/[0.01]">
                                <table className="w-full text-left border-collapse">
                                    <thead><tr className="bg-black/[0.02] border-b border-black/[0.05]">
                                        <th className="px-4 py-2.5 text-[9px] font-black uppercase text-black/30">Location</th>
                                        <th className="px-4 py-2.5 text-[9px] font-black uppercase text-black/30">Type</th>
                                        <th className="px-4 py-2.5 text-[9px] font-black uppercase text-black/30">Cost</th>
                                        <th className="px-4 py-2.5 text-[9px] font-black uppercase text-black/30">Dist.</th>
                                        {isEditing && <th className="px-4 py-2.5" />}
                                    </tr></thead>
                                    <tbody className="divide-y divide-black/[0.03]">
                                        {(editedData.scenes ?? item.scenes ?? []).map((scene: ContentScene) => (
                                            <tr key={scene.id} className="group hover:bg-black/[0.02]">
                                                <td className="px-4 py-3 text-[12px] font-bold"><div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-black/20" />{scene.location}</div></td>
                                                <td className="px-4 py-3"><span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border", scene.type === 'private' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>{scene.type}</span></td>
                                                <td className="px-4 py-3"><div className="flex items-center gap-1 text-[11px] font-bold text-black/50"><DollarSign className="w-3 h-3" />{scene.cost || 'Free'}</div></td>
                                                <td className="px-4 py-3"><div className="flex items-center gap-1 text-[11px] font-bold text-black/50"><Navigation className="w-3 h-3" />{scene.distance || '-'}</div></td>
                                                {isEditing && <td className="px-4 py-3 text-right"><button onClick={() => removeScene(scene.id)} className="p-1.5 text-black/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button></td>}
                                            </tr>
                                        ))}
                                        {(editedData.scenes ?? item.scenes ?? []).length === 0 && (
                                            <tr><td colSpan={isEditing ? 5 : 4} className="px-4 py-8 text-center"><p className="text-[11px] font-bold text-black/20 uppercase tracking-widest italic">No scenes listed</p></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SCRIPT TAB ── */}
                {activeTab === 'script' && (
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {totalWords > 0 && (
                            <div className="flex items-center gap-4 px-4 py-3 bg-black/[0.02] rounded-2xl border border-black/[0.04]">
                                <span className="flex items-center gap-2 text-[11px] font-black text-black/40"><Hash className="w-3.5 h-3.5" />{totalWords} words</span>
                                <span className="flex items-center gap-2 text-[11px] font-black text-black/40"><Clock className="w-3.5 h-3.5" />{readTime(totalWords)} read</span>
                            </div>
                        )}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30">Brainstorm & Concept</label>
                            </div>
                            <textarea value={brainstorm} onChange={e => { setBrainstorm(e.target.value); triggerAutosave(scriptSections, e.target.value) }}
                                placeholder="Dump your raw ideas, angle, references, inspiration..."
                                className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-3xl text-[13px] font-medium leading-relaxed focus:outline-none focus:border-amber-200 resize-none text-black/80 placeholder:text-black/20 min-h-[120px]" rows={5} />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30">Script Sections</label>
                            </div>
                            <div className="space-y-3">
                                {SCRIPT_SECTIONS.map(section => (
                                    <ScriptSection key={section.id} section={section}
                                        value={scriptSections[section.id as keyof ScriptSections]}
                                        onChange={val => { const next = { ...scriptSections, [section.id]: val }; setScriptSections(next); triggerAutosave(next, brainstorm) }} />
                                ))}
                            </div>
                        </div>
                        <p className="text-center text-[10px] font-bold text-black/15 uppercase tracking-widest pb-2">Changes autosave as you type</p>
                    </div>
                )}

                {/* Footer */}
                <div className="p-8 pt-4 flex items-center justify-between bg-black/[0.01] border-t border-black/[0.05]">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[12px]">
                            <Trash2 className="w-4 h-4" />Delete Item
                        </button>
                        <button
                            onClick={() => setShowArchiveConfirm(true)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all border",
                                item.is_archived
                                    ? "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                                    : "bg-black/[0.02] text-black/40 border-transparent hover:bg-black/5 hover:text-black/60"
                            )}
                        >
                            <Shield className="w-4 h-4" />
                            {item.is_archived ? 'Unarchive' : 'Archive'}
                        </button>
                    </div>
                    <div className={cn("text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest",
                        item.status === 'published' ? "bg-emerald-50 text-emerald-600" :
                            item.status === 'scripted' ? "bg-blue-50 text-blue-500" :
                                item.status === 'filmed' ? "bg-amber-50 text-amber-500" :
                                    item.status === 'edited' ? "bg-purple-50 text-purple-500" :
                                        item.status === 'scheduled' ? "bg-cyan-50 text-cyan-500" :
                                            "bg-black/[0.03] text-black/20")}>
                        {item.status}
                    </div>
                </div>
            </div>

            <ConfirmationModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
                title="Delete Content" message={`Delete "${item.title}"? This cannot be undone.`} confirmText="Delete" type="danger" />

            <ConfirmationModal
                isOpen={showArchiveConfirm}
                onClose={() => setShowArchiveConfirm(false)}
                onConfirm={handleArchiveToggle}
                title={item.is_archived ? "Restore Content" : "Archive Content"}
                message={item.is_archived
                    ? "This content will be moved back to your active pipeline."
                    : "This content will be hidden from your active pipeline but preserved in archives."
                }
                type="warning"
                confirmText={item.is_archived ? "Restore" : "Archive"}
            />

            <ConfirmationModal
                isOpen={!!milestoneToDelete}
                onClose={() => setMilestoneToDelete(null)}
                onConfirm={() => {
                    if (milestoneToDelete) {
                        deleteMilestone(milestoneToDelete)
                        setMilestoneToDelete(null)
                    }
                }}
                title="Delete Milestone"
                message="Are you sure you want to delete this milestone? This cannot be undone."
                confirmText="Delete"
                type="danger"
            />
        </div>
    )
}
