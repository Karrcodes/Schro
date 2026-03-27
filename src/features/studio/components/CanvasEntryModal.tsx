'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Pin, Trash2, ArrowUpRight, Tag, Archive, Image as ImageIcon, List, Loader2, Plus, Rocket, Video, Link2, Zap } from 'lucide-react'
import { useStudioContext } from '../context/StudioContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'
import type { StudioCanvasEntry, CanvasColor } from '../types/studio.types'

const COLOR_MAP: Record<CanvasColor, { bg: string; dot: string }> = {
    default: { bg: 'bg-white', dot: 'bg-black/20' },
    yellow: { bg: 'bg-amber-50', dot: 'bg-amber-400' },
    blue: { bg: 'bg-blue-50', dot: 'bg-blue-400' },
    green: { bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
    purple: { bg: 'bg-purple-50', dot: 'bg-purple-400' },
    red: { bg: 'bg-rose-50', dot: 'bg-rose-400' },
}
const COLORS: CanvasColor[] = ['default', 'yellow', 'blue', 'green', 'purple', 'red']

interface Props {
    entry: StudioCanvasEntry | null
    isOpen: boolean
    onClose: () => void
    onUpdate: (id: string, updates: Partial<StudioCanvasEntry>) => void
    onDelete: (id: string) => void
    onArchive: (id: string) => void
    connections?: {
        notes: number
        projects: { id: string; title: string }[]
        content: { id: string; title: string }[]
    }
    onAddLink: (fromId: string, toId: string) => void
    onRemoveLink: (entryId: string, targetId: string) => void
    allTags?: string[]
    onTweet?: (id: string, title: string) => void
}

export default function CanvasEntryModal({
    entry, isOpen, onClose, onUpdate, onDelete, onArchive,
    connections, onAddLink, onRemoveLink, allTags = [], onTweet
}: Props) {
    const { projects, content } = useStudioContext()
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [tagInput, setTagInput] = useState('')
    const [tags, setTags] = useState<string[]>([])
    const [color, setColor] = useState<CanvasColor>('default')
    const [pinned, setPinned] = useState(false)
    const [images, setImages] = useState<string[]>([])
    const [isDirty, setIsDirty] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
    const [showAddLink, setShowAddLink] = useState(false)
    const [linkTab, setLinkTab] = useState<'project' | 'content'>('project')
    const bodyRef = useRef<HTMLTextAreaElement>(null)
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (entry) {
            setTitle(entry.title)
            setBody(entry.body || '')
            setTags(entry.tags || [])
            setColor(entry.color)
            setPinned(entry.pinned)
            setImages(entry.images || [])
            setIsDirty(false)
        }
    }, [entry])

    // Auto-save after 800ms of inactivity
    useEffect(() => {
        if (!isDirty || !entry) return
        if (saveTimeout.current) clearTimeout(saveTimeout.current)
        saveTimeout.current = setTimeout(() => {
            onUpdate(entry.id, { title, body: body || undefined, tags, color, pinned, images })
            setIsDirty(false)
        }, 800)
        return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current) }
    }, [title, body, tags, color, pinned, images, isDirty, entry, onUpdate])

    const change = (fn: () => void) => { fn(); setIsDirty(true) }

    const addTag = () => {
        const trimmed = tagInput.trim().toLowerCase()
        if (trimmed && !tags.includes(trimmed)) change(() => setTags(t => [...t, trimmed]))
        setTagInput('')
    }

    const removeTag = (tag: string) => {
        if (tag === 'tweeted') return
        change(() => setTags(t => t.filter(x => x !== tag)))
    }

    const suggestedTags = (allTags || [])
        .filter(tag => !tags.includes(tag))
        .slice(0, 10) // Limit suggestions

    const autoGrow = () => {
        if (bodyRef.current) {
            bodyRef.current.style.height = 'auto'
            bodyRef.current.style.height = `${bodyRef.current.scrollHeight}px`
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !entry) return

        setIsUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `canvas_${entry.id}_${Date.now()}.${fileExt}`
            const filePath = `canvas-images/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('studio-assets')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(filePath)
            const publicUrl = urlData.publicUrl

            change(() => setImages(prev => [...prev, publicUrl]))
        } catch (err) {
            console.error('Upload failed:', err)
            alert('Failed to upload image to storage')
        } finally {
            setIsUploading(false)
        }
    }

    const removeImage = (index: number) => change(() => setImages(prev => prev.filter((_, i) => i !== index)))

    const insertBullet = () => {
        const textarea = bodyRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const prefix = body.substring(0, start)
        const suffix = body.substring(end)

        // If we are at the start of a line, or middle of a line, insert "• "
        const isStartOfLine = start === 0 || body[start - 1] === '\n'
        const newText = prefix + (isStartOfLine ? '• ' : '\n• ') + suffix

        change(() => setBody(newText))
        setTimeout(() => {
            textarea.focus()
            const newPos = start + (isStartOfLine ? 2 : 3)
            textarea.setSelectionRange(newPos, newPos)
            autoGrow()
        }, 0)
    }

    const handleBodyKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const textarea = bodyRef.current
            if (!textarea) return
            const start = textarea.selectionStart
            const lines = body.substring(0, start).split('\n')
            const lastLine = lines[lines.length - 1]

            if (lastLine.startsWith('• ')) {
                if (lastLine === '• ') {
                    // Backspace the empty bullet if they hit enter again
                    e.preventDefault()
                    const newBody = body.substring(0, start - 2) + '\n' + body.substring(start)
                    change(() => setBody(newBody))
                } else {
                    // Auto-continue bullet
                    e.preventDefault()
                    const newBody = body.substring(0, start) + '\n• ' + body.substring(start)
                    change(() => setBody(newBody))
                    setTimeout(() => {
                        const newPos = start + 3
                        textarea.setSelectionRange(newPos, newPos)
                        autoGrow()
                    }, 0)
                }
            }
        }
    }

    if (!isOpen || !entry) return null
    const { bg } = COLOR_MAP[color] || COLOR_MAP.default

    return (
        <>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                <div
                    className={cn(
                        "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-black/[0.08] flex flex-col",
                        bg
                    )}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-0 shrink-0">
                        <div className="flex items-center gap-2">
                            {/* Color picker */}
                            <div className="flex items-center gap-1.5">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => change(() => setColor(color === c ? 'default' : c))}
                                        className={cn(
                                            "w-4 h-4 rounded-full transition-all hover:scale-110",
                                            COLOR_MAP[c].dot,
                                            color === c ? 'ring-2 ring-black/20 ring-offset-1' : ''
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Pin */}
                            <button
                                onClick={() => change(() => setPinned(p => !p))}
                                className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                                    pinned ? 'bg-black/10 text-black' : 'text-black/30 hover:text-black/60 hover:bg-black/[0.04]'
                                )}
                            >
                                <Pin className={cn("w-4 h-4", pinned && "fill-current")} />
                            </button>
                            {/* Independent / Promote */}
                            {entry.is_independent && (
                                <button
                                    onClick={() => onUpdate(entry.id, { is_independent: false })}
                                    className="px-3 h-8 bg-indigo-500 text-white rounded-xl flex items-center gap-1.5 transition-all hover:bg-indigo-600 hover:-translate-y-0.5 shadow-lg shadow-indigo-100 font-black text-[9px] uppercase tracking-wider"
                                    title="Make this a permanent note"
                                >
                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                    Promote to Note
                                </button>
                            )}
                            {/* Tweet */}
                            {onTweet && (
                                <button
                                    onClick={() => onTweet(entry.id, title)}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-black/30 hover:text-blue-500 hover:bg-blue-50 transition-all"
                                    title="Tweet title"
                                >
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                </button>
                            )}
                            {/* Archive */}
                            <button
                                onClick={() => setShowArchiveConfirm(true)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-black/30 hover:text-amber-500 hover:bg-amber-50 transition-all"
                                title="Archive idea"
                            >
                                <Archive className="w-4 h-4" />
                            </button>
                            {/* Delete */}
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-black/30 hover:text-red-500 hover:bg-red-50 transition-all"
                                title="Delete idea"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-black/30 hover:text-black/60 hover:bg-black/[0.04] transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-4 px-6 py-5">
                        {/* Title */}
                        <input
                            value={title}
                            onChange={e => change(() => setTitle(e.target.value))}
                            placeholder="Idea title..."
                            className="text-[22px] font-bold text-black bg-transparent border-none outline-none placeholder:text-black/20 w-full"
                        />

                        {/* Toolbar */}
                        <div className="flex items-center gap-2 border-y border-black/[0.04] py-1">
                            <button
                                onClick={insertBullet}
                                className="p-1.5 rounded-lg text-black/40 hover:text-black hover:bg-black/[0.05] transition-all"
                                title="Bullet point"
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <label className="p-1.5 rounded-lg text-black/40 hover:text-black hover:bg-black/[0.05] transition-all cursor-pointer">
                                <ImageIcon className="w-4 h-4" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                            {isUploading && <Loader2 className="w-3.5 h-3.5 text-black/20 animate-spin" />}
                        </div>

                        {/* Body */}
                        <textarea
                            ref={bodyRef}
                            value={body}
                            onChange={e => { change(() => setBody(e.target.value)); autoGrow() }}
                            onKeyDown={handleBodyKeyDown}
                            onInput={autoGrow}
                            placeholder="Write your thoughts here... start a line with * for bullets"
                            rows={4}
                            className="text-[14px] text-black/70 leading-relaxed bg-transparent border-none outline-none placeholder:text-black/20 w-full resize-none min-h-[120px]"
                        />

                        {/* Images Grid */}
                        {images.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
                                {images.map((url, i) => (
                                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-black/[0.08] bg-black/[0.02]">
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeImage(i)}
                                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Semantic Links Section */}
                        <div className="border-t border-black/[0.06] pt-4 mt-2">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-3.5 h-3.5 text-black/40" />
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-black/50">Semantic Links</h4>
                                </div>
                                <button
                                    onClick={() => setShowAddLink(!showAddLink)}
                                    className="p-1 rounded-lg hover:bg-black/[0.05] text-indigo-500 transition-all font-bold text-[10px] flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    ADD LINK
                                </button>
                            </div>

                            {/* Projects and Content Links */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {connections?.projects.map(p => (
                                    <div key={p.id} className="flex items-center gap-2 py-1.5 px-3 bg-black/[0.03] border border-black/[0.04] rounded-xl group animate-in zoom-in-95 duration-200">
                                        <Rocket className="w-3 h-3 text-orange-500" />
                                        <span className="text-[11px] font-bold text-black/70">{p.title}</span>
                                        <button
                                            onClick={() => onRemoveLink(entry.id, p.id)}
                                            className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all text-black/20"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                ))}
                                {connections?.content.map(c => (
                                    <div key={c.id} className="flex items-center gap-2 py-1.5 px-3 bg-black/[0.03] border border-black/[0.04] rounded-xl group animate-in zoom-in-95 duration-200">
                                        <Video className="w-3 h-3 text-blue-500" />
                                        <span className="text-[11px] font-bold text-black/70">{c.title}</span>
                                        <button
                                            onClick={() => onRemoveLink(entry.id, c.id)}
                                            className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all text-black/20"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {showAddLink && (
                                <div className="p-3 bg-black/[0.03] rounded-2xl border border-black/[0.04] animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex bg-black/[0.05] p-1 rounded-xl mb-3">
                                        {(['project', 'content'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setLinkTab(tab)}
                                                className={cn(
                                                    "flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                    linkTab === tab ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                                )}
                                            >
                                                {tab}s
                                            </button>
                                        ))}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                        {linkTab === 'project' ? (
                                            projects
                                                .filter(p => !connections?.projects.some(l => l.id === p.id))
                                                .map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => { onAddLink(entry.id, p.id); setShowAddLink(false) }}
                                                        className="w-full text-left py-2 px-3 hover:bg-white rounded-xl transition-all flex items-center gap-2 group"
                                                    >
                                                        <Rocket className="w-3 h-3 text-orange-400 opacity-50 group-hover:opacity-100" />
                                                        <span className="text-[11px] font-bold text-black/60 group-hover:text-black">{p.title}</span>
                                                    </button>
                                                ))
                                        ) : (
                                            content
                                                .filter(c => !connections?.content.some(l => l.id === c.id))
                                                .map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => { onAddLink(entry.id, c.id); setShowAddLink(false) }}
                                                        className="w-full text-left py-2 px-3 hover:bg-white rounded-xl transition-all flex items-center gap-2 group"
                                                    >
                                                        <Video className="w-3 h-3 text-blue-400 opacity-50 group-hover:opacity-100" />
                                                        <span className="text-[11px] font-bold text-black/60 group-hover:text-black">{c.title}</span>
                                                    </button>
                                                ))
                                        )}
                                        {((linkTab === 'project' && projects.filter(p => !connections?.projects.some(l => l.id === p.id)).length === 0) ||
                                            (linkTab === 'content' && content.filter(c => !connections?.content.some(l => l.id === c.id)).length === 0)) && (
                                                <p className="text-[10px] text-black/20 text-center py-2 italic">Nothing more to link</p>
                                            )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        <div className="border-t border-black/[0.06] pt-4">
                            {suggestedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3 px-1">
                                    <span className="text-[9px] font-black uppercase tracking-tighter text-black/25 w-full mb-1">Quick Select</span>
                                    {suggestedTags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                const trimmed = tag.trim().toLowerCase()
                                                if (trimmed && !tags.includes(trimmed)) change(() => setTags(t => [...t, trimmed]))
                                            }}
                                            className="text-[10px] font-bold text-black/40 bg-black/[0.03] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 border border-transparent px-2 py-0.5 rounded-lg transition-all"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Tag className="w-3.5 h-3.5 text-black/25 shrink-0" />
                                {tags.map(tag => {
                                    const isTweeted = tag === 'tweeted';
                                    return (
                                        <span 
                                            key={tag} 
                                            className={cn(
                                                "flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all",
                                                isTweeted 
                                                    ? "bg-black text-white border-black shadow-lg shadow-black/10" 
                                                    : "text-black/50 bg-black/[0.05] border-black/[0.03]"
                                            )}
                                        >
                                            {isTweeted && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current mr-0.5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                                            {tag}
                                            {!isTweeted && (
                                                <button onClick={() => removeTag(tag)} className="text-black/30 hover:text-black/60 transition-colors leading-none">&times;</button>
                                            )}
                                        </span>
                                    );
                                })}
                                <input
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                                    placeholder="Add tag..."
                                    className="text-[11px] font-medium text-black/50 bg-transparent outline-none placeholder:text-black/20 min-w-[80px] flex-1"
                                />
                            </div>
                        </div>

                        {/* Footer meta */}
                        <div className="flex items-center justify-between text-[10px] text-black/25 font-medium border-t border-black/[0.06] pt-3">
                            <span>Created {new Date(entry.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            {isDirty && <span className="text-orange-400">Saving...</span>}
                            {!isDirty && <span className="text-black/20">Saved</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => { onDelete(entry.id); onClose() }}
                title="Delete Idea"
                message="This idea will be permanently deleted and cannot be recovered."
                confirmText="Delete"
                type="danger"
            />

            {/* Archive Confirmation */}
            <ConfirmationModal
                isOpen={showArchiveConfirm}
                onClose={() => setShowArchiveConfirm(false)}
                onConfirm={() => { onArchive(entry.id); onClose() }}
                title="Archive Idea"
                message="This idea will be tucked away in your archive. You can restore it anytime."
                confirmText="Archive"
                type="warning"
            />
        </>
    )
}
