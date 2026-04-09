'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Video, Calendar, CheckCircle2, Trash2, Plus, Zap, Rocket, Shield, RefreshCw,
    X, Hash, Clock, Link as LinkIcon, Globe, Edit3, Save, ExternalLink, 
    MapPin, Navigation, DollarSign, ChevronDown, ChevronRight, UploadCloud, 
    Loader2, MoreVertical, Archive, Layout, FileText, CheckSquare, GripVertical, Lightbulb,
    Pencil, Target, Wand2, AlignLeft, Circle, List, Sparkles
} from 'lucide-react'
import type { StudioContent, ContentStatus, Platform, ContentCategory, ContentScene, PriorityLevel } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'
import PlatformIcon from './PlatformIcon'
import DatePickerInput from '@/components/DatePickerInput'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'
import { supabase } from '@/lib/supabase'
import { Task } from '../../tasks/types/tasks.types'
import { Reorder, useDragControls } from 'framer-motion'
import { FramerSyncStatus } from './FramerSyncStatus'

interface ContentDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: StudioContent | null
    initialTab?: 'details' | 'script'
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

function NotepadEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const autoGrow = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }

    const insertBullet = () => {
        const textarea = textareaRef.current
        if (!textarea) return
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const isStartOfLine = start === 0 || value[start - 1] === '\n'
        const nextText = value.substring(0, start) + (isStartOfLine ? '• ' : '\n• ') + value.substring(end)
        onChange(nextText)
        setTimeout(() => {
            textarea.focus()
            const newPos = start + (isStartOfLine ? 2 : 3)
            textarea.setSelectionRange(newPos, newPos)
            autoGrow()
        }, 0)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const textarea = textareaRef.current
            if (!textarea) return
            const start = textarea.selectionStart
            const lines = value.substring(0, start).split('\n')
            const lastLine = lines[lines.length - 1]

            if (lastLine.startsWith('• ')) {
                if (lastLine === '• ') {
                    e.preventDefault()
                    onChange(value.substring(0, start - 2) + '\n' + value.substring(start))
                } else {
                    e.preventDefault()
                    onChange(value.substring(0, start) + '\n• ' + value.substring(start))
                    setTimeout(() => {
                        const newPos = start + 3
                        textarea.setSelectionRange(newPos, newPos)
                        autoGrow()
                    }, 0)
                }
            }
        }
    }

    return (
        <div className="bg-black/[0.01] border border-black/[0.03] rounded-[32px] overflow-hidden flex flex-col min-h-[400px]">
            <div className="flex items-center gap-2 px-6 py-3 border-b border-black/[0.03] bg-white/50">
                <button onClick={insertBullet} title="Bullet Point" className="p-2 rounded-xl text-black/30 hover:text-black hover:bg-black/5 transition-all">
                    <List className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-black/5 mx-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-black/20">Freeflow Notepad Mode</span>
            </div>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={e => { onChange(e.target.value); autoGrow() }}
                onKeyDown={handleKeyDown}
                onInput={autoGrow}
                placeholder="Start writing the full vision here... use bullets for structure."
                autoFocus
                className="flex-1 p-8 text-[15px] font-medium text-black/70 leading-relaxed bg-transparent border-none outline-none placeholder:text-black/10 resize-none min-h-[350px]"
            />
        </div>
    )
}

