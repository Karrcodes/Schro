'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Video, Calendar, CheckCircle2, Trash2, Plus, Zap, Rocket, Shield, 
    X, Hash, Clock, Link as LinkIcon, Globe, Edit3, Save, ExternalLink, 
    MapPin, Navigation, DollarSign, ChevronDown, ChevronRight, UploadCloud, 
    Loader2, MoreVertical, Archive, Layout, FileText, CheckSquare, GripVertical, Lightbulb
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
    super: { label: 'Super', bg: 'bg-purple-500 text-white', border: 'border-purple-300' },
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
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-2xl bg-white rounded-t-[32px] shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden font-outfit"
                    >
                        {/* Drag Handle */}
                        <div className="w-12 h-1 bg-black/10 rounded-full mx-auto mt-3 shrink-0" />

                        {/* Cover Section */}
                        <div className="relative w-full h-40 md:h-48 bg-black/5 shrink-0 overflow-hidden">
                            {!isClearingImage && (
                                <img
                                    src={coverSrc || `/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.category || '')}&type=content&id=${item.id}&w=1200&h=630`}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                            
                            {/* Stats/Labels on Cover */}
                            <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            {(editedData.platforms ?? item.platforms ?? []).map((p: Platform) => (
                                                <PlatformIcon key={p} platform={p} className="w-3.5 h-3.5 text-white/80" />
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                                            {editedData.category ?? item.category ?? 'Content'} • {editedData.type ?? item.type}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">{item.title}</h2>
                                </div>
                                
                                <button
                                    onClick={handleRegenerateCover}
                                    disabled={isGeneratingContent}
                                    className="px-4 py-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-white/30"
                                >
                                    {isGeneratingContent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-white" />}
                                    {isGeneratingContent ? 'Drawing...' : 'Regenerate'}
                                </button>
                            </div>

                            <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="px-8 pt-6 pb-2 border-b border-black/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1">
                                {(['details', 'script'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                            activeTab === tab ? "bg-black text-white shadow-lg" : "text-black/30 hover:bg-black/5"
                                        )}
                                    >
                                        {tab === 'details' ? 'Standard Protocol' : 'Creative Layer'}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {activeTab === 'script' && (
                                    <div className={cn("text-[9px] font-black px-3 py-1.5 rounded-lg border", scriptSaving ? "bg-blue-50 text-blue-600 border-blue-100" : scriptSaved ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-black/5 text-black/30 border-transparent")}>
                                        {scriptSaving ? 'SYNCING...' : scriptSaved ? 'SYNCED' : `${totalWords} WORDS`}
                                    </div>
                                )}
                                <button
                                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                        isEditing ? "bg-blue-600 text-white shadow-blue-500/20" : "bg-black/5 text-black/40 hover:text-black"
                                    )}
                                >
                                    {isEditing ? <CheckCircle2 className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            {activeTab === 'details' ? (
                                <div className="p-8 space-y-10">
                                    
                                    {/* Progress Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5 space-y-1">
                                            <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">Status</p>
                                            <select
                                                value={editedData.status ?? item.status}
                                                onChange={e => updateContent(item.id, { status: e.target.value as ContentStatus })}
                                                className="w-full bg-transparent border-none p-0 text-[13px] font-black text-blue-600 focus:ring-0 uppercase cursor-pointer"
                                            >
                                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5 space-y-1">
                                            <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">Priority</p>
                                            <select
                                                value={editedData.priority ?? item.priority}
                                                onChange={e => updateContent(item.id, { priority: e.target.value as PriorityLevel })}
                                                className="w-full bg-transparent border-none p-0 text-[13px] font-black text-black focus:ring-0 uppercase cursor-pointer"
                                            >
                                                {(Object.keys(PRIORITY_CONFIG) as PriorityLevel[]).map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5 space-y-1">
                                            <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">Deadline</p>
                                            <div className="relative h-5">
                                                <input
                                                    type="date"
                                                    value={(editedData.deadline ?? item.deadline ?? '').split('T')[0]}
                                                    onChange={e => updateContent(item.id, { deadline: e.target.value || null })}
                                                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                                />
                                                <p className="text-[13px] font-black text-black">
                                                    {(editedData.deadline ?? item.deadline) ? new Date((editedData.deadline ?? item.deadline!) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Set Date'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5 space-y-1">
                                            <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">Impact</p>
                                            <div className="flex items-center gap-1.5">
                                                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                <span className="text-[14px] font-black text-black">{item.impact_score}/10</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Milestones / Production Steps */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-black/30 flex items-center gap-2">
                                                <Layout className="w-4 h-4 text-blue-500" />
                                                Production Pipeline
                                            </h3>
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
                                            onReorder={(newOrder) => {
                                                // Logically reorder if weight implementation exists, 
                                                // for now we just show them.
                                            }}
                                            className="space-y-2"
                                        >
                                            {contentMilestones.map(m => (
                                                <MilestoneRow 
                                                    key={m.id} 
                                                    milestone={m} 
                                                    updateMilestone={updateMilestone}
                                                    deleteMilestone={deleteMilestone}
                                                />
                                            ))}
                                            {contentMilestones.length === 0 && (
                                                <div className="py-12 border-2 border-dashed border-black/5 rounded-3xl flex flex-col items-center justify-center gap-2">
                                                    <p className="text-[12px] font-bold text-black/20 uppercase">No production steps defined</p>
                                                </div>
                                            )}
                                        </Reorder.Group>
                                    </div>

                                    {/* Meta Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-black/5">
                                        {/* Linked Tasks */}
                                        <div className="space-y-4">
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-black/30 flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Operations Sync
                                            </h3>
                                            <div className="space-y-2">
                                                {linkedTasks.map(task => (
                                                    <div key={task.id} className="flex items-center gap-3 p-3 bg-black/[0.02] rounded-2xl border border-black/5">
                                                        <div className={cn("w-4 h-4 rounded border-2 shrink-0", task.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-black/20")}>
                                                            {task.is_completed && <CheckCircle2 className="w-3 h-3" />}
                                                        </div>
                                                        <span className={cn("text-[13px] font-bold flex-1 truncate", task.is_completed && "text-black/30 line-through")}>{task.title}</span>
                                                        {task.due_date && <span className="text-[10px] font-black text-black/30 uppercase">{new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                                                    </div>
                                                ))}
                                                {linkedTasks.length === 0 && <p className="text-[11px] text-black/20 italic">No linked tasks in operations</p>}
                                            </div>
                                        </div>

                                        {/* External Links */}
                                        <div className="space-y-4">
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-black/30 flex items-center gap-2">
                                                <LinkIcon className="w-4 h-4" />
                                                Assets & Links
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="relative group/link">
                                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                                    <input
                                                        placeholder="Add project URL..."
                                                        value={editedData.url ?? item.url ?? ''}
                                                        onChange={e => setEditedData(prev => ({ ...prev, url: e.target.value }))}
                                                        onBlur={handleSave}
                                                        className="w-full pl-11 pr-12 py-3 bg-black/[0.02] border border-black/5 rounded-2xl text-[13px] font-bold focus:bg-white focus:border-blue-100 transition-all outline-none"
                                                    />
                                                    {(editedData.url ?? item.url) && (
                                                        <a href={editedData.url ?? item.url ?? ''} target="_blank" className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-black/30 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-purple-500" />
                                            Content Architecture
                                        </h3>
                                        <div className="space-y-3">
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

                                    <div className="space-y-4 pt-6 border-t border-black/5">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-black/30 flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4 text-amber-500" />
                                            Brainstorming & Raw Notes
                                        </h3>
                                        <textarea
                                            value={brainstorm}
                                            onChange={e => {
                                                setBrainstorm(e.target.value)
                                                triggerAutosave(scriptSections, e.target.value)
                                            }}
                                            placeholder="Dump thoughts, research, links, and loose ideas here..."
                                            className="w-full min-h-[200px] p-6 bg-black/[0.02] border border-black/5 rounded-[32px] text-[15px] font-medium text-black/70 leading-relaxed focus:outline-none focus:bg-white focus:border-blue-100 transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Archive Footer (Mobile Safe) */}
                        {!item.is_archived && (
                            <div className="px-8 py-6 bg-black/[0.01] border-t border-black/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-black/30">Stable Release Layer</span>
                                </div>
                                <button
                                    onClick={() => updateContent(item.id, { is_archived: true })}
                                    className="px-6 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10 flex items-center gap-2"
                                >
                                    <Archive className="w-3.5 h-3.5" />
                                    Archive Item
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
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
                                m.priority === lvl ? PRIORITY_CONFIG[lvl].bg : "bg-black/5 hover:bg-black/10"
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
