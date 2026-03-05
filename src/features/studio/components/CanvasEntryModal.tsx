'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Pin, Trash2, ArrowUpRight, Tag, Archive, Image as ImageIcon, List, Loader2, Plus } from 'lucide-react'
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
    onPromoteToSpark: (entry: StudioCanvasEntry) => void
}

export default function CanvasEntryModal({ entry, isOpen, onClose, onUpdate, onDelete, onArchive, onPromoteToSpark }: Props) {
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

    const removeTag = (tag: string) => change(() => setTags(t => t.filter(x => x !== tag)))

    const autoGrow = () => {
        if (bodyRef.current) {
            bodyRef.current.style.height = 'auto'
            bodyRef.current.style.height = `${bodyRef.current.scrollHeight}px`
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // Using Data URL for demonstration/simplicity as no storage utility is available
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64 = reader.result as string
                change(() => setImages(prev => [...prev, base64]))
                setIsUploading(false)
            }
            reader.readAsDataURL(file)
        } catch (err) {
            console.error('Upload failed:', err)
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
                            {/* Promote to Spark */}
                            {!entry.promoted_to_spark_id && (
                                <button
                                    onClick={() => { onPromoteToSpark(entry); onClose() }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-[11px] font-black rounded-xl hover:bg-orange-600 transition-all"
                                >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    Promote to Spark
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

                        {/* Tags */}
                        <div className="border-t border-black/[0.06] pt-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Tag className="w-3.5 h-3.5 text-black/25 shrink-0" />
                                {tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 text-[11px] font-bold text-black/50 bg-black/[0.05] px-2 py-0.5 rounded-full">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="text-black/30 hover:text-black/60 transition-colors leading-none">&times;</button>
                                    </span>
                                ))}
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
