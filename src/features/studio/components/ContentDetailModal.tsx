'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Video, Calendar, CheckCircle2, Trash2, Plus, Zap, Rocket, Shield, 
    X, Hash, Clock, Link as LinkIcon, Globe, Edit3, Save, ExternalLink, 
    MapPin, Navigation, DollarSign, ChevronDown, ChevronRight, UploadCloud, 
    Loader2, MoreVertical, Archive, Layout, FileText, CheckSquare, GripVertical, Lightbulb,
    Pencil, Target, Wand2, AlignLeft
} from 'lucide-react'
import type { StudioContent, ContentStatus, Platform, ContentCategory, ContentScene, PriorityLevel } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'
import PlatformIcon from './PlatformIcon'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'
import { supabase } from '@/lib/supabase'
import { Task } from '../../tasks/types/tasks.types'
import { Reorder, useDragControls } from 'framer-motion'

interface ContentDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: StudioContent | null
}

const PLATFORMS: Platform[] = ['youtube', 'instagram', 'tiktok', 'x', 'web', 'substack']
const TYPES = ['video', 'reel', 'post', 'thread', 'article', 'short']
const STATUSES: ContentStatus[] = ['idea', 'scripted', 'filmed', 'edited', 'scheduled', 'published']
const CATEGORIES: ContentCategory[] = ['Vlog', 'Thoughts', 'Showcase', 'Concept', 'Update', 'Other']
const MILESTONE_CATEGORIES = ['rnd', 'production', 'media', 'growth']