export default function ContentDetailModal({ isOpen, onClose, item, initialTab }: ContentDetailModalProps) {
    const { refresh, updateContent, deleteContent, projects, milestones, addMilestone, updateMilestone, deleteMilestone, regenerateContentCover, generatingContentIds, stageItem, press } = useStudio()
    const [activeTab, setActiveTab] = useState<'details' | 'script'>(initialTab || 'details')
    const [isEditing, setIsEditing] = useState(false)
    const [isClearingImage, setIsClearingImage] = useState(false)
    const isGeneratingContent = item ? generatingContentIds.includes(item.id) : false
    const [editedData, setEditedData] = useState<Partial<StudioContent>>({})
    const [newScene, setNewScene] = useState<Partial<ContentScene>>({ type: 'public' })
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [coverPreview, setCoverPreview] = useState<string>('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Script state
    const [scriptSections, setScriptSections] = useState<ScriptSections>({ hook: '', intro: '', body: '', cta: '', outro: '' })
    const [brainstorm, setBrainstorm] = useState('')
    const [scriptSaving, setScriptSaving] = useState(false)
    const [scriptSaved, setScriptSaved] = useState(false)
    const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevItemId = useRef<string | null>(null)
    const [scriptMode, setScriptMode] = useState<'structured' | 'notepad'>('notepad')
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
                setActiveTab(initialTab || 'details')
                setScriptSections(parseScript(item.script))
                setBrainstorm(item.notes || '')
                setCoverFile(null)
                setCoverPreview('')
                setNewMilestoneTitle('')
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

    const handleAddMilestone = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMilestoneTitle.trim()) return

        try {
            await addMilestone({
                title: newMilestoneTitle.trim(),
                status: 'pending',
                content_id: item.id,
                project_id: item.project_id || undefined
            } as any)
            setNewMilestoneTitle('')
        } catch (err: any) {
            console.error('Failed to add milestone', err)
        }
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
    const completedCount = contentMilestones.filter(m => m.status === 'completed').length
    const progress = contentMilestones.length > 0 ? (completedCount / contentMilestones.length) * 100 : 0
    const totalWords = Object.values(scriptSections).reduce((s, t) => s + wordCount(t), 0)
    const coverSrc = coverPreview || editedData.cover_url || item.cover_url

    const milestonesSection = (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-black uppercase tracking-widest text-black/30">Production Pipeline</h3>
            </div>

            <Reorder.Group
                axis="y"
                values={contentMilestones}
                onReorder={() => {}}
                className="space-y-4"
            >
                {contentMilestones.map(m => (
                    <MilestoneRow 
                        key={m.id} 
                        milestone={m} 
                        updateMilestone={updateMilestone}
                        setMilestoneToDelete={setMilestoneToDelete}
                        isEditing={isEditing}
                    />
                ))}
            </Reorder.Group>

            {/* New Milestone Form */}
            {isEditing && (
                <form onSubmit={handleAddMilestone} className="relative group/new p-5 bg-black/[0.01] border-2 border-dashed border-black/[0.1] rounded-[24px] hover:border-black/30 transition-all mt-4">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-black/20 group-hover/new:bg-black group-hover/new:text-white transition-all">
                            <Plus className="w-5 h-5" />
                        </div>
                        <input
                            value={newMilestoneTitle}
                            onChange={e => setNewMilestoneTitle(e.target.value)}
                            placeholder="Define next production step..."
                            className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-black placeholder:text-black/10 focus:ring-0 p-0"
                        />
                        <button
                            type="submit"
                            disabled={!newMilestoneTitle.trim()}
                            className={cn(
                                "px-5 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                !newMilestoneTitle.trim() ? "opacity-0 scale-90" : "opacity-100 scale-100"
                            )}
                        >
                            Add Step
                        </button>
                    </div>
                </form>
            )}
        </div>
    )

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
                        {/* Command Center: Absolute to Modal Sheet, Far Right */}
                        <div className="absolute top-8 right-8 md:top-10 md:right-12 flex items-center gap-3 z-50">
                            {!isEditing && (
                                <button
                                    onClick={() => {
                                        setEditedData(item)
                                        setIsEditing(true)
                                        setActiveTab('details')
                                    }}
                                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black text-white rounded-full transition-all active:scale-90 shadow-xl shadow-black/10 hover:scale-110 group"
                                    title="Edit Content"
                                >
                                    <Pencil className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </button>
                             )}
                             <button
                                onClick={() => {
                                    const nextTab = activeTab === 'script' ? 'details' : 'script'
                                    setActiveTab(nextTab)
                                    if (nextTab === 'script') setIsEditing(false)
                                }}
                                className={cn(
                                    "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full transition-all active:scale-90 shadow-xl hover:scale-110 group",
                                    activeTab === 'script' ? "bg-purple-600 text-white shadow-purple-500/20" : "bg-white text-black border border-black/5"
                                )}
                                title="Creative Layer"
                            >
                                <Sparkles className={cn("w-4 h-4 md:w-5 md:h-5", activeTab === 'script' ? "text-white" : "text-purple-600")} />
                            </button>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black/[0.03] hover:bg-black/[0.1] rounded-full transition-all active:scale-90 border border-black/5 group"
                                title="Close Portal"
                            >
                                <X className="w-4 h-4 md:w-5 md:h-5 text-black/40 group-hover:text-black transition-colors" />
                            </button>
                        </div>

                        {/* Handle */}
                        <div className="flex justify-center p-4">
                            <div className="w-12 h-1.5 bg-black/10 rounded-full" />
                        </div>

                        <div className="max-w-4xl mx-auto px-6 md:px-8 pb-20 pt-8">
                            {activeTab === 'script' ? (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {/* Header in Script Mode */}
                                    <div className="flex items-start gap-8 border-b border-black/5 pb-10">
                                        <div className="relative w-32 h-32 shrink-0 rounded-[20px] overflow-hidden border border-black/5 shadow-xl">
                                             <img
                                                src={item?.cover_url || coverPreview || `/api/studio/cover?title=${encodeURIComponent(item?.title || '')}&tagline=${encodeURIComponent(item?.category || '')}&type=content&id=${item?.id}&w=1200&h=630`}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-4 pt-2">
                                            <div className="flex items-center gap-3 mb-1">
                                                {item.category && (
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                        item.category === 'Thoughts' && "bg-blue-50 text-blue-600",
                                                        item.category === 'Concept' && "bg-emerald-50 text-emerald-600",
                                                        item.category === 'Vlog' && "bg-purple-50 text-purple-600",
                                                        item.category === 'Showcase' && "bg-rose-50 text-rose-600",
                                                        item.category === 'Update' && "bg-amber-50 text-amber-600",
                                                        !['Thoughts', 'Concept', 'Vlog', 'Showcase', 'Update'].includes(item.category as any) && "bg-black/5 text-black/50"
                                                    )}>
                                                        {item.category}
                                                    </div>
                                                )}
                                                <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", PRIORITY_CONFIG[item.priority || 'low'].color)}>
                                                    {item.priority || 'Low'}
                                                </div>
                                                {item.impact_score && (
                                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/5 rounded-md border border-orange-500/5">
                                                        <Zap className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                                                        <span className="text-[10px] font-black text-orange-600">{item.impact_score}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <h1 className="text-[28px] font-black tracking-tight text-black leading-tight">{item.title}</h1>
                                        </div>
                                    </div>

                                    {/* Scripting Content */}
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl w-fit">
                                                {(['notepad', 'structured'] as const).map(mode => (
                                                    <button
                                                        key={mode}
                                                        onClick={() => {
                                                            if (mode === 'notepad' && scriptMode === 'structured') {
                                                                const merged = Object.values(scriptSections).filter(v => v.trim()).join('\n\n')
                                                                setScriptSections({ hook: '', intro: '', body: merged, cta: '', outro: '' })
                                                                triggerAutosave({ hook: '', intro: '', body: merged, cta: '', outro: '' }, brainstorm)
                                                            }
                                                            setScriptMode(mode)
                                                        }}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                                            scriptMode === mode ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/60"
                                                        )}
                                                    >
                                                        {mode === 'structured' ? <Layout className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className={cn("text-[10px] font-black px-4 py-2 rounded-xl border", scriptSaving ? "bg-blue-50 text-blue-600 border-blue-100" : scriptSaved ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-black/5 text-black/30 border-transparent")}>
                                                {scriptSaving ? 'SYNCING...' : scriptSaved ? 'SYNCED' : `${totalWords} WORDS · ${readTime(totalWords)}`}
                                            </div>
                                        </div>
                                        
                                        {scriptMode === 'structured' ? (
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
                                        ) : (
                                            <div className="space-y-4">
                                                <NotepadEditor 
                                                    value={scriptSections.body} 
                                                    onChange={(v) => {
                                                        const newSections = { hook: '', intro: '', body: v, cta: '', outro: '' }
                                                        setScriptSections(newSections)
                                                        triggerAutosave(newSections, brainstorm)
                                                    }} 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
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
                                                        {isGeneratingContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-6 py-3 bg-white text-black rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"
                                                >
                                                    <UploadCloud className="w-4 h-4" />
                                                    Replace
                                                </button>
                                            </div>
                                            {isGeneratingContent && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm gap-2 rounded-[24px]">
                                                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Generating...</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Framer Sync Status */}
                                        <FramerSyncStatus
                                            itemId={item.id}
                                            itemType="content"
                                            framerCmsId={item.framer_cms_id || (item.status === 'published' ? 'published' : undefined)}
                                            isStaged={item.is_staged}
                                            collectionName="Media"
                                            onStage={item.status === 'published' ? undefined : async (staged) => {
                                                await stageItem(item.id, 'content', staged)
                                                await refresh()
                                            }}
                                            onStatusChange={() => {
                                                refresh()
                                            }}
                                            className="p-6 bg-black/[0.02] rounded-3xl border border-black/5"
                                        />

                                        {/* Linked Press Appearance */}
                                        {item.press_ids && item.press_ids.length > 0 && (
                                            <div className="p-6 bg-black/[0.015] border border-black/[0.03] rounded-3xl space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-black/30">Linked Media ({item.press_ids.length})</span>
                                                    <Globe className="w-3.5 h-3.5 text-black/20" />
                                                </div>
                                                <div className="space-y-3">
                                                    {item.press_ids.map(id => {
                                                        const p = press.find(pr => pr.id === id)
                                                        if (!p) return null
                                                        return (
                                                            <div key={id} className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-black/5 shrink-0 bg-black/5">
                                                                    {p.cover_url && (
                                                                        <img 
                                                                            src={p.cover_url} 
                                                                            className="w-full h-full object-cover"
                                                                            alt="Press Link"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[11px] font-black text-black leading-tight truncate">
                                                                        {p.title}
                                                                    </p>
                                                                    <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest mt-0.5 truncate">
                                                                        {p.organization}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-6 bg-black/[0.02] rounded-3xl border border-black/5 space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Content Progress</span>
                                                    <span className="text-[14px] font-black text-black">{Math.round(progress)}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        className="h-full bg-black shadow-lg"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-black text-black/20 uppercase">Milestones</span>
                                                    <span className="text-[16px] font-black text-black">{completedCount}/{contentMilestones.length}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-black text-black/20 uppercase">Status</span>
                                                    <span className={cn("text-[14px] font-black uppercase tracking-tight", progress === 100 ? "text-emerald-500" : "text-black")}>
                                                        {progress === 100 ? 'Published' : item.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4">
                                            <button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="w-full py-4 border border-rose-500/10 bg-rose-500/5 text-rose-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-rose-500/5"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 inline mr-2" />
                                                Archive Content
                                            </button>
                                        </div>
                                    </div>

                                {/* Right Column: Content & Controls */}
                                <div className="md:col-span-2 space-y-12 self-start">
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

                                            <div className="pt-4 border-t border-black/5">
                                                {milestonesSection}
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

                                            {/* Published Link Input - Automatic when published */}
                                            {((editedData.status || item.status) === 'published') && (
                                                <div className="space-y-3 pt-4 border-t border-black/5 animate-in slide-in-from-top-4 duration-300">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Globe className="w-3.5 h-3.5 text-emerald-500" />
                                                        <label className="text-[9px] font-black text-black/30 uppercase tracking-widest">Published URL (YouTube/TikTok/etc)</label>
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            value={editedData.url || item.url || ''}
                                                            onChange={e => setEditedData(prev => ({ ...prev, url: e.target.value }))}
                                                            placeholder="https://..."
                                                            className="w-full px-4 py-4 bg-black/[0.03] border border-black/5 rounded-2xl text-[13px] font-black placeholder:text-black/10 focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500/30 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}

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

                                            {/* Cover Asset */}
                                            <div className="space-y-3 pt-4 border-t border-black/5">
                                                <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Cover Asset</label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="flex-1 px-5 py-4 rounded-2xl border border-dashed border-black/15 bg-black/[0.01] hover:bg-black/[0.05] hover:border-black/30 transition-all cursor-pointer flex items-center justify-center gap-2 text-[12px] font-bold text-black/50"
                                                    >
                                                        <UploadCloud className="w-4 h-4" />
                                                        <span>{coverPreview ? 'Change high-res cover' : 'Upload high-res cover'}</span>
                                                    </button>
                                                    {coverPreview && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setCoverFile(null); setCoverPreview('') }}
                                                            className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-center text-black/20 font-medium tracking-tight">Real-time cover replacement is also available via hover in View mode.</p>
                                            </div>

                                            {/* Timeline Setup */}
                                            <div className="space-y-3 pt-4 border-t border-black/5">
                                                <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Final Deployment Deadline</label>
                                                <DatePickerInput
                                                    value={(editedData.deadline ?? item.deadline ?? '').split('T')[0]}
                                                    onChange={val => setEditedData(prev => ({ ...prev, deadline: val }))}
                                                />
                                            </div>

                                            {/* Press Selection Row */}
                                            <div className="space-y-3 pt-4 border-t border-black/5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Associated Press / Recognition</label>
                                                    <span className="text-[8px] font-black text-black/20 uppercase tracking-widest">Multi-Link Enabled</span>
                                                </div>
                                                
                                                {/* Selected Press Tags */}
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {(editedData.press_ids || item.press_ids || []).map(id => {
                                                        const p = press.find(pr => pr.id === id)
                                                        if (!p) return null
                                                        return (
                                                            <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-black/[0.03] border border-black/5 rounded-xl">
                                                                <span className="text-[10px] font-bold text-black/60">{p.organization}: {p.title}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        const current = editedData.press_ids || item.press_ids || []
                                                                        setEditedData(prev => ({ ...prev, press_ids: current.filter(x => x !== id) }))
                                                                    }}
                                                                    className="p-1 hover:bg-black/5 rounded-md transition-colors"
                                                                >
                                                                    <X className="w-3 h-3 text-black/40" />
                                                                </button>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                <select
                                                    value=""
                                                    onChange={e => {
                                                        if (!e.target.value) return
                                                        const current = editedData.press_ids || item.press_ids || []
                                                        if (current.includes(e.target.value)) return
                                                        setEditedData(prev => ({ ...prev, press_ids: [...current, e.target.value] }))
                                                    }}
                                                    className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 appearance-none cursor-pointer"
                                                >
                                                    <option value="">Add Press Item...</option>
                                                    {press
                                                        .filter(pr => !(editedData.press_ids || item.press_ids || []).includes(pr.id))
                                                        .map(pr => (
                                                            <option key={pr.id} value={pr.id}>
                                                                {pr.organization}: {pr.title}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Impact Score Control */}
                                            <div className="p-6 bg-black/[0.03] border border-black/5 rounded-[24px] space-y-4 mt-6">
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
                                                    Save Changes
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
                                                        {item.category && (
                                                            <div className={cn(
                                                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                                item.category === 'Thoughts' && "bg-blue-50 text-blue-600",
                                                                item.category === 'Concept' && "bg-emerald-50 text-emerald-600",
                                                                item.category === 'Vlog' && "bg-purple-50 text-purple-600",
                                                                item.category === 'Showcase' && "bg-rose-50 text-rose-600",
                                                                item.category === 'Update' && "bg-amber-50 text-amber-600",
                                                                !['Thoughts', 'Concept', 'Vlog', 'Showcase', 'Update'].includes(item.category as any) && "bg-black/5 text-black/50"
                                                            )}>
                                                                {item.category}
                                                            </div>
                                                        )}
                                                        <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", PRIORITY_CONFIG[item.priority || 'low'].color)}>
                                                            {item.priority || 'Priority Unset'}
                                                        </div>
                                                        {item.impact_score && (
                                                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/5 rounded-md border border-orange-500/5 mb-0.5">
                                                                <Zap className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                                                                <span className="text-[10px] font-black text-orange-600">{item.impact_score}</span>
                                                            </div>
                                                        )}

                                                        {item.deadline && (
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-black/40 uppercase tracking-widest">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h1 className="text-[32px] md:text-[42px] font-black tracking-tight text-black leading-none">{item.title}</h1>
                                                    {item.category && <p className="text-[14px] md:text-[16px] font-medium text-black/40 uppercase tracking-[0.2em]">{item.category}</p>}
                                                    
                                                    {item.url && (
                                                        <div className="pt-4 flex items-center gap-3">
                                                            <a
                                                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-lg shadow-emerald-500/5 group/link"
                                                            >
                                                                <Globe className="w-4 h-4" />
                                                                Published Content
                                                                <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tab Selection */}
                                                {activeTab === 'details' && (
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
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                        {/* Production Pipeline - View Mode Only */}
                                        {!isEditing && (
                                            <div className="space-y-6 pt-12 border-t border-black/5">
                                                {milestonesSection}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
        <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) { 
                    if (isEditing) {
                        setCoverFile(file)
                        setCoverPreview(URL.createObjectURL(file)) 
                    } else {
                        // Immediate update in view mode
                        setIsClearingImage(true)
                        try {
                            const fileExt = file.name.split('.').pop()
                            const fileName = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`
                            const { error: uploadError } = await supabase.storage.from('studio-assets').upload(`content-covers/${fileName}`, file)
                            if (!uploadError) {
                                const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(`content-covers/${fileName}`)
                                await updateContent(item.id, { cover_url: urlData.publicUrl })
                            } else {
                                throw uploadError
                            }
                        } catch (err: any) {
                            alert(`Failed to update cover: ${err.message}`)
                        } finally {
                            setIsClearingImage(false)
                        }
                    }
                }
            }} 
        />
    </>
    )
}

function MilestoneRow({ milestone: m, updateMilestone, setMilestoneToDelete, isEditing }: { 
    milestone: any, 
    updateMilestone: any, 
    setMilestoneToDelete: any,
    isEditing: boolean
}) {
    const controls = useDragControls()

    return (
        <Reorder.Item
            value={m}
            dragListener={false}
            dragControls={controls}
            className={cn(
                "w-full flex flex-col gap-3 p-5 rounded-[24px] border transition-all group relative",
                m.status === 'completed'
                    ? "bg-emerald-50 border-emerald-100 opacity-60 shadow-sm shadow-emerald-500/5"
                    : "bg-white border-black/5 hover:border-black/20 hover:shadow-xl hover:shadow-black/5"
            )}
        >
            <div className="flex items-center gap-4">
                {/* Drag handle */}
                {isEditing && (
                    <div onPointerDown={(e) => controls.start(e)} className="cursor-grab active:cursor-grabbing p-1.5 opacity-20 hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4" />
                    </div>
                )}

                <button
                    onClick={() => updateMilestone(m.id, { status: m.status === 'completed' ? 'pending' : 'completed' })}
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0",
                        m.status === 'completed' ? "bg-emerald-500 text-white" : "bg-black/5 text-black/20 group-hover:bg-black group-hover:text-white"
                    )}
                >
                    {m.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={m.title}
                        onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                        className={cn(
                            "w-full bg-transparent border-none outline-none text-[15px] font-bold p-0 focus:ring-0",
                            m.status === 'completed' && "line-through text-emerald-900/40"
                        )}
                        placeholder="Milestone title..."
                        readOnly={!isEditing}
                    />
                </div>
                {isEditing && (
                    <button
                        onClick={() => setMilestoneToDelete(m.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 text-black/10 hover:text-red-500 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="flex flex-nowrap items-center gap-4 pl-8 border-t border-black/5 pt-3 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase text-black/20 whitespace-nowrap">Impact Score</span>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={m.impact_score || 5}
                            onChange={(e) => updateMilestone(m.id, { impact_score: parseInt(e.target.value) })}
                            className="w-20 h-0.5 bg-black/5 rounded-full appearance-none accent-black/40"
                        />
                        <span className="text-[10px] font-black text-black/40 w-4 text-center">{m.impact_score || 5}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-black/10" />
                        <DatePickerInput
                            className="scale-75 origin-left"
                            value={m.target_date?.split('T')[0] || ''}
                            onChange={val => updateMilestone(m.id, { target_date: val || null })}
                        />
                    </div>

                    <select
                        value={m.category || 'rnd'}
                        onChange={e => updateMilestone(m.id, { category: e.target.value })}
                        className="bg-transparent border-none p-0 text-[10px] font-black uppercase text-black/30 tracking-widest focus:ring-0 cursor-pointer"
                    >
                        {MILESTONE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    
                    {m.linked_task_id && (
                        <div className="flex items-center gap-1.5 ml-auto text-emerald-600">
                            <LinkIcon className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Synced to Tasks</span>
                        </div>
                    )}
                </div>
            )}
        </Reorder.Item>
    )
}
