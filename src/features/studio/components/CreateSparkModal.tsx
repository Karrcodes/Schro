'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, X, Type, Link as LinkIcon, AlignLeft, Tag, DollarSign, Briefcase } from 'lucide-react'
import type { SparkType, StudioProject } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'

interface CreateSparkModalProps {
    isOpen: boolean
    onClose: () => void
}

const SPARK_TYPES: { label: string; value: SparkType; icon: string }[] = [
    { label: 'Tool / Platform', value: 'tool', icon: '🛠️' },
    { label: 'Resource / Link', value: 'resource', icon: '🔗' },
    { label: 'Event', value: 'event', icon: '📅' }
]

export default function CreateSparkModal({ isOpen, onClose }: CreateSparkModalProps) {
    const { addSpark, projects } = useStudio()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        type: 'tool' as SparkType,
        url: '',
        notes: '',
        tags: [] as string[],
        project_id: '',
        price: undefined as number | undefined,
        icon_url: ''
    })
    const [tagInput, setTagInput] = useState('')
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

    // Reset form when modal opens to prevent data leaking from previous captures
    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: '',
                type: 'tool',
                url: '',
                notes: '',
                tags: [],
                project_id: '',
                price: undefined,
                icon_url: ''
            } as any)
            setSuggestions([])
        }
    }, [isOpen])

    if (!isOpen) return null

    const fetchSuggestions = async (query: string) => {
        if (query.length < 3 || (formData.type !== 'tool' && formData.type !== 'resource')) {
            setSuggestions([])
            return
        }

        try {
            setIsSearching(true)
            const res = await fetch('/api/studio/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, type: formData.type })
            })
            const data = await res.json()
            setSuggestions(data.results || [])
        } catch (err) {
            console.error('Suggestion fetch failed:', err)
        } finally {
            setIsSearching(false)
        }
    }

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setFormData(prev => ({ ...prev, title: value }))

        if (searchTimeout) clearTimeout(searchTimeout)

        const timeout = setTimeout(() => {
            fetchSuggestions(value)
        }, 600)
        setSearchTimeout(timeout)
    }

    const selectSuggestion = (s: any) => {
        setFormData(prev => ({
            ...prev,
            title: s.name,
            url: s.url,
            icon_url: s.icon_url,
            notes: s.description || prev.notes
        }))
        setSuggestions([])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title) return

        try {
            setLoading(true)
            await addSpark({
                ...formData,
                status: 'inbox',
                project_id: formData.project_id || undefined,
                price: formData.type === 'tool' ? formData.price : undefined
            } as any)
            onClose()
            setFormData({
                title: '',
                type: 'tool',
                url: '',
                notes: '',
                tags: [],
                project_id: '',
                price: undefined,
                icon_url: ''
            } as any)
        } catch (err: any) {
            console.error('Failed to capture spark:', err)
            alert(`Error: ${err.message || 'Failed to capture spark'}`)
        } finally {
            setLoading(false)
        }
    }

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault()
            if (!formData.tags.includes(tagInput.trim())) {
                setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
            }
            setTagInput('')
        }
    }

    const removeTag = (tag: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-black leading-tight">Capture Spark</h2>
                                <p className="text-[12px] font-medium text-black/40">Drop an idea, link, or resource before it fades.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 text-black/20 hover:text-black/60 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Type Picker */}
                        <div className="grid grid-cols-3 gap-2">
                            {SPARK_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, type: t.value }))}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all",
                                        formData.type === t.value
                                            ? "bg-black border-black text-white shadow-lg"
                                            : "bg-black/[0.02] border-black/[0.05] text-black/40 hover:bg-black/[0.04]"
                                    )}
                                >
                                    <span className="text-lg">{t.icon}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Title & URL */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    placeholder="Title / Name"
                                    value={formData.title}
                                    onChange={handleTitleChange}
                                    className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-200 transition-all"
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                    </div>
                                )}

                                {/* Suggestions Dropdown */}
                                {suggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-black/[0.05] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                        <div className="px-3 py-2 bg-black/[0.02] border-b border-black/[0.03] flex items-center justify-between">
                                            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">AI Matches Found</span>
                                            <button
                                                type="button"
                                                onClick={() => setSuggestions([])}
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                            >
                                                Dismiss Suggestions
                                            </button>
                                        </div>
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => selectSuggestion(s)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-black/[0.02] transition-colors border-b last:border-0 border-black/[0.03]"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-black/[0.02] border border-black/[0.05] flex items-center justify-center overflow-hidden shrink-0">
                                                    {s.icon_url ? (
                                                        <img
                                                            src={s.icon_url}
                                                            alt={s.name}
                                                            className="w-full h-full object-contain"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                if (target.parentElement) {
                                                                    target.parentElement.innerHTML = '<span class="text-[10px] text-black/20 font-black uppercase">?</span>';
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <Type className="w-4 h-4 text-black/20" />
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-[13px] font-black text-black leading-tight">{s.name}</div>
                                                    <div className="text-[10px] text-black/40 truncate max-w-[200px]">{s.url}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    type="url"
                                    placeholder="Link / URL (optional)"
                                    value={formData.url}
                                    onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-medium focus:outline-none focus:border-emerald-200 transition-all"
                                />
                            </div>
                        </div>

                        {/* Optional Fields (Price / Project) */}
                        <div className="grid grid-cols-2 gap-3">
                            {formData.type === 'tool' && (
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={formData.price || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, price: e.target.value ? Number(e.target.value) : undefined }))}
                                        className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-emerald-200 transition-all"
                                    />
                                </div>
                            )}
                            <div className="relative col-span-full">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <select
                                    value={formData.project_id}
                                    onChange={e => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-emerald-200 appearance-none cursor-pointer"
                                >
                                    <option value="">Attach to project... (optional)</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    type="text"
                                    placeholder="Add tags... (Enter)"
                                    value={tagInput}
                                    onKeyDown={addTag}
                                    onChange={e => setTagInput(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[12px] font-bold focus:outline-none focus:border-emerald-200 transition-all"
                                />
                            </div>
                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 px-2">
                                    {formData.tags.map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => removeTag(t)}
                                            className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                                        >
                                            {t}
                                            <X className="w-2 h-2" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-medium focus:outline-none focus:border-emerald-200 transition-all resize-none"
                                placeholder="Thoughts, context, or why this is cool..."
                            />
                        </div>

                        <button
                            disabled={loading || !formData.title}
                            type="submit"
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[14px] font-black hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Capture Spark
                                    <Plus className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