const PRIORITY_CONFIG = {
    super: { label: 'Super', color: 'bg-purple-50 text-purple-600 border-purple-200 shadow-purple-500/10' },
    high: { label: 'High', color: 'bg-red-50 text-red-600 border-red-200 shadow-red-500/10' },
    mid: { label: 'Mid', color: 'bg-yellow-50 text-yellow-600 border-yellow-200 shadow-yellow-500/10' },
    low: { label: 'Low', color: 'bg-black/5 text-black/60 border-black/10 shadow-black/5' },
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
        <div className={cn("rounded-2xl border-l-[3px] overflow-hidden", section.color)}>
            <button type="button" onClick={() => setCollapsed(c => !c)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-black/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                    <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", section.badge)}>{section.label}</span>
                    {wc > 0 && <span className="flex items-center gap-2 text-[9px] text-black/30 font-bold"><Hash className="w-2.5 h-2.5" />{wc}w <Clock className="w-2.5 h-2.5 ml-1" />{readTime(wc)}</span>}
                </div>
                {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-black/20" /> : <ChevronDown className="w-3.5 h-3.5 text-black/20" />}
            </button>
            {!collapsed && (
                <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={section.placeholder}
                    className="w-full px-5 pb-4 bg-transparent text-[13px] font-medium leading-relaxed focus:outline-none resize-none text-black/80 placeholder:text-black/15 min-h-[80px]"
                    rows={Math.max(3, value.split('\n').length)} />
            )}
        </div>
    )
}

export default function ContentDetailModal({ isOpen, onClose, item }: ContentDetailModalProps) {
    const { updateContent, deleteContent, projects, milestones, addMilestone, updateMilestone, deleteMilestone, regenerateContentCover, generatingContentIds } = useStudio()
    const [activeTab, setActiveTab] = useState<'details' | 'script'>('details')
    const [isEditing, setIsEditing] = useState(false)
    const [isClearingImage, setIsClearingImage] = useState(false)
    const isGeneratingContent = item ? generatingContentIds.includes(item.id) : false
    const [editedData, setEditedData] = useState<Partial<StudioContent>>({})
    const [newScene, setNewScene] = useState<Partial<ContentScene>>({ type: 'public' })
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [coverPreview, setCoverPreview] = useState<string>('')

    // Script state
    const [scriptSections, setScriptSections] = useState<ScriptSections>({ hook: '', intro: '', body: '', cta: '', outro: '' })
    const [brainstorm, setBrainstorm] = useState('')
    const [scriptSaving, setScriptSaving] = useState(false)
    const [scriptSaved, setScriptSaved] = useState(false)
    const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevItemId = useRef<string | null>(null)
    const [linkedTasks, setLinkedTasks] = useState<Task[]>([])

    useEffect(() => {
        if (!isOpen || !item) return
        const fetchLinkedTasks = async () => {
            const { data } = await supabase.from('fin_tasks').select('*').eq('content_id', item.id).order('created_at', { ascending: false })
            if (data) setLinkedTasks(data)
        }
        fetchLinkedTasks()
    }, [isOpen, item])

    useEffect(() => {
        if (item) {
            if (prevItemId.current !== item.id) {
                setEditedData({})
                setIsEditing(false)
                setActiveTab('details')
                setScriptSections(parseScript(item.script))
                setBrainstorm(item.notes || '')
                setCoverFile(null)
                setCoverPreview('')
                prevItemId.current = item.id
            }
        } else {
            prevItemId.current = null
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

    const handleRegenerateCover = async () => {
        if (!item || isGeneratingContent) return;
        setIsClearingImage(true);
        try {
            await regenerateContentCover(item.id);
        } catch (err) {
            console.error('Failed to regenerate cover:', err);
        } finally {
            setIsClearingImage(false);
        }
    }

    const contentMilestones = milestones.filter(m => m.content_id === item.id)
    const totalWords = Object.values(scriptSections).reduce((s, t) => s + wordCount(t), 0)
    const coverSrc = coverPreview || editedData.cover_url || item.cover_url

    return (
        <>
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
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[100] max-h-[90vh] overflow-y-auto shadow-2xl border-t border-black/5 no-scrollbar font-outfit"
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
                                        {!isClearingImage && (
                                            <img
                                                src={item?.cover_url || coverPreview || `/api/studio/cover?title=${encodeURIComponent(item?.title || '')}&tagline=${encodeURIComponent(item?.category || '')}&type=content&id=${item?.id}&w=1200&h=630`}
                                                alt={item.title}
                                                className={cn(
                                                    "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                                                    isGeneratingContent && "blur-md"
                                                )}
                                            />
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent rounded-b-[24px]">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{editedData.category ?? item.category ?? 'Content'}</span>
                                                    <div className="flex items-center gap-2">
                                                        {(editedData.platforms ?? item.platforms ?? []).map((p: Platform) => (
                                                            <PlatformIcon key={p} platform={p} className="w-3.5 h-3.5 text-white/80" />
                                                        ))}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleRegenerateCover}
                                                    disabled={isGeneratingContent}
                                                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                                                >
                                                    {isGeneratingContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
                                                </button>
                                            </div>
                                        </div>
                                        {isGeneratingContent && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm gap-2 rounded-[24px]">
                                                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Generating...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Stats Overlay */}
                                    <div className="p-6 bg-black/[0.02] rounded-3xl border border-black/5 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-black text-black/20 uppercase">Tactical Progress</span>
                                                <span className="text-[16px] font-black text-black">
                                                    {contentMilestones.filter(m => m.status === 'completed').length}/{contentMilestones.length}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-black text-black/20 uppercase">Deployment</span>
                                                <span className={cn(
                                                    "text-[14px] font-black uppercase tracking-tight",
                                                    item.status === 'published' ? "text-emerald-500" : "text-blue-600"
                                                )}>{item.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {!isEditing && (
                                            <button
                                                onClick={() => {
                                                    setEditedData(item)
                                                    setIsEditing(true)
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-black/[0.03] hover:bg-black/[0.06] rounded-2xl text-[11px] font-black uppercase tracking-widest text-black/40"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Edit Content
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full py-3 text-red-400 hover:text-red-500 text-[11px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            Archive Content
                                        </button>
                                    </div>
                                    
                                    <button onClick={onClose} className="w-full py-3 text-black/20 hover:text-black/40 text-[11px] font-black uppercase tracking-widest transition-colors">
                                        Close Portal
                                    </button>
                                </div>

                                {/* Right Column: Content & Controls */}
                                <div className="md:col-span-2 space-y-12">
                                    {isEditing ? (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                            {/* Core Identity Setup */}
                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Content Designation</label>
                                                    <input
                                                        autoFocus
                                                        value={editedData.title || ''}
                                                        onChange={e => setEditedData(prev => ({ ...prev, title: e.target.value }))}
                                                        placeholder="e.g. Masterclass on Schrödinger"
                                                        className="w-full text-[24px] md:text-[32px] font-bold tracking-tight placeholder:text-black/10 border-none p-0 focus:ring-0 outline-none bg-transparent text-black"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-2 pt-2 border-t border-black/5">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Secondary Designation (Category)</label>
                                                    <input
                                                        value={editedData.category || ''}
                                                        onChange={e => setEditedData(prev => ({ ...prev, category: e.target.value as ContentCategory }))}
                                                        placeholder="e.g. Education, Vlog, Thoughts..."
                                                        className="w-full text-lg font-bold text-black placeholder:text-black/10 border-none p-0 focus:ring-0 outline-none bg-transparent"
                                                    />
                                                </div>
                                            </div>

                                            {/* Status selection */}
                                            <div className="space-y-3 pt-4 border-t border-black/5">
                                                <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Production Phase</label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {STATUSES.map(s => {
                                                        const active = (editedData.status || item.status) === s
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

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-black/5">
                                                {/* Priority Setup */}
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Priority Logic</label>
                                                    <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-xl border border-black/5">
                                                        {(['super', 'high', 'mid', 'low'] as const).map(p => {
                                                            const currentPriority = editedData.priority || item.priority
                                                            const isActive = currentPriority === p
                                                            return (
                                                                <button
                                                                    key={p}
                                                                    type="button"
                                                                    onClick={() => setEditedData(prev => ({ ...prev, priority: p }))}
                                                                    className={cn(
                                                                        "flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all border",
                                                                        isActive
                                                                            ? PRIORITY_CONFIG[p].color
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
                                                            const active = (editedData.platforms ?? item.platforms ?? []).includes(p)
                                                            return (
                                                                <button
                                                                    key={p}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = editedData.platforms ?? item.platforms ?? []
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

                                            {/* Timeline Setup */}
                                            <div className="space-y-3 pt-4 border-t border-black/5">
                                                <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Final Deployment Deadline</label>
                                                <input
                                                    type="date"
                                                    value={(editedData.deadline || item.deadline || '').split('T')[0]}
                                                    onChange={e => setEditedData(prev => ({ ...prev, deadline: e.target.value }))}
                                                    className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[12px] font-bold outline-none focus:bg-white transition-all text-black"
                                                />
                                            </div>

                                            {/* Impact Control */}
                                            <div className="p-6 bg-black/[0.03] border border-black/5 rounded-[24px] space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Zap className="w-3.5 h-3.5 text-black/40" />
                                                        <label className="text-[9px] font-black text-black/30 uppercase tracking-widest">Impact Score</label>
                                                    </div>
                                                    <span className="text-[14px] font-black text-black">{editedData.impact_score || item.impact_score || 5}/10</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={editedData.impact_score || item.impact_score || 5}
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
                                            {/* View Mode Header */}
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", PRIORITY_CONFIG[item.priority || 'low'].color)}>
                                                            {item.priority || 'Priority Unset'}
                                                        </div>
                                                        {item.deadline && (
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-black/40 uppercase tracking-widest">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h1 className="text-[32px] md:text-[42px] font-black tracking-tight text-black leading-none">{item.title}</h1>
                                                    {item.category && <p className="text-[14px] md:text-[16px] font-medium text-black/40 uppercase tracking-[0.2em]">{item.category}</p>}
                                                </div>

                                                {/* Tab Selection */}
                                                <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl w-fit">
                                                    {(['details', 'script'] as const).map(tab => (
                                                        <button
                                                            key={tab}
                                                            onClick={() => setActiveTab(tab)}
                                                            className={cn(
                                                                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                activeTab === tab ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/60"
                                                            )}
                                                        >
                                                            {tab === 'details' ? 'Strategic Layer' : 'Creative Layer'}
                                                        </button>
                                                    ))}
                                                </div>

                                                {activeTab === 'details' ? (
                                                    <div className="space-y-12 animate-in fade-in duration-500">
                                                        {/* Brainstorm / Description Section */}
                                                        <div className="p-8 bg-black/[0.01] border border-black/[0.03] rounded-[32px] space-y-4">
                                                            <div className="flex items-center gap-2 text-black/20 mb-2">
                                                                <AlignLeft className="w-4 h-4" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Content Brief & Notes</span>
                                                            </div>
                                                            <p className="text-[15px] font-medium text-black/70 leading-relaxed whitespace-pre-wrap">
                                                                {item.notes || 'No brainstorming notes yet. Switch to Edit Content to add vision.'}
                                                            </p>
                                                        </div>

                                                        {/* Milestones / Production Steps */}
                                                        <div className="space-y-6">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="text-[12px] font-black uppercase tracking-widest text-black/30">Production Pipeline</h3>
                                                                <button
                                                                    onClick={() => {
                                                                        addMilestone({
                                                                            title: 'New Production Step',
                                                                            status: 'pending',
                                                                            content_id: item.id,
                                                                            project_id: item.project_id || undefined
                                                                        } as any)
                                                                    }}
                                                                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1"
                                                                >
                                                                    <Plus className="w-4 h-4" /> Add Step
                                                                </button>
                                                            </div>

                                                            <Reorder.Group
                                                                axis="y"
                                                                values={contentMilestones}
                                                                onReorder={() => {}}
                                                                className="space-y-3"
                                                            >
                                                                {contentMilestones.map(m => (
                                                                    <MilestoneRow 
                                                                        key={m.id} 
                                                                        milestone={m} 
                                                                        updateMilestone={updateMilestone}
                                                                        deleteMilestone={deleteMilestone}
                                                                    />
                                                                ))}
                                                            </Reorder.Group>
                                                        </div>

                                                        {/* Meta Grid */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-black/5">
                                                            <div className="space-y-4">
                                                                <div className="flex items-center gap-2 text-black/30">
                                                                    <Target className="w-4 h-4" />
                                                                    <span className="text-[11px] font-black uppercase tracking-tight">Impact Profile</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 px-4 py-3 bg-black/[0.02] rounded-2xl border border-black/5">
                                                                    <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
                                                                    <span className="text-[14px] font-black text-black">Impact Score: {item.impact_score || 5}/10</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="space-y-4">
                                                                <div className="flex items-center gap-2 text-black/30">
                                                                    <LinkIcon className="w-4 h-4" />
                                                                    <span className="text-[11px] font-black uppercase tracking-tight">Network Asset</span>
                                                                </div>
                                                                {item.url ? (
                                                                    <a href={item.url} target="_blank" className="flex items-center justify-between px-4 py-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all">
                                                                        <span className="text-[13px] font-bold truncate max-w-[150px]">{item.url}</span>
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </a>
                                                                ) : (
                                                                    <div className="px-4 py-3 bg-black/[0.02] rounded-2xl border border-black/5 text-black/20 text-[13px] italic">No active link</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className={cn("text-[10px] font-black px-4 py-2 rounded-xl border", scriptSaving ? "bg-blue-50 text-blue-600 border-blue-100" : scriptSaved ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-black/5 text-black/30 border-transparent")}>
                                                                {scriptSaving ? 'SYNCING...' : scriptSaved ? 'SYNCED' : `${totalWords} WORDS · ${readTime(totalWords)}`}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-4">
                                                            {SCRIPT_SECTIONS.map(s => (
                                                                <ScriptSection 
                                                                    key={s.id} 
                                                                    section={s} 
                                                                    value={scriptSections[s.id as keyof ScriptSections]}
                                                                    onChange={v => {
                                                                        const newSections = { ...scriptSections, [s.id]: v }
                                                                        setScriptSections(newSections)
                                                                        triggerAutosave(newSections, brainstorm)
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Purge Content Idea?"
            message="This will permanently delete this concept and all associated data from the production pipeline."
            confirmText="Purge"
            type="danger"
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
            title="Remove Production Step?"
            message="This step will be removed from your content roadmap."
            confirmText="Remove"
            type="danger"
        />
        </>
    )
}

function MilestoneRow({ milestone: m, updateMilestone, deleteMilestone }: { 
    milestone: any, 
    updateMilestone: any, 
    deleteMilestone: any 
}) {
    const [isEditing, setIsEditing] = useState(false)
    const controls = useDragControls()

    return (
        <Reorder.Item
            value={m}
            dragListener={false}
            dragControls={controls}
            className="group flex flex-col gap-2 p-4 bg-black/[0.02] border border-black/5 rounded-2xl hover:bg-black/[0.04] transition-all"
        >
            <div className="flex items-center gap-3">
                <div onPointerDown={(e) => controls.start(e)} className="cursor-grab active:cursor-grabbing p-1.5 opacity-20 hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4" />
                </div>

                <button
                    onClick={() => updateMilestone(m.id, { status: m.status === 'completed' ? 'pending' : 'completed' })}
                    className={cn(
                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                        m.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white border-black/10"
                    )}
                >
                    {m.status === 'completed' && <CheckSquare className="w-3.5 h-3.5" />}
                </button>

                <div className="flex-1 min-w-0">
                    <input
                        value={m.title}
                        onChange={e => updateMilestone(m.id, { title: e.target.value })}
                        className={cn(
                            "w-full bg-transparent border-none p-0 text-[14px] font-bold focus:ring-0",
                            m.status === 'completed' ? "text-black/20 line-through" : "text-black"
                        )}
                    />
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1">
                        <Zap className={cn("w-3.5 h-3.5", m.status === 'completed' ? "text-black/10" : "text-amber-500 fill-amber-500")} />
                        <span className={cn("text-[11px] font-black", m.status === 'completed' ? "text-black/10" : "text-black/40")}>{m.impact_score || 5}</span>
                    </div>

                    <button
                        onClick={() => deleteMilestone(m.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-black/20 hover:text-red-500 transition-all"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 ml-12">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-black/5 rounded-lg relative">
                    <Calendar className="w-3 h-3 text-black/20" />
                    <input
                        type="date"
                        value={m.target_date?.split('T')[0] || ''}
                        onChange={e => updateMilestone(m.id, { target_date: e.target.value || null })}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span className="text-[9px] font-black text-black/40 uppercase">
                        {m.target_date ? new Date(m.target_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No Date'}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {(['super', 'high', 'mid', 'low'] as const).map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => updateMilestone(m.id, { priority: lvl })}
                            className={cn(
                                "w-2.5 h-2.5 rounded-full border transition-all",
                                m.priority === lvl ? PRIORITY_CONFIG[lvl].color : "bg-black/5 hover:bg-black/10"
                            )}
                        />
                    ))}
                </div>

                <select
                    value={m.category || 'rnd'}
                    onChange={e => updateMilestone(m.id, { category: e.target.value })}
                    className="bg-transparent border-none p-0 text-[9px] font-black uppercase tracking-widest text-black/30 focus:ring-0 cursor-pointer"
                >
                    {MILESTONE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </Reorder.Item>
    )
}
