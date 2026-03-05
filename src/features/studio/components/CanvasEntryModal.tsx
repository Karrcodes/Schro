'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Pin, Trash2, ArrowUpRight, Tag, Archive } from 'lucide-react'
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
    const [isDirty, setIsDirty] = useState(false)
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
            setIsDirty(false)
        }
    }, [entry])

    // Auto-save after 800ms of inactivity
    useEffect(() => {
        if (!isDirty || !entry) return
        if (saveTimeout.current) clearTimeout(saveTimeout.current)
        saveTimeout.current = setTimeout(() => {
            onUpdate(entry.id, { title, body: body || undefined, tags, color, pinned })
            setIsDirty(false)
        }, 800)
        return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current) }
    }, [title, body, tags, color, pinned, isDirty, entry, onUpdate])

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

                        {/* Body */}
                        <textarea
                            ref={bodyRef}
                            value={body}
                            onChange={e => { change(() => setBody(e.target.value)); autoGrow() }}
                            onInput={autoGrow}
                            placeholder="Write your thoughts here..."
                            rows={4}
                            className="text-[14px] text-black/70 leading-relaxed bg-transparent border-none outline-none placeholder:text-black/20 w-full resize-none"
                        />

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
